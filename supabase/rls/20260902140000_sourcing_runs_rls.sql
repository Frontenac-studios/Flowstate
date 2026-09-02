-- W10i sourcing runs and their costs. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/): the CLI runs migrations on
-- `supabase start` before Drizzle has created these tables.
--
-- These policies guard the Supabase-client / PostgREST path. The app's own queries
-- run over a direct postgres:// connection as the table owner, not as
-- `authenticated`, so they never evaluate RLS — app-layer ctx.userId scoping is the
-- real enforcement. `(SELECT auth.uid())` is hoisted to an InitPlan.
--
-- sourcing_runs is org_shared and sourcing_run_costs is FINANCIAL (src/db/tenancy.ts).
-- Both are owner-only here: partner/member grants do not exist yet, and the costs
-- table would never get one.

ALTER TABLE sourcing_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sourcing_runs_select_own" ON sourcing_runs;
CREATE POLICY "sourcing_runs_select_own" ON sourcing_runs
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "sourcing_runs_insert_own" ON sourcing_runs;
CREATE POLICY "sourcing_runs_insert_own" ON sourcing_runs
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "sourcing_runs_update_own" ON sourcing_runs;
CREATE POLICY "sourcing_runs_update_own" ON sourcing_runs
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "sourcing_runs_delete_own" ON sourcing_runs;
CREATE POLICY "sourcing_runs_delete_own" ON sourcing_runs
  FOR DELETE USING (user_id = (SELECT auth.uid()));

ALTER TABLE sourcing_run_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sourcing_run_costs_select_own" ON sourcing_run_costs;
CREATE POLICY "sourcing_run_costs_select_own" ON sourcing_run_costs
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "sourcing_run_costs_insert_own" ON sourcing_run_costs;
CREATE POLICY "sourcing_run_costs_insert_own" ON sourcing_run_costs
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "sourcing_run_costs_update_own" ON sourcing_run_costs;
CREATE POLICY "sourcing_run_costs_update_own" ON sourcing_run_costs
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "sourcing_run_costs_delete_own" ON sourcing_run_costs;
CREATE POLICY "sourcing_run_costs_delete_own" ON sourcing_run_costs
  FOR DELETE USING (user_id = (SELECT auth.uid()));
