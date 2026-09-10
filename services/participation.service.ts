import { supabase } from "@/lib/supabase";

import type { Participation } from "@/types/participation";

export type { Participation } from "@/types/participation";

/*
 * ============================================================
 * MAPEAR SUPABASE → FRONTEND
 * ============================================================
 */

function mapParticipation(
  participation: any
): Participation {
  return {
    id: participation.id,

    matchId:
      participation.match_id,

    playerId:
      participation.player_id,

    teamId:
      participation.team_id,

    positionId:
      participation.position_id,

    shirtNumber:
      participation.shirt_number,

    isStartingXI:
      participation.is_starting_xi,

    minutesPlayed:
      participation.minutes_played,

    captain:
      participation.captain,

    substituteInMinute:
      participation.substitute_in_minute,

    substituteOutMinute:
      participation.substitute_out_minute,
  };
}

/*
 * ============================================================
 * CAMPOS DE PARTICIPACIÓN
 * ============================================================
 */

const participationSelect = `
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
`;

/*
 * ============================================================
 * OBTENER TODAS LAS PARTICIPACIONES
 *
 * IMPORTANTE:
 *
 * Supabase puede limitar una consulta a 1.000 registros.
 *
 * Recuperamos los datos por bloques de 1.000 hasta
 * obtener todos los registros.
 * ============================================================
 */

export async function getParticipations(): Promise<
  Participation[]
> {
  const PAGE_SIZE = 1000;

  const allParticipations: Participation[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("participations")
      .select(participationSelect)
      .order("id", {
        ascending: false,
      })
      .range(from, to);

    if (error) {
      console.error(
        "Error obteniendo participaciones:",
        JSON.stringify(error, null, 2)
      );

      throw error;
    }

    const page =
      (data ?? []).map(mapParticipation);

    allParticipations.push(...page);

    /*
     * Si recibimos menos de 1.000 registros,
     * hemos llegado al final.
     */

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allParticipations;
}

/*
 * ============================================================
 * OBTENER PARTICIPACIONES DE UN PARTIDO
 *
 * Esta función evita tener que cargar todas las
 * participaciones de la base de datos cuando solo
 * necesitamos trabajar con un partido concreto.
 * ============================================================
 */

export async function getParticipationsByMatchId(
  matchId: number
): Promise<Participation[]> {
  const { data, error } = await supabase
    .from("participations")
    .select(participationSelect)
    .eq("match_id", matchId)
    .order("id", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error obteniendo participaciones del partido:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map(
    mapParticipation
  );
}

/*
 * ============================================================
 * CREAR PARTICIPACIÓN
 *
 * El ID lo genera Supabase automáticamente.
 * ============================================================
 */

export async function addParticipation(
  participation: Omit<Participation, "id">
): Promise<Participation> {
  const { data, error } = await supabase
    .from("participations")
    .insert({
      match_id:
        participation.matchId,

      player_id:
        participation.playerId,

      team_id:
        participation.teamId,

      position_id:
        participation.positionId,

      shirt_number:
        participation.shirtNumber,

      is_starting_xi:
        participation.isStartingXI,

      minutes_played:
        participation.minutesPlayed,

      captain:
        participation.captain,

      substitute_in_minute:
        participation.substituteInMinute,

      substitute_out_minute:
        participation.substituteOutMinute,
    })
    .select(participationSelect)
    .single();

  if (error) {
    console.error(
      "Error creando participación:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return mapParticipation(data);
}

/*
 * ============================================================
 * CREAR VARIAS PARTICIPACIONES
 *
 * Permite añadir todos los jugadores de un equipo
 * y guardar sus participaciones de una sola vez.
 *
 * El ID de cada participación lo genera Supabase.
 * ============================================================
 */

export async function addParticipations(
  participations: Omit<Participation, "id">[]
): Promise<Participation[]> {
  /*
   * No hacemos ninguna petición si no hay
   * participaciones que guardar.
   */

  if (participations.length === 0) {
    return [];
  }

  /*
   * Convertimos nuestro modelo TypeScript
   * al modelo de Supabase.
   */

  const rows = participations.map(
    (participation) => ({
      match_id:
        participation.matchId,

      player_id:
        participation.playerId,

      team_id:
        participation.teamId,

      position_id:
        participation.positionId,

      shirt_number:
        participation.shirtNumber,

      is_starting_xi:
        participation.isStartingXI,

      minutes_played:
        participation.minutesPlayed,

      captain:
        participation.captain,

      substitute_in_minute:
        participation.substituteInMinute,

      substitute_out_minute:
        participation.substituteOutMinute,
    })
  );

  /*
   * INSERT MASIVO
   */

  const { data, error } = await supabase
    .from("participations")
    .insert(rows)
    .select(participationSelect);

  if (error) {
    console.error(
      "Error creando participaciones:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map(
    mapParticipation
  );
}

/*
 * ============================================================
 * ACTUALIZAR PARTICIPACIÓN
 * ============================================================
 */

export async function updateParticipation(
  id: number,
  changes: Omit<Participation, "id">
): Promise<Participation | undefined> {
  const { data, error } = await supabase
    .from("participations")
    .update({
      match_id:
        changes.matchId,

      player_id:
        changes.playerId,

      team_id:
        changes.teamId,

      position_id:
        changes.positionId,

      shirt_number:
        changes.shirtNumber,

      is_starting_xi:
        changes.isStartingXI,

      minutes_played:
        changes.minutesPlayed,

      captain:
        changes.captain,

      substitute_in_minute:
        changes.substituteInMinute,

      substitute_out_minute:
        changes.substituteOutMinute,
    })
    .eq("id", id)
    .select(participationSelect)
    .maybeSingle();

  if (error) {
    console.error(
      "Error actualizando participación:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  if (!data) {
    return undefined;
  }

  return mapParticipation(data);
}

/*
 * ============================================================
 * ELIMINAR PARTICIPACIÓN
 * ============================================================
 */

export async function deleteParticipation(
  id: number
): Promise<boolean> {
  const { error } = await supabase
    .from("participations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando participación:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return true;
}