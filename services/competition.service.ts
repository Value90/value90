import { supabase } from "@/lib/supabase";

import type { Competition } from "@/types/competition";

export type { Competition } from "@/types/competition";

/*
 * ============================================================
 * OBTENER COMPETICIONES
 * ============================================================
 */

export async function getCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .order("name", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error obteniendo competiciones:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map((competition) => ({
    id: competition.id,
    name: competition.name,
    shortName: competition.short_name,
    countryId: competition.country_id,
    competitionType: competition.competition_type,
    confederation: competition.confederation,
    active: competition.active,
  }));
}

/*
 * ============================================================
 * CREAR COMPETICIÓN
 * ============================================================
 */

export async function addCompetition(
  competition: Omit<Competition, "id">
): Promise<Competition> {
  const { data, error } = await supabase
    .from("competitions")
    .insert({
      name: competition.name,
      short_name: competition.shortName,
      country_id: competition.countryId,
      competition_type: competition.competitionType,
      confederation: competition.confederation,
      active: competition.active,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Error creando competición:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    shortName: data.short_name,
    countryId: data.country_id,
    competitionType: data.competition_type,
    confederation: data.confederation,
    active: data.active,
  };
}

/*
 * ============================================================
 * ACTUALIZAR COMPETICIÓN
 * ============================================================
 */

export async function updateCompetition(
  id: number,
  changes: Omit<Competition, "id">
): Promise<Competition | undefined> {
  const { data, error } = await supabase
    .from("competitions")
    .update({
      name: changes.name,
      short_name: changes.shortName,
      country_id: changes.countryId,
      competition_type: changes.competitionType,
      confederation: changes.confederation,
      active: changes.active,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(
      "Error actualizando competición:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  if (!data) {
    return undefined;
  }

  return {
    id: data.id,
    name: data.name,
    shortName: data.short_name,
    countryId: data.country_id,
    competitionType: data.competition_type,
    confederation: data.confederation,
    active: data.active,
  };
}

/*
 * ============================================================
 * ELIMINAR COMPETICIÓN
 * ============================================================
 */

export async function deleteCompetition(
  id: number
): Promise<boolean> {
  const { error } = await supabase
    .from("competitions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando competición:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return true;
}