-- W4 proposed invoices. Owner-only, anon denied.
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
-- invoices + invoice_lines are FINANCIAL-class (src/db/tenancy.ts): only the owner
-- ever reads them. No Partner/Member grant — role tiers go through the visibility
-- classes when they land, not ad-hoc policies here.

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_own" ON invoices;
CREATE POLICY "invoices_select_own" ON invoices
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "invoices_insert_own" ON invoices;
CREATE POLICY "invoices_insert_own" ON invoices
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "invoices_update_own" ON invoices;
CREATE POLICY "invoices_update_own" ON invoices
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "invoices_delete_own" ON invoices;
CREATE POLICY "invoices_delete_own" ON invoices
  FOR DELETE USING (user_id = (SELECT auth.uid()));

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_lines_select_own" ON invoice_lines;
CREATE POLICY "invoice_lines_select_own" ON invoice_lines
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "invoice_lines_insert_own" ON invoice_lines;
CREATE POLICY "invoice_lines_insert_own" ON invoice_lines
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "invoice_lines_update_own" ON invoice_lines;
CREATE POLICY "invoice_lines_update_own" ON invoice_lines
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "invoice_lines_delete_own" ON invoice_lines;
CREATE POLICY "invoice_lines_delete_own" ON invoice_lines
  FOR DELETE USING (user_id = (SELECT auth.uid()));
