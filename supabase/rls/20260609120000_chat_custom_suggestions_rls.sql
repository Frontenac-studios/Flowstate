CREATE TABLE IF NOT EXISTS chat_custom_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  user_text text NOT NULL,
  normalized_text text NOT NULL,
  label text NOT NULL,
  send_count integer DEFAULT 0 NOT NULL,
  usage_count integer DEFAULT 0 NOT NULL,
  promoted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_custom_suggestions_user_id_normalized_text_idx
  ON chat_custom_suggestions (user_id, normalized_text);

ALTER TABLE chat_custom_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_custom_suggestions_select_own" ON chat_custom_suggestions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "chat_custom_suggestions_insert_own" ON chat_custom_suggestions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_custom_suggestions_update_own" ON chat_custom_suggestions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "chat_custom_suggestions_delete_own" ON chat_custom_suggestions FOR DELETE USING (user_id = auth.uid());
