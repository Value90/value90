import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { POST as syncMatchPost } from "@/app/api/admin/sports/sync/route";
import { recalculateV90Forward } from "@/lib/recalculate-v90-forward.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const cronAuthorized = Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
  if (!cronAuthorized) {
    const session = await createClient();
    const { data: { user } } = await session.auth.getUser();
    if (user?.email?.toLowerCase() !== "pastues@icloud.com") {
      return NextResponse.json({ error: "No autorizado." }, { status: user ? 403 : 401 });
    }
  }

  try {
    const input = await request.json() as { seasonId?: number; competitionId?: number; limit?: number; concurrency?: number; skipMatchIds?: number[]; deferV90?: boolean; recalculateFromMatchId?: number };
    const seasonId = Number(input.seasonId);
    const competitionId = Number(input.competitionId);
    const batchLimit = Math.min(500, Math.max(1, Number(input.limit) || 500));
    const concurrency = Math.min(8, Math.max(1, Number(input.concurrency) || 5));
    const supabase = createAdminSupabaseClient();
    if (Number.isSafeInteger(Number(input.recalculateFromMatchId)) && Number(input.recalculateFromMatchId) > 0) {
      const v90 = await recalculateV90Forward(supabase, Number(input.recalculateFromMatchId));
      return NextResponse.json({ ok: true, recalculationOnly: true, v90 });
    }
    if (![seasonId, competitionId].every((value) => Number.isSafeInteger(value) && value > 0)) {
      return NextResponse.json({ error: "Selecciona temporada y competición." }, { status: 400 });
    }

    const { data: matches, error: matchesError } = await supabase.from("matches")
      .select("id,date,status,season_id,competition_id,stage_id,home_team_id,away_team_id")
      .eq("season_id", seasonId).eq("competition_id", competitionId).eq("status", "Jugado")
      .order("date", { ascending: true }).limit(1000);
    if (matchesError) throw new Error(matchesError.message);
    const matchIds = (matches ?? []).map((match) => Number(match.id));
    const mappings: Array<Record<string, unknown>> = [];
    for (let offset = 0; offset < matchIds.length; offset += 100) {
      const { data, error } = await supabase.from("external_match_mappings")
        .select("external_match_id,match_id,lineup_synced_at,final_synced_at,result_attempts,last_sync_error")
        .eq("provider", "highlightly").in("match_id", matchIds.slice(offset, offset + 100));
      if (error) throw new Error(error.message);
      mappings.push(...(data ?? []));
    }
    const matchById = new Map((matches ?? []).map((match) => [Number(match.id), match]));
    const pending = mappings.filter((mapping) => !mapping.final_synced_at)
      .filter((mapping) => !input.skipMatchIds?.includes(Number(mapping.match_id)))
      .sort((a, b) => new Date(String(matchById.get(Number(a.match_id))?.date)).getTime() - new Date(String(matchById.get(Number(b.match_id))?.date)).getTime())
      .slice(0, batchLimit);
    let callsUsed = 0;
    let callsRemaining: number | null = null;
    let callsLimit: number | null = null;
    const results: Array<Record<string, unknown>> = [];
    const syncedMatchIds: number[] = [];
    for (let offset = 0; offset < pending.length; offset += concurrency) {
      const group = pending.slice(offset, offset + concurrency);
      const settled = await Promise.all(group.map(async (mapping) => {
        const match = matchById.get(Number(mapping.match_id));
        if (!match) return null;
        try {
          const response = await syncMatchPost(new NextRequest("http://localhost/api/admin/sports/sync", {
          method: "POST",
          headers: { authorization: `Bearer ${cronSecret}`, "content-type": "application/json" },
          body: JSON.stringify({ matchId: match.id, deferV90: true }),
          }));
          const payload = await response.json() as { results?: Array<Record<string, unknown>>; error?: string };
          if (!response.ok) throw new Error(payload.error ?? "No se pudo sincronizar el partido.");
          const result = payload.results?.[0] ?? {};
          return { mapping, match, result };
        } catch (error) {
          return { mapping, match, error: error instanceof Error ? error.message : "Error sincronizando partido." };
        }
      }));
      for (const item of settled) {
        if (!item) continue;
        const { mapping, match } = item;
        try {
          if ("error" in item) throw new Error(item.error);
          const result = item.result;
        callsUsed += Number(result.callsUsed ?? 0);
        callsRemaining = result.callsRemaining == null ? callsRemaining : Math.min(callsRemaining ?? Number.POSITIVE_INFINITY, Number(result.callsRemaining));
        callsLimit = result.callsLimit == null ? callsLimit : Number(result.callsLimit);
        if (result.waiting !== true && !result.error) syncedMatchIds.push(Number(match.id));
        results.push({ matchId: Number(match.id), date: match.date, ...result });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Error sincronizando partido.";
        await supabase.from("external_match_mappings").update({ last_sync_error: message, updated_at: new Date().toISOString() })
          .eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
        results.push({ matchId: Number(match.id), date: match.date, error: message });
        }
      }
      if (callsRemaining === 0) break;
    }

    let v90 = null;
    if (syncedMatchIds.length && input.deferV90 !== true) v90 = await recalculateV90Forward(supabase, syncedMatchIds[0]);
    return NextResponse.json({
      ok: true,
      totalPlayedMatches: matchIds.length,
      mappedMatches: mappings.length,
      pendingAtStart: mappings.filter((mapping) => !mapping.final_synced_at).length,
      processed: results.length,
      synced: syncedMatchIds.length,
      callsUsed,
      callsRemaining,
      callsLimit,
      v90,
      results,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo sincronizar la temporada." }, { status: 500 });
  }
}
