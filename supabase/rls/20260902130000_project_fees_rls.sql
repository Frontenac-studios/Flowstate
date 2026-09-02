-- W10f project money sidecar. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/): the CLI runs migrations on
-- `supabase start` before Drizzle has created this table.
--
-- These policies guard the Supabase-client / PostgREST path. The app's own queries
-- run over a direct postgres:// connection as the table owner, not as
-- `authenticated`, so they never evaluate RLS — app-layer ctx.userId scoping is the
-- real enforcement. `(SELECT auth.uid())` is hoisted to an InitPlan.
--
-- project_fees is FINANCIAL-class (src/db/tenancy.ts): it holds what a deal was
-- quoted at, which is the figure the org_shared `projects` and `leads` rows exist
-- without. Only the owner ever reads it.

ALTER TABLE project_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_fees_select_own" ON project_fees;
CREATE POLICY "project_fees_select_own" ON project_fees
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "project_fees_insert_own" ON project_fees;
CREATE POLICY "project_fees_insert_own" ON project_fees
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "project_fees_update_own" ON project_fees;
CREATE POLICY "project_fees_update_own" ON project_fees
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "project_fees_delete_own" ON project_fees;
CREATE POLICY "project_fees_delete_own" ON project_fees
  FOR DELETE USING (user_id = (SELECT auth.uid()));
