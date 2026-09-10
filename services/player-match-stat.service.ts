import { supabase } from "@/lib/supabase";

import type { PlayerMatchStat } from "@/types/player-match-stat";

export type { PlayerMatchStat } from "@/types/player-match-stat";

/*
 * ============================================================
 * CAMPOS ESTADÍSTICOS
 * ============================================================
 */

const STAT_FIELDS = [
  "goals",
  "shots",
  "shotsOnTarget",
  "dribbles",
  "dribblesCompleted",
  "assists",
  "duels",
  "duelsWon",
  "clearances",
  "saves",
  "tackles",
  "recoveries",
  "passes",
  "passesCompleted",
  "errorsLeadingToGoal",
  "yellowCards",
  "redCards",
] as const;

/*
 * ============================================================
 * CONVERTIR SUPABASE -> FRONTEND
 * ============================================================
 */

function mapPlayerMatchStat(
  stat: any
): PlayerMatchStat {
  return {
    id: stat.id,

    participationId:
      stat.participation_id,

    /*
     * ========================================================
     * OFENSIVAS
     * ========================================================
     */

    goals:
      stat.goals,

    shots:
      stat.shots,

    shotsOnTarget:
      stat.shots_on_target,

    dribbles:
      stat.dribbles,

    dribblesCompleted:
      stat.dribbles_completed,

    assists:
      stat.assists,

    /*
     * ========================================================
     * DEFENSIVAS
     * ========================================================
     */

    duels:
      stat.duels,

    duelsWon:
      stat.duels_won,

    clearances:
      stat.clearances,

    saves:
      stat.saves,

    tackles:
      stat.tackles,

    recoveries:
      stat.recoveries,

    /*
     * ========================================================
     * DISTRIBUCIÓN
     * ========================================================
     */

    passes:
      stat.passes,

    passesCompleted:
      stat.passes_completed,

    /*
     * IMPORTANTE:
     *
     * La columna real de Supabase es:
     * goal_errors
     *
     * En frontend se llama:
     * errorsLeadingToGoal
     */

    errorsLeadingToGoal:
      stat.goal_errors,

    yellowCards:
      stat.yellow_cards,

    redCards:
      stat.red_cards,
  };
}

/*
 * ============================================================
 * CONVERTIR FRONTEND -> SUPABASE
 * ============================================================
 */

function mapPlayerMatchStatToDatabase(
  stat: Omit<PlayerMatchStat, "id">
) {
  return {
    participation_id:
      stat.participationId,

    /*
     * ========================================================
     * OFENSIVAS
     * ========================================================
     */

    goals:
      stat.goals,

    shots:
      stat.shots,

    shots_on_target:
      stat.shotsOnTarget,

    dribbles:
      stat.dribbles,

    dribbles_completed:
      stat.dribblesCompleted,

    assists:
      stat.assists,

    /*
     * ========================================================
     * DEFENSIVAS
     * ========================================================
     */

    duels:
      stat.duels,

    duels_won:
      stat.duelsWon,

    clearances:
      stat.clearances,

    saves:
      stat.saves,

    tackles:
      stat.tackles,

    recoveries:
      stat.recoveries,

    /*
     * ========================================================
     * DISTRIBUCIÓN
     * ========================================================
     */

    passes:
      stat.passes,

    passes_completed:
      stat.passesCompleted,

    /*
     * IMPORTANTE:
     *
     * Frontend:
     * errorsLeadingToGoal
     *
     * Supabase:
     * goal_errors
     */

    goal_errors:
      stat.errorsLeadingToGoal,

    yellow_cards:
      stat.yellowCards,

    red_cards:
      stat.redCards,
  };
}

/*
 * ============================================================
 * VALIDAR ESTADÍSTICA
 * ============================================================
 */

function validatePlayerMatchStat(
  stat: Omit<PlayerMatchStat, "id">
) {
  /*
   * ==========================================================
   * PARTICIPACIÓN
   * ==========================================================
   */

  if (!stat.participationId) {
    throw new Error(
      "La estadística debe tener una participación."
    );
  }

  /*
   * ==========================================================
   * VALORES ESTADÍSTICOS
   * ==========================================================
   */

  for (const field of STAT_FIELDS) {
    const value = stat[field];

    /*
     * Permitimos null porque una estadística
     * puede no estar disponible.
     */

    if (
      value !== null &&
      value !== undefined
    ) {
      if (
        !Number.isInteger(value) ||
        value < 0
      ) {
        throw new Error(
          `El valor de ${field} debe ser un número entero igual o superior a 0.`
        );
      }
    }
  }
}

/*
 * ============================================================
 * OBTENER TODAS LAS ESTADÍSTICAS
 * ============================================================
 */

export async function getPlayerMatchStats(): Promise<
  PlayerMatchStat[]
> {
  /*
   * Supabase/PostgREST limita las consultas a 1000 registros
   * por defecto. Como esta tabla crecerá rápidamente,
   * recuperamos todos los registros en bloques de 1000.
   */

  const PAGE_SIZE = 1000;
  let from = 0;
  const allStats: PlayerMatchStat[] = [];

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } =
      await supabase
        .from("player_match_stats")
        .select("*")
        .order("id", {
          ascending: true,
        })
        .range(from, to);

    if (error) {
      console.error(
        "Error obteniendo estadísticas de jugadores:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      throw error;
    }

    const page = (data ?? []).map(
      mapPlayerMatchStat
    );

    allStats.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allStats;
}

