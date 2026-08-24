-- W1.5 Draw-panel pipe: business_expenses + money_settings. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/) for the usual reason: the CLI
-- runs migrations on `supabase start` before Drizzle has created these tables.
--
-- These policies guard the Supabase-client / PostgREST path. The app's own queries
-- run over a direct postgres:// connection as the table owner, not as
-- `authenticated`, so they never evaluate RLS — app-layer ctx.userId scoping is the
-- real enforcement. `(SELECT auth.uid())` is hoisted to an InitPlan (evaluated once
-- per statement, not per row), matching the clients/rates policies.
--
-- Both tables are FINANCIAL-class (src/db/tenancy.ts): only the owner ever reads
-- them. There is no Partner/Member grant here — role tiers are not enforced yet,
-- and when they land they go through the visibility classes, not ad-hoc policies.

ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_expenses_select_own" ON business_expenses;
CREATE POLICY "business_expenses_select_own" ON business_expenses
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "business_expenses_insert_own" ON business_expenses;
CREATE POLICY "business_expenses_insert_own" ON business_expenses
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "business_expenses_update_own" ON business_expenses;
CREATE POLICY "business_expenses_update_own" ON business_expenses
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "business_expenses_delete_own" ON business_expenses;
CREATE POLICY "business_expenses_delete_own" ON business_expenses
  FOR DELETE USING (user_id = (SELECT auth.uid()));

ALTER TABLE money_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "money_settings_select_own" ON money_settings;
CREATE POLICY "money_settings_select_own" ON money_settings
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "money_settings_insert_own" ON money_settings;
CREATE POLICY "money_settings_insert_own" ON money_settings
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "money_settings_update_own" ON money_settings;
CREATE POLICY "money_settings_update_own" ON money_settings
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "money_settings_delete_own" ON money_settings;
CREATE POLICY "money_settings_delete_own" ON money_settings
  FOR DELETE USING (user_id = (SELECT auth.uid()));
