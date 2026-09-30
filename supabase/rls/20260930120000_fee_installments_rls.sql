-- Lump-sum billing installments (Spec v5 KashB2). Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/): the CLI runs migrations on
-- `supabase start` before Drizzle has created this table.
--
-- These policies guard the Supabase-client / PostgREST path. The app's own queries
-- run over a direct postgres:// connection as the table owner, not as
-- `authenticated`, so they never evaluate RLS — app-layer ctx.userId scoping is the
-- real enforcement. `(SELECT auth.uid())` is hoisted to an InitPlan.
--
-- fee_installments is FINANCIAL-class (src/db/tenancy.ts): every row is an amount
-- owed against a fixed fee. Only the owner ever reads it.

ALTER TABLE fee_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fee_installments_select_own" ON fee_installments;
CREATE POLICY "fee_installments_select_own" ON fee_installments
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "fee_installments_insert_own" ON fee_installments;
CREATE POLICY "fee_installments_insert_own" ON fee_installments
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "fee_installments_update_own" ON fee_installments;
CREATE POLICY "fee_installments_update_own" ON fee_installments
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "fee_installments_delete_own" ON fee_installments;
CREATE POLICY "fee_installments_delete_own" ON fee_installments
  FOR DELETE USING (user_id = (SELECT auth.uid()));
