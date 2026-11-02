-- Add application-required conflict keys and the Highlightly lineup retry field.
-- The recovery snapshot was checked for duplicates on these keys before adding them.

ALTER TABLE public.external_match_mappings
  ADD COLUMN IF NOT EXISTS next_lineup_sync_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS competition_weights_competition_id_uidx
  ON public.competition_weights (competition_id);

CREATE UNIQUE INDEX IF NOT EXISTS hist_player_teams_player_team_season_uidx
  ON public.hist_player_teams (player_id, team_id, season_id);

CREATE UNIQUE INDEX IF NOT EXISTS hist_team_competitions_team_competition_season_uidx
  ON public.hist_team_competitions (team_id, competition_id, season_id);

CREATE UNIQUE INDEX IF NOT EXISTS participations_match_player_uidx
  ON public.participations (match_id, player_id);

CREATE UNIQUE INDEX IF NOT EXISTS match_ratings_participation_uidx
  ON public.match_ratings (participation_id);

CREATE UNIQUE INDEX IF NOT EXISTS player_match_stats_participation_uidx
  ON public.player_match_stats (participation_id);

CREATE UNIQUE INDEX IF NOT EXISTS fact_player_v90_match_participation_uidx
  ON public.fact_player_v90_match (participation_id);