/*
 * ============================================================
 * OBTENER ESTADÍSTICAS DE UNA PARTICIPACIÓN
 * ============================================================
 */

export async function getPlayerMatchStatsByParticipation(
  participationId: number
): Promise<PlayerMatchStat | null> {
  const { data, error } =
    await supabase
      .from("player_match_stats")
      .select("*")
      .eq(
        "participation_id",
        participationId
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Error obteniendo estadísticas de la participación:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPlayerMatchStat(data);
}

/*
 * ============================================================
 * CREAR UNA ESTADÍSTICA
 * ============================================================
 */

export async function addPlayerMatchStat(
  playerMatchStat: Omit<
    PlayerMatchStat,
    "id"
  >
): Promise<PlayerMatchStat> {
  validatePlayerMatchStat(
    playerMatchStat
  );

  const { data, error } =
    await supabase
      .from("player_match_stats")
      .insert(
        mapPlayerMatchStatToDatabase(
          playerMatchStat
        )
      )
      .select()
      .single();

  if (error) {
    console.error(
      "Error creando estadísticas de jugador:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;
  }

  return mapPlayerMatchStat(data);
}

/*
 * ============================================================
 * CREAR VARIAS ESTADÍSTICAS
 * ============================================================
 */

export async function addPlayerMatchStatsBulk(
  stats: Omit<
    PlayerMatchStat,
    "id"
  >[]
): Promise<PlayerMatchStat[]> {
  /*
   * ==========================================================
   * LOTE VACÍO
   * ==========================================================
   */

  if (stats.length === 0) {
    return [];
  }

  /*
   * ==========================================================
   * VALIDAR TODO EL LOTE
   * ==========================================================
   */

  for (const stat of stats) {
    validatePlayerMatchStat(stat);
  }

  /*
   * ==========================================================
   * COMPROBAR PARTICIPACIONES DUPLICADAS
   * ==========================================================
   */

  const batchParticipationIds =
    new Set<number>();

  for (const stat of stats) {
    if (
      batchParticipationIds.has(
        stat.participationId
      )
    ) {
      throw new Error(
        `La participación ${stat.participationId} aparece más de una vez en el lote.`
      );
    }

    batchParticipationIds.add(
      stat.participationId
    );
  }

  /*
   * ==========================================================
   * COMPROBAR REGISTROS EXISTENTES
   * ==========================================================
   */

  const participationIds =
    Array.from(
      batchParticipationIds
    );

  const {
    data: existingStats,
    error: existingError,
  } = await supabase
    .from("player_match_stats")
    .select("participation_id")
    .in(
      "participation_id",
      participationIds
    );

  if (existingError) {
    console.error(
      "Error comprobando estadísticas existentes:",
      JSON.stringify(
        existingError,
        null,
        2
      )
    );

    throw existingError;
  }

  /*
   * ==========================================================
   * DETECTAR DUPLICADOS
   * ==========================================================
   */

  if (
    existingStats &&
    existingStats.length > 0
  ) {
    const duplicatedIds =
      existingStats.map(
        (item) =>
          item.participation_id
      );

    throw new Error(
      `Ya existen estadísticas para las participaciones: ${duplicatedIds.join(
        ", "
      )}.`
    );
  }

  /*
   * ==========================================================
   * PREPARAR INSERT
   * ==========================================================
   */

  const rows = stats.map(
    mapPlayerMatchStatToDatabase
  );

  /*
   * ==========================================================
   * INSERTAR LOTE
   * ==========================================================
   */

  const { data, error } =
    await supabase
      .from("player_match_stats")
      .insert(rows)
      .select();

  if (error) {
    console.error(
      "Error creando estadísticas en lote:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;
  }

  /*
   * ==========================================================
   * DEVOLVER RESULTADO
   * ==========================================================
   */

  return (data ?? []).map(
    mapPlayerMatchStat
  );
}

/*
 * ============================================================
 * ACTUALIZAR
 * ============================================================
 */

export async function updatePlayerMatchStat(
  id: number,
  changes: Omit<
    PlayerMatchStat,
    "id"
  >
): Promise<
  PlayerMatchStat | undefined
> {
  /*
   * ==========================================================
   * VALIDACIÓN
   * ==========================================================
   */

  validatePlayerMatchStat(
    changes
  );

  /*
   * ==========================================================
   * ACTUALIZAR EN SUPABASE
   * ==========================================================
   */

  const { data, error } =
    await supabase
      .from("player_match_stats")
      .update(
        mapPlayerMatchStatToDatabase(
          changes
        )
      )
      .eq("id", id)
      .select()
      .single();

  if (error) {
    console.error(
      "Error actualizando estadísticas de jugador:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;
  }

  if (!data) {
    return undefined;
  }

  return mapPlayerMatchStat(data);
}

/*
 * ============================================================
 * ELIMINAR
 * ============================================================
 */

export async function deletePlayerMatchStat(
  id: number
): Promise<boolean> {
  const { error } =
    await supabase
      .from("player_match_stats")
      .delete()
      .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando estadísticas de jugador:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;
  }

  return true;
}