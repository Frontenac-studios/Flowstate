-- W1 clients + rates. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/) for the usual reason: the CLI
-- runs migrations on `supabase start` before Drizzle has created these tables.
--
-- These policies guard the Supabase-client / PostgREST path. The app's own queries
-- run over a direct postgres:// connection as the table owner, not as
-- `authenticated`, so they never evaluate RLS — app-layer ctx.userId scoping is the
-- real enforcement. `(SELECT auth.uid())` is hoisted to an InitPlan (evaluated once
-- per statement, not per row), matching the orgs policies.
--
-- rates is FINANCIAL-class (src/db/tenancy.ts): only the owner ever reads it. There
-- is no Partner/Member grant here — role tiers are not enforced yet, and when they
-- land they go through the visibility classes, not ad-hoc policies.

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select_own" ON clients;
CREATE POLICY "clients_select_own" ON clients
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "clients_insert_own" ON clients;
CREATE POLICY "clients_insert_own" ON clients
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "clients_update_own" ON clients;
CREATE POLICY "clients_update_own" ON clients
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "clients_delete_own" ON clients;
CREATE POLICY "clients_delete_own" ON clients
  FOR DELETE USING (user_id = (SELECT auth.uid()));

ALTER TABLE rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rates_select_own" ON rates;
CREATE POLICY "rates_select_own" ON rates
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "rates_insert_own" ON rates;
CREATE POLICY "rates_insert_own" ON rates
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "rates_update_own" ON rates;
CREATE POLICY "rates_update_own" ON rates
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "rates_delete_own" ON rates;
CREATE POLICY "rates_delete_own" ON rates
  FOR DELETE USING (user_id = (SELECT auth.uid()));
