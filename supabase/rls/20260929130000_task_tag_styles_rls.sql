-- Spec v3 task_tag_styles. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/) because the CLI runs migrations on
-- `supabase start` before Drizzle has created the table. Guards the Supabase-client /
-- PostgREST path the desktop sync pushes through; the app's own queries go over
-- postgres:// and are scoped by ctx.userId.

ALTER TABLE task_tag_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_tag_styles_select_own" ON task_tag_styles;
CREATE POLICY "task_tag_styles_select_own" ON task_tag_styles
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "task_tag_styles_insert_own" ON task_tag_styles;
CREATE POLICY "task_tag_styles_insert_own" ON task_tag_styles
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "task_tag_styles_update_own" ON task_tag_styles;
CREATE POLICY "task_tag_styles_update_own" ON task_tag_styles
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "task_tag_styles_delete_own" ON task_tag_styles;
CREATE POLICY "task_tag_styles_delete_own" ON task_tag_styles
  FOR DELETE USING (user_id = (SELECT auth.uid()));
