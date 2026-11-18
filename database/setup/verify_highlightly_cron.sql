-- Read-only check for the automatic Highlightly retry schedule.
SELECT
  count(*) FILTER (WHERE jobname = 'value90-highlightly-auto-sync') AS automatic_sync_jobs,
  count(*) FILTER (
    WHERE lower(jobname) ~ '(highlightly.*(sync|result|match)|sports.*sync)'
      AND jobname <> 'value90-highlightly-auto-sync'
  ) AS unexpected_sync_jobs,
  CASE
    WHEN count(*) FILTER (WHERE jobname = 'value90-highlightly-auto-sync') = 1
      AND count(*) FILTER (
        WHERE lower(jobname) ~ '(highlightly.*(sync|result|match)|sports.*sync)'
          AND jobname <> 'value90-highlightly-auto-sync'
      ) = 0 THEN 'automatic_sync_ready'
    ELSE 'check_cron_configuration'
  END AS status
FROM cron.job;
