-- W10f — the deal pipeline. Three things:
--
-- 1. `lead_state` gains the terminal stages. The state IS the close reason:
--    `signed` (won), `declined` (they said no), `lost` (went dark). `dismissed`
--    stays separate — that is a triage verb used before the deal was real.
--
-- 2. Promotion stops being a state. A lead at `contacted` or beyond carries a
--    `project_id`, and that link is the fact; the stage no longer has to agree with
--    it. Postgres cannot drop an enum value, so `promoted` survives in the type but
--    every row holding it moves to `contacted` (promote = first real contact, which
--    is exactly what the value meant).
--
-- 3. `project_fees` — the financial-class home for a project's money facts. The
--    proposal amount is money and `projects`/`leads` are org_shared, so it cannot
--    live on either (CLAUDE.md: money never becomes a column on an existing table;
--    tenancy.test.ts enforces it). W15's fixed fee + target-rate floor extend THIS
--    table rather than adding another. RLS in
--    supabase/rls/20260902130000_project_fees_rls.sql.
--
-- ALTER TYPE ... ADD VALUE is transaction-safe on PG12+ so long as the new value is
-- not used in the same transaction; the UPDATE below only writes `contacted`, which
-- already existed.

ALTER TYPE "lead_state" ADD VALUE IF NOT EXISTS 'signed';--> statement-breakpoint
ALTER TYPE "lead_state" ADD VALUE IF NOT EXISTS 'declined';--> statement-breakpoint
ALTER TYPE "lead_state" ADD VALUE IF NOT EXISTS 'lost';--> statement-breakpoint

UPDATE "leads" SET "state" = 'contacted' WHERE "state" = 'promoted';--> statement-breakpoint

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "project_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
	"proposal_amount_cents" integer,
	"proposed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_fees_user_id_project_id_idx" ON "project_fees" ("user_id","project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_fees_project_id_idx" ON "project_fees" ("project_id");
