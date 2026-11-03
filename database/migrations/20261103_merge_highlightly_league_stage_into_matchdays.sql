-- Consolidates Highlightly Champions League league-stage rounds into Value90's
-- season-wide Jornada N stages. Match references are moved before redundant
-- stage rows are deleted, so no match data is lost.
DO $$
DECLARE
  duplicate_stage RECORD;
  target_stage_id integer;
  canonical_name text;
BEGIN
  FOR duplicate_stage IN
    SELECT id, season_id, (regexp_match(name, 'league[[:space:]]+stage[[:space:]]*[-–]?[[:space:]]*([0-9]+)[[:space:]]*$', 'i'))[1] AS round_number
    FROM public.stages
    WHERE name ~* 'league[[:space:]]+stage[[:space:]]*[-–]?[[:space:]]*[0-9]+[[:space:]]*$'
  LOOP
    canonical_name := 'Jornada ' || duplicate_stage.round_number;

    SELECT id INTO target_stage_id
    FROM public.stages
    WHERE season_id = duplicate_stage.season_id
      AND name = canonical_name
      AND id <> duplicate_stage.id
    ORDER BY id
    LIMIT 1;

    IF target_stage_id IS NULL THEN
      UPDATE public.stages SET name = canonical_name WHERE id = duplicate_stage.id;
    ELSE
      UPDATE public.matches SET stage_id = target_stage_id WHERE stage_id = duplicate_stage.id;
      DELETE FROM public.stages WHERE id = duplicate_stage.id;
    END IF;
  END LOOP;
END $$;
