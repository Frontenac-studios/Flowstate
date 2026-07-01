-- Projects Miller PR-5: reusable project templates. Owner-scoped via user_id.

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_templates_select_own" ON project_templates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "project_templates_insert_own" ON project_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "project_templates_update_own" ON project_templates
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "project_templates_delete_own" ON project_templates
  FOR DELETE USING (user_id = auth.uid());
