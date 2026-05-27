-- Kash RLS spot-check (run in Supabase SQL editor or psql against local DB)
-- Prerequisite: two auth users with rows in tasks (replace UUIDs below).

-- Example: set role to authenticated and impersonate user A
-- SELECT set_config('request.jwt.claim.sub', '<user-a-uuid>', true);
-- SET ROLE authenticated;
-- SELECT count(*) FROM tasks;  -- should only see user A rows

-- Verify RLS is enabled on all user tables
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'projects',
    'tasks',
    'task_time_entries',
    'chat_messages',
    'day_reviews',
    'app_settings',
    'nudge_events',
    'health_checks'
  )
ORDER BY c.relname;

-- List policies per table
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'projects',
    'tasks',
    'task_time_entries',
    'chat_messages',
    'day_reviews',
    'app_settings',
    'nudge_events'
  )
ORDER BY tablename, policyname;
