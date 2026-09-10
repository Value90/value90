import { supabase } from "@/lib/supabase";

import type { Season } from "@/types/season";

export type { Season } from "@/types/season";

/*
 * ============================================================
 * OBTENER TEMPORADAS
 * ============================================================
 */

export async function getSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error obteniendo temporadas:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map((season) => ({
    id: season.id,
    name: season.name,
    startDate: season.start_date,
    endDate: season.end_date,
    active: season.active,
  }));
}

/*
 * ============================================================
 * CREAR TEMPORADA
 * ============================================================
 */

export async function addSeason(
  season: Omit<Season, "id">
): Promise<Season> {
  const { data, error } = await supabase
    .from("seasons")
    .insert({
      name: season.name,
      start_date: season.startDate,
      end_date: season.endDate,
      active: season.active,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Error creando temporada:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
    active: data.active,
  };
}

/*
 * ============================================================
 * ACTUALIZAR TEMPORADA
 * ============================================================
 */

export async function updateSeason(
  id: number,
  changes: Omit<Season, "id">
): Promise<Season | undefined> {
  const { data, error } = await supabase
    .from("seasons")
    .update({
      name: changes.name,
      start_date: changes.startDate,
      end_date: changes.endDate,
      active: changes.active,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(
      "Error actualizando temporada:",
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
    startDate: data.start_date,
    endDate: data.end_date,
    active: data.active,
  };
}

/*
 * ============================================================
 * ELIMINAR TEMPORADA
 * ============================================================
 */

export async function deleteSeason(
  id: number
): Promise<boolean> {
  const { error } = await supabase
    .from("seasons")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando temporada:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return true;
}