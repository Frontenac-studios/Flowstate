-- Spec v5 task_checklist_items. Owner-only, anon denied.
--
-- Lives in supabase/rls/ (not supabase/migrations/) because the CLI runs migrations on
-- `supabase start` before Drizzle has created the table. Guards the Supabase-client /
-- PostgREST path the desktop sync pushes through; the app's own queries go over
-- postgres:// and are scoped by ctx.userId. Inserts must also own the parent task.

ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_checklist_items_select_own" ON task_checklist_items;
CREATE POLICY "task_checklist_items_select_own" ON task_checklist_items
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "task_checklist_items_insert_own" ON task_checklist_items;
CREATE POLICY "task_checklist_items_insert_own" ON task_checklist_items
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND t.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "task_checklist_items_update_own" ON task_checklist_items;
CREATE POLICY "task_checklist_items_update_own" ON task_checklist_items
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "task_checklist_items_delete_own" ON task_checklist_items;
CREATE POLICY "task_checklist_items_delete_own" ON task_checklist_items
  FOR DELETE USING (user_id = (SELECT auth.uid()));
