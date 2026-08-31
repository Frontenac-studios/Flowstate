-- W6 — the Budget. The declared time tilt for the quarter: the share of logged
-- time meant for business (0–100), personal is the remainder. Null until declared,
-- so the Today bar invites rather than measures. Additive; app_settings is
-- personal-class, so no RLS change (the existing per-user policy covers it).
ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "quarter_tilt_business_pct" integer;
