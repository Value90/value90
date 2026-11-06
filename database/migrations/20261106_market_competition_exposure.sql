-- Value90 market valuation v1.1: includes competition-weighted match exposure.
-- A 10-match weighted exposure is the baseline; additional exposure raises value
-- with diminishing returns, bounded between 0.75x and 1.50x. Missing weights are
-- surfaced in the Admin competitions page and do not silently penalize a player.
ALTER TABLE public.market_valuation_runs ALTER COLUMN model_version SET DEFAULT 'V90-MV-1.1';
ALTER TABLE public.player_market_values ALTER COLUMN model_version SET DEFAULT 'V90-MV-1.1';
ALTER TABLE public.player_market_value_history ALTER COLUMN model_version SET DEFAULT 'V90-MV-1.1';

CREATE OR REPLACE FUNCTION public.run_market_valuation(p_force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_local_date date := (now() AT TIME ZONE 'Europe/Madrid')::date;
  v_period_start date;
  v_season_id bigint;
  v_run_id uuid;
  v_count integer := 0;
  v_source text := CASE WHEN p_force THEN 'manual' ELSE 'scheduled' END;
BEGIN
  IF auth.uid() IS NOT NULL
     AND lower(coalesce(auth.jwt() ->> 'email', '')) <> 'pastues@icloud.com' THEN
    RAISE EXCEPTION 'Only the Value90 administrator can run market valuations.' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('value90-market-valuation'));

  IF NOT p_force AND (EXTRACT(ISODOW FROM v_local_date) <> 2 OR EXTRACT(DAY FROM v_local_date) > 7) THEN
    RETURN jsonb_build_object('status', 'not_due', 'checked_on', v_local_date);
  END IF;

  v_period_start := date_trunc('month', v_local_date)::date;

  IF NOT p_force AND EXISTS (
    SELECT 1 FROM public.market_valuation_runs
    WHERE period_start = v_period_start AND run_source = 'scheduled' AND status = 'completed'
  ) THEN
    RETURN jsonb_build_object('status', 'already_completed', 'period_start', v_period_start);
  END IF;

  SELECT id INTO v_season_id
  FROM public.seasons
  WHERE active = true
  ORDER BY start_date DESC NULLS LAST, id DESC
  LIMIT 1;

  IF v_season_id IS NULL THEN
    RETURN jsonb_build_object('status', 'no_active_season', 'checked_on', v_local_date);
  END IF;

  INSERT INTO public.market_valuation_runs (period_start, run_source, season_id, status)
  VALUES (v_period_start, v_source, v_season_id, 'running')
  RETURNING id INTO v_run_id;

  DROP TABLE IF EXISTS pg_temp.value90_market_candidates;
  CREATE TEMP TABLE value90_market_candidates ON COMMIT DROP AS
  WITH player_ratings AS (
    SELECT
      f.player_id,
      SUM(f.weighted_contribution) FILTER (WHERE m.date >= v_local_date - 30)::numeric
        / NULLIF(SUM(f.total_weight) FILTER (WHERE m.date >= v_local_date - 30), 0) AS recent_rating,
      SUM(f.weighted_contribution)::numeric / NULLIF(SUM(f.total_weight), 0) AS season_rating,
      COUNT(DISTINCT f.match_id)::integer AS season_matches,
      SUM(f.competition_weight)::numeric AS weighted_match_exposure,
      COUNT(DISTINCT f.match_id) FILTER (WHERE m.date >= v_local_date - 30)::integer AS recent_matches
    FROM public.fact_player_v90_match AS f
    JOIN public.matches AS m ON m.id = f.match_id
    WHERE f.active = true
      AND f.status = 'CALCULATED'
      AND m.season_id = v_season_id
      AND f.weighted_contribution IS NOT NULL
      AND f.total_weight > 0
    GROUP BY f.player_id
  ), eligible AS (
    SELECT
      p.id AS player_id,
      current_team.team_id,
      pr.recent_rating,
      pr.season_rating,
      CASE
        WHEN pr.recent_rating IS NULL THEN pr.season_rating
        ELSE (pr.recent_rating * 0.60 + pr.season_rating * 0.40)
      END AS market_rating,
      pr.season_matches,
      pr.recent_matches,
      pr.weighted_match_exposure,
      CASE WHEN p.birth_date IS NULL THEN NULL
        ELSE EXTRACT(YEAR FROM age(v_local_date, p.birth_date::date))::integer
      END AS age_at_valuation
    FROM player_ratings AS pr
    JOIN public.players AS p ON p.id = pr.player_id AND p.active = true
    LEFT JOIN LATERAL (
      SELECT h.team_id
      FROM public.hist_player_teams AS h
      WHERE h.player_id = p.id AND h.season_id = v_season_id AND h.active = true
      ORDER BY h.id DESC
      LIMIT 1
    ) AS current_team ON true
    WHERE pr.season_rating BETWEEN 0 AND 10
  ), calculated AS (
    SELECT
      eligible.*,
      CASE
        WHEN age_at_valuation IS NULL THEN 1.00
        WHEN age_at_valuation <= 17 THEN 0.55
        WHEN age_at_valuation = 18 THEN 0.70
        WHEN age_at_valuation = 19 THEN 0.82
        WHEN age_at_valuation = 20 THEN 0.92
        WHEN age_at_valuation = 21 THEN 1.02
        WHEN age_at_valuation BETWEEN 22 AND 27 THEN 1.15
        WHEN age_at_valuation = 28 THEN 1.10
        WHEN age_at_valuation = 29 THEN 1.02
        WHEN age_at_valuation = 30 THEN 0.92
        WHEN age_at_valuation = 31 THEN 0.80
        WHEN age_at_valuation = 32 THEN 0.68
        WHEN age_at_valuation = 33 THEN 0.56
        WHEN age_at_valuation = 34 THEN 0.46
        WHEN age_at_valuation = 35 THEN 0.38
        ELSE 0.30
      END AS age_factor,
      CASE WHEN weighted_match_exposure > 0
          THEN LEAST(1.50::numeric, GREATEST(0.75::numeric, sqrt(weighted_match_exposure / 10.0)))
          ELSE 1.00::numeric
        END AS exposure_factor
    FROM eligible
  )
  SELECT
    player_id,
    team_id,
    recent_rating,
    season_rating,
    market_rating,
    season_matches,
    recent_matches,
    age_at_valuation,
    GREATEST(50000, LEAST(500000000,
      round((1000000 * power(3.25::numeric, market_rating - 5) * age_factor * exposure_factor) / 50000) * 50000
    ))::bigint AS value_eur
  FROM calculated
  WHERE market_rating BETWEEN 0 AND 10;

  SELECT COUNT(*)::integer INTO v_count FROM pg_temp.value90_market_candidates;

  IF v_count = 0 THEN
    UPDATE public.market_valuation_runs SET status = 'no_data', player_count = 0 WHERE id = v_run_id;
    RETURN jsonb_build_object('status', 'no_data', 'run_id', v_run_id, 'season_id', v_season_id);
  END IF;

  INSERT INTO public.player_market_value_history (
    player_id, team_id, run_id, period_start, value_eur,
    rating_last_30_days, rating_current_season, market_rating,
    age_at_valuation, model_version
  )
  SELECT
    candidate.player_id, candidate.team_id, v_run_id, v_period_start, candidate.value_eur,
    round(candidate.recent_rating, 3), round(candidate.season_rating, 3), round(candidate.market_rating, 3),
    candidate.age_at_valuation, 'V90-MV-1.1'
  FROM pg_temp.value90_market_candidates AS candidate;

  INSERT INTO public.player_market_values AS existing (
    player_id, team_id, current_value_eur, previous_value_eur, change_percent,
    rating_last_30_days, rating_current_season, market_rating,
    age_at_valuation, eligible_matches, run_id, period_start, model_version, updated_at
  )
  SELECT
    candidate.player_id, candidate.team_id, candidate.value_eur, current_value.current_value_eur,
    CASE WHEN current_value.current_value_eur > 0
      THEN round(((candidate.value_eur - current_value.current_value_eur)::numeric / current_value.current_value_eur) * 100, 2)
      ELSE NULL END,
    round(candidate.recent_rating, 3), round(candidate.season_rating, 3), round(candidate.market_rating, 3),
    candidate.age_at_valuation, candidate.season_matches,
    v_run_id, v_period_start, 'V90-MV-1.1', now()
  FROM pg_temp.value90_market_candidates AS candidate
  LEFT JOIN public.player_market_values AS current_value ON current_value.player_id = candidate.player_id
  ON CONFLICT (player_id) DO UPDATE SET
    team_id = EXCLUDED.team_id,
    current_value_eur = EXCLUDED.current_value_eur,
    previous_value_eur = existing.current_value_eur,
    change_percent = CASE WHEN existing.current_value_eur > 0
      THEN round(((EXCLUDED.current_value_eur - existing.current_value_eur)::numeric / existing.current_value_eur) * 100, 2)
      ELSE NULL END,
    rating_last_30_days = EXCLUDED.rating_last_30_days,
    rating_current_season = EXCLUDED.rating_current_season,
    market_rating = EXCLUDED.market_rating,
    age_at_valuation = EXCLUDED.age_at_valuation,
    eligible_matches = EXCLUDED.eligible_matches,
    run_id = EXCLUDED.run_id,
    period_start = EXCLUDED.period_start,
    model_version = EXCLUDED.model_version,
    updated_at = EXCLUDED.updated_at;

  UPDATE public.market_valuation_runs SET status = 'completed', player_count = v_count WHERE id = v_run_id;
  RETURN jsonb_build_object('status', 'completed', 'run_id', v_run_id, 'period_start', v_period_start, 'season_id', v_season_id, 'player_count', v_count, 'model_version', 'V90-MV-1.1');
END;
$$;

REVOKE ALL ON FUNCTION public.run_market_valuation(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_market_valuation(boolean) TO authenticated;
