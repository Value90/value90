import { supabase } from "@/lib/supabase";

import type { MatchRating } from "@/types/match-rating";

export type { MatchRating } from "@/types/match-rating";

/*
 * ============================================================
 * REDONDEAR A 3 DECIMALES
 * ============================================================
 */

function roundTo3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/*
 * ============================================================
 * CALCULAR MEDIA EXTERNA
 *
 * Marca:
 * 0 - 3
 *
 * AS:
 * 0 - 4
 *
 * SofaScore:
 * 0 - 10
 *
 * FlashScore:
 * 0 - 10
 *
 * Todas las escalas se normalizan a 0 - 10.
 * ============================================================
 */

export function calculateExternalAverage(
  marcaRating: number | null,
  asRating: number | null,
  sofascoreRating: number | null,
  flashscoreRating: number | null
): number | null {
  const values: number[] = [];

  if (marcaRating !== null) {
    values.push((marcaRating * 10) / 3);
  }

  if (asRating !== null) {
    values.push((asRating * 10) / 4);
  }

  if (sofascoreRating !== null) {
    values.push(sofascoreRating);
  }

  if (flashscoreRating !== null) {
    values.push(flashscoreRating);
  }

  if (values.length === 0) {
    return null;
  }

  const average =
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length;

  return roundTo3(average);
}

/*
 * ============================================================
 * MAPEAR SUPABASE → FRONTEND
 * ============================================================
 */

function mapMatchRating(
  rating: any
): MatchRating {
  return {
    id: rating.id,

    matchId: rating.match_id,

    playerId: rating.player_id,

    participationId:
      rating.participation_id,

    marcaRating:
      rating.marca_rating !== null
        ? Number(rating.marca_rating)
        : null,

    asRating:
      rating.as_rating !== null
        ? Number(rating.as_rating)
        : null,

    sofascoreRating:
      rating.sofascore_rating !== null
        ? Number(rating.sofascore_rating)
        : null,

    flashscoreRating:
      rating.flashscore_rating !== null
        ? Number(rating.flashscore_rating)
        : null,

    externalAverage:
      rating.external_average !== null
        ? Number(rating.external_average)
        : null,

    value90MatchRating:
      rating.value90_match_rating !== null
        ? Number(rating.value90_match_rating)
        : null,

    finalMatchRating:
      rating.final_match_rating !== null
        ? Number(rating.final_match_rating)
        : null,

    confidence:
      rating.confidence !== null
        ? Number(rating.confidence)
        : null,

    calculationVersion:
      rating.calculation_version,

    calculatedAt:
      rating.calculated_at,
  };
}

/*
 * ============================================================
 * OBTENER TODAS LAS VALORACIONES
 *
 * IMPORTANTE:
 *
 * Supabase puede limitar una consulta a 1.000 registros.
 *
 * Por eso recuperamos los datos por bloques de 1.000
 * hasta obtener todos los registros existentes.
 * ============================================================
 */

export async function getMatchRatings(): Promise<
  MatchRating[]
