-- Planning Mode foundation: goals, milestones, reserved days.

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_select_own" ON goals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "goals_insert_own" ON goals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_update_own" ON goals FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_delete_own" ON goals FOR DELETE USING (user_id = auth.uid());

ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goal_milestones_select_own" ON goal_milestones FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "goal_milestones_insert_own" ON goal_milestones FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "goal_milestones_update_own" ON goal_milestones FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "goal_milestones_delete_own" ON goal_milestones FOR DELETE USING (user_id = auth.uid());

ALTER TABLE reserved_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reserved_days_select_own" ON reserved_days FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "reserved_days_insert_own" ON reserved_days FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reserved_days_update_own" ON reserved_days FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reserved_days_delete_own" ON reserved_days FOR DELETE USING (user_id = auth.uid());