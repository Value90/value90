import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { predictWithStoredModels, type OwnRatingSample, type PositionGroup, type StoredPositionModel } from "@/lib/own-ratings.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRAINING_ROUNDS = [1, 2, 3, 4, 5];
const EVALUATION_ROUNDS = [6, 7, 8, 9, 10];
const roundName = (round: number) => `Jornada ${round}`;

async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const output: T[] = [];
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    output.push(...page);
    if (page.length < 1000) return output;
  }
  throw new Error("La consulta superó el límite de seguridad de 100.000 filas.");
}

async function adminClient() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) throw new Error("Inicia sesión para evaluar las valoraciones propias.");
  if (user.email?.toLowerCase() !== "pastues@icloud.com") throw new Error("No tienes permiso para evaluar las valoraciones propias.");
  return createAdminSupabaseClient();
}

export async function POST() {
  try {
    const supabase = await adminClient();
    const [seasonsResult, competitionsResult] = await Promise.all([
      supabase.from("seasons").select("id,name,active,start_date").order("start_date", { ascending: false }),
      supabase.from("competitions").select("id,name").ilike("name", "%laliga%"),
    ]);
    if (seasonsResult.error) throw new Error(seasonsResult.error.message);
    if (competitionsResult.error) throw new Error(competitionsResult.error.message);
    const season = (seasonsResult.data ?? []).find((row) => row.active)
      ?? (seasonsResult.data ?? []).find((row) => String(row.name).includes("2026/27"));
    const competition = competitionsResult.data?.[0];
    if (!season || !competition) throw new Error("No encuentro LaLiga o la temporada activa.");

    const { data: stages, error: stagesError } = await supabase.from("stages").select("id,name")
      .eq("season_id", season.id).in("name", [...TRAINING_ROUNDS, ...EVALUATION_ROUNDS].map(roundName));
    if (stagesError) throw new Error(stagesError.message);
    const stagesByName = new Map((stages ?? []).map((row) => [row.name, Number(row.id)]));
    const trainingStageIds = TRAINING_ROUNDS.map((round) => stagesByName.get(roundName(round)));
    const evaluationStageIds = EVALUATION_ROUNDS.map((round) => stagesByName.get(roundName(round)));
    if (trainingStageIds.some((id) => id == null) || evaluationStageIds.some((id) => id == null)) {
      throw new Error("Deben existir las jornadas 1–10 para la temporada activa.");
    }

    const { data: candidateRuns, error: runsError } = await supabase.from("own_rating_runs")
      .select("id,stage_ids,training_samples,position_models,model_version,created_at")
      .eq("season_id", season.id).eq("competition_id", competition.id).is("evaluation_source_run_id", null)
      .order("created_at", { ascending: false }).limit(100);
    if (runsError) throw new Error(runsError.message);
    const trainingRun = (candidateRuns ?? []).find((run) => {
      const ids: number[] = Array.isArray(run.stage_ids) ? run.stage_ids.map((value: number) => Number(value)).sort((a: number, b: number) => a - b) : [];
      return ids.join(",") === trainingStageIds.map((value) => Number(value)).sort((a: number, b: number) => a - b).join(",");
    });
    if (!trainingRun) throw new Error("No hay un modelo entrenado con las jornadas 1–5. Recalcula primero la valoración propia inicial.");

    const matches = await readAll((from, to) => supabase.from("matches")
      .select("id,stage_id").eq("season_id", season.id).eq("competition_id", competition.id)
      .in("stage_id", evaluationStageIds).order("id").range(from, to));
    if (!matches.length) throw new Error("No hay partidos de LaLiga en las jornadas 6–10.");
    const matchIds = matches.map((row) => Number(row.id));
    const participations = await readAll((from, to) => supabase.from("participations")
      .select("id,match_id,player_id,position_id,minutes_played").in("match_id", matchIds)
      .order("id").range(from, to));
    if (!participations.length) throw new Error("Todavía no hay participaciones en las jornadas 6–10.");
    const participationIds = participations.map((row) => Number(row.id));
    const [stats, externalRatings, positionsResult] = await Promise.all([
      readAll((from, to) => supabase.from("player_match_stats").select("*")
        .in("participation_id", participationIds).order("participation_id").range(from, to)),
      readAll((from, to) => supabase.from("match_ratings").select("participation_id,external_average")
        .in("participation_id", participationIds).order("participation_id").range(from, to)),
      supabase.from("positions").select("id,name"),
    ]);
    if (positionsResult.error) throw new Error(positionsResult.error.message);
    const statsById = new Map(stats.map((row) => [Number(row.participation_id), row]));
    const externalById = new Map(externalRatings.filter((row) => row.external_average != null)
      .map((row) => [Number(row.participation_id), Number(row.external_average)]));
    const positionNames = new Map((positionsResult.data ?? []).map((row) => [Number(row.id), String(row.name)]));
    const stageNumberById = new Map((stages ?? []).map((row) => [Number(row.id), Number(row.name.match(/\d+/)?.[0] ?? 0)]));
    const matchById = new Map(matches.map((row) => [Number(row.id), row]));
    const samples: OwnRatingSample[] = participations.flatMap((participation) => {
      const stat = statsById.get(Number(participation.id));
      const match = matchById.get(Number(participation.match_id));
      const positionName = positionNames.get(Number(participation.position_id));
      if (!stat || !match || !positionName) return [];
      const values = Object.fromEntries([
        "goals", "assists", "shots", "shots_on_target", "dribbles_completed", "duels_won", "tackles", "recoveries", "saves", "passes_completed", "yellow_cards", "red_cards",
      ].map((field) => [field, Number(stat[field]) || 0]));
      return [{
        participationId: Number(participation.id), playerId: Number(participation.player_id),
        matchId: Number(participation.match_id), positionId: Number(participation.position_id),
        positionName, stageNumber: stageNumberById.get(Number(match.stage_id)) ?? 0,
        minutesPlayed: Number(participation.minutes_played) || 0,
        externalAverage: externalById.get(Number(participation.id)) ?? null,
        stats: values,
      }];
    });
    if (!samples.length) throw new Error("No hay participaciones con estadísticas importadas en las jornadas 6–10.");

    const storedModels = trainingRun.position_models as Partial<Record<PositionGroup | "global", StoredPositionModel>>;
    const evaluation = predictWithStoredModels(samples, storedModels);
    if (!evaluation.evaluatedSamples || evaluation.mae == null || evaluation.rmse == null) {
      throw new Error("Las jornadas 6–10 no tienen valoraciones externas asociadas; no se puede calcular MAE/RMSE.");
    }
    const evaluationRun = await supabase.from("own_rating_runs").insert({
      season_id: season.id,
      competition_id: competition.id,
      model_version: trainingRun.model_version,
      stage_ids: evaluationStageIds,
      training_samples: Number(trainingRun.training_samples),
      rated_samples: evaluation.ratings.length,
      position_models: trainingRun.position_models,
      evaluation_source_run_id: trainingRun.id,
      evaluation_mae: evaluation.mae,
      evaluation_rmse: evaluation.rmse,
    }).select("id").single();
    if (evaluationRun.error) throw new Error(evaluationRun.error.message);
    const rows = evaluation.ratings.map((rating) => ({
      run_id: evaluationRun.data.id,
      participation_id: rating.participationId,
      match_id: rating.matchId,
      player_id: rating.playerId,
      position_id: rating.positionId,
      own_rating: rating.ownRating,
      external_average: rating.externalAverage,
      absolute_error: rating.absoluteError,
      calculation_version: `${trainingRun.model_version}-blind-eval`,
    }));
    for (let offset = 0; offset < rows.length; offset += 500) {
      const saved = await supabase.from("own_match_ratings").insert(rows.slice(offset, offset + 500));
      if (saved.error) throw new Error(saved.error.message);
    }
    return NextResponse.json({
      ok: true,
      sourceRunId: trainingRun.id,
      evaluationRunId: evaluationRun.data.id,
      modelVersion: trainingRun.model_version,
      trainingSamples: Number(trainingRun.training_samples),
      evaluatedSamples: evaluation.evaluatedSamples,
      ratedSamples: evaluation.ratings.length,
      mae: evaluation.mae,
      rmse: evaluation.rmse,
      rounds: EVALUATION_ROUNDS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo evaluar la valoración propia.";
    const status = /sesión/.test(message) ? 401 : /permiso/.test(message) ? 403 : /No hay|no se puede|no tienen|todavía|deben existir/.test(message) ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
