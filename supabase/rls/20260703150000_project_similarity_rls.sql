-- Kash 3.1 P2: project similarity relations. Owner-scoped via user_id.

ALTER TABLE project_similarity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_similarity_select_own" ON project_similarity
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "project_similarity_insert_own" ON project_similarity
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "project_similarity_update_own" ON project_similarity
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "project_similarity_delete_own" ON project_similarity
  FOR DELETE USING (user_id = auth.uid());
