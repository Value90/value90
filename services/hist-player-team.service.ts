import { supabase } from "@/lib/supabase";

import type { HistPlayerTeam } from "@/types/hist-player-team";

export type { HistPlayerTeam } from "@/types/hist-player-team";

/*
 * ============================================================
 * OBTENER TODO EL HISTORIAL
 * ============================================================
 */

export async function getHistPlayerTeams(): Promise<
  HistPlayerTeam[]
> {
  /*
   * Supabase/PostgREST limita las consultas a 1000 registros
   * por defecto.
   *
   * Recuperamos el historial en bloques de 1000 para que la
   * función siga funcionando correctamente aunque la tabla
   * crezca por encima de ese límite.
   */

  const PAGE_SIZE = 1000;
  let from = 0;

  const allHistPlayerTeams: HistPlayerTeam[] = [];

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("hist_player_teams")
      .select(`
        id,
        player_id,
        team_id,
        season_id,
        shirt_number,
        position_id,
        start_date,
        end_date,
        active
      `)
      .order("id", {
        ascending: true,
      })
      .range(from, to);

    if (error) {
      console.error(
        "Error obteniendo historial jugador/equipo:",
        JSON.stringify(error, null, 2)
      );

      throw error;
    }

    const page = (data ?? []).map((item) => ({
      id: item.id,
      playerId: item.player_id,
      teamId: item.team_id,
      seasonId: item.season_id,
      shirtNumber: item.shirt_number,
      positionId: item.position_id,
      startDate: item.start_date,
      endDate: item.end_date,
      active: item.active,
    }));

    allHistPlayerTeams.push(...page);

    /*
     * Si recibimos menos de 1000 registros, hemos llegado
     * al final de la tabla.
     */
    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allHistPlayerTeams;
}

/*
 * ============================================================
 * OBTENER JUGADORES DE UN EQUIPO EN UNA TEMPORADA
 * ============================================================
 */

export async function getHistPlayerTeamsByTeamAndSeason(
  teamId: number,
  seasonId: number
): Promise<HistPlayerTeam[]> {
  const { data, error } = await supabase
    .from("hist_player_teams")
    .select(`
      id,
      player_id,
      team_id,
      season_id,
      shirt_number,
      position_id,
      start_date,
      end_date,
      active
    `)
    .eq("team_id", teamId)
    .eq("season_id", seasonId)
    .eq("active", true)
    .order("shirt_number", {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    console.error(
      "Error obteniendo jugadores históricos:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    playerId: item.player_id,
    teamId: item.team_id,
    seasonId: item.season_id,
    shirtNumber: item.shirt_number,
    positionId: item.position_id,
    startDate: item.start_date,
    endDate: item.end_date,
    active: item.active,
  }));
}

/*
 * ============================================================
 * OBTENER HISTORIAL DE UN JUGADOR
 * ============================================================
 */

export async function getHistPlayerTeamsByPlayer(
  playerId: number
): Promise<HistPlayerTeam[]> {
  const { data, error } = await supabase
    .from("hist_player_teams")
    .select(`
      id,
      player_id,
      team_id,
      season_id,
      shirt_number,
      position_id,
      start_date,
      end_date,
      active
    `)
    .eq("player_id", playerId)
    .order("season_id", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error obteniendo historial del jugador:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    playerId: item.player_id,
    teamId: item.team_id,
    seasonId: item.season_id,
    shirtNumber: item.shirt_number,
    positionId: item.position_id,
    startDate: item.start_date,
    endDate: item.end_date,
    active: item.active,
  }));
}

/*
 * ============================================================
 * CREAR HISTORIAL INDIVIDUAL
 * ============================================================
 */

