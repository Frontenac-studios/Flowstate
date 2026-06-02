ALTER TABLE task_bulk_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_bulk_import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_bulk_imports_select_own" ON task_bulk_imports
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "task_bulk_imports_insert_own" ON task_bulk_imports
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "task_bulk_imports_update_own" ON task_bulk_imports
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "task_bulk_import_items_select_own" ON task_bulk_import_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_bulk_imports i
      WHERE i.id = import_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "task_bulk_import_items_insert_own" ON task_bulk_import_items
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM task_bulk_imports i
      WHERE i.id = import_id AND i.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "task_bulk_import_items_delete_own" ON task_bulk_import_items
  FOR DELETE USING (user_id = auth.uid());
