-- §13 "About me" doc — values, prose sections, constraints, and AI-proposed suggestions.

ALTER TABLE user_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_values_select_own" ON user_values FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_values_insert_own" ON user_values FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_values_update_own" ON user_values FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_values_delete_own" ON user_values FOR DELETE USING (user_id = auth.uid());

ALTER TABLE about_me_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "about_me_sections_select_own" ON about_me_sections FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "about_me_sections_insert_own" ON about_me_sections FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "about_me_sections_update_own" ON about_me_sections FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "about_me_sections_delete_own" ON about_me_sections FOR DELETE USING (user_id = auth.uid());

ALTER TABLE user_constraints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_constraints_select_own" ON user_constraints FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_constraints_insert_own" ON user_constraints FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_constraints_update_own" ON user_constraints FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_constraints_delete_own" ON user_constraints FOR DELETE USING (user_id = auth.uid());

ALTER TABLE about_me_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "about_me_suggestions_select_own" ON about_me_suggestions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "about_me_suggestions_insert_own" ON about_me_suggestions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "about_me_suggestions_update_own" ON about_me_suggestions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "about_me_suggestions_delete_own" ON about_me_suggestions FOR DELETE USING (user_id = auth.uid());
