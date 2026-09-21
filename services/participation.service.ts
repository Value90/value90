
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
    matchId: participation.match_id,
    playerId: participation.player_id,
    teamId: participation.team_id,
    positionId: participation.position_id,
    shirtNumber: participation.shirt_number,
    isStartingXI: participation.is_starting_xi,
    minutesPlayed: participation.minutes_played,
    captain: participation.captain,
    substituteInMinute: participation.substitute_in_minute,
    substituteOutMinute: participation.substitute_out_minute,
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
 * CONVERTIR FRONTEND → SUPABASE
 * ============================================================
 */

function toSupabaseRow(
  participation: Omit<Participation, "id">
) {
  return {
    match_id: participation.matchId,
    player_id: participation.playerId,
    team_id: participation.teamId,
    position_id: participation.positionId,
    shirt_number: participation.shirtNumber,
    is_starting_xi: participation.isStartingXI,
    minutes_played: participation.minutesPlayed,
    captain: participation.captain,
    substitute_in_minute: participation.substituteInMinute,
    substitute_out_minute: participation.substituteOutMinute,
  };
}

/*
 * ============================================================
 * OBTENER TODAS LAS PARTICIPACIONES
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

    const page = (data ?? []).map(mapParticipation);

    allParticipations.push(...page);

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

  return (data ?? []).map(mapParticipation);
}

/*
 * ============================================================
 * CREAR O ACTUALIZAR UNA PARTICIPACIÓN
 *
 * Si ya existe una participación con la combinación
 * match_id + player_id, se actualiza.
 *
 * Si no existe, se crea una nueva.
 * ============================================================
 */

export async function addParticipation(
  participation: Omit<Participation, "id">
): Promise<Participation> {
  const row = toSupabaseRow(participation);

  const { data, error } = await supabase
    .from("participations")
    .upsert(row, {
      onConflict: "match_id,player_id",
    })
    .select(participationSelect)
    .single();

  if (error) {
    console.error(
      "Error creando o actualizando participación:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return mapParticipation(data);
}

/*
 * ============================================================
 * CREAR O ACTUALIZAR VARIAS PARTICIPACIONES
 *
 * Evita errores de duplicidad cuando alguna participación
 * ya existe en la base de datos.
 * ============================================================
 */

export async function addParticipations(
  participations: Omit<Participation, "id">[]
): Promise<Participation[]> {
  if (participations.length === 0) {
    return [];
  }

  /*
   * Evitar duplicados dentro de la propia petición.
   *
   * Si el mismo jugador aparece varias veces para el mismo
   * partido, conservamos la última aparición.
   */

  const uniqueParticipations = new Map<
    string,
    Omit<Participation, "id">
  >();

  for (const participation of participations) {
    const key = `${participation.matchId}-${participation.playerId}`;

    uniqueParticipations.set(key, participation);
  }

  const rows = Array.from(uniqueParticipations.values()).map(
    toSupabaseRow
  );

  const { data, error } = await supabase
    .from("participations")
    .upsert(rows, {
      onConflict: "match_id,player_id",
    })
    .select(participationSelect);

  if (error) {
    console.error(
      "Error creando o actualizando participaciones:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map(mapParticipation);
}

/*
 * ============================================================
 * ACTUALIZAR PARTICIPACIÓN POR ID
 * ============================================================
 */

export async function updateParticipation(
  id: number,
  changes: Omit<Participation, "id">
): Promise<Participation | undefined> {
  const { data, error } = await supabase
    .from("participations")
    .update(toSupabaseRow(changes))
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