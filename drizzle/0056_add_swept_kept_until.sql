-- W7 — the Sweep. A per-item "kept until" marker on the three stale altitudes
-- (tasks, projects, targets). Set to now + ~30d when an item is "kept" in the
-- weekly Sweep, which suppresses it from the stale list until then ("keep buys a
-- month, not a week"). Null = never kept. Additive; all three are org_shared, so
-- the existing per-table RLS covers the new column.
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "swept_kept_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "swept_kept_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN IF NOT EXISTS "swept_kept_until" timestamp with time zone;
