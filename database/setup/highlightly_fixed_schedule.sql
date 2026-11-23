-- Fixed Highlightly automatic-sync timetable.
-- Times use the Supabase project / pg_cron timezone shown in the Cron panel.
-- If the panel is set to Europe/Madrid, these are local Madrid times.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  v_job_id bigint;
  v_url text;
  v_secret text;
BEGIN
  SELECT rtrim(decrypted_secret, '/') INTO v_url FROM vault.decrypted_secrets WHERE name = 'value90_app_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'value90_cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE EXCEPTION 'Faltan value90_app_url o value90_cron_secret en Supabase Vault.';
  END IF;

  FOR v_job_id IN SELECT jobid FROM cron.job WHERE jobname LIKE 'value90-highlightly-%' LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  -- Friday and Monday: 23:00, 23:20 and 23:40. All linked active competitions.
  PERFORM cron.schedule('value90-highlightly-fri-mon', '0,20,40 23 * * 1,5',
    format($job$SELECT net.http_post(url := %L, headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'), body := '{}'::jsonb, timeout_milliseconds := 240000);$job$,
      v_url || '/api/admin/sports/scheduled-sync?scope=all', 'Bearer ' || v_secret));

  -- Saturday and Sunday: every 20 minutes from 15:00 through 23:40. All linked active competitions.
  PERFORM cron.schedule('value90-highlightly-weekend', '*/20 15-23 * * 0,6',
    format($job$SELECT net.http_post(url := %L, headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'), body := '{}'::jsonb, timeout_milliseconds := 240000);$job$,
      v_url || '/api/admin/sports/scheduled-sync?scope=all', 'Bearer ' || v_secret));

  -- Tuesday and Wednesday: 19:40, then every 20 minutes from 20:00 through 23:40, only Champions competitions.
  PERFORM cron.schedule('value90-highlightly-champions-open', '40 19 * * 2,3',
    format($job$SELECT net.http_post(url := %L, headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'), body := '{}'::jsonb, timeout_milliseconds := 240000);$job$,
      v_url || '/api/admin/sports/scheduled-sync?scope=champions', 'Bearer ' || v_secret));
  PERFORM cron.schedule('value90-highlightly-champions', '*/20 20-23 * * 2,3',
    format($job$SELECT net.http_post(url := %L, headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'), body := '{}'::jsonb, timeout_milliseconds := 240000);$job$,
      v_url || '/api/admin/sports/scheduled-sync?scope=champions', 'Bearer ' || v_secret));
END;
$$;
