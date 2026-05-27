CREATE TABLE IF NOT EXISTS nudge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  local_date date NOT NULL,
  task_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS nudge_events_user_id_kind_local_date_idx
  ON nudge_events (user_id, kind, local_date);

ALTER TABLE nudge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nudge_events_select_own" ON nudge_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "nudge_events_insert_own" ON nudge_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "nudge_events_update_own" ON nudge_events FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "nudge_events_delete_own" ON nudge_events FOR DELETE USING (user_id = auth.uid());
