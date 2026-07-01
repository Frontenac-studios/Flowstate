-- Week §7 WD1: per-day priorities (≤3 per weekday). Owner-scoped via user_id.

ALTER TABLE week_day_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "week_day_priorities_select_own" ON week_day_priorities
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "week_day_priorities_insert_own" ON week_day_priorities
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "week_day_priorities_update_own" ON week_day_priorities
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "week_day_priorities_delete_own" ON week_day_priorities
  FOR DELETE USING (user_id = auth.uid());
