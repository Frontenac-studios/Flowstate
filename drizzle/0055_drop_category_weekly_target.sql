-- W6 — the Budget. Drop the never-surfaced `weekly_target` weighting from
-- category_settings. It was schema-only from day one (written and read nowhere),
-- and the Budget measures logged time rather than per-category task targets, so the
-- column has no future. The rest of category_settings (label/color/sort_order
-- overrides) stays. Safe: no data path depends on this column.
ALTER TABLE "category_settings" DROP COLUMN IF EXISTS "weekly_target";
