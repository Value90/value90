import { supabase } from "@/lib/supabase";

import type { Match } from "@/types/match";

export type { Match } from "@/types/match";

const matchSelect = `
  id,
  competition_id,
  season_id,
  stage_id,
  home_team_id,
  away_team_id,
  home_score,
  away_score,
  home_penalty_score,
  away_penalty_score,
  date,
  stadium,
  status,
  match_duration
`;

function mapMatch(match: any): Match {
  return {
    id: match.id,
    competitionId: match.competition_id,
    seasonId: match.season_id,
    stageId: match.stage_id,
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
    homeScore: match.home_score,
    awayScore: match.away_score,
    homePenaltyScore: match.home_penalty_score ?? null,
    awayPenaltyScore: match.away_penalty_score ?? null,
    date: match.date,
    stadium: match.stadium ?? "",
    status: match.status as Match["status"],
    matchDuration: match.match_duration ?? 90,
  };
}

/*
 * ============================================================
 * OBTENER PARTIDOS
 * ============================================================
 */

export async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(matchSelect)
    .order("date", { ascending: false });

  if (error) {
    console.error(
      "Error obteniendo partidos:",
      JSON.stringify(error, null, 2)
    );
    throw error;
  }

  return (data ?? []).map(mapMatch);
}

/*
 * ============================================================
 * CREAR PARTIDO
 * ============================================================
 */

export async function addMatch(
  match: Omit<Match, "id">
): Promise<Match> {
  const { data, error } = await supabase
    .from("matches")
    .insert({
      competition_id: match.competitionId,
      season_id: match.seasonId,
      stage_id: match.stageId,
      home_team_id: match.homeTeamId,
      away_team_id: match.awayTeamId,
      home_score: match.homeScore,
      away_score: match.awayScore,
      home_penalty_score: match.homePenaltyScore,
      away_penalty_score: match.awayPenaltyScore,
      date: match.date,
      stadium: match.stadium || null,
      status: match.status,
      match_duration: match.matchDuration,
    })
    .select(matchSelect)
    .single();

  if (error) {
    console.error(
      "Error creando partido:",
      JSON.stringify(error, null, 2)
    );
    throw error;
  }

  return mapMatch(data);
}

/*
 * ============================================================
 * ACTUALIZAR PARTIDO
 * ============================================================
 */

export async function updateMatch(
  id: number,
  changes: Omit<Match, "id">
): Promise<Match | undefined> {
  const { data, error } = await supabase
    .from("matches")
    .update({
      competition_id: changes.competitionId,
      season_id: changes.seasonId,
      stage_id: changes.stageId,
      home_team_id: changes.homeTeamId,
      away_team_id: changes.awayTeamId,
      home_score: changes.homeScore,
      away_score: changes.awayScore,
      home_penalty_score: changes.homePenaltyScore,
      away_penalty_score: changes.awayPenaltyScore,
      date: changes.date,
      stadium: changes.stadium || null,
      status: changes.status,
      match_duration: changes.matchDuration,
    })
    .eq("id", id)
    .select(matchSelect)
    .single();

  if (error) {
    console.error(
      "Error actualizando partido:",
      JSON.stringify(error, null, 2)
    );
    throw error;
  }

  if (!data) {
    return undefined;
  }

  return mapMatch(data);
}

/*
 * ============================================================
 * ELIMINAR PARTIDO
 * ============================================================
 */

export async function deleteMatch(
  id: number
): Promise<boolean> {
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando partido:",
      JSON.stringify(error, null, 2)
    );
    throw error;
  }

  return true;
}
