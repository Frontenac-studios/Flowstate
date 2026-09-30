-- Lump-sum billing for fixed-fee projects (Spec v5 KashB2 "Billable now").
--
-- Numbered 0068: main's highest is 0067, and 0064 stays reserved for the in-flight
-- W18b OAuth branch (0064_mcp_oauth.sql).
--
-- `fee_installments` splits a project's fixed fee into billable pieces
-- ("Milestone 3 · $2,000"). An installment is billable once its linked project
-- milestone is completed OR it was marked ready by hand (`ready_at`) — readiness is
-- derived at read time, so un-completing a milestone un-readies its installment
-- without a cross-table write. It is FINANCIAL-class (src/db/tenancy.ts): an amount
-- never becomes a column on the org_shared `projects` row. RLS lives in
-- supabase/rls/20260930120000_fee_installments_rls.sql.
--
-- Installments are billed on their own FEE invoice, never mixed into an hourly one:
-- `invoices.kind` is 'time' (every existing row) or 'fee'. A fee invoice shares the
-- client's invoice-number sequence and carries 0 for the hourly snapshot columns.
--
-- `fee_installments.invoice_id` gets the same write-once guard as
-- `time_entries.invoice_id` (0050): NULL -> invoice (bill) and invoice -> NULL (void
-- releases) are allowed, re-pointing a billed installment at another invoice is not.

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'time' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_kind_check" CHECK ("kind" IN ('time', 'fee'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fee_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"milestone_id" uuid,
	"ready_at" timestamp with time zone,
	"invoice_id" uuid,
	"invoiced_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_installments_amount_check" CHECK ("amount_cents" > 0)
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_milestone_id_project_milestones_id_fk"
    FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_invoice_id_invoices_id_fk"
    FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "fee_installments_user_id_project_id_idx" ON "fee_installments" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fee_installments_invoice_id_idx" ON "fee_installments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fee_installments_user_id_updated_at_idx" ON "fee_installments" USING btree ("user_id","updated_at");--> statement-breakpoint

CREATE OR REPLACE FUNCTION fee_installments_invoice_id_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.invoice_id IS NOT NULL
     AND NEW.invoice_id IS NOT NULL
     AND NEW.invoice_id <> OLD.invoice_id THEN
    RAISE EXCEPTION
      'fee_installments.invoice_id is immutable once set (installment %, already billed on invoice %); void that invoice to release the installment before re-billing',
      OLD.id, OLD.invoice_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS fee_installments_invoice_id_immutable ON "fee_installments";--> statement-breakpoint
CREATE TRIGGER fee_installments_invoice_id_immutable
  BEFORE UPDATE OF invoice_id ON "fee_installments"
  FOR EACH ROW
  EXECUTE FUNCTION fee_installments_invoice_id_immutable();
