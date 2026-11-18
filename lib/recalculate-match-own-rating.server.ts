import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { OWN_RATING_MODEL_VERSION, calculateOwnRatingFromStats } from "@/lib/own-ratings.server";
import { recalculateV90Forward } from "@/lib/recalculate-v90-forward.server";

type AdminSupabase = ReturnType<typeof createAdminSupabaseClient>;
type SyncMatch = { season_id: number | string; competition_id: number | string; home_team_id: number | string };

/** Rebuilds own match ratings and contextual V90 without calling Highlightly. */
export async function recalculateMatchOwnRating(
  supabase: AdminSupabase,
  matchId: number,
  match: SyncMatch,
  options: { calculateV90?: boolean } = {},
) {
  const [participationsResult, positionsResult] = await Promise.all([
    supabase.from("participations").select("id,match_id,player_id,position_id,minutes_played").eq("match_id", matchId),
    supabase.from("positions").select("id,name,short_name"),
  ]);
  if (participationsResult.error || positionsResult.error) throw new Error(participationsResult.error?.message ?? positionsResult.error?.message);
  const participations = participationsResult.data ?? [];
  const ids = participations.map((row) => Number(row.id));
  if (!ids.length) return { calculated: 0, v90Calculated: 0, v90Pending: 0, reason: "El partido no contiene participaciones." };
  const statsResult = await supabase.from("player_match_stats").select("*").in("participation_id", ids);
  if (statsResult.error) throw new Error(statsResult.error.message);
  const statsByParticipation = new Map((statsResult.data ?? []).map((row) => [Number(row.participation_id), row]));
  const positionById = new Map((positionsResult.data ?? []).map((row) => [Number(row.id), String(row.name)]));
  const ratings = participations.flatMap((participation) => {
    const stats = statsByParticipation.get(Number(participation.id));
    const positionName = positionById.get(Number(participation.position_id));
    if (!stats || !positionName || Number(participation.minutes_played) <= 0) return [];
    const ownRating = calculateOwnRatingFromStats({
      positionName,
      minutesPlayed: Number(participation.minutes_played) || 0,
      stats: Object.fromEntries(["goals", "assists", "shots", "shots_on_target", "dribbles_completed", "duels_won", "tackles", "recoveries", "saves", "passes_completed", "yellow_cards", "red_cards"].map((key) => [key, Number(stats[key]) || 0])),
    });
    return ownRating == null ? [] : [{ participation, ownRating }];
  });
  if (!ratings.length) return { calculated: 0, v90Calculated: 0, v90Pending: 0, reason: "No hay participaciones con minutos y estadísticas." };

  const { data: existingRun, error: existingRunError } = await supabase.from("own_rating_runs")
    .select("id,rated_samples").eq("season_id", match.season_id).eq("competition_id", match.competition_id)
    .eq("model_version", OWN_RATING_MODEL_VERSION).is("evaluation_source_run_id", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existingRunError) throw new Error(`No se pudo consultar la ejecución V90: ${existingRunError.message}`);
  let runId = existingRun?.id;
  if (!runId) {
    const runResult = await supabase.from("own_rating_runs").insert({
      season_id: match.season_id, competition_id: match.competition_id, model_version: OWN_RATING_MODEL_VERSION,
      stage_ids: [], training_samples: 0, rated_samples: ratings.length,
      position_models: { method: "position-weighted-highlightly-statistics", baseline: 6, externalRatingsUsed: false },
    }).select("id").single();
    if (runResult.error) throw new Error(`No se pudo registrar el cálculo V90: ${runResult.error.message}`);
    runId = runResult.data.id;
  }
  const ownRows = ratings.map(({ participation, ownRating }) => ({
    run_id: runId, participation_id: Number(participation.id), match_id: matchId,
    player_id: Number(participation.player_id), position_id: Number(participation.position_id),
    own_rating: ownRating, external_average: null, absolute_error: null, calculation_version: OWN_RATING_MODEL_VERSION,
  }));
  const savedOwn = await supabase.from("own_match_ratings").upsert(ownRows, { onConflict: "run_id,participation_id" });
  if (savedOwn.error) throw new Error(`No se pudo guardar la valoración estadística: ${savedOwn.error.message}`);
  const { count: savedRatingCount, error: countError } = await supabase.from("own_match_ratings")
    .select("id", { count: "exact", head: true }).eq("run_id", runId);
  if (countError) throw new Error(`No se pudo contar el histórico de valoraciones: ${countError.message}`);
  const updatedRun = await supabase.from("own_rating_runs").update({
    rated_samples: savedRatingCount ?? 0,
    position_models: { method: "position-weighted-highlightly-statistics", baseline: 6, externalRatingsUsed: false },
  }).eq("id", runId);
  if (updatedRun.error) throw new Error(`No se pudo actualizar la ejecución V90: ${updatedRun.error.message}`);
  const finalRows = ratings.map(({ participation, ownRating }) => ({
    match_id: matchId, player_id: Number(participation.player_id), participation_id: Number(participation.id),
    final_match_rating: ownRating, calculation_version: OWN_RATING_MODEL_VERSION, calculated_at: new Date().toISOString(),
  }));
  const savedFinal = await supabase.from("match_ratings").upsert(finalRows, { onConflict: "participation_id" });
  if (savedFinal.error) throw new Error(`No se pudo actualizar la valoración final: ${savedFinal.error.message}`);
  const v90 = options.calculateV90 === false ? null : await recalculateV90Forward(supabase, matchId);
  return {
    calculated: ratings.length,
    v90Calculated: v90?.calculated ?? 0,
    v90Pending: v90?.pending ?? 0,
    v90StagesRecalculated: v90?.stagesRecalculated ?? 0,
    pendingReasons: [],
  };
}
