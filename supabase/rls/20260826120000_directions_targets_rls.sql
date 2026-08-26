-- W5 Quarter surface: directions + targets. Owner-only, anon denied.
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
-- Both are ORG_SHARED (src/db/tenancy.ts). Role tiers are not enforced yet; when
-- they land they go through the visibility classes, not ad-hoc policies. Money never
-- lands on a target row (an `auto` measure is derived at read), so there is nothing
-- financial to guard here.

ALTER TABLE directions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directions_select_own" ON directions;
CREATE POLICY "directions_select_own" ON directions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "directions_insert_own" ON directions;
CREATE POLICY "directions_insert_own" ON directions
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "directions_update_own" ON directions;
CREATE POLICY "directions_update_own" ON directions
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "directions_delete_own" ON directions;
CREATE POLICY "directions_delete_own" ON directions
  FOR DELETE USING (user_id = (SELECT auth.uid()));

ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "targets_select_own" ON targets;
CREATE POLICY "targets_select_own" ON targets
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "targets_insert_own" ON targets;
CREATE POLICY "targets_insert_own" ON targets
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "targets_update_own" ON targets;
CREATE POLICY "targets_update_own" ON targets
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "targets_delete_own" ON targets;
CREATE POLICY "targets_delete_own" ON targets
  FOR DELETE USING (user_id = (SELECT auth.uid()));
