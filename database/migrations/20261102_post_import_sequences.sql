-- Run after importing the legacy rows with their original IDs.
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
