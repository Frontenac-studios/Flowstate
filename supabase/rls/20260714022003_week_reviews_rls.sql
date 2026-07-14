-- Week Reviews: owner-scoped weekly review persistence (summary, reflection, payload snapshot).

ALTER TABLE week_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "week_reviews_select_own" ON week_reviews
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "week_reviews_insert_own" ON week_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "week_reviews_update_own" ON week_reviews
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "week_reviews_delete_own" ON week_reviews
  FOR DELETE USING (user_id = auth.uid());
