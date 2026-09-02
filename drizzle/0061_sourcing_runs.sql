-- W10i — the weekly sourcing agent's batch model.
--
-- Two tables, for the reason CLAUDE.md gives: money never becomes a column on an
-- existing table.
--
--   sourcing_runs       org_shared — status, counts, timings. Work facts.
--   sourcing_run_costs  financial  — what the run actually cost. Not work facts.
--
-- A run is RESUMABLE by design. One company's research takes 50–75 seconds against a
-- 300-second function ceiling, so a batch of five cannot complete in a single
-- invocation; `discovered` names the work and `processed` records how far the agent
-- has got, and a worker advances whatever is unfinished. Without that, a run dies
-- half-done with no record of where it stopped.
--
-- `week_key` (ISO "2026-W36") is what stops an hourly worker from starting a fresh
-- Tuesday batch every hour it wakes up.
--
-- A sourced prospect costs about 35c all-in (measured): two calls to discover a
-- batch, two to research each company, one to score it.
--
-- Costs are stored as real billed amounts (OpenRouter returns the charge per call),
-- in whole cents PLUS millionths of a cent: a research call is about four cents but a
-- scoring call is a fraction of one, and rounding each to a whole cent would drift
-- the 30-day ceiling away from the real bill in either direction.
--
-- RLS in supabase/rls/20260902140000_sourcing_runs_rls.sql.

DO $$ BEGIN
  CREATE TYPE "sourcing_run_trigger" AS ENUM ('cron', 'manual');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "sourcing_run_status" AS ENUM ('discovering', 'researching', 'complete', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sourcing_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"trigger" "sourcing_run_trigger" DEFAULT 'cron' NOT NULL,
	"status" "sourcing_run_status" DEFAULT 'discovering' NOT NULL,
	"week_key" text NOT NULL,
	"batch_size" integer NOT NULL,
	"discovered" integer DEFAULT 0 NOT NULL,
	"processed" integer DEFAULT 0 NOT NULL,
	"finished_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sourcing_runs_user_id_created_at_idx" ON "sourcing_runs" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sourcing_runs_user_id_status_idx" ON "sourcing_runs" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sourcing_runs_user_id_week_key_idx" ON "sourcing_runs" ("user_id","week_key");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sourcing_run_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"run_id" uuid NOT NULL REFERENCES "sourcing_runs"("id") ON DELETE CASCADE,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"amount_micros" integer DEFAULT 0 NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sourcing_run_costs_user_id_created_at_idx" ON "sourcing_run_costs" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sourcing_run_costs_run_id_idx" ON "sourcing_run_costs" ("run_id");
--> statement-breakpoint

-- The opt-in switch. Defaults FALSE: the agent spends real money unattended, so it
-- starts because someone enabled it, never because a branch merged.
ALTER TABLE "sourcing_settings" ADD COLUMN IF NOT EXISTS "weekly_run_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sourcing_settings" ADD COLUMN IF NOT EXISTS "weekly_run_batch_size" integer;
