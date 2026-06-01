ALTER TABLE focus_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "focus_blocks_select_own" ON focus_blocks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "focus_blocks_insert_own" ON focus_blocks FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_id AND t.user_id = auth.uid()
  )
);
CREATE POLICY "focus_blocks_update_own" ON focus_blocks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "focus_blocks_delete_own" ON focus_blocks FOR DELETE USING (user_id = auth.uid());
