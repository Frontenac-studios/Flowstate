-- Kill Care / garden (docs/v1-scope.md §3.3). Forward-only.
--
-- The owner reversed the earlier PARK decision (§8a #2 / §8c) on 2026-08-26:
-- Care is deleted, not parked. Hosted holds 0 care rows (§8a), so no hosted data
-- is lost; any local dev rows are dropped. drizzle-kit generate is unusable in
-- this repo (pre-existing 0050/0051 snapshot collision), so this migration is
-- hand-written and applied via scripts/apply-drizzle-migrations.cjs, consistent
-- with how 0050/0051 are applied.

-- 1. Remove the tasks -> care_activities link (FK + column on the kept tasks table).
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_care_activity_id_care_activities_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "care_activity_id";
--> statement-breakpoint

-- 2. Drop the care tables. CASCADE clears their indexes and the
--    care_events.activity_id -> care_activities FK.
DROP TABLE IF EXISTS "care_reflections" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "care_events" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "care_activities" CASCADE;
--> statement-breakpoint

-- 3. Drop the care-only enum types (now unreferenced).
DROP TYPE IF EXISTS "care_theme";
--> statement-breakpoint
DROP TYPE IF EXISTS "care_kind";
--> statement-breakpoint
DROP TYPE IF EXISTS "care_cadence";
--> statement-breakpoint
DROP TYPE IF EXISTS "care_source";
--> statement-breakpoint
DROP TYPE IF EXISTS "care_event_source";
--> statement-breakpoint
DROP TYPE IF EXISTS "reflection_scope";
