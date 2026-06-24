ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_dependencies_select_own" ON task_dependencies;
CREATE POLICY "task_dependencies_select_own" ON task_dependencies FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "task_dependencies_insert_own" ON task_dependencies;
CREATE POLICY "task_dependencies_insert_own" ON task_dependencies FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = blocker_task_id AND t.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = blocked_task_id AND t.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "task_dependencies_update_own" ON task_dependencies;
CREATE POLICY "task_dependencies_update_own" ON task_dependencies FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "task_dependencies_delete_own" ON task_dependencies;
CREATE POLICY "task_dependencies_delete_own" ON task_dependencies FOR DELETE USING (user_id = auth.uid());
