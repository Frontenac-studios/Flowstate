-- The Abyss: backburner ideas + deferred tasks (kash-3.0-abyss-build-spec.md §6).
-- Owner-scoped; anon has no access.

ALTER TABLE abyss_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "abyss_items_select_own" ON abyss_items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "abyss_items_insert_own" ON abyss_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "abyss_items_update_own" ON abyss_items FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "abyss_items_delete_own" ON abyss_items FOR DELETE USING (user_id = auth.uid());
