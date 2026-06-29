-- Care library (CL1): RLS for self-care practices + logged care events.
-- Every row is owned by user_id; the anon role has no access by default.
-- tasks already has RLS (kash_schema_rls); the additive care_activity_id column
-- needs no new policy.

ALTER TABLE care_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_activities_select_own" ON care_activities
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "care_activities_insert_own" ON care_activities
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "care_activities_update_own" ON care_activities
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "care_activities_delete_own" ON care_activities
  FOR DELETE USING (user_id = auth.uid());

ALTER TABLE care_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_events_select_own" ON care_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "care_events_insert_own" ON care_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "care_events_update_own" ON care_events
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "care_events_delete_own" ON care_events
  FOR DELETE USING (user_id = auth.uid());