export async function addHistPlayerTeam(
  histPlayerTeam: Omit<HistPlayerTeam, "id">
): Promise<HistPlayerTeam> {
  const { data, error } = await supabase
    .from("hist_player_teams")
    .insert({
      player_id: histPlayerTeam.playerId,
      team_id: histPlayerTeam.teamId,
      season_id: histPlayerTeam.seasonId,
      shirt_number: histPlayerTeam.shirtNumber,
      position_id: histPlayerTeam.positionId,
      start_date: histPlayerTeam.startDate,
      end_date: histPlayerTeam.endDate,
      active: histPlayerTeam.active,
    })
    .select(`
      id,
      player_id,
      team_id,
      season_id,
      shirt_number,
      position_id,
      start_date,
      end_date,
      active
    `)
    .single();

  if (error) {
    console.error(
      "Error creando historial jugador/equipo:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return {
    id: data.id,
    playerId: data.player_id,
    teamId: data.team_id,
    seasonId: data.season_id,
    shirtNumber: data.shirt_number,
    positionId: data.position_id,
    startDate: data.start_date,
    endDate: data.end_date,
    active: data.active,
  };
}

/*
 * ============================================================
 * GUARDAR PLANTILLA COMPLETA
 *
 * Utiliza la restricción:
 *
 * unique (player_id, team_id, season_id)
 *
 * Si el registro ya existe, se actualiza.
 * Si no existe, se crea.
 * ============================================================
 */

export async function saveHistPlayerTeamSquad(
  records: Omit<HistPlayerTeam, "id">[]
): Promise<HistPlayerTeam[]> {
  if (records.length === 0) {
    return [];
  }

  const rows = records.map((item) => ({
    player_id: item.playerId,
    team_id: item.teamId,
    season_id: item.seasonId,
    shirt_number: item.shirtNumber,
    position_id: item.positionId,
    start_date: item.startDate,
    end_date: item.endDate,
    active: item.active,
  }));

  const { data, error } = await supabase
    .from("hist_player_teams")
    .upsert(rows, {
      onConflict: "player_id,team_id,season_id",
    })
    .select(`
      id,
      player_id,
      team_id,
      season_id,
      shirt_number,
      position_id,
      start_date,
      end_date,
      active
    `);

  if (error) {
    console.error(
      "Error guardando plantilla:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    playerId: item.player_id,
    teamId: item.team_id,
    seasonId: item.season_id,
    shirtNumber: item.shirt_number,
    positionId: item.position_id,
    startDate: item.start_date,
    endDate: item.end_date,
    active: item.active,
  }));
}

/*
 * ============================================================
 * ACTUALIZAR HISTORIAL
 * ============================================================
 */

export async function updateHistPlayerTeam(
  id: number,
  changes: Omit<HistPlayerTeam, "id">
): Promise<HistPlayerTeam | undefined> {
  const { data, error } = await supabase
    .from("hist_player_teams")
    .update({
      player_id: changes.playerId,
      team_id: changes.teamId,
      season_id: changes.seasonId,
      shirt_number: changes.shirtNumber,
      position_id: changes.positionId,
      start_date: changes.startDate,
      end_date: changes.endDate,
      active: changes.active,
    })
    .eq("id", id)
    .select(`
      id,
      player_id,
      team_id,
      season_id,
      shirt_number,
      position_id,
      start_date,
      end_date,
      active
    `)
    .single();

  if (error) {
    console.error(
      "Error actualizando historial jugador/equipo:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  if (!data) {
    return undefined;
  }

  return {
    id: data.id,
    playerId: data.player_id,
    teamId: data.team_id,
    seasonId: data.season_id,
    shirtNumber: data.shirt_number,
    positionId: data.position_id,
    startDate: data.start_date,
    endDate: data.end_date,
    active: data.active,
  };
}

/*
 * ============================================================
 * ELIMINAR HISTORIAL
 * ============================================================
 */

export async function deleteHistPlayerTeam(
  id: number
): Promise<boolean> {
  const { error } = await supabase
    .from("hist_player_teams")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando historial jugador/equipo:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return true;
}