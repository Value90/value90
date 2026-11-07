import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { OWN_RATING_MODEL_VERSION, trainOwnRatings, type OwnRatingSample } from "@/lib/own-ratings.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIRST_ELEVEN_STAGES = Array.from({ length: 11 }, (_, index) => `Jornada ${index + 1}`);

async function adminClient() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) throw new Error("Inicia sesión para acceder a las valoraciones propias.");
  if (user.email?.toLowerCase() !== "pastues@icloud.com") throw new Error("No tienes permiso para gestionar las valoraciones propias.");
  return createAdminSupabaseClient();
}

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

function roundNumber(name: string) {
  const match = name.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export async function POST() {
  try {
    const supabase = await adminClient();
    const [seasons, competitions] = await Promise.all([
      supabase.from("seasons").select("id,name,active,start_date").order("start_date", { ascending: false }),
      supabase.from("competitions").select("id,name,active"),
    ]);
    if (seasons.error) throw new Error(seasons.error.message);
    if (competitions.error) throw new Error(competitions.error.message);
    const season = (seasons.data ?? []).find((item) => item.active)
      ?? (seasons.data ?? []).find((item) => String(item.name).includes("2026/27"));
    const competition = (competitions.data ?? []).find((item) => /laliga|primera division/i.test(item.name));
    if (!season || !competition) throw new Error("No encuentro la temporada activa o LaLiga.");

    const { data: stages, error: stageError } = await supabase.from("stages")
      .select("id,name").eq("season_id", season.id).in("name", FIRST_ELEVEN_STAGES);
    if (stageError) throw new Error(stageError.message);
    const stageIds = (stages ?? []).map((stage) => Number(stage.id));
    if (stageIds.length !== FIRST_ELEVEN_STAGES.length) {
      throw new Error("Faltan jornadas 1–11. Comprueba que estén creadas para la temporada activa.");
    }
    const stageNumberById = new Map((stages ?? []).map((stage) => [Number(stage.id), roundNumber(stage.name)]));
    const matches = await readAll((from, to) => supabase.from("matches")
      .select("id,stage_id,competition_id,season_id").eq("season_id", season.id)
      .eq("competition_id", competition.id).in("stage_id", stageIds).eq("status", "Jugado").order("id").range(from, to));
    if (!matches.length) throw new Error("No hay partidos jugados de LaLiga en las jornadas 1–11.");
    const matchIds = matches.map((match) => Number(match.id));
    const participations = await readAll((from, to) => supabase.from("participations")
      .select("id,match_id,player_id,position_id,minutes_played").in("match_id", matchIds)
      .order("id").range(from, to));
    if (!participations.length) throw new Error("Todavía no hay participaciones para esas jornadas.");
    const participationIds = participations.map((item) => Number(item.id));
    const [stats, externalRatings, positions] = await Promise.all([
      readAll((from, to) => supabase.from("player_match_stats").select("*")
        .in("participation_id", participationIds).order("participation_id").range(from, to)),
      readAll((from, to) => supabase.from("match_ratings").select("participation_id,external_average")
        .in("participation_id", participationIds).order("participation_id").range(from, to)),
      supabase.from("positions").select("id,name,short_name"),
    ]);
    if (positions.error) throw new Error(positions.error.message);

    const statsByParticipation = new Map(stats.map((row) => [Number(row.participation_id), row]));
    const externalByParticipation = new Map(externalRatings
      .filter((row) => row.external_average != null)
      .map((row) => [Number(row.participation_id), Number(row.external_average)]));
    const positionById = new Map((positions.data ?? []).map((item) => [Number(item.id), String(item.name)]));
    const matchById = new Map(matches.map((match) => [Number(match.id), match]));
    const samples: OwnRatingSample[] = participations.flatMap((participation) => {
      const stat = statsByParticipation.get(Number(participation.id));
      if (!stat) return [];
      const match = matchById.get(Number(participation.match_id));
      if (!match) return [];
      const positionName = positionById.get(Number(participation.position_id));
      if (!positionName) return [];
      const statValues = Object.fromEntries([
        "goals", "assists", "shots", "shots_on_target", "dribbles_completed", "duels_won", "tackles", "recoveries", "saves", "passes_completed", "yellow_cards", "red_cards",
      ].map((field) => [field, Number(stat[field]) || 0]));
      return [{
        participationId: Number(participation.id), playerId: Number(participation.player_id),
        matchId: Number(participation.match_id), positionId: Number(participation.position_id),
        positionName, stageNumber: stageNumberById.get(Number(match.stage_id)) ?? 0,
        minutesPlayed: Number(participation.minutes_played) || 0,
        externalAverage: externalByParticipation.get(Number(participation.id)) ?? null,
        stats: statValues,
      }];
    });
    if (!samples.length) throw new Error("No hay participaciones con estadísticas importadas. Importa primero las estadísticas de las jornadas 1–11.");

    const trained = trainOwnRatings(samples);
    if (!trained) throw new Error(`Solo hay ${samples.filter((sample) => sample.externalAverage != null).length} valoraciones externas vinculadas a estadísticas; hacen falta al menos 17 para ajustar el modelo.`);

    const run = await supabase.from("own_rating_runs").insert({
      season_id: season.id,
      competition_id: competition.id,
      model_version: OWN_RATING_MODEL_VERSION,
      stage_ids: stageIds,
      training_samples: trained.trainingSamples,
      rated_samples: trained.ratedSamples,
      cross_validation_mae: trained.crossValidationMae,
      cross_validation_rmse: trained.crossValidationRmse,
      position_models: trained.positionModels,
    }).select("id").single();
    if (run.error) throw new Error(run.error.message);

    const rows = trained.ratings.map((rating) => ({
      run_id: run.data.id,
      participation_id: rating.participationId,
      match_id: rating.matchId,
      player_id: rating.playerId,
      position_id: rating.positionId,
      own_rating: rating.ownRating,
      external_average: rating.externalAverage,
      absolute_error: rating.absoluteError,
      calculation_version: OWN_RATING_MODEL_VERSION,
    }));
    for (let offset = 0; offset < rows.length; offset += 500) {
      const inserted = await supabase.from("own_match_ratings").insert(rows.slice(offset, offset + 500));
      if (inserted.error) throw new Error(inserted.error.message);
    }

    const finalRows = trained.ratings.map((rating) => ({
      match_id: rating.matchId,
      player_id: rating.playerId,
      participation_id: rating.participationId,
      final_match_rating: rating.ownRating,
      calculation_version: OWN_RATING_MODEL_VERSION,
      calculated_at: new Date().toISOString(),
    }));
    for (let offset = 0; offset < finalRows.length; offset += 500) {
      const saved = await supabase.from("match_ratings").upsert(finalRows.slice(offset, offset + 500), { onConflict: "participation_id" });
      if (saved.error) throw new Error(`No se pudo actualizar la valoración final del ranking: ${saved.error.message}`);
    }

    return NextResponse.json({
      ok: true,
      runId: run.data.id,
      season: season.name,
      competition: competition.name,
      matchCount: matches.length,
      participationCount: participations.length,
      statsCount: samples.length,
      trainingSamples: trained.trainingSamples,
      ratedSamples: trained.ratedSamples,
      rankingRatingsUpdated: finalRows.length,
      crossValidationMae: trained.crossValidationMae,
      crossValidationRmse: trained.crossValidationRmse,
      modelVersion: OWN_RATING_MODEL_VERSION,
      fallbackPositions: trained.fallbackPositions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo calcular la valoración propia.";
    const status = /sesión/.test(message) ? 401 : /permiso/.test(message) ? 403 : /No hay|hacen falta|faltan|todavía|Solo hay/.test(message) ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  try {
    const supabase = await adminClient();
    const { data: run, error: runError } = await supabase.from("own_rating_runs")
      .select("id,season_id,competition_id,model_version,training_samples,rated_samples,cross_validation_mae,cross_validation_rmse,evaluation_source_run_id,evaluation_mae,evaluation_rmse,created_at,position_models")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (runError) throw new Error(runError.message);
    if (!run) return NextResponse.json({ run: null, items: [] });

    const items = await readAll((from, to) => supabase.from("own_match_ratings")
      .select("own_rating,external_average,absolute_error,calculation_version,player:players!inner(name,short_name),match:matches!inner(date,stage_id),position:positions!inner(name),participation:participations!inner(minutes_played)")
      .eq("run_id", run.id).order("id", { ascending: true }).range(from, to));
    const stageIds = [...new Set(items.map((item) => Number((Array.isArray(item.match) ? item.match[0] : item.match)?.stage_id)).filter(Number.isFinite))];
    const { data: stages, error: stagesError } = stageIds.length
      ? await supabase.from("stages").select("id,name").in("id", stageIds)
      : { data: [], error: null };
    if (stagesError) throw new Error(stagesError.message);
    const stageNames = new Map((stages ?? []).map((stage) => [Number(stage.id), stage.name]));
    return NextResponse.json({
      run,
      items: items.map((item) => {
        const player = Array.isArray(item.player) ? item.player[0] : item.player;
        const match = Array.isArray(item.match) ? item.match[0] : item.match;
        const position = Array.isArray(item.position) ? item.position[0] : item.position;
        const participation = Array.isArray(item.participation) ? item.participation[0] : item.participation;
        return {
          playerName: player?.name ?? "Jugador",
          date: match?.date ?? null,
          stage: stageNames.get(Number(match?.stage_id)) ?? "Jornada",
          position: position?.name ?? "—",
          minutesPlayed: Number(participation?.minutes_played ?? 0),
          ownRating: Number(item.own_rating),
          externalAverage: item.external_average == null ? null : Number(item.external_average),
          absoluteError: item.absolute_error == null ? null : Number(item.absolute_error),
          difference: item.external_average == null ? null : Number(item.own_rating) - Number(item.external_average),
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron leer las comparaciones.";
    const status = /sesión/.test(message) ? 401 : /permiso/.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
