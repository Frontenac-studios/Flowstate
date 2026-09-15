-- W18b mcp_tokens. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/) for the usual reason: the CLI runs
-- migrations on `supabase start` before Drizzle has created the table. This guards the
-- Supabase-client / PostgREST path — which the desktop app's sync uses to push a token
-- minted offline. The /api/mcp route reads over postgres:// and never evaluates RLS;
-- it looks a token up by its hash and scopes every read to that token's user.

ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mcp_tokens_select_own" ON mcp_tokens;
CREATE POLICY "mcp_tokens_select_own" ON mcp_tokens
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "mcp_tokens_insert_own" ON mcp_tokens;
CREATE POLICY "mcp_tokens_insert_own" ON mcp_tokens
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "mcp_tokens_update_own" ON mcp_tokens;
CREATE POLICY "mcp_tokens_update_own" ON mcp_tokens
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "mcp_tokens_delete_own" ON mcp_tokens;
CREATE POLICY "mcp_tokens_delete_own" ON mcp_tokens
  FOR DELETE USING (user_id = (SELECT auth.uid()));
