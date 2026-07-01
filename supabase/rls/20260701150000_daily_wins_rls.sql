-- Daily Wins (DWN-1): owner-scoped hero slots + dismiss overrides.

ALTER TABLE daily_wins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_wins_select_own" ON daily_wins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "daily_wins_insert_own" ON daily_wins
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "daily_wins_update_own" ON daily_wins
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "daily_wins_delete_own" ON daily_wins
  FOR DELETE USING (user_id = auth.uid());
