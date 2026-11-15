-- Value90 now synchronizes Highlightly matches manually from the admin panel.
-- Run this once in Supabase SQL Editor to remove the previous scheduled poll.
-- The monthly market valuation job is intentionally not changed.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RETURN;
  END IF;

  FOR v_job_id IN EXECUTE $query$
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'value90-highlightly-match-sync'
       OR lower(jobname) ~ '(highlightly.*(sync|result|match)|sports.*sync)'
       OR lower(command) LIKE '%/api/admin/sports/sync%'
  $query$
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
END;
$$;
