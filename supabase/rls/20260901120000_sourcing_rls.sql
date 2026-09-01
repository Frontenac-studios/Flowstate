-- W10 sourcing agent: leads + sourcing_settings + lead_outreach. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/) for the usual reason: the CLI runs
-- migrations on `supabase start` before Drizzle has created these tables. These guard
-- the Supabase-client / PostgREST path; the app's own queries run over postgres:// and
-- never evaluate RLS — app-layer ctx.userId scoping is the real enforcement. Role tiers
-- (a Partner reading the pipeline) land later through the visibility classes, not here.
-- No money lives on these tables, so there is nothing financial to guard.

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select_own" ON leads;
CREATE POLICY "leads_select_own" ON leads
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "leads_insert_own" ON leads;
CREATE POLICY "leads_insert_own" ON leads
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "leads_update_own" ON leads;
CREATE POLICY "leads_update_own" ON leads
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "leads_delete_own" ON leads;
CREATE POLICY "leads_delete_own" ON leads
  FOR DELETE USING (user_id = (SELECT auth.uid()));

ALTER TABLE sourcing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sourcing_settings_select_own" ON sourcing_settings;
CREATE POLICY "sourcing_settings_select_own" ON sourcing_settings
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "sourcing_settings_insert_own" ON sourcing_settings;
CREATE POLICY "sourcing_settings_insert_own" ON sourcing_settings
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "sourcing_settings_update_own" ON sourcing_settings;
CREATE POLICY "sourcing_settings_update_own" ON sourcing_settings
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "sourcing_settings_delete_own" ON sourcing_settings;
CREATE POLICY "sourcing_settings_delete_own" ON sourcing_settings
  FOR DELETE USING (user_id = (SELECT auth.uid()));

ALTER TABLE lead_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_outreach_select_own" ON lead_outreach;
CREATE POLICY "lead_outreach_select_own" ON lead_outreach
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "lead_outreach_insert_own" ON lead_outreach;
CREATE POLICY "lead_outreach_insert_own" ON lead_outreach
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "lead_outreach_update_own" ON lead_outreach;
CREATE POLICY "lead_outreach_update_own" ON lead_outreach
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "lead_outreach_delete_own" ON lead_outreach;
CREATE POLICY "lead_outreach_delete_own" ON lead_outreach
  FOR DELETE USING (user_id = (SELECT auth.uid()));
