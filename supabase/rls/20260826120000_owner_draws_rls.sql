-- W16 owner's draws. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/): the CLI runs migrations on
-- `supabase start` before Drizzle has created this table.
--
-- These policies guard the Supabase-client / PostgREST path. The app's own queries
-- run over a direct postgres:// connection as the table owner, not as
-- `authenticated`, so they never evaluate RLS — app-layer ctx.userId scoping is the
-- real enforcement. `(SELECT auth.uid())` is hoisted to an InitPlan.
--
-- owner_draws is FINANCIAL-class (src/db/tenancy.ts): only the owner ever reads it.

ALTER TABLE owner_draws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_draws_select_own" ON owner_draws;
CREATE POLICY "owner_draws_select_own" ON owner_draws
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_draws_insert_own" ON owner_draws;
CREATE POLICY "owner_draws_insert_own" ON owner_draws
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_draws_update_own" ON owner_draws;
CREATE POLICY "owner_draws_update_own" ON owner_draws
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_draws_delete_own" ON owner_draws;
CREATE POLICY "owner_draws_delete_own" ON owner_draws
  FOR DELETE USING (user_id = (SELECT auth.uid()));
