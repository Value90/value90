import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getHighlightlyLineups,
  getHighlightlyMatch,
  getHighlightlyBoxScore,
  getHighlightlyEvents,
  type HighlightlyEvent,
  type HighlightlyLineupTeam,
  type HighlightlyLineups,
  type HighlightlyMatch,
} from "@/lib/highlightly.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncMapping = { external_match_id: number | string; match_id: number | string; result_attempts?: number | null; lineup_synced_at?: string | null };
type SyncMatch = { season_id: number | string };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function nameMatchesAbbreviation(sourceName: string, playerName: string, shortName = "") {
  const source = normalize(sourceName);
  if (source && (source === normalize(playerName) || (shortName && source === normalize(shortName)))) return true;
  const parts = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const sourceParts = parts(sourceName);
  const playerParts = parts(playerName);
  if (sourceParts.length < 2 || playerParts.length < 2) return false;
  const sourceFirst = sourceParts[0];
  const playerFirst = playerParts[0];
  return sourceFirst.length === 1 && playerFirst.startsWith(sourceFirst)
    && sourceParts[sourceParts.length - 1] === playerParts[playerParts.length - 1];
}

function positionMatches(providerPosition: string, localName: string, shortName: string) {
  const local = normalize(`${localName} ${shortName}`);
  const groups: Record<string, string[]> = {
    goalkeeper: ["goalkeeper", "portero", "arquero", "gk", "por"],
    defender: ["defender", "defensa", "def", "dfc", "lateral"],
    midfielder: ["midfielder", "centrocampista", "mediocentro", "medio", "mc", "mco", "mcd"],
    forward: ["forward", "delantero", "extremo", "punta", "dc", "sd", "ei", "ed"],
  };
  return (groups[providerPosition.toLowerCase()] ?? []).some((term) => local.includes(normalize(term)));
}

function minute(value: string) {
  const [base, added = "0"] = value.split("+");
  const number = Number(base) + Number(added);
  return Number.isFinite(number) ? Math.max(0, Math.min(120, number)) : 0;
}

