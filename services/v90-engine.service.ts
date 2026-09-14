import { supabase } from "@/lib/supabase";

/*
 * ============================================================
 * V90 ENGINE
 * ============================================================
 *
 * Motor central de cálculo de Value90.
 *
 * V90-1.0
 *
 * Esta versión mantiene la función individual para automatismos
 * y añade un motor por lote para jornadas. El motor por lote evita
 * repetir consultas a Supabase para cada jugador.
 *
 * ============================================================
 */

const CALCULATION_VERSION = "V90-1.1";
const QUERY_CHUNK_SIZE = 500;

interface ParticipationRow {
  id: number;
  match_id: number;
  player_id: number;
  team_id: number;
  position_id: number;
  shirt_number: number;
  is_starting_xi: boolean;
  minutes_played: number;
  captain: boolean;
  substitute_in_minute: number | null;
  substitute_out_minute: number | null;
}

interface MatchRow {
  id: number;
  competition_id: number;
  season_id: number;
  stage_id: number;
  home_team_id: number;
  away_team_id: number;
  date: string;
  status: string;
  match_duration: number | null;
}

interface MatchRatingRow {
  id: number;
  match_id: number;
  player_id: number;
  participation_id: number;
  external_average: number | null;
}

interface CompetitionWeightRow {
  competition_id: number;
  peso_v90: number;
  active: boolean;
}

interface ParticipationWeightRow {
  id: number;
  min_minutes: number;
  max_minutes: number;
  peso_v90: number;
  active: boolean;
}

interface RivalWeightRow {
  id: number;
  classification: string;
  min_difference: number | null;
  max_difference: number | null;
  peso_v90: number;
  active: boolean;
}

interface HistoricalFactRow {
  participation_id: number;
  player_id: number;
  match_id: number;
  total_weight: number;
  weighted_contribution: number;
  status: "CALCULATED" | "PENDING" | "ERROR";
  active: boolean;
}

interface SaveCalculation {
  participationId: number;
  playerId: number;
  matchId: number;
  teamId: number;
  rivalTeamId: number;
  externalAverage: number;
  competitionWeight: number;
  rivalWeight: number;
  participationWeight: number;
  totalWeight: number;
  weightedContribution: number;
  v90Match: number;
  status: "CALCULATED" | "PENDING" | "ERROR";
}

export interface V90MatchCalculationResult {
  success: boolean;
  status: "CALCULATED" | "PENDING" | "ERROR";
  participationId: number;
  playerId: number;
  matchId: number;
  teamId: number;
  rivalTeamId: number;
  externalAverage: number | null;
  competitionWeight: number | null;
  rivalWeight: number | null;
  participationWeight: number | null;
  totalWeight: number | null;
  weightedContribution: number | null;
  v90Match: number | null;
  rivalClassification: string | null;
  message: string;
}

export interface V90StageParticipationResult {
  participationId: number;
  playerId: number;
  status: "CALCULATED" | "PENDING" | "ERROR";
  message: string;
}

export interface V90StageMatchResult {
  matchId: number;
  participationCount: number;
  calculated: number;
  pending: number;
  errors: number;
  ratingsCount: number;
  errorMessages: string[];
  participationResults: V90StageParticipationResult[];
}

export interface V90StageCalculationResult {
  success: boolean;
  status: "CALCULATED" | "PENDING" | "ERROR";
  durationMs: number;
  matches: V90StageMatchResult[];
  message: string;
}

function round(value: number, decimals = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function chunk<T>(items: T[], size = QUERY_CHUNK_SIZE): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

function toNumber(value: unknown): number {
  return Number(value);
}

function getRivalWeightFromRows(
  weights: RivalWeightRow[],
  difference: number,
  rivalV90: number
): { weight: number; classification: string } | null {
  const elite = weights.find(
    (row) => row.classification.toUpperCase() === "ÉLITE"
  );

  if (rivalV90 > 9 && elite) {
    return {
      weight: toNumber(elite.peso_v90),
      classification: elite.classification,
    };
  }

  const matching = weights.find((row) => {
    if (row.classification.toUpperCase() === "ÉLITE") {
      return false;
    }

    const minOk =
      row.min_difference === null ||
      difference > toNumber(row.min_difference);

    const maxOk =
      row.max_difference === null ||
      difference <= toNumber(row.max_difference);

    return minOk && maxOk;
  });

  if (!matching) {
    return null;
  }

  return {
    weight: toNumber(matching.peso_v90),
    classification: matching.classification,
  };
}

function getParticipationWeightFromRows(
  weights: ParticipationWeightRow[],
  minutesPlayed: number
): number | null {
  const matching = weights.find(
    (row) =>
      toNumber(row.min_minutes) <= minutesPlayed &&
      toNumber(row.max_minutes) >= minutesPlayed
  );

  return matching ? toNumber(matching.peso_v90) : null;
}

/*
 * ============================================================
 * MOTOR INDIVIDUAL
 * ============================================================
 *
 * Se mantiene para futuras automatizaciones que calculen una sola
 * participación. Para jornadas se recomienda usar
 * calculateV90Stage(), que trabaja en bloque.
 * ============================================================
 */

async function getParticipation(
  participationId: number
): Promise<ParticipationRow | null> {
  const { data, error } = await supabase
    .from("participations")
    .select(
      `
      id,
      match_id,
      player_id,
      team_id,
      position_id,
      shirt_number,
      is_starting_xi,
      minutes_played,
      captain,
      substitute_in_minute,
      substitute_out_minute
      `
    )
    .eq("id", participationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo participación: ${error.message}`);
  }

  return data ? (data as ParticipationRow) : null;
}

async function getMatch(matchId: number): Promise<MatchRow | null> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      id,
      competition_id,
      season_id,
      stage_id,
      home_team_id,
      away_team_id,
      date,
      status,
      match_duration
      `
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo partido: ${error.message}`);
  }

  return data ? (data as MatchRow) : null;
}

async function getMatchRatingByParticipation(
  participationId: number
): Promise<MatchRatingRow | null> {
  const { data, error } = await supabase
    .from("match_ratings")
    .select(
      `
      id,
      match_id,
      player_id,
      participation_id,
      external_average
      `
    )
    .eq("participation_id", participationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo Match Rating: ${error.message}`);
  }

  return data ? (data as MatchRatingRow) : null;
}

