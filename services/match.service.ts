import { supabase } from "@/lib/supabase";

import type { Match } from "@/types/match";

export type { Match } from "@/types/match";

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const PAGE_SIZE = 1000;

/*
 * ============================================================
 * SELECT COMÚN
 * ============================================================
 */

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

/*
 * ============================================================
 * MAPEO
 * ============================================================
 */

function mapMatch(match: any): Match {
  return {
    id: Number(match.id),
    competitionId: Number(match.competition_id),
    seasonId: Number(match.season_id),
    stageId: Number(match.stage_id),
    homeTeamId: Number(match.home_team_id),
    awayTeamId: Number(match.away_team_id),
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
 * OBTENER TODOS LOS PARTIDOS
 *
 * IMPORTANTE:
 *
 * Supabase puede limitar las respuestas grandes.
 * Por eso hacemos paginación explícita.
 * ============================================================
 */

export async function getMatches(): Promise<Match[]> {
  const allMatches: Match[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("matches")
      .select(matchSelect)
      .order("date", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(
        "Error obteniendo partidos:",
        JSON.stringify(error, null, 2)
      );

      throw error;
    }

    const page = data ?? [];

    allMatches.push(...page.map(mapMatch));

    /*
     * Si hemos recibido menos de PAGE_SIZE,
     * ya no quedan más registros.
     */
    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allMatches;
}

/*
 * ============================================================
 * OBTENER PARTIDOS DE UNA TEMPORADA + COMPETICIÓN
 *
 * Esta función NO depende de stage_id.
 *
 * La utilizamos para que la página pueda comprobar
 * realmente qué jornadas tienen partidos.
 * ============================================================
 */

export async function getMatchesBySeasonCompetition(
  seasonId: number,
  competitionId: number
): Promise<Match[]> {
  const allMatches: Match[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("matches")
      .select(matchSelect)
      .eq("season_id", seasonId)
      .eq("competition_id", competitionId)
      .order("date", { ascending: true })
      .range(from, to);

    if (error) {
      console.error(
        "Error obteniendo partidos de temporada y competición:",
        JSON.stringify(error, null, 2)
      );

      throw error;
    }

    const page = data ?? [];

    allMatches.push(...page.map(mapMatch));

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allMatches;
}

/*
 * ============================================================
 * OBTENER PARTIDOS DE UNA JORNADA
 *
 * CONSULTA DIRECTA:
 *
 * season_id
 * competition_id
 * stage_id
 *
 * Además utilizamos paginación explícita.
 * ============================================================
 */

export async function getMatchesByStage(
  seasonId: number,
  competitionId: number,
  stageId: number
): Promise<Match[]> {
  const allMatches: Match[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("matches")
      .select(matchSelect)
      .eq("season_id", seasonId)
      .eq("competition_id", competitionId)
      .eq("stage_id", stageId)
      .order("date", { ascending: true })
      .range(from, to);

    if (error) {
      console.error(
        "Error obteniendo partidos de la jornada:",
        JSON.stringify(error, null, 2)
      );

      throw error;
    }

    const page = data ?? [];

    allMatches.push(...page.map(mapMatch));

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  console.log(
    `[V90] Partidos encontrados para temporada=${seasonId}, competición=${competitionId}, jornada=${stageId}: ${allMatches.length}`
  );

  return allMatches;
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