function score(value?: string | null) {
  const match = value?.match(/(\d+)\s*[-:]\s*(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] as const : [null, null] as const;
}

function isTerminal(state: string) {
  return /finished|full.?time|after (penalt|over.?time)|cancelled|abandoned|awarded/i.test(state);
}

function isCancelled(state: string) {
  return /cancelled|abandoned/i.test(state);
}

function lineupPlayers(team: HighlightlyLineupTeam) {
  const starters = (team.initialLineup ?? []).flat();
  return [
    ...starters.map((player) => ({ player, starter: true })),
    ...(team.substitutes ?? []).map((player) => ({ player, starter: false })),
  ];
}

async function syncLineup(supabase: ReturnType<typeof createAdminSupabaseClient>, mapping: SyncMapping, match: SyncMatch, lineups: HighlightlyLineups) {
  if (!lineups?.homeTeam || !lineups?.awayTeam) throw new Error("Highlightly todavía no ofrece las alineaciones.");

  const [teamMapResult, playersResult, positionsResult, linkedPlayersResult] = await Promise.all([
    supabase.from("external_team_mappings").select("external_team_id,team_id").eq("provider", "highlightly")
      .in("external_team_id", [lineups.homeTeam.id, lineups.awayTeam.id]),
    supabase.from("players").select("id,name,short_name,country_id,active"),
    supabase.from("positions").select("id,name,short_name").eq("active", true),
    supabase.from("external_player_mappings").select("external_player_key,player_id,position_id").eq("provider", "highlightly").eq("status", "linked"),
  ]);
  for (const result of [teamMapResult, playersResult, positionsResult, linkedPlayersResult]) if (result.error) throw new Error(result.error.message);
  const teamMap = new Map((teamMapResult.data ?? []).map((row) => [Number(row.external_team_id), Number(row.team_id)]));
  const linkedPlayers = new Map((linkedPlayersResult.data ?? []).map((row) => [row.external_player_key, row]));
  const positions = positionsResult.data ?? [];
  const seasonId = Number(match.season_id);
  const localTeamIds = [...teamMap.values()];
  const rosterResult = localTeamIds.length
    ? await supabase.from("hist_player_teams").select("player_id,team_id,season_id,shirt_number,position_id")
      .eq("season_id", seasonId).in("team_id", localTeamIds)
    : { data: [], error: null };
  if (rosterResult.error) throw new Error(rosterResult.error.message);
  const rosterRows = rosterResult.data ?? [];
  const participants: Array<Record<string, unknown>> = [];
  let pending = 0;

  for (const sourceTeam of [lineups.homeTeam, lineups.awayTeam]) {
    const teamId = teamMap.get(Number(sourceTeam.id));
    if (!teamId) throw new Error(`El equipo ${sourceTeam.name} no está asociado con un equipo de Value90.`);
    for (const entry of lineupPlayers(sourceTeam)) {
      const player = entry.player;
      const externalKey = player.id ? String(player.id) : `${sourceTeam.id}:${normalize(player.name)}`;
      const linkedPlayer = linkedPlayers.get(externalKey)?.player_id
        ? (playersResult.data ?? []).find((item) => Number(item.id) === Number(linkedPlayers.get(externalKey)?.player_id)) ?? null
        : null;
      const rosterCandidates = rosterRows.filter((row) => Number(row.team_id) === teamId
        && Number(row.season_id) === seasonId && Number(row.shirt_number) === Number(player.number)
        && (playersResult.data ?? []).some((item) => Number(item.id) === Number(row.player_id)
          && nameMatchesAbbreviation(player.name, item.name, item.short_name ?? "")));
      const strictCandidateIds = [...new Set(rosterCandidates.map((row) => Number(row.player_id)))];
      const strictPlayer = strictCandidateIds.length === 1
        ? (playersResult.data ?? []).find((item) => Number(item.id) === strictCandidateIds[0]) ?? null
        : null;
      const localPlayer = linkedPlayer ?? strictPlayer;
      const rosterPositionId = rosterCandidates.find((row) => Number(row.player_id) === Number(localPlayer?.id))?.position_id
        ?? linkedPlayers.get(externalKey)?.position_id;
      const position = positions.find((item) => positionMatches(player.position, item.name, item.short_name ?? ""))
        ?? positions.find((item) => Number(item.id) === Number(rosterPositionId))
        ?? null;
      const mapRow = {
        provider: "highlightly",
        external_player_key: externalKey,
        external_player_id: player.id ?? null,
        player_id: localPlayer?.id ?? null,
        status: localPlayer ? "linked" : "pending",
        source_name: player.name,
        team_id: teamId,
        season_id: seasonId,
        shirt_number: player.number ?? null,
        position_id: position?.id ?? null,
        match_id: Number(mapping.match_id),
        is_starting_xi: entry.starter,
        captain: false,
        updated_at: new Date().toISOString(),
      };
      const savedMap = await supabase.from("external_player_mappings").upsert(mapRow, { onConflict: "provider,external_player_key,match_id" });
      if (savedMap.error) throw new Error(savedMap.error.message);
      if (!localPlayer || !position) {
        pending += 1;
        continue;
      }
      if (!entry.starter) continue;
      participants.push({
        match_id: Number(mapping.match_id),
        player_id: Number(localPlayer.id),
        team_id: teamId,
        position_id: Number(position.id),
        shirt_number: player.number ?? null,
        is_starting_xi: entry.starter,
        minutes_played: entry.starter ? 90 : 0,
        captain: false,
        substitute_in_minute: null,
        substitute_out_minute: null,
      });
    }
  }

  if (participants.length) {
    const saved = await supabase.from("participations").upsert(participants, { onConflict: "match_id,player_id" });
    if (saved.error) throw new Error(saved.error.message);
  }
  const mark = await supabase.from("external_match_mappings").update({ lineup_synced_at: new Date().toISOString(), next_lineup_sync_at: null, last_sync_error: null, updated_at: new Date().toISOString() })
    .eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
  if (mark.error) throw new Error(mark.error.message);
  return { matchId: mapping.match_id, participants: participants.length, pendingPlayers: pending };
}

async function syncResult(supabase: ReturnType<typeof createAdminSupabaseClient>, mapping: SyncMapping, match: SyncMatch) {
  const { body } = await getHighlightlyMatch(Number(mapping.external_match_id));
  const matchRecord = Array.isArray(body) ? body[0] : body;
  if (!matchRecord) throw new Error("Highlightly no devolvió el partido solicitado.");
  const detail = matchRecord as HighlightlyMatch & { events?: HighlightlyEvent[] };
  const state = detail.state?.description ?? "Unknown";
  if (!isTerminal(state)) {
    const attempts = Number(mapping.result_attempts ?? 0) + 1;
    const canRetry = attempts < 4;
    const retry = await supabase.from("external_match_mappings").update({ result_attempts: attempts, next_result_sync_at: canRetry ? new Date(Date.now() + 5 * 60_000).toISOString() : null, last_sync_error: canRetry ? `El proveedor aún indica «${state}»; volveré a consultar en 5 minutos.` : `El proveedor aún indica «${state}» después de cuatro comprobaciones. Requiere revisión manual.`, updated_at: new Date().toISOString() })
      .eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
    if (retry.error) throw new Error(retry.error.message);
    return { matchId: mapping.match_id, waiting: true };
  }

  const [homeScore, awayScore] = score(detail.state?.score?.current);
  const updatedMatch = await supabase.from("matches").update({
    home_score: homeScore,
    away_score: awayScore,
    status: isCancelled(state) ? "Cancelado" : "Jugado",
  }).eq("id", mapping.match_id);
  if (updatedMatch.error) throw new Error(updatedMatch.error.message);

  let lineupSummary: { participants: number; pendingPlayers: number } | null = null;
  if (!isCancelled(state) && !mapping.lineup_synced_at) {
    const lineupResponse = await getHighlightlyLineups(Number(mapping.external_match_id));
    lineupSummary = await syncLineup(supabase, mapping, match, lineupResponse.body);
  }

  const { body: boxScoreTeams } = !isCancelled(state)
    ? await getHighlightlyBoxScore(Number(mapping.external_match_id))
    : { body: [] };
  let events = Array.isArray(detail.events) ? detail.events : [];
  if (!isCancelled(state) && !events.length && boxScoreTeams.some((team) => (team.players ?? []).some((player) => player.isSubstitute && Number(player.minutesPlayed) === 0))) {
    events = (await getHighlightlyEvents(Number(mapping.external_match_id))).body;
  }
  const substitutions = events.filter((event) => event.type.toLowerCase() === "substitution" && event.player && event.substituted);
  const [mappingsResult, teamsResult, participationsResult] = await Promise.all([
    supabase.from("external_player_mappings").select("*").eq("provider", "highlightly").eq("match_id", mapping.match_id),
    supabase.from("external_team_mappings").select("external_team_id,team_id").eq("provider", "highlightly"),
    supabase.from("participations").select("*").eq("match_id", mapping.match_id),
  ]);
  for (const result of [mappingsResult, teamsResult, participationsResult]) if (result.error) throw new Error(result.error.message);
  const playerMappings = mappingsResult.data ?? [];
  const participationByPlayerId = new Map((participationsResult.data ?? []).map((row) => [Number(row.player_id), { ...row }]));
  const substitutionMinutesByExternalKey = new Map<string, { incoming?: number; outgoing?: number }>();

  for (const event of substitutions) {
    const outgoing = playerMappings.find((item) => normalize(item.source_name) === normalize(event.player ?? "") && item.player_id);
    const incoming = playerMappings.find((item) => normalize(item.source_name) === normalize(event.substituted ?? "") && item.player_id && Number(item.team_id) === Number(outgoing?.team_id));
    if (!outgoing || !incoming) continue;
    const atMinute = minute(event.time);
    substitutionMinutesByExternalKey.set(outgoing.external_player_key, {
      ...substitutionMinutesByExternalKey.get(outgoing.external_player_key),
      outgoing: atMinute,
    });
    substitutionMinutesByExternalKey.set(incoming.external_player_key, {
      ...substitutionMinutesByExternalKey.get(incoming.external_player_key),
      incoming: atMinute,
    });
  }

  const localTeamByExternalId = new Map((teamsResult.data ?? []).map((team) => [Number(team.external_team_id), Number(team.team_id)]));
  const changedMappings = new Map<string, (typeof playerMappings)[number]>();
  for (const sourceTeam of boxScoreTeams) {
    const localTeamId = localTeamByExternalId.get(Number(sourceTeam.team?.id));
    if (!localTeamId) continue;
    const candidates = playerMappings.filter((item) => Number(item.team_id) === localTeamId);
    for (const sourcePlayer of sourceTeam.players ?? []) {
      let playerMapping = Number(sourcePlayer.id) > 0
        ? candidates.find((item) => Number(item.external_player_id) === Number(sourcePlayer.id))
        : undefined;
      if (!playerMapping) {
        const names = [sourcePlayer.name, sourcePlayer.fullName].filter((name): name is string => Boolean(name)).map(normalize);
        const nameMatches = candidates.filter((item) => names.includes(normalize(item.source_name)));
        if (nameMatches.length === 1) playerMapping = nameMatches[0];
      }
      if (!playerMapping) continue;

      const isStarting = sourcePlayer.isSubstitute !== true;
      const shirtNumber = sourcePlayer.shirtNumber ?? playerMapping.shirt_number;
      const minutesPlayed = Math.max(0, Number(sourcePlayer.minutesPlayed) || 0);
      const substitutionMinutes = substitutionMinutesByExternalKey.get(playerMapping.external_player_key);
      const updatedMapping = {
        ...playerMapping,
        is_starting_xi: isStarting,
        captain: sourcePlayer.isCaptain === true,
        shirt_number: shirtNumber,
        minutes_played: minutesPlayed,
        substitute_in_minute: substitutionMinutes?.incoming ?? playerMapping.substitute_in_minute,
        substitute_out_minute: substitutionMinutes?.outgoing ?? playerMapping.substitute_out_minute,
        updated_at: new Date().toISOString(),
      };
      changedMappings.set(playerMapping.external_player_key, updatedMapping);

      const participation = playerMapping.player_id
        ? participationByPlayerId.get(Number(playerMapping.player_id))
        : null;
      const shouldSaveParticipation = isStarting || minutesPlayed > 0 || substitutionMinutes?.incoming != null;
      if (playerMapping.player_id && shouldSaveParticipation) {
        const row = participation ?? {
          match_id: Number(mapping.match_id),
          player_id: Number(playerMapping.player_id),
          team_id: Number(playerMapping.team_id),
          position_id: playerMapping.position_id == null ? null : Number(playerMapping.position_id),
          substitute_in_minute: null,
          substitute_out_minute: null,
        };
        if (row.position_id == null) continue;
        row.is_starting_xi = isStarting;
        row.minutes_played = minutesPlayed;
        row.captain = sourcePlayer.isCaptain === true;
        row.shirt_number = shirtNumber;
        row.substitute_in_minute = substitutionMinutes?.incoming ?? row.substitute_in_minute;
        row.substitute_out_minute = substitutionMinutes?.outgoing ?? row.substitute_out_minute;
        participationByPlayerId.set(Number(playerMapping.player_id), row);
      } else if (participation && Number.isFinite(Number(sourcePlayer.minutesPlayed))) {
        participation.is_starting_xi = isStarting;
        participation.minutes_played = minutesPlayed;
        participation.captain = sourcePlayer.isCaptain === true;
        participation.shirt_number = shirtNumber;
      }
    }
  }

  if (changedMappings.size) {
    const savedMappings = await supabase.from("external_player_mappings").upsert([...changedMappings.values()], { onConflict: "provider,external_player_key,match_id" });
    if (savedMappings.error) throw new Error(savedMappings.error.message);
  }
  const unusedSubstituteIds = [...participationByPlayerId.values()]
    .filter((row) => !row.is_starting_xi && Number(row.minutes_played) === 0 && row.substitute_in_minute == null)
    .map((row) => Number(row.player_id));
  if (unusedSubstituteIds.length) {
    const removed = await supabase.from("participations").delete()
      .eq("match_id", mapping.match_id).in("player_id", unusedSubstituteIds);
    if (removed.error) throw new Error(removed.error.message);
    for (const playerId of unusedSubstituteIds) participationByPlayerId.delete(playerId);
  }
  if (participationByPlayerId.size) {
    const savedParticipations = await supabase.from("participations").upsert([...participationByPlayerId.values()], { onConflict: "match_id,player_id" });
    if (savedParticipations.error) throw new Error(savedParticipations.error.message);
  }

  const marked = await supabase.from("external_match_mappings").update({ final_synced_at: new Date().toISOString(), next_result_sync_at: null, last_sync_error: null, updated_at: new Date().toISOString() })
    .eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
  if (marked.error) throw new Error(marked.error.message);
  return { matchId: mapping.match_id, status: isCancelled(state) ? "Cancelado" : "Jugado", score: `${homeScore ?? "?"}-${awayScore ?? "?"}`, substitutions: substitutions.length, ...lineupSummary };
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const validCron = Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
  if (!validCron) {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const supabase = createAdminSupabaseClient();
    const { data: mappings, error } = await supabase.from("external_match_mappings")
      .select("provider,external_match_id,match_id,lineup_synced_at,final_synced_at,next_result_sync_at,result_attempts,last_sync_error,match:matches!inner(id,date,status,season_id,home_team_id,away_team_id)")
      .eq("provider", "highlightly").limit(250);
    if (error) throw error;
    const now = Date.now();
    const results: Array<Record<string, unknown>> = [];
    for (const mapping of mappings ?? []) {
      const match = Array.isArray(mapping.match) ? mapping.match[0] : mapping.match;
      if (!match) continue;
      const kickoff = new Date(match.date).getTime();
      const resultDue = !mapping.final_synced_at && Number(mapping.result_attempts ?? 0) < 4 && kickoff + 105 * 60_000 <= now && now <= kickoff + 120 * 60_000
        && (!mapping.next_result_sync_at || new Date(mapping.next_result_sync_at).getTime() <= now);
      if (resultDue) {
        try {
          results.push({ phase: "resultado-final-y-participaciones", ...await syncResult(supabase, mapping, match) });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Error sincronizando resultado.";
          const attempts = Number(mapping.result_attempts ?? 0) + 1;
          await supabase.from("external_match_mappings").update({ result_attempts: attempts, next_result_sync_at: attempts < 4 ? new Date(Date.now() + 5 * 60_000).toISOString() : null, last_sync_error: attempts < 4 ? message : `${message} Se agotaron cuatro intentos; requiere revisión manual.`, updated_at: new Date().toISOString() }).eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
          results.push({ phase: "resultado", matchId: mapping.match_id, error: message });
        }
      }
    }
    return NextResponse.json({ ok: true, checked: mappings?.length ?? 0, processed: results.length, results });
  } catch (error) {
    console.error("Error en sincronización automática Highlightly:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error en sincronización." }, { status: 500 });
  }
}

