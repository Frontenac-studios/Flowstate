-- W2a: reconcile RLS after task_time_entries -> time_entries, and add time_tags.
--
-- On HOSTED, the table rename carried its policies over under their old names
-- (task_time_entries_*) with the old task-requiring INSERT check. This file drops
-- those and re-creates them as time_entries_* with the correct project-scoped,
-- task-optional check. On a FRESH DB the historical file already created the
-- correct time_entries_* policies; the DROP ... IF EXISTS + CREATE here is
-- idempotent, so it simply reasserts them. Drop-then-create throughout means no
-- statement trips the whole-file skip-on-exists in apply-supabase-migrations.
--
-- time_entries is FINANCIAL-class (owner-only, no partner/member grant). time_tags
-- is org_shared but still owner-scoped until roles are enforced.

-- ---- time_entries: drop carried old-named policies, assert the correct ones. ----
DROP POLICY IF EXISTS "task_time_entries_select_own" ON time_entries;
DROP POLICY IF EXISTS "task_time_entries_insert_own" ON time_entries;
DROP POLICY IF EXISTS "task_time_entries_update_own" ON time_entries;
DROP POLICY IF EXISTS "task_time_entries_delete_own" ON time_entries;

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_entries_select_own" ON time_entries;
CREATE POLICY "time_entries_select_own" ON time_entries
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "time_entries_insert_own" ON time_entries;
CREATE POLICY "time_entries_insert_own" ON time_entries
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "time_entries_update_own" ON time_entries;
CREATE POLICY "time_entries_update_own" ON time_entries
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "time_entries_delete_own" ON time_entries;
CREATE POLICY "time_entries_delete_own" ON time_entries
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ---- time_tags: owner-scoped. ----
ALTER TABLE time_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_tags_select_own" ON time_tags;
CREATE POLICY "time_tags_select_own" ON time_tags
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "time_tags_insert_own" ON time_tags;
CREATE POLICY "time_tags_insert_own" ON time_tags
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "time_tags_update_own" ON time_tags;
CREATE POLICY "time_tags_update_own" ON time_tags
  FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "time_tags_delete_own" ON time_tags;
CREATE POLICY "time_tags_delete_own" ON time_tags
  FOR DELETE USING (user_id = (SELECT auth.uid()));
