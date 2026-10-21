import { dedupeRequest } from "@/lib/request-dedupe";
import { supabase } from "@/lib/supabase";

import type { Player } from "@/types/player";

export type { Player } from "@/types/player";

export interface PublicPlayer {
  id: number;
  name: string;
}

/*
 * ============================================================
 * MAPEAR SUPABASE → FRONTEND
 * ============================================================
 */

function mapPlayer(
  player: any
): Player {
  return {
    id: player.id,

    name:
      player.name,

    shortName:
      player.short_name,

    countryId:
      player.country_id,

    birthDate:
      player.birth_date,

    active:
      player.active,
  };
}

/*
 * ============================================================
 * OBTENER TODOS LOS JUGADORES
 *
 * Supabase puede limitar una consulta a 1.000 registros.
 *
 * Recuperamos los jugadores por bloques de 1.000
 * hasta obtener todos los registros.
 * ============================================================
 */

async function fetchPlayers(): Promise<Player[]> {
  const PAGE_SIZE = 1000;

  const allPlayers: Player[] = [];

  let from = 0;

  while (true) {
    const to =
      from + PAGE_SIZE - 1;

    const { data, error } =
      await supabase
        .from("players")
        .select("*")
        .order("name", {
          ascending: true,
        })
        .range(from, to);

    if (error) {
      console.error(
        "Error obteniendo jugadores:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      throw error;
    }

    const page =
      (data ?? []).map(mapPlayer);

    allPlayers.push(...page);

    /*
     * Si hemos recibido menos de 1.000
     * registros, hemos llegado al final.
     */

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allPlayers;
}

/*
 * ============================================================
 * CREAR JUGADOR
 * ============================================================
 */

export async function addPlayer(
  player: Omit<Player, "id">
): Promise<Player> {
  const { data, error } =
    await supabase
      .from("players")
      .insert({
        name:
          player.name,

        short_name:
          player.shortName,

        country_id:
          player.countryId,

        birth_date:
          player.birthDate,

        active:
          player.active,
      })
      .select()
      .single();

  if (error) {
    console.error(
      "Error creando jugador:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;
  }

  return mapPlayer(data);
}

/*
 * ============================================================
 * ACTUALIZAR JUGADOR
 * ============================================================
 */

export async function updatePlayer(
  id: number,
  changes: Omit<Player, "id">
): Promise<Player | undefined> {
  const { data, error } =
    await supabase
      .from("players")
      .update({
        name:
          changes.name,

        short_name:
          changes.shortName,

        country_id:
          changes.countryId,

        birth_date:
          changes.birthDate,

        active:
          changes.active,
      })
      .eq("id", id)
      .select()
      .maybeSingle();

  if (error) {
    console.error(
      "Error actualizando jugador:",
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

  return mapPlayer(data);
}

/*
 * ============================================================
 * ELIMINAR JUGADOR
 * ============================================================
 */

export async function deletePlayer(
  id: number
): Promise<boolean> {
  const { error } =
    await supabase
      .from("players")
      .delete()
      .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando jugador:",
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
export function getPlayers(): ReturnType<typeof fetchPlayers> {
  return dedupeRequest("player.service.ts:getPlayers", fetchPlayers);
}

async function fetchPublicPlayers(): Promise<PublicPlayer[]> {
  const pageSize = 1000;
  const players: PublicPlayer[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("players")
      .select("id,name")
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = data ?? [];
    players.push(...page.map((player) => ({
      id: Number(player.id),
      name: player.name,
    })));

    if (page.length < pageSize) break;
  }

  return players;
}

export function getPublicPlayers(): ReturnType<typeof fetchPublicPlayers> {
  return dedupeRequest("player.service.ts:getPublicPlayers", fetchPublicPlayers);
}
