-- Week §7: protected block templates + day instances. Owner-scoped via user_id.

ALTER TABLE protected_block_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "protected_block_templates_select_own" ON protected_block_templates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "protected_block_templates_insert_own" ON protected_block_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "protected_block_templates_update_own" ON protected_block_templates
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "protected_block_templates_delete_own" ON protected_block_templates
  FOR DELETE USING (user_id = auth.uid());

ALTER TABLE protected_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "protected_blocks_select_own" ON protected_blocks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "protected_blocks_insert_own" ON protected_blocks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "protected_blocks_update_own" ON protected_blocks
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "protected_blocks_delete_own" ON protected_blocks
  FOR DELETE USING (user_id = auth.uid());
