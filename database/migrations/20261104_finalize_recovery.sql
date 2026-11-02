-- Finalize the one-off recovery import. Safe to rerun: sequences are reset to
-- current maxima, club metadata is guarded by ID + name, and market valuation
-- is generated only if this month has no completed/no-data run yet.

DO $$
DECLARE
  table_name text;
  sequence_name text;
  max_id bigint;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'countries','competitions','competition_weights','rival_weights','participation_weights',
    'teams','positions','players','seasons','stages','hist_team_competitions',
    'hist_player_teams','matches','participations','match_ratings','player_match_stats',
    'fact_player_v90_match','ai_recognition_results','ai_recognition_corrections',
    'player_market_value_history'
  ] LOOP
    sequence_name := pg_get_serial_sequence(format('public.%I', table_name), 'id');
    IF sequence_name IS NOT NULL THEN
      EXECUTE format('SELECT max(id) FROM public.%I', table_name) INTO max_id;
      IF max_id IS NOT NULL THEN
        PERFORM setval(sequence_name::regclass, max_id, true);
      END IF;
    END IF;
  END LOOP;
END $$;

WITH team_metadata(team_id, expected_name, foundation_year, stadium_capacity) AS (
  VALUES
    (2,  'Real Madrid CF.',                         1902, 79000),
    (3,  'FC. Barcelona',                           1899, 62652),
    (13, 'Villarreal CF.',                           1923, 21332),
    (5,  'Real Betis Balompie',                     1907, 68887),
    (18, 'Club Atlético de Madrid',                 1903, 70692),
    (12, 'Racing de Santander',                     1913, 22514),
    (4,  'Sevilla FC.',                             1890, 43883),
    (24, 'Valencia CF.',                            1919, 49430),
    (17, 'Elche CF.',                               1923, 31388),
    (11, 'Rayo Vallecano',                          1924, 14708),
    (15, 'Levante UD.',                             1909, 26354),
    (20, 'Athletic Club',                           1898, 53331),
    (9,  'Deportivo Alavés',                        1921, 19840),
    (10, 'Getafe CF.',                              1983, 16500),
    (16, 'RC. Deportivo de A Coruña',               1906, 32490),
    (19, 'Málaga CF.',                              1994, 30044),
    (23, 'CA. Osasuna',                             1920, 23576),
    (21, 'Real Sociedad de Fútbol',                 1909, 39313),
    (22, 'RC. Celta de Vigo',                       1923, 23000),
    (14, 'RCD. Espanyol',                           1900, 40500)
)
UPDATE public.teams AS teams
SET foundation_year = metadata.foundation_year,
    stadium_capacity = metadata.stadium_capacity
FROM team_metadata AS metadata
WHERE teams.id = metadata.team_id
  AND teams.name = metadata.expected_name;

UPDATE public.teams
SET stadium = 'Estadio de Vallecas'
WHERE id = 11 AND name = 'Rayo Vallecano' AND stadium = 'Butarque';

DO $$
DECLARE
  current_period date := date_trunc('month', (now() AT TIME ZONE 'Europe/Madrid'))::date;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.market_valuation_runs
    WHERE period_start = current_period AND status IN ('completed', 'no_data')
  ) THEN
    PERFORM public.run_market_valuation(true);
  END IF;
END $$;

SELECT
  run.status,
  run.period_start,
  run.player_count,
  run.model_version,
  (SELECT count(*) FROM public.player_market_values) AS current_player_values,
  (SELECT count(*) FROM public.player_market_value_history) AS history_rows
FROM public.market_valuation_runs AS run
ORDER BY run.created_at DESC
LIMIT 1;
