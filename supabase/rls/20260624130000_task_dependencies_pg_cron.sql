-- Phase 3 (3.i): server-side cleanup of expired window dependency edges.
--
-- This is hygiene only — correctness comes from the read-time guard (`expires_at`
-- is on every row, so clients self-expire at the week boundary regardless). The
-- watermark-pull sync can't propagate hard-deletes to offline mirrors, which is
-- accepted (online reads are authoritative).
--
-- Guarded: pg_cron is not preloaded on the local/CI Postgres image, so enabling it
-- there would fail. When it's unavailable we skip scheduling (a NOTICE, not an
-- error) so DB bootstrap still succeeds. On hosted Supabase, enable pg_cron once
-- (Dashboard → Database → Extensions) for this job to actually run.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    -- Named schedule upserts by job name, so re-applying this file is idempotent.
    PERFORM cron.schedule(
      'task_dependencies_purge_expired',
      '7 0 * * *', -- daily 00:07 UTC; absolute expires_at means timing isn't critical
      $job$DELETE FROM task_dependencies WHERE expires_at < now()$job$
    );
  ELSE
    RAISE NOTICE 'pg_cron unavailable; skipping window-edge cleanup schedule (read-time guard still applies)';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- e.g. pg_cron present but not in shared_preload_libraries — never block bootstrap.
    RAISE NOTICE 'Could not schedule task_dependencies cleanup (%); read-time guard still applies', SQLERRM;
END $$;
