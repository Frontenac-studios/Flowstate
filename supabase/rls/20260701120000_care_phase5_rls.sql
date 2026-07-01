-- Care Phase 5: reflections + lifts_me + breathing event source.

ALTER TABLE care_activities ADD COLUMN IF NOT EXISTS lifts_me boolean NOT NULL DEFAULT false;
ALTER TYPE "public"."care_event_source" ADD VALUE IF NOT EXISTS 'breathing';
CREATE TYPE "public"."reflection_scope" AS ENUM('daily', 'weekly', 'monthly');

CREATE TABLE IF NOT EXISTS care_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reflection_date date NOT NULL,
  scope reflection_scope NOT NULL DEFAULT 'daily',
  prompt_text text NOT NULL,
  body_text text,
  mood smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS care_reflections_user_date_scope_idx
  ON care_reflections (user_id, reflection_date, scope);
CREATE INDEX IF NOT EXISTS care_reflections_user_id_updated_at_idx
  ON care_reflections (user_id, updated_at);

ALTER TABLE care_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_reflections_select_own" ON care_reflections
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "care_reflections_insert_own" ON care_reflections
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "care_reflections_update_own" ON care_reflections
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "care_reflections_delete_own" ON care_reflections
  FOR DELETE USING (user_id = auth.uid());
