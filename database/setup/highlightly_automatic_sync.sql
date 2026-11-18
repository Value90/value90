-- Programación automática de resultados, alineaciones, minutos, estadísticas y V90.
-- Requiere dos secretos en Supabase Vault:
--   value90_app_url     = https://www.value90.es
--   value90_cron_secret = el mismo valor configurado como CRON_SECRET en Vercel Production
-- No guardes el valor de CRON_SECRET en este archivo ni en el repositorio.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS external_match_mappings_next_result_sync_idx
  ON public.external_match_mappings (next_result_sync_at)
  WHERE final_synced_at IS NULL AND next_result_sync_at IS NOT NULL;

DO $$
DECLARE
  v_missing text[];
  v_job_id bigint;
BEGIN
  SELECT array_agg(required.name)
  INTO v_missing
  FROM (VALUES ('value90_app_url'), ('value90_cron_secret')) AS required(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets AS secret WHERE secret.name = required.name
  );

  IF coalesce(array_length(v_missing, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Añade primero a Supabase Vault estos secretos: %', array_to_string(v_missing, ', ');
  END IF;

  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'value90-highlightly-auto-sync'
       OR (lower(jobname) ~ '(highlightly.*(sync|result|match)|sports.*sync)'
           AND jobname <> 'value90-monthly-market-valuation')
       OR lower(command) LIKE '%/api/admin/sports/sync%'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'value90-highlightly-auto-sync',
    '*/5 * * * *',
    $job$
      SELECT net.http_post(
        url := (SELECT rtrim(decrypted_secret, '/') FROM vault.decrypted_secrets WHERE name = 'value90_app_url') || '/api/admin/sports/scheduled-sync',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'value90_cron_secret'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 240000
      );
    $job$
  );
END;
$$;

-- Programa la primera consulta para partidos ya importados y próximos a jugarse.
-- Los encuentros antiguos quedan para la sincronización histórica manual.
UPDATE public.external_match_mappings AS mapping
SET next_result_sync_at = (match.date::timestamptz + interval '2 hours'),
    result_attempts = 0,
    last_sync_error = NULL,
    updated_at = now()
FROM public.matches AS match
WHERE mapping.provider = 'highlightly'
  AND mapping.match_id = match.id
  AND match.competition_id IN (1, 2, 3)
  AND mapping.final_synced_at IS NULL
  AND coalesce(mapping.result_attempts, 0) < 5
  AND (match.date::timestamptz + interval '2 hours') >= now() - interval '48 hours'
  AND mapping.next_result_sync_at IS NULL;
