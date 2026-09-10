import { supabase } from "@/lib/supabase";

/*
 * ============================================================
 * STAGE
 * ============================================================
 */

export interface Stage {
  id: number;
  seasonId: number;
  name: string;
  displayOrder: number;
  active: boolean;
}

/*
 * ============================================================
 * GET STAGES
 * ============================================================
 *
 * Obtiene todas las jornadas / fases desde Supabase.
 *
 * Tabla:
 *
 * public.stages
 *
 * Orden:
 *
 * season_id
 * display_order
 * ============================================================
 */

export async function getStages(): Promise<Stage[]> {
  const { data, error } = await supabase
    .from("stages")
    .select(
      `
        id,
        season_id,
        name,
        display_order,
        active
      `
    )
    .order("season_id", {
      ascending: true,
    })
    .order("display_order", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error obteniendo jornadas / fases:",
      error
    );

    throw error;
  }

  return (data ?? []).map((stage) => ({
    id: stage.id,
    seasonId: stage.season_id,
    name: stage.name,
    displayOrder: stage.display_order,
    active: stage.active,
  }));
}

/*
 * ============================================================
 * ADD STAGE
 * ============================================================
 */

export async function addStage(
  stage: Omit<Stage, "id">
): Promise<Stage> {
  const { data, error } = await supabase
    .from("stages")
    .insert({
      season_id: stage.seasonId,
      name: stage.name,
      display_order: stage.displayOrder,
      active: stage.active,
    })
    .select(
      `
        id,
        season_id,
        name,
        display_order,
        active
      `
    )
    .single();

  if (error) {
    console.error(
      "Error creando jornada / fase:",
      error
    );

    throw error;
  }

  return {
    id: data.id,
    seasonId: data.season_id,
    name: data.name,
    displayOrder: data.display_order,
    active: data.active,
  };
}

/*
 * ============================================================
 * UPDATE STAGE
 * ============================================================
 */

export async function updateStage(
  id: number,
  changes: Omit<Stage, "id">
): Promise<Stage> {
  const { data, error } = await supabase
    .from("stages")
    .update({
      season_id: changes.seasonId,
      name: changes.name,
      display_order: changes.displayOrder,
      active: changes.active,
    })
    .eq("id", id)
    .select(
      `
        id,
        season_id,
        name,
        display_order,
        active
      `
    )
    .single();

  if (error) {
    console.error(
      "Error actualizando jornada / fase:",
      error
    );

    throw error;
  }

  return {
    id: data.id,
    seasonId: data.season_id,
    name: data.name,
    displayOrder: data.display_order,
    active: data.active,
  };
}

/*
 * ============================================================
 * DELETE STAGE
 * ============================================================
 */

export async function deleteStage(
  id: number
): Promise<void> {
  const { error } = await supabase
    .from("stages")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando jornada / fase:",
      error
    );

    throw error;
  }
}