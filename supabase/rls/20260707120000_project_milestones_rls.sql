ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_milestones_select_own" ON project_milestones FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "project_milestones_insert_own" ON project_milestones FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "project_milestones_update_own" ON project_milestones FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "project_milestones_delete_own" ON project_milestones FOR DELETE USING (user_id = auth.uid());