> {
  const PAGE_SIZE = 1000;

  const allRatings: MatchRating[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("match_ratings")
      .select("*")
      .order("id", {
        ascending: true,
      })
      .range(from, to);

    if (error) {
      console.error(
        "Error obteniendo valoraciones de partidos:",
        JSON.stringify(error, null, 2)
      );

      throw error;
    }

    const page =
      (data ?? []).map(mapMatchRating);

    allRatings.push(...page);

    /*
     * Si hemos recibido menos de 1.000 registros,
     * significa que ya hemos llegado al final.
     */

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allRatings;
}

/*
 * ============================================================
 * OBTENER VALORACIONES DE UN PARTIDO
 *
 * Esta función es especialmente útil para MatchRatingForm.
 *
 * En lugar de cargar todas las valoraciones de la base de datos,
 * podemos cargar únicamente las correspondientes al partido.
 * ============================================================
 */

export async function getMatchRatingsByMatchId(
  matchId: number
): Promise<MatchRating[]> {
  const { data, error } = await supabase
    .from("match_ratings")
    .select("*")
    .eq("match_id", matchId)
    .order("id", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error obteniendo valoraciones del partido:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return (data ?? []).map(mapMatchRating);
}

/*
 * ============================================================
 * OBTENER POR ID
 * ============================================================
 */

export async function getMatchRatingById(
  id: number
): Promise<MatchRating | undefined> {
  const { data, error } = await supabase
    .from("match_ratings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "Error obteniendo valoración:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  if (!data) {
    return undefined;
  }

  return mapMatchRating(data);
}

/*
 * ============================================================
 * OBTENER POR PARTICIPACIÓN
 *
 * Una participación solo puede tener una valoración.
 * ============================================================
 */

export async function getMatchRatingByParticipationId(
  participationId: number
): Promise<MatchRating | undefined> {
  const { data, error } = await supabase
    .from("match_ratings")
    .select("*")
    .eq(
      "participation_id",
      participationId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Error obteniendo valoración de participación:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  if (!data) {
    return undefined;
  }

  return mapMatchRating(data);
}

/*
 * ============================================================
 * CREAR
 * ============================================================
 */

export async function addMatchRating(
  matchRating: Omit<MatchRating, "id">
): Promise<MatchRating> {
  if (!matchRating.matchId) {
    throw new Error(
      "La valoración debe tener un partido."
    );
  }

  if (!matchRating.playerId) {
    throw new Error(
      "La valoración debe tener un jugador."
    );
  }

  if (!matchRating.participationId) {
    throw new Error(
      "La valoración debe tener una participación."
    );
  }

  const externalAverage =
    calculateExternalAverage(
      matchRating.marcaRating,
      matchRating.asRating,
      matchRating.sofascoreRating,
      matchRating.flashscoreRating
    );

  const { data, error } = await supabase
    .from("match_ratings")
    .insert({
      match_id:
        matchRating.matchId,

      player_id:
        matchRating.playerId,

      participation_id:
        matchRating.participationId,

      marca_rating:
        matchRating.marcaRating,

      as_rating:
        matchRating.asRating,

      sofascore_rating:
        matchRating.sofascoreRating,

      flashscore_rating:
        matchRating.flashscoreRating,

      external_average:
        externalAverage,

      value90_match_rating:
        matchRating.value90MatchRating,

      final_match_rating:
        matchRating.finalMatchRating,

      confidence:
        matchRating.confidence,

      calculation_version:
        matchRating.calculationVersion,

      calculated_at:
        matchRating.calculatedAt,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Error creando valoración:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return mapMatchRating(data);
}

/*
 * ============================================================
 * ACTUALIZAR
 * ============================================================
 */

export async function updateMatchRating(
  id: number,
  changes: Omit<MatchRating, "id">
): Promise<MatchRating | undefined> {
  const externalAverage =
    calculateExternalAverage(
      changes.marcaRating,
      changes.asRating,
      changes.sofascoreRating,
      changes.flashscoreRating
    );

  const { data, error } = await supabase
    .from("match_ratings")
    .update({
      match_id:
        changes.matchId,

      player_id:
        changes.playerId,

      participation_id:
        changes.participationId,

      marca_rating:
        changes.marcaRating,

      as_rating:
        changes.asRating,

      sofascore_rating:
        changes.sofascoreRating,

      flashscore_rating:
        changes.flashscoreRating,

      external_average:
        externalAverage,

      value90_match_rating:
        changes.value90MatchRating,

      final_match_rating:
        changes.finalMatchRating,

      confidence:
        changes.confidence,

      calculation_version:
        changes.calculationVersion,

      calculated_at:
        changes.calculatedAt,
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error(
      "Error actualizando valoración:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  if (!data) {
    return undefined;
  }

  return mapMatchRating(data);
}

/*
 * ============================================================
 * ELIMINAR
 * ============================================================
 */

export async function deleteMatchRating(
  id: number
): Promise<boolean> {
  const { error } = await supabase
    .from("match_ratings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando valoración:",
      JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return true;
}