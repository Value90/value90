-- Highlightly result/lineup/statistics synchronization is manual by request.
-- Remove only existing Highlightly match-sync cron jobs; leave the monthly
-- market valuation cron intact.
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
    WHERE lower(jobname) ~ '(highlightly.*(sync|result|match)|sports.*sync)'
       OR lower(command) LIKE '%/api/admin/sports/sync%'
  $query$
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
END;
$$;

-- The existing value90-monthly-market-valuation job remains scheduled daily
-- at 05:00 UTC; run_market_valuation(false) executes only on the first Tuesday
-- in Europe/Madrid.
