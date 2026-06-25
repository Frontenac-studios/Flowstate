-- Planning Mode foundation: goals, bingo, horizons, ghosted suggestions.

ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bingo_cards_select_own" ON bingo_cards FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bingo_cards_insert_own" ON bingo_cards FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bingo_cards_update_own" ON bingo_cards FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "bingo_cards_delete_own" ON bingo_cards FOR DELETE USING (user_id = auth.uid());

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

ALTER TABLE quarter_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quarter_themes_select_own" ON quarter_themes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "quarter_themes_insert_own" ON quarter_themes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "quarter_themes_update_own" ON quarter_themes FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "quarter_themes_delete_own" ON quarter_themes FOR DELETE USING (user_id = auth.uid());

ALTER TABLE month_intentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "month_intentions_select_own" ON month_intentions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "month_intentions_insert_own" ON month_intentions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "month_intentions_update_own" ON month_intentions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "month_intentions_delete_own" ON month_intentions FOR DELETE USING (user_id = auth.uid());

ALTER TABLE reserved_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reserved_days_select_own" ON reserved_days FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "reserved_days_insert_own" ON reserved_days FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "reserved_days_update_own" ON reserved_days FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reserved_days_delete_own" ON reserved_days FOR DELETE USING (user_id = auth.uid());

ALTER TABLE planning_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planning_suggestions_select_own" ON planning_suggestions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "planning_suggestions_insert_own" ON planning_suggestions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "planning_suggestions_update_own" ON planning_suggestions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "planning_suggestions_delete_own" ON planning_suggestions FOR DELETE USING (user_id = auth.uid());
