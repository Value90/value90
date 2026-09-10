import { supabase } from "@/lib/supabase";

/*
 * ============================================================
 * TIPO
 * ============================================================
 */

export interface TeamCompetition {
  id: number;
  teamId: number;
  competitionId: number;
  seasonId: number;
  active: boolean;
  createdAt: string;
}

/*
 * ============================================================
 * CONVERTIR SUPABASE -> FRONTEND
 * ============================================================
 */

function mapTeamCompetition(
  row: any
): TeamCompetition {
  return {
    id: row.id,
    teamId: row.team_id,
    competitionId: row.competition_id,
    seasonId: row.season_id,
    active: row.active,
    createdAt: row.created_at,
  };
}

/*
 * ============================================================
 * OBTENER TODAS LAS RELACIONES
 * ============================================================
 */

export async function getTeamCompetitions(): Promise<
  TeamCompetition[]
> {
  const { data, error } = await supabase
    .from("hist_team_competitions")
    .select("*")
    .order("id", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error obteniendo relaciones equipo-competición:",
      error
    );

    throw new Error(
      "No se pudieron obtener las relaciones equipo-competición."
    );
  }

  return (data ?? []).map(
    mapTeamCompetition
  );
}

/*
 * ============================================================
 * OBTENER POR TEMPORADA
 * ============================================================
 */

export async function getTeamCompetitionsBySeason(
  seasonId: number
): Promise<TeamCompetition[]> {
  const { data, error } = await supabase
    .from("hist_team_competitions")
    .select("*")
    .eq("season_id", seasonId)
    .eq("active", true)
    .order("competition_id", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error obteniendo relaciones por temporada:",
      error
    );

    throw new Error(
      "No se pudieron obtener las relaciones de la temporada."
    );
  }

  return (data ?? []).map(
    mapTeamCompetition
  );
}

/*
 * ============================================================
 * OBTENER POR EQUIPO Y TEMPORADA
 * ============================================================
 */

export async function getTeamCompetitionsByTeamAndSeason(
  teamId: number,
  seasonId: number
): Promise<TeamCompetition[]> {
  const { data, error } = await supabase
    .from("hist_team_competitions")
    .select("*")
    .eq("team_id", teamId)
    .eq("season_id", seasonId)
    .eq("active", true)
    .order("competition_id", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error obteniendo competiciones del equipo:",
      error
    );

    throw new Error(
      "No se pudieron obtener las competiciones del equipo."
    );
  }

  return (data ?? []).map(
    mapTeamCompetition
  );
}

/*
 * ============================================================
 * OBTENER EQUIPOS POR COMPETICIÓN Y TEMPORADA
 * ============================================================
 */

export async function getTeamsByCompetitionAndSeason(
  competitionId: number,
  seasonId: number
): Promise<number[]> {
  const { data, error } = await supabase
    .from("hist_team_competitions")
    .select("team_id")
    .eq("competition_id", competitionId)
    .eq("season_id", seasonId)
    .eq("active", true);

  if (error) {
    console.error(
      "Error obteniendo equipos por competición y temporada:",
      error
    );

    throw new Error(
      "No se pudieron obtener los equipos de la competición."
    );
  }

  return (data ?? []).map(
    (row) => row.team_id
  );
}

/*
 * ============================================================
 * CREAR RELACIÓN
 * ============================================================
 */

export async function addTeamCompetition(
  teamId: number,
  competitionId: number,
  seasonId: number
): Promise<TeamCompetition> {
  const { data, error } = await supabase
    .from("hist_team_competitions")
    .insert({
      team_id: teamId,
      competition_id: competitionId,
      season_id: seasonId,
      active: true,
    })
    .select("*")
    .single();

  if (error) {
    console.error(
      "Error creando relación equipo-competición:",
      error
    );

    throw new Error(
      `Error creando relación equipo-competición: ${error.message}`
    );
  }

  return mapTeamCompetition(data);
}

/*
 * ============================================================
 * ELIMINAR RELACIÓN
 * ============================================================
 */

export async function deleteTeamCompetition(
  teamId: number,
  competitionId: number,
  seasonId: number
): Promise<void> {
  const { error } = await supabase
    .from("hist_team_competitions")
    .delete()
    .eq("team_id", teamId)
    .eq("competition_id", competitionId)
    .eq("season_id", seasonId);

  if (error) {
    console.error(
      "Error eliminando relación equipo-competición:",
      error
    );

    throw new Error(
      `Error eliminando relación equipo-competición: ${error.message}`
    );
  }
}

/*
 * ============================================================
 * GUARDAR VARIAS RELACIONES
 * ============================================================
 */

export async function saveTeamCompetitions(
  records: Array<{
    teamId: number;
    competitionId: number;
    seasonId: number;
    active?: boolean;
  }>
): Promise<TeamCompetition[]> {
  if (records.length === 0) {
    return [];
  }

  const databaseRecords = records.map(
    (record) => ({
      team_id: record.teamId,
      competition_id:
        record.competitionId,
      season_id: record.seasonId,
      active:
        record.active ?? true,
    })
  );

  const { data, error } = await supabase
    .from("hist_team_competitions")
    .upsert(
      databaseRecords,
      {
        onConflict:
          "team_id,competition_id,season_id",
      }
    )
    .select("*");

  if (error) {
    console.error(
      "Error guardando relaciones equipo-competición:",
      error
    );

    throw new Error(
      `Error guardando relaciones equipo-competición: ${error.message}`
    );
  }

  return (data ?? []).map(
    mapTeamCompetition
  );
}