-- Google Calendar sync: OAuth connections + normalized external events. Owner-scoped via user_id.

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_connections_select_own" ON calendar_connections
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "calendar_connections_insert_own" ON calendar_connections
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "calendar_connections_update_own" ON calendar_connections
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "calendar_connections_delete_own" ON calendar_connections
  FOR DELETE USING (user_id = auth.uid());

ALTER TABLE external_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external_calendar_events_select_own" ON external_calendar_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "external_calendar_events_insert_own" ON external_calendar_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "external_calendar_events_update_own" ON external_calendar_events
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "external_calendar_events_delete_own" ON external_calendar_events
  FOR DELETE USING (user_id = auth.uid());
