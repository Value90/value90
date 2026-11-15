-- Read-only check: manual Highlightly sync should have no scheduled job.
SELECT
  count(*) FILTER (
    WHERE jobname = 'value90-highlightly-match-sync'
       OR lower(jobname) ~ '(highlightly.*(sync|result|match)|sports.*sync)'
       OR lower(command) LIKE '%/api/admin/sports/sync%'
  ) AS remaining_highlightly_sync_jobs,
  CASE WHEN count(*) FILTER (
    WHERE jobname = 'value90-highlightly-match-sync'
       OR lower(jobname) ~ '(highlightly.*(sync|result|match)|sports.*sync)'
       OR lower(command) LIKE '%/api/admin/sports/sync%'
  ) = 0 THEN 'manual_only' ELSE 'scheduled_job_found' END AS status
FROM cron.job;
