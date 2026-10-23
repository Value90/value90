import { dedupeRequest } from "@/lib/request-dedupe";
import { supabase } from "@/lib/supabase";

import type { Team } from "@/types/team";

export type { Team } from "@/types/team";

export interface PublicTeam {
  id: number;
  name: string;
  shortName: string;
}

type NewTeam = Omit<
  Team,
  "id" | "displayOrder"
>;

/*
 * ============================================================
 * OBTENER EQUIPOS
 * ============================================================
 */

async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error obteniendo equipos:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map((team) => ({
    id: team.id,

    name: team.name,

    shortName: team.short_name,

    countryId: team.country_id,

    confederation: team.confederation,

    city: team.city,

    stadium: team.stadium,

    foundationYear: team.foundation_year == null ? null : Number(team.foundation_year),

    stadiumCapacity: team.stadium_capacity == null ? null : Number(team.stadium_capacity),

    type: team.type,

    active: team.active,

    displayOrder:
      team.display_order,

    competitionId:
      team.competition_id ?? null,
  }));
}

/*
 * ============================================================
 * CREAR EQUIPO
 * ============================================================
 *
 * El displayOrder se genera automáticamente.
 * ============================================================
 */

export async function addTeam(
  team: NewTeam
): Promise<Team> {
  /*
   * Buscamos el mayor display_order existente.
   */

  const {
    data: lastTeam,
    error: orderError,
  } = await supabase
    .from("teams")
    .select("display_order")
    .order("display_order", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    console.error(
      "Error obteniendo el orden de visualización:",
      JSON.stringify(
        orderError,
        null,
        2
      )
    );

    throw orderError;
  }

  /*
   * Si no existen equipos,
   * empezamos en 1.
   */

  const nextDisplayOrder =
    (lastTeam?.display_order ?? 0) + 1;

  const { data, error } =
    await supabase
      .from("teams")
      .insert({
        name: team.name,

        short_name:
          team.shortName,

        country_id:
          team.countryId,

        confederation:
          team.confederation,

        city: team.city,

        stadium:
          team.stadium,

        foundation_year: team.foundationYear,

        stadium_capacity: team.stadiumCapacity,

        type:
          team.type,

        active:
          team.active,

        display_order:
          nextDisplayOrder,

        competition_id:
          team.competitionId,
      })
      .select()
      .single();

  if (error) {
    console.error(
      "Error creando equipo:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;
  }

  return {
    id: data.id,

    name: data.name,

    shortName:
      data.short_name,

    countryId:
      data.country_id,

    confederation:
      data.confederation,

    city: data.city,

    stadium:
      data.stadium,

    foundationYear: data.foundation_year == null ? null : Number(data.foundation_year),

    stadiumCapacity: data.stadium_capacity == null ? null : Number(data.stadium_capacity),

    type: data.type,

    active: data.active,

    displayOrder:
      data.display_order,

    competitionId:
      data.competition_id ?? null,
  };
}

/*
 * ============================================================
 * ACTUALIZAR EQUIPO
 * ============================================================
 */

export async function updateTeam(
  id: number,
  changes: Omit<Team, "id">
): Promise<Team | undefined> {
  const { data, error } =
    await supabase
      .from("teams")
      .update({
        name:
          changes.name,

        short_name:
          changes.shortName,

        country_id:
          changes.countryId,

        confederation:
          changes.confederation,

        city:
          changes.city,

        stadium:
          changes.stadium,

        foundation_year: changes.foundationYear,

        stadium_capacity: changes.stadiumCapacity,

        type:
          changes.type,

        active:
          changes.active,

        display_order:
          changes.displayOrder,

        competition_id:
          changes.competitionId,
      })
      .eq("id", id)
      .select()
      .single();

  if (error) {
    console.error(
      "Error actualizando equipo:",
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

  return {
    id: data.id,

    name:
      data.name,

    shortName:
      data.short_name,

    countryId:
      data.country_id,

    confederation:
      data.confederation,

    city:
      data.city,

    stadium:
      data.stadium,

    foundationYear: data.foundation_year == null ? null : Number(data.foundation_year),

    stadiumCapacity: data.stadium_capacity == null ? null : Number(data.stadium_capacity),

    type:
      data.type,

    active:
      data.active,

    displayOrder:
      data.display_order,

    competitionId:
      data.competition_id ?? null,
  };
}

/*
 * ============================================================
 * ELIMINAR EQUIPO
 * ============================================================
 */

export async function deleteTeam(
  id: number
): Promise<boolean> {
  const { error } =
    await supabase
      .from("teams")
      .delete()
      .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando equipo:",
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
export function getTeams(): ReturnType<typeof fetchTeams> {
  return dedupeRequest("team.service.ts:getTeams", fetchTeams);
}

async function fetchPublicTeams(): Promise<PublicTeam[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id,name,short_name")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((team) => ({
    id: Number(team.id),
    name: team.name,
    shortName: team.short_name,
  }));
}

export function getPublicTeams(): ReturnType<typeof fetchPublicTeams> {
  return dedupeRequest("team.service.ts:getPublicTeams", fetchPublicTeams);
}