async function getCompetitionWeight(
  competitionId: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from("competition_weights")
    .select("competition_id, peso_v90, active")
    .eq("competition_id", competitionId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo peso de competición: ${error.message}`);
  }

  return data ? toNumber(data.peso_v90) : null;
}

async function getParticipationWeight(
  minutesPlayed: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from("participation_weights")
    .select("id, min_minutes, max_minutes, peso_v90, active")
    .eq("active", true)
    .lte("min_minutes", minutesPlayed)
    .gte("max_minutes", minutesPlayed)
    .order("min_minutes", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo peso de participación: ${error.message}`);
  }

  return data ? toNumber(data.peso_v90) : null;
}

async function getRivalWeight(
  difference: number,
  rivalV90: number
): Promise<{ weight: number; classification: string } | null> {
  const { data, error } = await supabase
    .from("rival_weights")
    .select(
      "id, classification, min_difference, max_difference, peso_v90, active"
    )
    .eq("active", true)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Error obteniendo pesos de rival: ${error.message}`);
  }

  return getRivalWeightFromRows(
    (data ?? []) as RivalWeightRow[],
    difference,
    rivalV90
  );
}

async function getPlayerPreviousV90(
  playerId: number,
  seasonId: number,
  matchDate: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("fact_player_v90_match")
    .select("v90_match, total_weight, weighted_contribution, match_id")
    .eq("player_id", playerId)
    .eq("status", "CALCULATED")
    .eq("active", true);

  if (error) {
    throw new Error(`Error obteniendo V90 previo del jugador: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const matchIds = data.map((row) => row.match_id);
  const previousMatches = await loadMatchesByIds(matchIds, seasonId, matchDate);

  const previousMatchIds = new Set(previousMatches.map((match) => match.id));
  const validRows = data.filter((row) => previousMatchIds.has(row.match_id));

  if (validRows.length === 0) {
    return null;
  }

  const totalWeight = validRows.reduce(
    (sum, row) => sum + toNumber(row.total_weight),
    0
  );

  if (totalWeight <= 0) {
    return null;
  }

  const totalContribution = validRows.reduce(
    (sum, row) => sum + toNumber(row.weighted_contribution),
    0
  );

  return round(totalContribution / totalWeight, 3);
}

async function loadMatchesByIds(
  matchIds: number[],
  seasonId?: number,
  beforeDate?: string
): Promise<MatchRow[]> {
  if (matchIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(matchIds)];
  const results: MatchRow[] = [];

  for (const ids of chunk(uniqueIds)) {
    let query = supabase
      .from("matches")
      .select(
        `
        id,
        competition_id,
        season_id,
        stage_id,
        home_team_id,
        away_team_id,
        date,
        status,
        match_duration
        `
      )
      .in("id", ids);

    if (seasonId !== undefined) {
      query = query.eq("season_id", seasonId);
    }

    if (beforeDate !== undefined) {
      query = query.lt("date", beforeDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error obteniendo partidos anteriores: ${error.message}`);
    }

    results.push(...((data ?? []) as MatchRow[]));
  }

  return results;
}

async function getTeamPreviousV90(
  teamId: number,
  seasonId: number,
  matchId: number,
  matchDate: string
): Promise<number | null> {
  const { data: previousMatches, error } = await supabase
    .from("matches")
    .select("id, date, home_team_id, away_team_id")
    .eq("season_id", seasonId)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .lt("date", matchDate)
    .neq("id", matchId)
    .order("date", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Error obteniendo partido anterior del equipo: ${error.message}`);
  }

  if (!previousMatches || previousMatches.length === 0) {
    return null;
  }

  const previousMatch = previousMatches[0];

  const { data: previousParticipations, error: participationError } =
    await supabase
      .from("participations")
      .select("id, player_id, team_id, is_starting_xi")
      .eq("match_id", previousMatch.id)
      .eq("team_id", teamId)
      .eq("is_starting_xi", true);

  if (participationError) {
    throw new Error(`Error obteniendo XI anterior: ${participationError.message}`);
  }

  if (!previousParticipations || previousParticipations.length === 0) {
    return null;
  }

  const values: number[] = [];

  for (const participation of previousParticipations) {
    const value = await getPlayerPreviousV90(
      participation.player_id,
      seasonId,
      matchDate
    );

    if (value !== null) {
      values.push(value);
    }
  }

  if (values.length === 0) {
    return null;
  }

  return round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
    3
  );
}

async function hasPreviousTeamMatch(
  teamId: number,
  seasonId: number,
  matchDate: string,
  matchId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .eq("season_id", seasonId)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .lt("date", matchDate)
    .neq("id", matchId)
    .limit(1);

  if (error) {
    throw new Error(`Error comprobando partidos previos del equipo: ${error.message}`);
  }

  return Boolean(data && data.length > 0);
}

