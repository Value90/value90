import { supabase } from "@/lib/supabase";

import type { Position } from "@/types/positions";

export type { Position } from "@/types/positions";

/*
 * ============================================================
 * OBTENER POSICIONES
 * ============================================================
 */

export async function getPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("active", true)
    .order("display_order", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error obteniendo posiciones:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map((position) => ({
    id: position.id,
    name: position.name,
    shortName: position.short_name,
    displayOrder: position.display_order,
    active: position.active,
  }));
}

/*
 * ============================================================
 * CREAR POSICIÓN
 * ============================================================
 */

export async function addPosition(
  position: Omit<Position, "id">
): Promise<Position> {
  const { data, error } = await supabase
    .from("positions")
    .insert({
      name: position.name,
      short_name: position.shortName,
      display_order: position.displayOrder,
      active: position.active,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Error creando posición:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    shortName: data.short_name,
    displayOrder: data.display_order,
    active: data.active,
  };
}

/*
 * ============================================================
 * ACTUALIZAR POSICIÓN
 * ============================================================
 */

export async function updatePosition(
  id: number,
  changes: Omit<Position, "id">
): Promise<Position | undefined> {
  const { data, error } = await supabase
    .from("positions")
    .update({
      name: changes.name,
      short_name: changes.shortName,
      display_order: changes.displayOrder,
      active: changes.active,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(
      "Error actualizando posición:",
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
    displayOrder: data.display_order,
    active: data.active,
  };
}

/*
 * ============================================================
 * ELIMINAR POSICIÓN
 * ============================================================
 */

export async function deletePosition(
  id: number
): Promise<boolean> {
  const { error } = await supabase
    .from("positions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando posición:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return true;
}