ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_own" ON projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "projects_insert_own" ON projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects_update_own" ON projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "projects_delete_own" ON projects FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "tasks_select_own" ON tasks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tasks_insert_own" ON tasks FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND (
    project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  )
);
CREATE POLICY "tasks_update_own" ON tasks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "tasks_delete_own" ON tasks FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "task_time_entries_select_own" ON task_time_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "task_time_entries_insert_own" ON task_time_entries FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_id AND t.user_id = auth.uid()
  )
);
CREATE POLICY "task_time_entries_update_own" ON task_time_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "task_time_entries_delete_own" ON task_time_entries FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "chat_messages_select_own" ON chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "chat_messages_insert_own" ON chat_messages FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND (
    task_id IS NULL
    OR EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND t.user_id = auth.uid()
    )
  )
);
CREATE POLICY "chat_messages_update_own" ON chat_messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "chat_messages_delete_own" ON chat_messages FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "day_reviews_select_own" ON day_reviews FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "day_reviews_insert_own" ON day_reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "day_reviews_update_own" ON day_reviews FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "day_reviews_delete_own" ON day_reviews FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "app_settings_select_own" ON app_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "app_settings_insert_own" ON app_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "app_settings_update_own" ON app_settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "app_settings_delete_own" ON app_settings FOR DELETE USING (user_id = auth.uid());
