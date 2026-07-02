-- Evidence editions (wins memory): owner-scoped shrine cache.

ALTER TABLE evidence_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_editions_select_own" ON evidence_editions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "evidence_editions_insert_own" ON evidence_editions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "evidence_editions_update_own" ON evidence_editions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "evidence_editions_delete_own" ON evidence_editions
  FOR DELETE USING (user_id = auth.uid());
