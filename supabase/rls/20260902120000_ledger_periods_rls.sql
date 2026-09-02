-- W8 sealed fortnights. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/): the CLI runs migrations on
-- `supabase start` before Drizzle has created this table.
--
-- These policies guard the Supabase-client / PostgREST path. The app's own queries
-- run over a direct postgres:// connection as the table owner, not as
-- `authenticated`, so they never evaluate RLS — app-layer ctx.userId scoping is the
-- real enforcement. `(SELECT auth.uid())` is hoisted to an InitPlan.
--
-- ledger_periods is FINANCIAL-class (src/db/tenancy.ts): the breakdown carries
-- client names against logged seconds, so only the owner ever reads it.

ALTER TABLE ledger_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_periods_select_own" ON ledger_periods;
CREATE POLICY "ledger_periods_select_own" ON ledger_periods
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ledger_periods_insert_own" ON ledger_periods;
CREATE POLICY "ledger_periods_insert_own" ON ledger_periods
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ledger_periods_update_own" ON ledger_periods;
CREATE POLICY "ledger_periods_update_own" ON ledger_periods
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ledger_periods_delete_own" ON ledger_periods;
CREATE POLICY "ledger_periods_delete_own" ON ledger_periods
  FOR DELETE USING (user_id = (SELECT auth.uid()));
