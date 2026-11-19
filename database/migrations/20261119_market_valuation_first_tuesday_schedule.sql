-- Run the market valuation cron only on Tuesdays.
-- run_market_valuation(false) already checks Europe/Madrid and returns without
-- recalculating unless the date is the first Tuesday of the month. Scheduling
-- it weekly avoids the previous daily no-op executions.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'value90-monthly-market-valuation'
  ) THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'value90-monthly-market-valuation';
  END IF;

  PERFORM cron.schedule(
    'value90-monthly-market-valuation',
    '0 5 * * 2',
    'SELECT public.run_market_valuation(false);'
  );
END;
$$;