async function saveV90Match(
  calculation: SaveCalculation
): Promise<void> {
  const payload = {
    participation_id: calculation.participationId,
    player_id: calculation.playerId,
    match_id: calculation.matchId,
    team_id: calculation.teamId,
    rival_team_id: calculation.rivalTeamId,
    external_average: calculation.externalAverage,
    competition_weight: calculation.competitionWeight,
    rival_weight: calculation.rivalWeight,
    participation_weight: calculation.participationWeight,
    total_weight: calculation.totalWeight,
    weighted_contribution: calculation.weightedContribution,
    v90_match: calculation.v90Match,
    status: calculation.status,
    calculation_version: CALCULATION_VERSION,
    calculated_at: new Date().toISOString(),
    active: true,
  };

  const { error } = await supabase
    .from("fact_player_v90_match")
    .upsert(payload, { onConflict: "participation_id" });

  if (error) {
    throw new Error(`Error guardando cálculo V90: ${error.message}`);
  }
}

export async function calculatePlayerV90Match(
  participationId: number
): Promise<V90MatchCalculationResult> {
  try {
    const participation = await getParticipation(participationId);

    if (!participation) {
      return errorResult(participationId, "No existe la participación indicada.");
    }

    const match = await getMatch(participation.match_id);

    if (!match) {
      return errorResult(
        participationId,
        "No existe el partido asociado a la participación.",
        participation.player_id,
        participation.match_id,
        participation.team_id
      );
    }

    const rivalTeamId = getRivalTeamId(participation.team_id, match);

    if (rivalTeamId === null) {
      return errorResult(
        participationId,
        "El equipo de la participación no pertenece al partido.",
        participation.player_id,
        participation.match_id,
        participation.team_id
      );
    }

    const matchRating = await getMatchRatingByParticipation(participationId);

    if (!matchRating || matchRating.external_average === null) {
      return pendingResult(
        participationId,
        participation.player_id,
        participation.match_id,
        participation.team_id,
        rivalTeamId,
        "Pendiente: falta la media externa."
      );
    }

    const externalAverage = toNumber(matchRating.external_average);
    const competitionWeight = await getCompetitionWeight(match.competition_id);

    if (competitionWeight === null) {
      return pendingResult(
        participationId,
        participation.player_id,
        participation.match_id,
        participation.team_id,
        rivalTeamId,
        "Pendiente: la competición no tiene peso V90.",
        externalAverage
      );
    }

    const participationWeight = await getParticipationWeight(
      participation.minutes_played
    );

    if (participationWeight === null) {
      return pendingResult(
        participationId,
        participation.player_id,
        participation.match_id,
        participation.team_id,
        rivalTeamId,
        "Pendiente: no existe tramo de minutos válido.",
        externalAverage,
        competitionWeight
      );
    }

    const ownTeamV90 = await getTeamPreviousV90(
      participation.team_id,
      match.season_id,
      match.id,
      match.date
    );

    const rivalV90 = await getTeamPreviousV90(
      rivalTeamId,
      match.season_id,
      match.id,
      match.date
    );

    let rivalWeightResult: { weight: number; classification: string } | null = null;

    if (ownTeamV90 === null && rivalV90 === null) {
      rivalWeightResult = await getRivalWeight(0, 0);
    } else if (ownTeamV90 !== null && rivalV90 !== null) {
      rivalWeightResult = await getRivalWeight(
        rivalV90 - ownTeamV90,
        rivalV90
      );
    } else {
      return pendingResult(
        participationId,
        participation.player_id,
        participation.match_id,
        participation.team_id,
        rivalTeamId,
        ownTeamV90 === null
          ? "Pendiente: todavía no existe V90 previo suficiente para el equipo propio."
          : "Pendiente: todavía no existe V90 previo suficiente para el rival.",
        externalAverage,
        competitionWeight,
        participationWeight
      );
    }

    if (!rivalWeightResult) {
      return pendingResult(
        participationId,
        participation.player_id,
        participation.match_id,
        participation.team_id,
        rivalTeamId,
        "Pendiente: no existe una clasificación de rival válida.",
        externalAverage,
        competitionWeight,
        participationWeight
      );
    }

    const totalWeight =
      competitionWeight * rivalWeightResult.weight * participationWeight;

    /*
     * ============================================================
     * V90 DEL PARTIDO
     * ============================================================
     *
     * La media externa sigue siendo la nota base.
     *
     * El peso de participación NO modifica la calidad de la nota:
     * solo determina cuánto influye el partido en el V90 acumulado.
     *
     * Para el V90 histórico sí contextualizamos la actuación según:
     *   - nivel de la competición
     *   - nivel del rival
     *
     * El ajuste se realiza alrededor de 5.00 para que:
     *   - peso contextual 1.00 => V90 = media externa
     *   - peso contextual > 1.00 => amplifica la actuación respecto a 5
     *   - peso contextual < 1.00 => la acerca a 5
     *
     * Nunca se sale del rango 0-10.
     *
     * Fórmula exacta:
     *   peso_contexto = peso_competicion * peso_rival
     *   V90_partido = 5 + (media_externa - 5) * peso_contexto
     *
     * La aportación ponderada mantiene la fórmula original, por lo que
     * el V90 TOTAL no cambia.
     * ============================================================
     */
    const contextWeight =
      competitionWeight * rivalWeightResult.weight;

    const v90Match = Math.min(
      10,
      Math.max(
        0,
        5 + (externalAverage - 5) * contextWeight
      )
    );

    const weightedContribution = externalAverage * totalWeight;

    await saveV90Match({
      participationId,
      playerId: participation.player_id,
      matchId: participation.match_id,
      teamId: participation.team_id,
      rivalTeamId,
      externalAverage,
      competitionWeight,
      rivalWeight: rivalWeightResult.weight,
      participationWeight,
      totalWeight: round(totalWeight, 4),
      weightedContribution: round(weightedContribution, 4),
      v90Match: round(v90Match, 3),
      status: "CALCULATED",
    });

    return {
      success: true,
      status: "CALCULATED",
      participationId,
      playerId: participation.player_id,
      matchId: participation.match_id,
      teamId: participation.team_id,
      rivalTeamId,
      externalAverage,
      competitionWeight,
      rivalWeight: rivalWeightResult.weight,
      participationWeight,
      totalWeight: round(totalWeight, 4),
      weightedContribution: round(weightedContribution, 4),
      v90Match: round(v90Match, 3),
      rivalClassification: rivalWeightResult.classification,
      message:
        ownTeamV90 === null && rivalV90 === null
          ? "Cálculo V90 realizado correctamente. Primer partido de la temporada: rival considerado SIMILAR."
          : "Cálculo V90 realizado correctamente.",
    };
  } catch (error) {
    console.error("Error en calculatePlayerV90Match:", error);

    return errorResult(
      participationId,
      error instanceof Error
        ? error.message
        : "Error desconocido en el motor V90."
    );
  }
}

