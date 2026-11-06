import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getHighlightlyBoxScore, getHighlightlyMatches, type HighlightlyMatch } from "@/lib/highlightly.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAGUE_ID = 119924;
const SEASON_YEAR = 2026;
const FIRST_FIVE = new Set([1, 2, 3, 4, 5]);

function stageNumber(round: string) {
  const match = round.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function normalize(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(fc|cf|club|de|del|the|afc|sc)\b/g, " ").replace(/[^a-z0-9]/g, "");
}

function abbreviatedNameMatches(source: string, local: string) {
  const words = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const a = words(source);
  const b = words(local);
  return a.length > 1 && b.length > 1 && a[0].length === 1 && b[0].startsWith(a[0]) && a.at(-1) === b.at(-1);
}

async function requireAdminSession() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Inicia sesión para importar estadísticas.");
  if (user.email?.toLowerCase() !== "pastues@icloud.com") throw new Error("No tienes permiso para importar estas estadísticas.");
  return createAdminSupabaseClient();
}

async function fetchAllLaLiga() {
  const allMatches: HighlightlyMatch[] = [];
  let total = Number.POSITIVE_INFINITY;
  let callsUsed = 0;
  let callsRemaining: string | null = null;
  for (let offset = 0; offset < total; offset += 100) {
    const response = await getHighlightlyMatches(LEAGUE_ID, SEASON_YEAR, offset);
    callsUsed += 1;
    callsRemaining = response.remaining;
    const page = response.body;
    if (!page?.pagination || !Array.isArray(page.data)) throw new Error("Highlightly devolvió un calendario no válido.");
    allMatches.push(...page.data);
    total = page.pagination.totalCount;
    if (!page.data.length || (callsRemaining === "0" && offset + 100 < total)) break;
  }
  return { allMatches, callsUsed, callsRemaining };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await requireAdminSession();
    const input = await request.json().catch(() => ({})) as { action?: string; matchIds?: number[] };

    if (input.action === "prepare") {
      const [seasonResult, competitionResult, stagesResult, teamsResult] = await Promise.all([
        supabase.from("seasons").select("id,name,active,start_date").order("start_date", { ascending: false }),
        supabase.from("competitions").select("id,name").ilike("name", "%laliga%"),
        supabase.from("stages").select("id,name,season_id"),
        supabase.from("external_team_mappings").select("external_team_id,team_id").eq("provider", "highlightly"),
      ]);
      for (const result of [seasonResult, competitionResult, stagesResult, teamsResult]) if (result.error) throw new Error(result.error.message);
      const season = (seasonResult.data ?? []).find((row) => row.active) ?? (seasonResult.data ?? []).find((row) => String(row.name).includes("2026/27"));
      const competition = competitionResult.data?.[0];
      if (!season || !competition) throw new Error("No encuentro LaLiga o la temporada activa.");
      const stages = (stagesResult.data ?? []).filter((row) => Number(row.season_id) === Number(season.id) && /^Jornada [1-5]$/.test(row.name));
      if (stages.length !== 5) throw new Error("Deben existir las jornadas 1–5 para la temporada activa.");
      const stageIdByNumber = new Map(stages.map((row) => [stageNumber(row.name)!, Number(row.id)]));
      const localMatchesResult = await supabase.from("matches")
        .select("id,stage_id,home_team_id,away_team_id,status")
        .eq("season_id", season.id).eq("competition_id", competition.id)
        .in("stage_id", stages.map((row) => row.id));
      if (localMatchesResult.error) throw new Error(localMatchesResult.error.message);
      const localMatchByKey = new Map((localMatchesResult.data ?? []).map((row) => [`${row.stage_id}:${row.home_team_id}:${row.away_team_id}`, Number(row.id)]));
      const localTeamByExternalId = new Map((teamsResult.data ?? []).map((row) => [Number(row.external_team_id), Number(row.team_id)]));

      const fetched = await fetchAllLaLiga();
      const fixtures = [...new Map(fetched.allMatches
        .filter((match) => Number(match.league?.season) === SEASON_YEAR && FIRST_FIVE.has(stageNumber(match.round) ?? -1))
        .map((match) => [Number(match.id), match])).values()];
      const selected: Array<{ localMatchId: number; externalMatchId: number }> = [];
      const missingTeamMappings = new Set<string>();
      const missingLocalMatches: string[] = [];
      for (const fixture of fixtures) {
        const round = stageNumber(fixture.round);
        if (round == null) continue;
        const homeId = localTeamByExternalId.get(Number(fixture.homeTeam.id));
        const awayId = localTeamByExternalId.get(Number(fixture.awayTeam.id));
        if (!homeId || !awayId) {
          if (!homeId) missingTeamMappings.add(fixture.homeTeam.name);
          if (!awayId) missingTeamMappings.add(fixture.awayTeam.name);
          continue;
        }
        const localMatchId = localMatchByKey.get(`${stageIdByNumber.get(round)}:${homeId}:${awayId}`);
        if (!localMatchId) {
          missingLocalMatches.push(`${fixture.round}: ${fixture.homeTeam.name}–${fixture.awayTeam.name}`);
          continue;
        }
        selected.push({ localMatchId, externalMatchId: Number(fixture.id) });
      }
      const localIds = selected.map((row) => row.localMatchId);
      const externalIds = selected.map((row) => row.externalMatchId);
      const [existingResult, existingExternalResult] = localIds.length
        ? await Promise.all([
            supabase.from("external_match_mappings").select("match_id,external_match_id").eq("provider", "highlightly").in("match_id", localIds),
            supabase.from("external_match_mappings").select("match_id,external_match_id").eq("provider", "highlightly").in("external_match_id", externalIds),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];
      if (existingResult.error || existingExternalResult.error) throw new Error(existingResult.error?.message ?? existingExternalResult.error?.message);
      const existingByMatch = new Map((existingResult.data ?? []).map((row) => [Number(row.match_id), Number(row.external_match_id)]));
      const existingByExternal = new Map((existingExternalResult.data ?? []).map((row) => [Number(row.external_match_id), Number(row.match_id)]));
      const conflictingMappings: string[] = [];
      const conflictingLocalIds = new Set<number>();
      const toInsert = selected.filter((row) => {
        const mappedExternalId = existingByMatch.get(row.localMatchId);
        const mappedLocalId = existingByExternal.get(row.externalMatchId);
        if ((mappedExternalId != null && mappedExternalId !== row.externalMatchId)
          || (mappedLocalId != null && mappedLocalId !== row.localMatchId)) {
          conflictingMappings.push(`partido local ${row.localMatchId} / Highlightly ${row.externalMatchId}`);
          conflictingLocalIds.add(row.localMatchId);
          return false;
        }
        return mappedExternalId == null && mappedLocalId == null;
      });
      for (let offset = 0; offset < toInsert.length; offset += 200) {
        const inserted = await supabase.from("external_match_mappings").insert(toInsert.slice(offset, offset + 200).map((row) => ({
          provider: "highlightly", external_match_id: row.externalMatchId, match_id: row.localMatchId,
        })));
        if (inserted.error) throw new Error(`No pude asociar los partidos con Highlightly: ${inserted.error.message}`);
      }
      const matchIds = selected.filter((row) => !conflictingLocalIds.has(row.localMatchId)).map((row) => row.localMatchId);
      return NextResponse.json({
        ok: true, matchIds, totalMatches: matchIds.length, callsUsed: fetched.callsUsed,
        callsRemaining: fetched.callsRemaining == null ? null : Number(fetched.callsRemaining),
        skipped: { missingTeamMappings: [...missingTeamMappings], missingLocalMatches, conflictingMappings },
      });
    }

    if (input.action !== "import_batch" || !Array.isArray(input.matchIds) || input.matchIds.length < 1 || input.matchIds.length > 5) {
      return NextResponse.json({ error: "Envía lotes de entre 1 y 5 partidos válidos." }, { status: 400 });
    }
    const matchIds = [...new Set(input.matchIds.map(Number))];
    if (matchIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) return NextResponse.json({ error: "La lista contiene un partido no válido." }, { status: 400 });

    const [mappingResult, participantsResult, teamMapResult] = await Promise.all([
      supabase.from("external_match_mappings").select("match_id,external_match_id").eq("provider", "highlightly").in("match_id", matchIds),
      supabase.from("participations").select("id,match_id,player_id,team_id,shirt_number,minutes_played,is_starting_xi").in("match_id", matchIds),
      supabase.from("external_team_mappings").select("external_team_id,team_id").eq("provider", "highlightly"),
    ]);
    for (const result of [mappingResult, participantsResult, teamMapResult]) if (result.error) throw new Error(result.error.message);
    const mappings = mappingResult.data ?? [];
    if (mappings.length !== matchIds.length) throw new Error("Falta asociar alguno de los partidos con Highlightly. Repite la preparación.");
    const participantRows = participantsResult.data ?? [];
    const playerIds = [...new Set(participantRows.map((row) => Number(row.player_id)))];
    const [playersResult, externalPlayersResult] = await Promise.all([
      playerIds.length ? supabase.from("players").select("id,name,short_name").in("id", playerIds) : Promise.resolve({ data: [], error: null }),
      supabase.from("external_player_mappings").select("match_id,external_player_id,player_id,status,source_name")
        .eq("provider", "highlightly").in("match_id", matchIds).eq("status", "linked"),
    ]);
    for (const result of [playersResult, externalPlayersResult]) if (result.error) throw new Error(result.error.message);
    const playersById = new Map((playersResult.data ?? []).map((row) => [Number(row.id), row]));
    const externalTeams = new Map((teamMapResult.data ?? []).map((row) => [Number(row.external_team_id), Number(row.team_id)]));
    const participantsByMatch = new Map<number, typeof participantRows>();
    for (const participant of participantRows) {
      const key = Number(participant.match_id);
      participantsByMatch.set(key, [...(participantsByMatch.get(key) ?? []), participant]);
    }
    const mappingsByMatch = new Map(mappings.map((row) => [Number(row.match_id), row]));
    let callsUsed = 0;
    let callsRemaining: string | null = null;
    let imported = 0;
    const unmatched: Array<{ matchId: number; teamId: number; player: string; shirtNumber: number | null }> = [];
    for (const localMatchId of matchIds) {
      const mapping = mappingsByMatch.get(localMatchId)!;
      const response = await getHighlightlyBoxScore(Number(mapping.external_match_id));
      callsUsed += 1;
      callsRemaining = response.remaining;
      const rows: Array<Record<string, number>> = [];
      const matchParticipants = participantsByMatch.get(localMatchId) ?? [];
      const extPlayerMappings = (externalPlayersResult.data ?? []).filter((row) => Number(row.match_id) === localMatchId);
      for (const sourceTeam of response.body ?? []) {
        const localTeamId = externalTeams.get(Number(sourceTeam.team?.id));
        if (!localTeamId) continue;
        const candidates = matchParticipants.filter((row) => Number(row.team_id) === localTeamId);
        for (const sourcePlayer of sourceTeam.players ?? []) {
          if (sourcePlayer.isSubstitute && Number(sourcePlayer.minutesPlayed) <= 0) continue;
          const linked = extPlayerMappings.find((row) => Number(row.external_player_id) === Number(sourcePlayer.id) && row.player_id != null);
          let participant = linked ? candidates.find((row) => Number(row.player_id) === Number(linked.player_id)) : undefined;
          if (!participant) {
            const sourceNames = [sourcePlayer.name, sourcePlayer.fullName].filter((name): name is string => Boolean(name));
            const exact = candidates.filter((row) => {
              const player = playersById.get(Number(row.player_id));
              return player && sourceNames.some((name) => normalize(name) === normalize(player.name) || normalize(name) === normalize(player.short_name));
            });
            if (exact.length === 1) participant = exact[0];
            if (!participant && sourcePlayer.shirtNumber != null) {
              const abbreviated = candidates.filter((row) => {
                if (Number(row.shirt_number) !== Number(sourcePlayer.shirtNumber)) return false;
                const player = playersById.get(Number(row.player_id));
                return player && sourceNames.some((name) => abbreviatedNameMatches(name, player.name) || abbreviatedNameMatches(name, player.short_name ?? ""));
              });
              if (abbreviated.length === 1) participant = abbreviated[0];
            }
          }
          if (!participant) {
            unmatched.push({ matchId: localMatchId, teamId: localTeamId, player: sourcePlayer.fullName ?? sourcePlayer.name, shirtNumber: sourcePlayer.shirtNumber ?? null });
            continue;
          }
          const stats = Array.isArray(sourcePlayer.statistics) ? sourcePlayer.statistics[0] : sourcePlayer.statistics;
          if (!stats) continue;
          const count = (value: number | undefined) => Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
          rows.push({
            participation_id: Number(participant.id),
            goals: count(stats.goalsScored), shots: count(stats.shotsTotal), shots_on_target: count(stats.shotsOnTarget),
            dribbles: count(stats.dribblesTotal), dribbles_completed: count(stats.dribblesSuccessful), assists: count(stats.assists),
            duels: count(stats.duelsTotal), duels_won: count(stats.duelsWon), recoveries: count(stats.interceptionsTotal),
            saves: count(stats.goalsSaved), tackles: count(stats.tacklesTotal), passes: count(stats.passesTotal),
            passes_completed: count(stats.passesSuccessful), yellow_cards: count(stats.cardsYellow), red_cards: count(stats.cardsRed),
          });
        }
      }
      if (rows.length) {
        const saved = await supabase.from("player_match_stats").upsert(rows, { onConflict: "participation_id" });
        if (saved.error) throw new Error(`No pude guardar las estadísticas del partido ${localMatchId}: ${saved.error.message}`);
        imported += rows.length;
      }
      if (callsRemaining === "0" && localMatchId !== matchIds.at(-1)) break;
    }
    return NextResponse.json({ ok: true, matchesProcessed: callsUsed, callsUsed, callsRemaining: callsRemaining == null ? null : Number(callsRemaining), imported, unmatched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron importar las estadísticas.";
    const status = /Inicia sesión/.test(message) ? 401 : /permiso/.test(message) ? 403 : /Falta asociar|no válido/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
