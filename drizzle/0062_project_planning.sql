-- W15 — project planning & estimate-vs-actual.
--
-- Numbered 0062, not 0060: main carries TWO files numbered 0059
-- (0059_orgs_personal_for_user_id.sql and 0059_pipeline_stages.sql), so the highest
-- number on disk is 0061 and the convention "next integer after the highest file"
-- lands here.
--
-- Additive only. Every column hangs off a table that already exists and already has
-- RLS policies, so there is no companion RLS file.
--
-- No alert state or alert switch here: the app already has an edge-triggered
-- notifier (ThresholdNotifier + alertPrefs.projectOverEstimate) that re-arms when a
-- project recovers. W15 changes what that alert MEANS — from the lagging "logged
-- time passed the estimate" to the leading "budget is ahead of the work" — rather
-- than adding a second switch that says almost the same thing.
--
-- The tenancy split the audit called for (v1-scope §W15, 2026-09-01) is honoured:
-- `billing_type` is a WORK FACT and may sit on the org_shared `projects` row — it
-- says how to READ the burn, not what anything is worth. The fee amount and the
-- target-rate floor are MONEY and extend `project_fees` (financial), exactly as
-- W10f's 0059 promised they would.

DO $$ BEGIN
  CREATE TYPE "project_billing_type" AS ENUM ('hourly', 'fixed_fee');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "billing_type" "project_billing_type" DEFAULT 'hourly' NOT NULL;--> statement-breakpoint


-- Hours, not minutes: a phase estimated to the minute is a false precision nobody can
-- hold. The plan's "optional deadline" is the existing phases.end_date.
ALTER TABLE "phases" ADD COLUMN IF NOT EXISTS "estimate_hours" integer;--> statement-breakpoint

ALTER TABLE "project_fees" ADD COLUMN IF NOT EXISTS "fee_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "project_fees" ADD COLUMN IF NOT EXISTS "target_rate_floor_cents" integer;