function getRivalTeamId(
  teamId: number,
  match: MatchRow
): number | null {
  if (teamId === match.home_team_id) {
    return match.away_team_id;
  }

  if (teamId === match.away_team_id) {
    return match.home_team_id;
  }

  return null;
}

function errorResult(
  participationId: number,
  message: string,
  playerId = 0,
  matchId = 0,
  teamId = 0,
  rivalTeamId = 0
): V90MatchCalculationResult {
  return {
    success: false,
    status: "ERROR",
    participationId,
    playerId,
    matchId,
    teamId,
    rivalTeamId,
    externalAverage: null,
    competitionWeight: null,
    rivalWeight: null,
    participationWeight: null,
    totalWeight: null,
    weightedContribution: null,
    v90Match: null,
    rivalClassification: null,
    message,
  };
}

function pendingResult(
  participationId: number,
  playerId: number,
  matchId: number,
  teamId: number,
  rivalTeamId: number,
  message: string,
  externalAverage: number | null = null,
  competitionWeight: number | null = null,
  participationWeight: number | null = null
): V90MatchCalculationResult {
  return {
    success: true,
    status: "PENDING",
    participationId,
    playerId,
    matchId,
    teamId,
    rivalTeamId,
    externalAverage,
    competitionWeight,
    rivalWeight: null,
    participationWeight,
    totalWeight: null,
    weightedContribution: null,
    v90Match: null,
    rivalClassification: null,
    message,
  };
}

/*
 * ============================================================
 * MOTOR POR JORNADA
 * ============================================================
 *
 * La optimización principal está aquí:
 *
 * - carga una sola vez los partidos de la temporada necesarios
 * - carga una sola vez participaciones y Match Ratings
 * - carga una sola vez los pesos
 * - carga el histórico V90 una sola vez
 * - calcula en memoria en orden cronológico
 * - hace un único upsert de los resultados calculados
 *
 * Así evitamos N x consultas por jugador.
 * ============================================================
 */

