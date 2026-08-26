CREATE TABLE "owner_draws" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"drawn_on" timestamp with time zone NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "owner_draws_user_id_drawn_on_idx" ON "owner_draws" USING btree ("user_id","drawn_on");