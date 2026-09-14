import { supabase } from "@/lib/supabase";

export interface PlayerV90MatchFact {
  id: number;
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
  calculationVersion: string;
  calculatedAt: string;
  active: boolean;
}

interface PlayerV90MatchFactRow {
  id: number;
  participation_id: number;
  player_id: number;
  match_id: number;
  team_id: number;
  rival_team_id: number;
  external_average: number;
  competition_weight: number;
  rival_weight: number;
  participation_weight: number;
  total_weight: number;
  weighted_contribution: number;
  v90_match: number;
  status: "CALCULATED" | "PENDING" | "ERROR";
  calculation_version: string;
  calculated_at: string;
  active: boolean;
}

function mapFact(row: PlayerV90MatchFactRow): PlayerV90MatchFact {
  return {
    id: Number(row.id),
    participationId: Number(row.participation_id),
    playerId: Number(row.player_id),
    matchId: Number(row.match_id),
    teamId: Number(row.team_id),
    rivalTeamId: Number(row.rival_team_id),
    externalAverage: Number(row.external_average),
    competitionWeight: Number(row.competition_weight),
    rivalWeight: Number(row.rival_weight),
    participationWeight: Number(row.participation_weight),
    totalWeight: Number(row.total_weight),
    weightedContribution: Number(row.weighted_contribution),
    v90Match: Number(row.v90_match),
    status: row.status,
    calculationVersion: row.calculation_version,
    calculatedAt: row.calculated_at,
    active: Boolean(row.active),
  };
}

export interface PlayerV90MatchSummary {
  total: number;
  calculated: number;
  pending: number;
  errors: number;
  v90MatchAverage: number | null;
  playerV90Average: number | null;
}

/**
 * Obtiene todos los resultados V90 de partido activos y CALCULATED.
 *
 * Se pagina para no depender del límite por defecto de Supabase.
 * Esta función se utiliza en Ranking y en otras vistas que necesitan
 * el detalle completo de cada FACT.
 */
export async function getPlayerV90MatchFacts(): Promise<PlayerV90MatchFact[]> {
  const pageSize = 1000;
  const facts: PlayerV90MatchFact[] = [];
  let from = 0;
  let page = 0;
  const maxPages = 1000;

  while (page < maxPages) {
    const { data, error } = await supabase
      .from("fact_player_v90_match")
      .select(
        `
        id,
        participation_id,
        player_id,
        match_id,
        team_id,
        rival_team_id,
        external_average,
        competition_weight,
        rival_weight,
        participation_weight,
        total_weight,
        weighted_contribution,
        v90_match,
        status,
        calculation_version,
        calculated_at,
        active
        `
      )
      .eq("active", true)
      .eq("status", "CALCULATED")
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Error obteniendo datos V90: ${error.message}`);
    }

    const rows = (data ?? []) as PlayerV90MatchFactRow[];

    if (rows.length === 0) {
      break;
    }

    facts.push(...rows.map(mapFact));

    if (rows.length < pageSize) {
      break;
    }

    from += pageSize;
    page += 1;
  }

  if (page >= maxPages) {
    throw new Error(
      "La lectura de datos V90 superó el límite de seguridad de paginación."
    );
  }

  return facts;
}

/**
 * Obtiene únicamente los datos necesarios para las tarjetas de Datos V90.
 *
 * IMPORTANTE:
 * No carga todas las columnas del FACT ni realiza cuatro consultas HEAD
 * independientes. Hace una lectura paginada de los registros activos y
 * calcula los contadores y medias en memoria.
 */
export async function getPlayerV90MatchSummary(): Promise<PlayerV90MatchSummary> {
  const pageSize = 1000;
  let from = 0;
  let page = 0;
  const maxPages = 1000;

  let total = 0;
  let calculated = 0;
  let pending = 0;
  let errors = 0;

  let v90MatchSum = 0;
  let v90MatchCount = 0;

  const playerAggregates = new Map<
    number,
    { contribution: number; weight: number }
  >();

  while (page < maxPages) {
    const { data, error } = await supabase
      .from("fact_player_v90_match")
      .select(
        `
        player_id,
        weighted_contribution,
        total_weight,
        v90_match,
        status
        `
      )
      .eq("active", true)
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Error obteniendo resumen V90: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{
      player_id: number;
      weighted_contribution: number | null;
      total_weight: number | null;
      v90_match: number | null;
      status: "CALCULATED" | "PENDING" | "ERROR";
    }>;

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      total += 1;

      if (row.status === "CALCULATED") {
        calculated += 1;

        const v90Match = Number(row.v90_match);
        if (Number.isFinite(v90Match)) {
          v90MatchSum += v90Match;
          v90MatchCount += 1;
        }

        const contribution = Number(row.weighted_contribution);
        const weight = Number(row.total_weight);

        if (
          Number.isFinite(contribution) &&
          Number.isFinite(weight) &&
          weight > 0
        ) {
          const playerId = Number(row.player_id);
          const current = playerAggregates.get(playerId) ?? {
            contribution: 0,
            weight: 0,
          };

          current.contribution += contribution;
          current.weight += weight;
          playerAggregates.set(playerId, current);
        }
      } else if (row.status === "PENDING") {
        pending += 1;
      } else if (row.status === "ERROR") {
        errors += 1;
      }
    }

    if (rows.length < pageSize) {
      break;
    }

    from += pageSize;
    page += 1;
  }

  if (page >= maxPages) {
    throw new Error(
      "La lectura del resumen V90 superó el límite de seguridad de paginación."
    );
  }

  const v90MatchAverage =
    v90MatchCount > 0 ? v90MatchSum / v90MatchCount : null;

  const playerV90Values = Array.from(playerAggregates.values())
    .filter((value) => value.weight > 0)
    .map((value) => value.contribution / value.weight);

  const playerV90Average =
    playerV90Values.length > 0
      ? playerV90Values.reduce((sum, value) => sum + value, 0) /
        playerV90Values.length
      : null;

  return {
    total,
    calculated,
    pending,
    errors,
    v90MatchAverage,
    playerV90Average,
  };
}
