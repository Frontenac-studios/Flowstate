-- Spec v2 — per-project colour.
--
-- Numbered 0065, not 0064: the in-flight W18b OAuth branch already holds
-- 0064_mcp_oauth.sql, so this takes the next number to avoid a duplicate.
--
-- Additive only. `hue` hangs off `projects` (org_shared, already has RLS), so there
-- is no companion RLS file. It is a presentation fact, not money.
--
-- `hue` is one of the 8 project hues (--project-1..8 in tokens.css). Personal
-- projects are always personal purple, so the CHECK keeps their hue NULL.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "hue" smallint;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "projects" ADD CONSTRAINT "projects_hue_check"
    CHECK ("hue" IS NULL OR ("hue" BETWEEN 1 AND 8 AND "category" = 'business'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- Backfill: each user's business projects get hues in creation order, live
-- projects first so they don't share a hue with an archived one. Only rows still
-- NULL are touched, so re-running this file is a no-op.
UPDATE "projects" AS p
SET "hue" = numbered.hue
FROM (
  SELECT
    "id",
    ((row_number() OVER (
      PARTITION BY "user_id"
      ORDER BY ("archived_at" IS NOT NULL), "created_at", "id"
    ) - 1) % 8) + 1 AS hue
  FROM "projects"
  WHERE "category" = 'business'
) AS numbered
WHERE p."id" = numbered."id" AND p."hue" IS NULL;
