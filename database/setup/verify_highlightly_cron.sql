-- Read-only diagnostic. Always returns one row and never reveals secret values.
WITH cron_status AS (
  SELECT
    bool_or(active AND schedule = '* * * * *') AS active_on_expected_schedule,
    max(schedule) AS schedule
  FROM cron.job
  WHERE jobname = 'value90-highlightly-match-sync'
), vault_status AS (
  SELECT
    coalesce(bool_or(name = 'value90_app_url' AND length(btrim(decrypted_secret)) > 0), false) AS app_url_configured,
    coalesce(bool_or(name = 'value90_sports_cron_secret' AND length(btrim(decrypted_secret)) > 0), false) AS cron_secret_configured
  FROM vault.decrypted_secrets
  WHERE name IN ('value90_app_url', 'value90_sports_cron_secret')
)
SELECT
  coalesce(cron_status.active_on_expected_schedule, false) AS cron_job_ready,
  cron_status.schedule,
  vault_status.app_url_configured,
  vault_status.cron_secret_configured,
  CASE
    WHEN coalesce(cron_status.active_on_expected_schedule, false)
      AND vault_status.app_url_configured
      AND vault_status.cron_secret_configured
    THEN 'ready'
    ELSE 'not_ready'
  END AS status
FROM cron_status
CROSS JOIN vault_status;
