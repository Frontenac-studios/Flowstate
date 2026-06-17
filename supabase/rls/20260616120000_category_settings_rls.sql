ALTER TABLE category_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_settings_select_own" ON category_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "category_settings_insert_own" ON category_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "category_settings_update_own" ON category_settings
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "category_settings_delete_own" ON category_settings
  FOR DELETE USING (user_id = auth.uid());
