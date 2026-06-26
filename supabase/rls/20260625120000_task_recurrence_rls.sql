-- Phase 4 (4A): RLS for recurrence templates + per-occurrence overrides.
-- Every row is owned by user_id; the anon role has no access by default.

ALTER TABLE task_recurrence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_recurrence_select_own" ON task_recurrence
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "task_recurrence_insert_own" ON task_recurrence
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_recurrence_update_own" ON task_recurrence
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_recurrence_delete_own" ON task_recurrence
  FOR DELETE USING (user_id = auth.uid());

ALTER TABLE task_occurrence_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_occurrence_overrides_select_own" ON task_occurrence_overrides
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "task_occurrence_overrides_insert_own" ON task_occurrence_overrides
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_occurrence_overrides_update_own" ON task_occurrence_overrides
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "task_occurrence_overrides_delete_own" ON task_occurrence_overrides
  FOR DELETE USING (user_id = auth.uid());
