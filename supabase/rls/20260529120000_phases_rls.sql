ALTER TABLE phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phases_select_own" ON phases FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "phases_insert_own" ON phases FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  )
  AND (
    parent_phase_id IS NULL
    OR EXISTS (
      SELECT 1 FROM phases pp
      WHERE pp.id = parent_phase_id AND pp.user_id = auth.uid()
    )
  )
);
CREATE POLICY "phases_update_own" ON phases FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "phases_delete_own" ON phases FOR DELETE USING (user_id = auth.uid());
