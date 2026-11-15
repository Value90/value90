import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
  throw new Error("La consulta de progreso superó el límite de seguridad.");
}

function chunks<T>(values: T[], size = 500) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

export async function GET(request: NextRequest) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para consultar el progreso de Highlightly." }, { status: 401 });

  try {
    const seasonId = Number(request.nextUrl.searchParams.get("seasonId"));
    const competitionValue = request.nextUrl.searchParams.get("competitionId");
    const competitionId = competitionValue ? Number(competitionValue) : null;
    const stageValue = request.nextUrl.searchParams.get("stageId");
    const stageId = stageValue ? Number(stageValue) : null;
    if (!Number.isSafeInteger(seasonId) || seasonId <= 0 || (competitionId != null && (!Number.isSafeInteger(competitionId) || competitionId <= 0)) || (stageId != null && (!Number.isSafeInteger(stageId) || stageId <= 0))) {
      return NextResponse.json({ error: "Selecciona una temporada, competición y jornada válidas." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const matches = await readAll((from, to) => {
      let query = supabase.from("matches")
        .select("id,date,status,home_score,away_score,stadium,season_id,competition_id,stage_id,home_team_id,away_team_id")
        .eq("season_id", seasonId).order("date", { ascending: false });
      if (competitionId != null) query = query.eq("competition_id", competitionId);
      if (stageId != null) query = query.eq("stage_id", stageId);
      return query.range(from, to);
    });

    if (!matches.length) return NextResponse.json({ matches: [], summary: { total: 0, pendingMatchData: 0, pendingStats: 0, complete: 0 } });
    const matchIds = matches.map((item) => Number(item.id));
    const matchBatches = chunks(matchIds);
    const [mappings, participations] = await Promise.all([
      Promise.all(matchBatches.map((ids) => readAll((from, to) => supabase.from("external_match_mappings")
        .select("match_id,external_match_id,lineup_synced_at,final_synced_at,last_sync_error,result_attempts")
        .eq("provider", "highlightly").in("match_id", ids).order("match_id").range(from, to))))
        .then((pages) => pages.flat()),
      Promise.all(matchBatches.map((ids) => readAll((from, to) => supabase.from("participations")
        .select("id,match_id,is_starting_xi,minutes_played").in("match_id", ids).order("id").range(from, to))))
        .then((pages) => pages.flat()),
    ]);
    const participationIds = participations.map((item) => Number(item.id));
    const stats = await Promise.all(chunks(participationIds).map((ids) => readAll((from, to) => supabase.from("player_match_stats")
      .select("participation_id").in("participation_id", ids).order("participation_id").range(from, to))))
      .then((pages) => pages.flat());
    const v90Facts = await Promise.all(matchBatches.map((ids) => readAll((from, to) => supabase.from("fact_player_v90_match")
      .select("match_id,status,v90_match").eq("active", true).in("match_id", ids).order("id").range(from, to))))
      .then((pages) => pages.flat());

    const teamIds = [...new Set(matches.flatMap((item) => [Number(item.home_team_id), Number(item.away_team_id)]))];
    const stageIds = [...new Set(matches.map((item) => Number(item.stage_id)))];
    const [teams, stages, competitions, seasons] = await Promise.all([
      Promise.all(chunks(teamIds).map((ids) => supabase.from("teams").select("id,name").in("id", ids))).then((results) => results.flatMap((item) => { if (item.error) throw new Error(item.error.message); return item.data ?? []; })),
      Promise.all(chunks(stageIds).map((ids) => supabase.from("stages").select("id,name").in("id", ids))).then((results) => results.flatMap((item) => { if (item.error) throw new Error(item.error.message); return item.data ?? []; })),
      Promise.all(chunks([...new Set(matches.map((item) => Number(item.competition_id)))]).map((ids) => supabase.from("competitions").select("id,name").in("id", ids)))
        .then((results) => results.flatMap((item) => { if (item.error) throw new Error(item.error.message); return item.data ?? []; })),
      supabase.from("seasons").select("id,name").eq("id", seasonId).maybeSingle(),
    ]);
    if (seasons.error) throw new Error(seasons.error.message);

    const teamsById = new Map(teams.map((item) => [Number(item.id), item.name]));
    const stagesById = new Map(stages.map((item) => [Number(item.id), item.name]));
    const mappingsByMatch = new Map(mappings.map((item) => [Number(item.match_id), item]));
    const participationsByMatch = new Map<number, typeof participations>();
    participations.forEach((item) => participationsByMatch.set(Number(item.match_id), [...(participationsByMatch.get(Number(item.match_id)) ?? []), item]));
    const statsByParticipation = new Set(stats.map((item) => Number(item.participation_id)));
    const v90ByMatch = new Map<number, { calculated: number; pending: number; errors: number; average: number | null }>();
    for (const fact of v90Facts) {
      const id = Number(fact.match_id);
      const current = v90ByMatch.get(id) ?? { calculated: 0, pending: 0, errors: 0, average: null };
      if (fact.status === "CALCULATED") {
        const value = Number(fact.v90_match);
        current.calculated += 1;
        if (Number.isFinite(value)) current.average = ((current.average ?? 0) * (current.calculated - 1) + value) / current.calculated;
      } else if (fact.status === "PENDING") current.pending += 1;
      else if (fact.status === "ERROR") current.errors += 1;
      v90ByMatch.set(id, current);
    }
    const now = Date.now();
    const rows = matches.map((match) => {
      const id = Number(match.id);
      const mapping = mappingsByMatch.get(id) ?? null;
      const appearanceRows = (participationsByMatch.get(id) ?? []).filter((item) => item.is_starting_xi || Number(item.minutes_played) > 0);
      const missingStats = appearanceRows.filter((item) => !statsByParticipation.has(Number(item.id))).length;
      const completedStatus = ["Jugado", "Cancelado"].includes(String(match.status));
      const cancelled = String(match.status) === "Cancelado";
      const v90 = v90ByMatch.get(id) ?? null;
      const resultComplete = Boolean(mapping?.final_synced_at) && completedStatus;
      const participationComplete = cancelled || (Boolean(mapping?.lineup_synced_at) && appearanceRows.length > 0);
      const statsComplete = cancelled || (appearanceRows.length > 0 && missingStats === 0);
      const overdue = new Date(String(match.date)).getTime() <= now;
      const pendingMatchData = overdue && !cancelled && (!resultComplete || !participationComplete);
      const pendingStats = overdue && completedStatus && participationComplete && !statsComplete;
      const expectedV90 = appearanceRows.filter((item) => Number(item.minutes_played) > 0).length;
      const actualV90 = v90 ? v90.calculated + v90.pending + v90.errors : 0;
      const pendingV90 = overdue && String(match.status) === "Jugado" && statsComplete && expectedV90 > 0
        && (!v90 || v90.pending > 0 || v90.errors > 0 || actualV90 < expectedV90);
      const isComplete = cancelled || (resultComplete && participationComplete && statsComplete && !pendingV90);
      return {
        id,
        date: String(match.date),
        status: String(match.status),
        homeScore: Number(match.home_score ?? 0),
        awayScore: Number(match.away_score ?? 0),
        stadium: String(match.stadium ?? ""),
        competitionId: Number(match.competition_id),
        competitionName: competitions.find((item) => Number(item.id) === Number(match.competition_id))?.name ?? "Competición",
        seasonName: seasons.data?.name ?? "Temporada",
        stageName: stagesById.get(Number(match.stage_id)) ?? "Jornada",
        homeTeamName: teamsById.get(Number(match.home_team_id)) ?? "Equipo local",
        awayTeamName: teamsById.get(Number(match.away_team_id)) ?? "Equipo visitante",
        hasHighlightlyMapping: Boolean(mapping),
        resultComplete,
        participationComplete,
        lineupSyncedAt: mapping?.lineup_synced_at ?? null,
        statsComplete,
        v90Calculated: v90?.calculated ?? 0,
        v90Pending: v90?.pending ?? 0,
        v90Errors: v90?.errors ?? 0,
        v90Average: v90?.average ?? null,
        pendingV90,
        participationCount: appearanceRows.length,
        missingStats,
        pendingMatchData,
        pendingStats,
        pending: pendingMatchData || pendingStats || pendingV90,
        isComplete,
        lastSyncError: mapping?.last_sync_error ?? null,
        lastSyncedAt: mapping?.final_synced_at ?? mapping?.lineup_synced_at ?? null,
        externalMatchId: mapping?.external_match_id ?? null,
      };
    });
    const pending = rows.filter((item) => item.pending);
    return NextResponse.json({
      matches: rows,
      summary: {
        total: rows.length,
        pendingMatchData: pending.filter((item) => item.pendingMatchData).length,
        pendingStats: pending.filter((item) => item.pendingStats).length,
        pendingV90: pending.filter((item) => item.pendingV90).length,
        complete: rows.filter((item) => item.isComplete).length,
      },
    });
  } catch (error) {
    console.error("Error leyendo progreso de Highlightly:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo consultar el progreso de Highlightly." }, { status: 500 });
  }
}
