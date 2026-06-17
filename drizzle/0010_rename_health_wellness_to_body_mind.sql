-- 1B: rename the project_category enum value 'health_wellness' -> 'body_mind'.
-- drizzle-kit's auto-diff wants to DROP TYPE + recreate with a text round-trip,
-- which fails on existing 'health_wellness' rows (the value no longer exists to
-- cast into). Per data-spine §7, use the atomic, data-preserving ALTER TYPE
-- RENAME VALUE instead. Guarded so the local idempotent applier can re-run it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'project_category' AND e.enumlabel = 'health_wellness'
  ) THEN
    ALTER TYPE "public"."project_category" RENAME VALUE 'health_wellness' TO 'body_mind';
  END IF;
END $$;