export async function calculateV90Stage(
  matchIds: number[]
): Promise<V90StageCalculationResult> {
  const startedAt = Date.now();

  try {
    const uniqueStageMatchIds = [...new Set(matchIds)];

    if (uniqueStageMatchIds.length === 0) {
      return {
        success: false,
        status: "ERROR",
        durationMs: Date.now() - startedAt,
        matches: [],
        message: "No se han recibido partidos para calcular.",
      };
    }

    /* ----------------------------------------------------------
     * 1. PARTIDOS DE LA JORNADA
     * ---------------------------------------------------------- */

    const stageMatches = await loadMatchesByIds(uniqueStageMatchIds);

    if (stageMatches.length !== uniqueStageMatchIds.length) {
      return {
        success: false,
        status: "ERROR",
        durationMs: Date.now() - startedAt,
        matches: [],
        message: "No se pudieron localizar todos los partidos seleccionados.",
      };
    }

    stageMatches.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const seasonId = stageMatches[0].season_id;

    if (stageMatches.some((match) => match.season_id !== seasonId)) {
      return {
        success: false,
        status: "ERROR",
        durationMs: Date.now() - startedAt,
        matches: [],
        message: "Los partidos seleccionados pertenecen a temporadas diferentes.",
      };
    }

    const firstStageDate = stageMatches[0].date;
    const stageCompetitionId = stageMatches[0].competition_id;
    const stageId = stageMatches[0].stage_id;

    /*
     * Determinamos si un partido pertenece al histórico disponible para
     * el cálculo de una jornada. Para la misma competición, el número de
     * jornada tiene prioridad sobre la fecha. Esto es importante porque
     * un partido aplazado puede tener una fecha posterior a la jornada que
     * estamos calculando. Para otras competiciones usamos la fecha real.
     */
    const isBeforeStage = (match: MatchRow): boolean => {
      if (match.season_id !== seasonId) {
        return false;
      }

      if (match.competition_id === stageCompetitionId) {
        if (match.stage_id < stageId) {
          return true;
        }

        if (match.stage_id > stageId) {
          return false;
        }

        return new Date(match.date).getTime() <
          new Date(firstStageDate).getTime();
      }

      return new Date(match.date).getTime() <
        new Date(firstStageDate).getTime();
    };

    /* ----------------------------------------------------------
     * 2. CARGA MASIVA DE DATOS
     * ---------------------------------------------------------- */

    const [
      seasonMatchesData,
      competitionWeightsData,
      participationWeightsData,
      rivalWeightsData,
    ] = await Promise.all([
      supabase
        .from("matches")
        .select(
          `
          id,
          competition_id,
          season_id,
          stage_id,
          home_team_id,
          away_team_id,
          date,
          status,
          match_duration
          `
        )
        .eq("season_id", seasonId)
        .order("date", { ascending: true }),
      supabase
        .from("competition_weights")
        .select("competition_id, peso_v90, active")
        .eq("active", true),
      supabase
        .from("participation_weights")
        .select("id, min_minutes, max_minutes, peso_v90, active")
        .eq("active", true)
        .order("min_minutes", { ascending: true }),
      supabase
        .from("rival_weights")
        .select(
          "id, classification, min_difference, max_difference, peso_v90, active"
        )
        .eq("active", true)
        .order("id", { ascending: true }),
    ]);

    if (seasonMatchesData.error) {
      throw new Error(`Error cargando partidos de la temporada: ${seasonMatchesData.error.message}`);
    }

    if (competitionWeightsData.error) {
      throw new Error(`Error cargando pesos de competición: ${competitionWeightsData.error.message}`);
    }

    if (participationWeightsData.error) {
      throw new Error(`Error cargando pesos de participación: ${participationWeightsData.error.message}`);
    }

    if (rivalWeightsData.error) {
      throw new Error(`Error cargando pesos de rival: ${rivalWeightsData.error.message}`);
    }

    const seasonMatches = (seasonMatchesData.data ?? []) as MatchRow[];
    const competitionWeights = (competitionWeightsData.data ?? []) as CompetitionWeightRow[];
    const participationWeights = (participationWeightsData.data ?? []) as ParticipationWeightRow[];
    const rivalWeights = (rivalWeightsData.data ?? []) as RivalWeightRow[];

    const seasonMatchIds = seasonMatches.map((match) => match.id);

    const participations: ParticipationRow[] = [];
    const matchRatings: MatchRatingRow[] = [];
    const historicalFacts: HistoricalFactRow[] = [];

    /*
     * ----------------------------------------------------------
     * CARGA GENERAL DE LA TEMPORADA
     * ----------------------------------------------------------
     *
     * Necesitamos todos los datos de la temporada para construir el
     * histórico previo de jugadores y equipos.
     */
    for (const ids of chunk(seasonMatchIds)) {
      const [participationsResponse, ratingsResponse, factsResponse] =
        await Promise.all([
          supabase
            .from("participations")
            .select(
              `
              id,
              match_id,
              player_id,
              team_id,
              position_id,
              shirt_number,
              is_starting_xi,
              minutes_played,
              captain,
              substitute_in_minute,
              substitute_out_minute
              `
            )
            .in("match_id", ids),
          supabase
            .from("match_ratings")
            .select(
              `
              id,
              match_id,
              player_id,
              participation_id,
              external_average
              `
            )
            .in("match_id", ids),
          supabase
            .from("fact_player_v90_match")
            .select(
              `
              participation_id,
              player_id,
              match_id,
              total_weight,
              weighted_contribution,
              status,
              active
              `
            )
            .in("match_id", ids)
            .eq("status", "CALCULATED")
            .eq("active", true),
        ]);

      if (participationsResponse.error) {
        throw new Error(`Error cargando participaciones: ${participationsResponse.error.message}`);
      }

      if (ratingsResponse.error) {
        throw new Error(`Error cargando Match Ratings: ${ratingsResponse.error.message}`);
      }

      if (factsResponse.error) {
        throw new Error(`Error cargando histórico V90: ${factsResponse.error.message}`);
      }

      participations.push(...((participationsResponse.data ?? []) as ParticipationRow[]));
      matchRatings.push(...((ratingsResponse.data ?? []) as MatchRatingRow[]));
      historicalFacts.push(...((factsResponse.data ?? []) as HistoricalFactRow[]));
    }

    /*
     * ----------------------------------------------------------
     * CORRECCIÓN IMPORTANTE: DATOS DE LA JORNADA DIRECTAMENTE POR ID
     * ----------------------------------------------------------
     *
     * Aunque ya hemos cargado la temporada, para los partidos que se
     * están calculando hacemos una consulta directa usando EXACTAMENTE
     * los match_id recibidos por calculateV90Stage().
     *
     * Esto evita depender de una carga general que pueda devolver un
     * conjunto incompleto por paginación/límites de Supabase y garantiza
     * que el número de participaciones mostrado por el motor coincide
     * con el que realmente existe para cada partido de la jornada.
     *
     * Estos datos reemplazan a los datos generales de esos partidos.
     */
    const stageParticipations: ParticipationRow[] = [];
    const stageMatchRatings: MatchRatingRow[] = [];

    for (const ids of chunk(uniqueStageMatchIds)) {
      const [stageParticipationsResponse, stageRatingsResponse] =
        await Promise.all([
          supabase
            .from("participations")
            .select(
              `
              id,
              match_id,
              player_id,
              team_id,
              position_id,
              shirt_number,
              is_starting_xi,
              minutes_played,
              captain,
              substitute_in_minute,
              substitute_out_minute
              `
            )
            .in("match_id", ids),
          supabase
            .from("match_ratings")
            .select(
              `
              id,
              match_id,
              player_id,
              participation_id,
              external_average
              `
            )
            .in("match_id", ids),
        ]);

      if (stageParticipationsResponse.error) {
        throw new Error(
          `Error cargando participaciones de la jornada: ${stageParticipationsResponse.error.message}`
        );
      }

      if (stageRatingsResponse.error) {
        throw new Error(
          `Error cargando Match Ratings de la jornada: ${stageRatingsResponse.error.message}`
        );
      }

      stageParticipations.push(
        ...((stageParticipationsResponse.data ?? []) as ParticipationRow[])
      );
      stageMatchRatings.push(
        ...((stageRatingsResponse.data ?? []) as MatchRatingRow[])
      );
    }

    console.info(
      `[V90] Jornada: ${uniqueStageMatchIds.length} partidos | ` +
      `${stageParticipations.length} participaciones directas | ` +
      `${stageMatchRatings.length} Match Ratings directos`
    );

    /*
     * Sustituimos exclusivamente las participaciones y ratings de los
     * partidos de la jornada por la consulta directa anterior.
     * El resto de la temporada sigue disponible para el histórico.
     */
    const stageMatchIdSet = new Set(uniqueStageMatchIds);

    const seasonParticipationsWithoutStage = participations.filter(
      (participation) => !stageMatchIdSet.has(participation.match_id)
    );
    const seasonRatingsWithoutStage = matchRatings.filter(
      (rating) => !stageMatchIdSet.has(rating.match_id)
    );

    participations.length = 0;
    participations.push(
      ...seasonParticipationsWithoutStage,
      ...stageParticipations
    );

    matchRatings.length = 0;
    matchRatings.push(
      ...seasonRatingsWithoutStage,
      ...stageMatchRatings
    );

    /* ----------------------------------------------------------
     * 3. ÍNDICES EN MEMORIA
     * ---------------------------------------------------------- */

    const matchesById = new Map<number, MatchRow>();
    const participationsByMatch = new Map<number, ParticipationRow[]>();
    const ratingByParticipation = new Map<number, MatchRatingRow>();
    const competitionWeightById = new Map<number, number>();
    const playerAggregate = new Map<number, { weight: number; contribution: number }>();
    const teamPreviousV90 = new Map<number, number | null>();
    const teamPreviousMatch = new Map<number, MatchRow>();

    for (const match of seasonMatches) {
      matchesById.set(match.id, match);
    }

    for (const participation of participations) {
      const list = participationsByMatch.get(participation.match_id) ?? [];
      list.push(participation);
      participationsByMatch.set(participation.match_id, list);
    }

    for (const rating of matchRatings) {
      ratingByParticipation.set(rating.participation_id, rating);
    }

    for (const weight of competitionWeights) {
      competitionWeightById.set(
        weight.competition_id,
        toNumber(weight.peso_v90)
      );
    }

    /* ----------------------------------------------------------
     * 4. SEMBRAR HISTÓRICO ANTERIOR A LA JORNADA
     * ----------------------------------------------------------
     *
     * Los partidos con peso de competición 0 (por ejemplo amistosos)
     * no forman parte del histórico V90.
     * ---------------------------------------------------------- */

    const matchDateById = new Map<number, string>();

    for (const match of seasonMatches) {
      matchDateById.set(match.id, match.date);
    }

    for (const fact of historicalFacts) {
      const factDate = matchDateById.get(fact.match_id);

      const factMatch = matchesById.get(fact.match_id);
      if (!factMatch || !isBeforeStage(factMatch)) {
        continue;
      }

      const factCompetitionWeight = competitionWeightById.get(
        factMatch.competition_id
      );

      if (factCompetitionWeight === undefined || factCompetitionWeight <= 0) {
        continue;
      }

      const current = playerAggregate.get(fact.player_id) ?? {
        weight: 0,
        contribution: 0,
      };

      current.weight += toNumber(fact.total_weight);
      current.contribution += toNumber(fact.weighted_contribution);
      playerAggregate.set(fact.player_id, current);
    }

    /*
     * Último partido V90 válido de cada equipo antes de la jornada.
     *
     * Importante: no basta con localizar el último partido disputado.
     * Para usarlo como referencia debe existir histórico V90 calculado
     * para los jugadores del XI de ese partido. Los amistosos y partidos
     * sin cálculo V90 no deben bloquear las jornadas posteriores.
     */
    for (const match of seasonMatches) {
      if (!isBeforeStage(match)) {
        continue;
      }

      const competitionWeight = competitionWeightById.get(
        match.competition_id
      );

      if (competitionWeight === undefined || competitionWeight <= 0) {
        continue;
      }

      const matchParticipations = participationsByMatch.get(match.id) ?? [];

      const teamIds = [match.home_team_id, match.away_team_id];

      for (const teamId of teamIds) {
        const startingXI = matchParticipations.filter(
          (participation) =>
            participation.team_id === teamId &&
            participation.is_starting_xi
        );

        if (startingXI.length === 0) {
          continue;
        }

        const values: number[] = [];

        for (const participation of startingXI) {
          const aggregate = playerAggregate.get(participation.player_id);

          if (!aggregate || aggregate.weight <= 0) {
            continue;
          }

          values.push(
            round(aggregate.contribution / aggregate.weight, 3)
          );
        }

        /*
         * Solo consideramos que el equipo tiene V90 previo cuando
         * disponemos de al menos un jugador del XI con histórico V90.
         * Esto evita que un cambio de alineación deje todo el partido
         * pendiente innecesariamente.
         */
        if (values.length > 0) {
          const value = round(
            values.reduce((sum, current) => sum + current, 0) /
              values.length,
            3
          );

          const previousTeamMatch = teamPreviousMatch.get(teamId);

          const currentIsNewer =
            !previousTeamMatch ||
            (match.competition_id === stageCompetitionId &&
              previousTeamMatch.competition_id === stageCompetitionId
              ? match.stage_id > previousTeamMatch.stage_id ||
                (match.stage_id === previousTeamMatch.stage_id &&
                  new Date(match.date).getTime() >
                    new Date(previousTeamMatch.date).getTime())
              : new Date(match.date).getTime() >
                new Date(previousTeamMatch.date).getTime());

          if (currentIsNewer) {
            teamPreviousV90.set(teamId, value);
            teamPreviousMatch.set(teamId, match);
          }
        }
      }
    }

    /* ----------------------------------------------------------
     * 5. CALCULAR EN MEMORIA, EN ORDEN CRONOLÓGICO
     * ---------------------------------------------------------- */

    const calculations: SaveCalculation[] = [];
    const stageResults: V90StageMatchResult[] = [];

    for (const match of stageMatches) {
      const matchParticipations = participationsByMatch.get(match.id) ?? [];
      const ratingsCount = matchParticipations.reduce(
        (count, participation) =>
          count +
          (ratingByParticipation.get(participation.id)?.external_average !== null &&
          ratingByParticipation.get(participation.id)?.external_average !== undefined
            ? 1
            : 0),
        0
      );

      const participationResults: V90StageParticipationResult[] = [];
      const errorMessages: string[] = [];
      let calculated = 0;
      let pending = 0;
      let errors = 0;

      const matchCompetitionWeight = competitionWeightById.get(
        match.competition_id
      );

      if (matchCompetitionWeight === undefined) {
        pending = matchParticipations.length;

        for (const participation of matchParticipations) {
          participationResults.push({
            participationId: participation.id,
            playerId: participation.player_id,
            status: "PENDING",
            message: "Pendiente: la competición no tiene peso V90.",
          });
        }

        stageResults.push({
          matchId: match.id,
          participationCount: matchParticipations.length,
          calculated: 0,
          pending,
          errors: 0,
          ratingsCount,
          errorMessages,
          participationResults,
        });

        continue;
      }

      if (matchCompetitionWeight <= 0) {
        pending = matchParticipations.length;

        for (const participation of matchParticipations) {
          participationResults.push({
            participationId: participation.id,
            playerId: participation.player_id,
            status: "PENDING",
            message: "Pendiente: esta competición tiene peso V90 0 y no cuenta para el cálculo.",
          });
        }

        stageResults.push({
          matchId: match.id,
          participationCount: matchParticipations.length,
          calculated: 0,
          pending,
          errors: 0,
          ratingsCount,
          errorMessages,
          participationResults,
        });

        continue;
      }

      const ownTeamId = match.home_team_id;
      const rivalTeamIdForHome = match.away_team_id;

      /*
       * El V90 previo del equipo ya está resuelto en memoria a partir
       * de sus últimos datos V90 válidos. No volvemos a consultar
       * participaciones ni facts por cada jugador.
       */
      const getTeamPreviousV90FromMemory = (
        teamId: number
      ): number | null => {
        return teamPreviousV90.get(teamId) ?? null;
      };

      for (const participation of matchParticipations) {
        try {
          const rating = ratingByParticipation.get(participation.id);

          if (!rating || rating.external_average === null) {
            pending += 1;
            participationResults.push({
              participationId: participation.id,
              playerId: participation.player_id,
              status: "PENDING",
              message: "Pendiente: falta la media externa.",
            });
            continue;
          }

          const externalAverage = toNumber(rating.external_average);
          const competitionWeight = competitionWeightById.get(
            match.competition_id
          );

          if (competitionWeight === undefined) {
            pending += 1;
            participationResults.push({
              participationId: participation.id,
              playerId: participation.player_id,
              status: "PENDING",
              message: "Pendiente: la competición no tiene peso V90.",
            });
            continue;
          }

          const participationWeight = getParticipationWeightFromRows(
            participationWeights,
            participation.minutes_played
          );

          if (participationWeight === null) {
            pending += 1;
            participationResults.push({
              participationId: participation.id,
              playerId: participation.player_id,
              status: "PENDING",
              message: "Pendiente: no existe tramo de minutos válido.",
            });
            continue;
          }

          const rivalTeamId =
            participation.team_id === ownTeamId
              ? rivalTeamIdForHome
              : participation.team_id === match.away_team_id
                ? match.home_team_id
                : null;

          if (rivalTeamId === null) {
            errors += 1;
            const message =
              "El equipo de la participación no pertenece al partido.";
            participationResults.push({
              participationId: participation.id,
              playerId: participation.player_id,
              status: "ERROR",
              message,
            });
            errorMessages.push(
              `participación #${participation.id}: ${message}`
            );
            continue;
          }

          const ownTeamV90 = getTeamPreviousV90FromMemory(participation.team_id);
          const rivalV90 = getTeamPreviousV90FromMemory(rivalTeamId);

          let rivalWeightResult: {
            weight: number;
            classification: string;
          } | null;

          if (ownTeamV90 === null && rivalV90 === null) {
            rivalWeightResult = getRivalWeightFromRows(
              rivalWeights,
              0,
              0
            );
          } else if (ownTeamV90 !== null && rivalV90 !== null) {
            rivalWeightResult = getRivalWeightFromRows(
              rivalWeights,
              rivalV90 - ownTeamV90,
              rivalV90
            );
          } else {
            pending += 1;
            participationResults.push({
              participationId: participation.id,
              playerId: participation.player_id,
              status: "PENDING",
              message:
                ownTeamV90 === null
                  ? "Pendiente: todavía no existe V90 previo suficiente para el equipo propio."
                  : "Pendiente: todavía no existe V90 previo suficiente para el rival.",
            });
            continue;
          }

          if (!rivalWeightResult) {
            pending += 1;
            participationResults.push({
              participationId: participation.id,
              playerId: participation.player_id,
              status: "PENDING",
              message: "Pendiente: no existe una clasificación de rival válida.",
            });
            continue;
          }

          const totalWeight =
            competitionWeight *
            rivalWeightResult.weight *
            participationWeight;

          /*
           * V90 histórico del partido.
           *
           * La participación afecta únicamente al peso del partido en
           * el acumulado. No altera la nota contextual del partido.
           *
           * Fórmula:
           *   contexto = competición × rival
           *   V90 = 5 + (media externa - 5) × contexto
           *
           * Se limita al rango 0-10.
           */
          const contextWeight =
            competitionWeight * rivalWeightResult.weight;

          const v90Match = Math.min(
            10,
            Math.max(
              0,
              5 + (externalAverage - 5) * contextWeight
            )
          );

          const weightedContribution =
            externalAverage * totalWeight;

          calculations.push({
            participationId: participation.id,
            playerId: participation.player_id,
            matchId: match.id,
            teamId: participation.team_id,
            rivalTeamId,
            externalAverage,
            competitionWeight,
            rivalWeight: rivalWeightResult.weight,
            participationWeight,
            totalWeight: round(totalWeight, 4),
            weightedContribution: round(weightedContribution, 4),
            v90Match: round(v90Match, 3),
            status: "CALCULATED",
          });

          /*
           * Muy importante: el resultado de este partido pasa a estar
           * disponible inmediatamente para los siguientes partidos de
           * la jornada. Esto permite calcular correctamente jornadas
           * cuyos partidos se disputan en fechas diferentes.
           */
          const aggregate = playerAggregate.get(participation.player_id) ?? {
            weight: 0,
            contribution: 0,
          };

          aggregate.weight += totalWeight;
          aggregate.contribution += weightedContribution;
          playerAggregate.set(participation.player_id, aggregate);

          calculated += 1;
          participationResults.push({
            participationId: participation.id,
            playerId: participation.player_id,
            status: "CALCULATED",
            message:
              ownTeamV90 === null && rivalV90 === null
                ? "Calculado. Primer partido de la temporada: rival considerado SIMILAR."
                : "Calculado correctamente.",
          });
        } catch (error) {
          errors += 1;

          const message =
            error instanceof Error
              ? error.message
              : "Error desconocido durante el cálculo.";

          participationResults.push({
            participationId: participation.id,
            playerId: participation.player_id,
            status: "ERROR",
            message,
          });

          errorMessages.push(
            `participación #${participation.id}: ${message}`
          );
        }
      }

      /*
       * El V90 de los equipos de este partido queda disponible para el
       * siguiente partido cronológico. Lo calculamos con el XI de este
       * partido y los acumulados de jugador que acabamos de actualizar.
       */
      for (const teamId of [match.home_team_id, match.away_team_id]) {
        const startingXI = matchParticipations.filter(
          (participation) =>
            participation.team_id === teamId &&
            participation.is_starting_xi
        );

        const values: number[] = [];

        for (const participation of startingXI) {
          const aggregate = playerAggregate.get(participation.player_id);

          if (!aggregate || aggregate.weight <= 0) {
            continue;
          }

          values.push(
            round(aggregate.contribution / aggregate.weight, 3)
          );
        }

        if (values.length > 0) {
          teamPreviousV90.set(
            teamId,
            round(
              values.reduce((sum, current) => sum + current, 0) /
                values.length,
              3
            )
          );
          teamPreviousMatch.set(teamId, match);
        }
      }

      stageResults.push({
        matchId: match.id,
        participationCount: matchParticipations.length,
        calculated,
        pending,
        errors,
        ratingsCount,
        errorMessages,
        participationResults,
      });
    }

    /* ----------------------------------------------------------
     * 6. GUARDAR / SOBRESCRIBIR RESULTADOS
     * ----------------------------------------------------------
     *
     * No eliminamos ni desactivamos previamente el cálculo existente.
     * Cada resultado calculado utiliza participation_id como clave de
     * conflicto, por lo que Supabase actualiza la fila existente.
     *
     * Esto hace que recalcular una jornada sea idempotente:
     * - no crea duplicados
     * - conserva el mismo registro
     * - sustituye los pesos y la aportación anteriores
     * - actualiza calculated_at y la versión del motor
     *
     * Si una participación queda PENDING, no se destruye un cálculo
     * válido anterior hasta que exista un nuevo cálculo CALCULATED.
     * ---------------------------------------------------------- */

    for (const calculationsChunk of chunk(calculations)) {
      if (calculationsChunk.length === 0) {
        continue;
      }

      const payload = calculationsChunk.map((calculation) => ({
        participation_id: calculation.participationId,
        player_id: calculation.playerId,
        match_id: calculation.matchId,
        team_id: calculation.teamId,
        rival_team_id: calculation.rivalTeamId,
        external_average: calculation.externalAverage,
        competition_weight: calculation.competitionWeight,
        rival_weight: calculation.rivalWeight,
        participation_weight: calculation.participationWeight,
        total_weight: calculation.totalWeight,
        weighted_contribution: calculation.weightedContribution,
        v90_match: calculation.v90Match,
        status: calculation.status,
        calculation_version: CALCULATION_VERSION,
        calculated_at: new Date().toISOString(),
        active: true,
      }));

      const { error } = await supabase
        .from("fact_player_v90_match")
        .upsert(payload, { onConflict: "participation_id" });

      if (error) {
        throw new Error(`Error guardando lote de cálculos V90: ${error.message}`);
      }
    }

    const hasErrors = stageResults.some((result) => result.errors > 0);
    const hasPending = stageResults.some((result) => result.pending > 0);

    return {
      success: !hasErrors,
      status: hasErrors
        ? "ERROR"
        : hasPending
          ? "PENDING"
          : "CALCULATED",
      durationMs: Date.now() - startedAt,
      matches: stageResults,
      message: hasErrors
        ? "La jornada se ha procesado, pero existen errores que deben revisarse."
        : hasPending
          ? "La jornada se ha procesado y quedan datos pendientes."
          : "La jornada V90 se ha calculado correctamente.",
    };
  } catch (error) {
    console.error("Error calculando jornada V90:", error);

    return {
      success: false,
      status: "ERROR",
      durationMs: Date.now() - startedAt,
      matches: [],
      message:
        error instanceof Error
          ? error.message
          : "Error desconocido durante el cálculo de la jornada V90.",
    };
  }
}

export async function recalculatePlayerV90Match(
  participationId: number
): Promise<V90MatchCalculationResult> {
  return calculatePlayerV90Match(participationId);
}
