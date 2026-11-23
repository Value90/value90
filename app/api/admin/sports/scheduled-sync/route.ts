import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { POST as syncMatchPost } from "@/app/api/admin/sports/sync/route";
import { recalculateV90Forward } from "@/lib/recalculate-v90-forward.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MATCHES_PER_RUN = 12;
const MATCHES_PER_GROUP = 4;
const CLAIM_LEASE_MS = 10 * 60_000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const scope = request.nextUrl.searchParams.get("scope") ?? "all";
    const now = new Date();
    const { data: configuredCompetitions, error: configuredError } = await supabase
      .from("external_competition_mappings")
      .select("competition_id,competitions!inner(name,active)")
      .eq("provider", "highlightly")
      .eq("competitions.active", true);
    if (configuredError) throw new Error(configuredError.message);
    const competitionIds = (configuredCompetitions ?? [])
      .filter((item) => scope !== "champions" || /champions/i.test(String(Array.isArray(item.competitions) ? item.competitions[0]?.name : item.competitions?.name ?? "")))
      .map((item) => Number(item.competition_id));
    if (!competitionIds.length) return NextResponse.json({ ok: true, due: 0, processed: 0, skipped: "No hay competiciones activas vinculadas a Highlightly para esta programación." });
    const { data: dueMappings, error } = await supabase.from("external_match_mappings")
      .select("provider,external_match_id,match_id,next_result_sync_at,result_attempts,final_synced_at,match:matches!inner(id,date,status,competition_id)")
      .eq("provider", "highlightly").is("final_synced_at", null)
      .lte("next_result_sync_at", now.toISOString()).or("result_attempts.is.null,result_attempts.lt.5")
      .in("match.competition_id", competitionIds)
      .order("next_result_sync_at", { ascending: true }).limit(MAX_MATCHES_PER_RUN);
    if (error) throw new Error(error.message);

    const results: Array<Record<string, unknown>> = [];
    const successfulMatchIds: number[] = [];
    let callsUsed = 0;
    let callsRemaining: number | null = null;
    let callsLimit: number | null = null;
    for (let offset = 0; offset < (dueMappings ?? []).length; offset += MATCHES_PER_GROUP) {
      const groupResults = await Promise.all((dueMappings ?? []).slice(offset, offset + MATCHES_PER_GROUP).map(async (mapping) => {
        const match = Array.isArray(mapping.match) ? mapping.match[0] : mapping.match;
        if (!match || !mapping.next_result_sync_at) return null;

        // Claim the due row so overlapping cron invocations cannot spend calls twice.
        const leaseUntil = new Date(Date.now() + CLAIM_LEASE_MS).toISOString();
        const claim = await supabase.from("external_match_mappings").update({ next_result_sync_at: leaseUntil, updated_at: now.toISOString() })
          .eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id)
          .eq("next_result_sync_at", mapping.next_result_sync_at).is("final_synced_at", null)
          .select("external_match_id").maybeSingle();
        if (claim.error) throw new Error(claim.error.message);
        if (!claim.data) return null;

        try {
          const response = await syncMatchPost(new NextRequest("http://localhost/api/admin/sports/sync", {
            method: "POST",
            headers: { authorization: `Bearer ${cronSecret}`, "content-type": "application/json" },
            body: JSON.stringify({ matchId: Number(mapping.match_id), automaticAttempt: true, deferV90: true }),
          }));
          const payload = await response.json() as { results?: Array<Record<string, unknown>>; error?: string };
          if (!response.ok) throw new Error(payload.error ?? "Falló la sincronización automática.");
          return { mapping, match, result: payload.results?.[0] ?? {} };
        } catch (syncError) {
          const message = syncError instanceof Error ? syncError.message : "Falló la sincronización automática.";
          const attempts = Number(mapping.result_attempts ?? 0) + 1;
          const nextResultSyncAt = attempts < 5 ? new Date(Date.now() + 30 * 60_000).toISOString() : null;
          await supabase.from("external_match_mappings").update({
            result_attempts: attempts, next_result_sync_at: nextResultSyncAt,
            last_sync_error: `${message} Reintento ${attempts}/5${nextResultSyncAt ? `; próximo intento ${nextResultSyncAt}` : "; se agotaron los intentos automáticos"}.`,
            updated_at: new Date().toISOString(),
          }).eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
          return { mapping, match, result: { error: message, attempts, nextAttemptAt: nextResultSyncAt } };
        }
      }));

      for (const item of groupResults) {
        if (!item) continue;
        const { mapping, match, result } = item;
        callsUsed += Number(result.callsUsed ?? 0);
        callsRemaining = result.callsRemaining == null ? callsRemaining : Number(result.callsRemaining);
        callsLimit = result.callsLimit == null ? callsLimit : Number(result.callsLimit);
        if (result.waiting !== true && !result.error) successfulMatchIds.push(Number(mapping.match_id));
        results.push({ matchId: Number(mapping.match_id), date: match.date, ...result });
      }
    }

    const v90 = successfulMatchIds.length
      ? await recalculateV90Forward(supabase, Math.min(...successfulMatchIds))
      : null;
    return NextResponse.json({ ok: true, due: dueMappings?.length ?? 0, processed: results.length, callsUsed, callsRemaining, callsLimit, synced: successfulMatchIds.length, v90, results });
  } catch (error) {
    console.error("Error en el cron de sincronización Highlightly:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falló la sincronización automática." }, { status: 500 });
  }
}
