-- Programación de la sincronización Highlightly con Supabase Cron.
-- Primero añade en Supabase Vault los secretos con estos nombres:
--   value90_app_url              = URL de producción de Vercel
--   value90_sports_cron_secret   = mismo valor configurado como CRON_SECRET en Vercel
-- Después ejecuta este archivo una sola vez en Supabase SQL Editor.
-- El endpoint protegido de Vercel también necesita SUPABASE_SECRET_KEY y HIGHLIGHTLY_API_KEY.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'value90-highlightly-match-sync') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'value90-highlightly-match-sync';
  END IF;

  PERFORM cron.schedule(
    'value90-highlightly-match-sync',
    '* * * * *',
    $job$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'value90_app_url') || '/api/admin/sports/sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'value90_sports_cron_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 15000
      );
    $job$
  );
END $$;
