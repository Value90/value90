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
  type HighlightlyBoxScorePlayerStatistics,
} from "@/lib/highlightly.server";
import { recalculateMatchOwnRating } from "@/lib/recalculate-match-own-rating.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type SyncMapping = { external_match_id: number | string; match_id: number | string; result_attempts?: number | null; lineup_synced_at?: string | null };
type SyncMatch = { season_id: number | string; competition_id: number | string; home_team_id: number | string };

const MAX_AUTOMATIC_RESULT_ATTEMPTS = 5;
const AUTOMATIC_RETRY_DELAY_MS = 30 * 60_000;

async function scheduleAutomaticRetry(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  mapping: SyncMapping,
  attempt: number,
  reason: string,
) {
  const nextResultSyncAt = attempt < MAX_AUTOMATIC_RESULT_ATTEMPTS
    ? new Date(Date.now() + AUTOMATIC_RETRY_DELAY_MS).toISOString()
    : null;
  const update = await supabase.from("external_match_mappings").update({
    next_result_sync_at: nextResultSyncAt,
    last_sync_error: attempt < MAX_AUTOMATIC_RESULT_ATTEMPTS
      ? `${reason} Reintento automático ${attempt}/${MAX_AUTOMATIC_RESULT_ATTEMPTS}; próximo intento ${nextResultSyncAt}.`
      : `${reason} Se agotaron los ${MAX_AUTOMATIC_RESULT_ATTEMPTS} intentos automáticos; se puede volver a sincronizar manualmente.`,
    updated_at: new Date().toISOString(),
  }).eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
  if (update.error) throw new Error(update.error.message);
  return nextResultSyncAt;
}

function normalize(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function nameMatchesAbbreviation(sourceName: string, playerName: string, shortName = "") {
  const source = normalize(sourceName);
  if (source && (source === normalize(playerName) || (shortName && source === normalize(shortName)))) return true;
  const parts = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const sourceParts = parts(sourceName);
  const playerParts = parts(playerName);
  if (sourceParts.length === 1 && sourceParts[0].length >= 4
    && playerParts.some((part) => part.startsWith(sourceParts[0]))) return true;
  const similarity = (left: string, right: string) => {
    const a = normalize(left);
    const b = normalize(right);
    if (!a || !b || Math.abs(a.length - b.length) / Math.max(a.length, b.length) > 0.4) return 0;
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row += 1) {
      const current = [row];
      for (let column = 1; column <= b.length; column += 1) {
        current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1));
      }
      previous = current;
    }
    return 1 - previous[b.length] / Math.max(a.length, b.length);
  };
  if (Math.max(similarity(sourceName, playerName), similarity(sourceName, shortName)) >= 0.82) return true;
  if (sourceParts.length < 2 || playerParts.length < 2) return false;
  const sourceFirst = sourceParts[0];
  const playerFirst = playerParts[0];
  return sourceFirst.length === 1 && playerFirst.startsWith(sourceFirst)
    && sourceParts[sourceParts.length - 1] === playerParts[playerParts.length - 1];
}

function positionMatches(providerPosition: string | null | undefined, localName: string, shortName: string) {
  if (typeof providerPosition !== "string" || !providerPosition.trim()) return false;
  const local = normalize(`${localName} ${shortName}`);
  const groups: Record<string, string[]> = {
    goalkeeper: ["goalkeeper", "portero", "arquero", "gk", "por"],
    defender: ["defender", "defensa", "def", "dfc", "lateral"],
    midfielder: ["midfielder", "centrocampista", "mediocentro", "medio", "mc", "mco", "mcd"],
    forward: ["forward", "delantero", "extremo", "punta", "dc", "sd", "ei", "ed"],
  };
  return (groups[providerPosition.toLowerCase()] ?? []).some((term) => local.includes(normalize(term)));
}

function minute(value: string | null | undefined) {
  if (typeof value !== "string" || !value.trim()) return 0;
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

  const sourceEntries = [lineups.homeTeam, lineups.awayTeam].flatMap((team) =>
    lineupPlayers(team).map(({ player }) => ({ team, player, externalKey: player.id ? String(player.id) : `${team.id}:${normalize(player.name)}` })));
  const externalKeys = [...new Set(sourceEntries.map((entry) => entry.externalKey))];
  const externalPlayerIds = [...new Set(sourceEntries.map(({ player }) => Number(player.id)).filter((id) => Number.isSafeInteger(id) && id > 0))];
  const seasonId = Number(match.season_id);
  const [teamMapResult, playersResult, positionsResult] = await Promise.all([
    supabase.from("external_team_mappings").select("external_team_id,team_id").eq("provider", "highlightly")
      .in("external_team_id", [lineups.homeTeam.id, lineups.awayTeam.id]),
    supabase.from("players").select("id,name,short_name,country_id,active"),
    supabase.from("positions").select("id,name,short_name").eq("active", true),
  ]);
  for (const result of [teamMapResult, playersResult, positionsResult]) if (result.error) throw new Error(result.error.message);
  const teamMap = new Map((teamMapResult.data ?? []).map((row) => [Number(row.external_team_id), Number(row.team_id)]));
  const positions = positionsResult.data ?? [];
  const localTeamIds = [...teamMap.values()];
  const [linkedPlayersResult, rosterResult] = await Promise.all([
    externalKeys.length && localTeamIds.length
      ? supabase.from("external_player_mappings").select("external_player_key,external_player_id,player_id,position_id,team_id,season_id,shirt_number,source_name").eq("provider", "highlightly").eq("season_id", seasonId).eq("status", "linked").in("team_id", localTeamIds).in("external_player_key", externalKeys)
      : Promise.resolve({ data: [], error: null }),
    localTeamIds.length
      ? supabase.from("hist_player_teams").select("player_id,team_id,season_id,shirt_number,position_id")
        .eq("season_id", seasonId).in("team_id", localTeamIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (linkedPlayersResult.error || rosterResult.error) throw new Error(linkedPlayersResult.error?.message ?? rosterResult.error?.message);
  const rosterRows = rosterResult.data ?? [];
  const [linkedByIdResult, linkedRosterResult] = await Promise.all([
    externalPlayerIds.length && localTeamIds.length
      ? supabase.from("external_player_mappings").select("external_player_key,external_player_id,player_id,position_id,team_id,season_id,shirt_number,source_name").eq("provider", "highlightly").eq("season_id", seasonId).eq("status", "linked").in("team_id", localTeamIds).in("external_player_id", externalPlayerIds).limit(5000)
      : Promise.resolve({ data: [], error: null }),
    localTeamIds.length && rosterRows.length
      ? supabase.from("external_player_mappings").select("external_player_key,external_player_id,player_id,position_id,team_id,season_id,shirt_number,source_name").eq("provider", "highlightly").eq("status", "linked").eq("season_id", seasonId).in("team_id", localTeamIds).in("shirt_number", [...new Set(rosterRows.map((row) => Number(row.shirt_number)).filter(Number.isFinite))]).limit(5000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (linkedByIdResult.error || linkedRosterResult.error) throw new Error(linkedByIdResult.error?.message ?? linkedRosterResult.error?.message);
  const linkedPlayers = new Map((linkedPlayersResult.data ?? []).map((row) => [`${row.external_player_key}:${row.team_id}`, row]));
  const playersById = new Map((playersResult.data ?? []).map((player) => [Number(player.id), player]));
  const linkedByExternalId = new Map((linkedByIdResult.data ?? []).filter((row) => row.external_player_id != null)
    .map((row) => [`${row.external_player_id}:${row.team_id}`, row]));
  const linkedHistory = [...(linkedRosterResult.data ?? [])];
  const participants: Array<Record<string, unknown>> = [];
  let pending = 0;

  for (const sourceTeam of [lineups.homeTeam, lineups.awayTeam]) {
    const teamId = teamMap.get(Number(sourceTeam.id));
    if (!teamId) throw new Error(`El equipo ${sourceTeam.name} no está asociado con un equipo de Value90.`);
    for (const entry of lineupPlayers(sourceTeam)) {
      const player = entry.player;
      const externalKey = player.id ? String(player.id) : `${sourceTeam.id}:${normalize(player.name)}`;
      const knownMapping = linkedPlayers.get(`${externalKey}:${teamId}`)
        ?? (player.id ? linkedByExternalId.get(`${player.id}:${teamId}`) : undefined)
        ?? linkedHistory.find((row) => Number(row.team_id) === teamId && Number(row.season_id) === seasonId
          && Number(row.shirt_number) === Number(player.number)
          && row.player_id != null
          && nameMatchesAbbreviation(player.name, String(playersById.get(Number(row.player_id))?.name ?? row.source_name), String(playersById.get(Number(row.player_id))?.short_name ?? "")));
      const linkedPlayer = knownMapping?.player_id
        ? playersById.get(Number(knownMapping.player_id)) ?? null
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
        ?? knownMapping?.position_id;
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
    const saved = await supabase.from("participations").upsert(participants, { onConflict: "match_id,player_id", defaultToNull: false });
    if (saved.error) throw new Error(saved.error.message);
  }
  const mark = await supabase.from("external_match_mappings").update({ lineup_synced_at: new Date().toISOString(), next_lineup_sync_at: null, last_sync_error: null, updated_at: new Date().toISOString() })
    .eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
  if (mark.error) throw new Error(mark.error.message);
  return { matchId: mapping.match_id, participants: participants.length, pendingPlayers: pending };
}

async function syncHighlightlyResult(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  mapping: SyncMapping,
  match: SyncMatch,
  options: { deferV90?: boolean; automaticAttempt?: boolean } = {},
) {
  const matchResponse = await getHighlightlyMatch(Number(mapping.external_match_id));
  let callsUsed = 1;
  let callsRemaining = matchResponse.remaining;
  let callsLimit = matchResponse.limit;
  const { body } = matchResponse;
  const matchRecord = Array.isArray(body) ? body[0] : body;
  if (!matchRecord) throw new Error("Highlightly no devolvió el partido solicitado.");
  const detail = matchRecord as HighlightlyMatch & { events?: HighlightlyEvent[] };
  const state = detail.state?.description ?? "Unknown";
  if (!isTerminal(state)) {
    const nextAttemptAt = options.automaticAttempt
      ? await scheduleAutomaticRetry(supabase, mapping, Number(mapping.result_attempts ?? 0), `Highlightly todavía indica «${state}».`)
      : null;
    if (!options.automaticAttempt) {
      const retry = await supabase.from("external_match_mappings").update({ next_result_sync_at: null, last_sync_error: `Highlightly todavía indica «${state}». Reintenta manualmente cuando haya finalizado.`, updated_at: new Date().toISOString() })
        .eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
      if (retry.error) throw new Error(retry.error.message);
    }
    return { matchId: mapping.match_id, waiting: true, nextAttemptAt, attempts: Number(mapping.result_attempts ?? 0), callsUsed, callsRemaining, callsLimit };
  }

  const [homeScore, awayScore] = score(detail.state?.score?.current);
  const { data: homeTeam, error: homeTeamError } = await supabase.from("teams").select("stadium").eq("id", match.home_team_id).maybeSingle();
  if (homeTeamError) throw new Error(homeTeamError.message);
  const updatedMatch = await supabase.from("matches").update({
    home_score: homeScore,
    away_score: awayScore,
    status: isCancelled(state) ? "Cancelado" : "Jugado",
    stadium: detail.venue?.name ?? detail.stadium ?? homeTeam?.stadium ?? null,
  }).eq("id", mapping.match_id);
  if (updatedMatch.error) throw new Error(updatedMatch.error.message);

  let lineupSummary: { participants: number; pendingPlayers: number } | null = null;
  if (!isCancelled(state) && !mapping.lineup_synced_at) {
    const lineupResponse = await getHighlightlyLineups(Number(mapping.external_match_id));
    callsUsed += 1;
    callsRemaining = lineupResponse.remaining;
    callsLimit = lineupResponse.limit;
    lineupSummary = await syncLineup(supabase, mapping, match, lineupResponse.body);
  }

  const boxScoreResponse = !isCancelled(state)
    ? await getHighlightlyBoxScore(Number(mapping.external_match_id))
    : { body: [], remaining: callsRemaining, limit: callsLimit };
  if (!isCancelled(state)) callsUsed += 1;
  callsRemaining = boxScoreResponse.remaining;
  callsLimit = boxScoreResponse.limit;
  const boxScoreTeams = boxScoreResponse.body;
  const providerHasIndividualStats = boxScoreTeams.some((team) => (team.players ?? []).some((player) => player.statistics != null));
  let events = Array.isArray(detail.events) ? detail.events : [];
  if (!isCancelled(state) && !events.length && boxScoreTeams.some((team) => (team.players ?? []).some((player) => player.isSubstitute && Number(player.minutesPlayed) === 0))) {
    const eventResponse = await getHighlightlyEvents(Number(mapping.external_match_id));
    callsUsed += 1;
    callsRemaining = eventResponse.remaining;
    callsLimit = eventResponse.limit;
    events = eventResponse.body;
  }
  const substitutions = events.filter((event) => event.type?.toLowerCase() === "substitution" && event.player && event.substituted);
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
  const statsByPlayerId = new Map<number, HighlightlyBoxScorePlayerStatistics>();
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
        source_statistics: Array.isArray(sourcePlayer.statistics)
          ? sourcePlayer.statistics[0] ?? null
          : sourcePlayer.statistics ?? null,
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
        const providerStats = Array.isArray(sourcePlayer.statistics)
          ? sourcePlayer.statistics[0]
          : sourcePlayer.statistics;
        if (providerStats) statsByPlayerId.set(Number(playerMapping.player_id), providerStats);
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
  const unusedPendingSubstituteKeys = [...changedMappings.values()]
    .filter((row) => row.status === "pending" && !row.is_starting_xi
      && Number(row.minutes_played) === 0 && row.substitute_in_minute == null)
    .map((row) => String(row.external_player_key));
  if (unusedPendingSubstituteKeys.length) {
    const removed = await supabase.from("external_player_mappings").delete()
      .eq("provider", "highlightly").eq("match_id", mapping.match_id)
      .in("external_player_key", unusedPendingSubstituteKeys);
    if (removed.error) throw new Error(removed.error.message);
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
    const savedParticipations = await supabase.from("participations").upsert([...participationByPlayerId.values()], { onConflict: "match_id,player_id", defaultToNull: false });
    if (savedParticipations.error) throw new Error(savedParticipations.error.message);
  }

  let importedPlayerStats = 0;
  if (statsByPlayerId.size) {
    const savedParticipationIds = await supabase.from("participations")
      .select("id,player_id").eq("match_id", mapping.match_id)
      .in("player_id", [...statsByPlayerId.keys()]);
    if (savedParticipationIds.error) throw new Error(savedParticipationIds.error.message);
    const participationIdByPlayer = new Map((savedParticipationIds.data ?? [])
      .map((row) => [Number(row.player_id), Number(row.id)]));
    const playerStatsRows = [...statsByPlayerId.entries()].flatMap(([playerId, stats]) => {
      const participationId = participationIdByPlayer.get(playerId);
      if (!participationId) return [];
      const count = (value: number | undefined) => Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
      return [{
        participation_id: participationId,
        goals: count(stats.goalsScored),
        shots: count(stats.shotsTotal),
        shots_on_target: count(stats.shotsOnTarget),
        dribbles: count(stats.dribblesTotal),
        dribbles_completed: count(stats.dribblesSuccessful),
        assists: count(stats.assists),
        duels: count(stats.duelsTotal),
        duels_won: count(stats.duelsWon),
        recoveries: count(stats.interceptionsTotal),
        saves: count(stats.goalsSaved),
        tackles: count(stats.tacklesTotal),
        passes: count(stats.passesTotal),
        passes_completed: count(stats.passesSuccessful),
        yellow_cards: count(stats.cardsYellow),
        red_cards: count(stats.cardsRed),
      }];
    });
    if (playerStatsRows.length) {
      const savedStats = await supabase.from("player_match_stats")
        .upsert(playerStatsRows, { onConflict: "participation_id" });
      if (savedStats.error) throw new Error(savedStats.error.message);
      importedPlayerStats = playerStatsRows.length;
    }
  }

  if (options.automaticAttempt && !isCancelled(state) && !providerHasIndividualStats) {
    const attempt = Number(mapping.result_attempts ?? 0);
    const nextAttemptAt = await scheduleAutomaticRetry(supabase, mapping, attempt, "El partido terminó, pero Highlightly todavía no devolvió estadísticas individuales importables.");
    return { matchId: mapping.match_id, waiting: true, pendingStatistics: true, attempts: attempt, nextAttemptAt, callsUsed, callsRemaining, callsLimit };
  }

  const ownRating = await recalculateMatchOwnRating(supabase, Number(mapping.match_id), match, {
    calculateV90: options.deferV90 !== true,
  });
  const marked = await supabase.from("external_match_mappings").update({ final_synced_at: new Date().toISOString(), next_result_sync_at: null, last_sync_error: null, updated_at: new Date().toISOString() })
    .eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
  if (marked.error) throw new Error(marked.error.message);
  return { matchId: mapping.match_id, status: isCancelled(state) ? "Cancelado" : "Jugado", score: `${homeScore ?? "?"}-${awayScore ?? "?"}`, substitutions: substitutions.length, importedPlayerStats, ownRatings: ownRating.calculated, ownRatingNote: ownRating.reason, ...lineupSummary, callsUsed, callsRemaining, callsLimit };
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const cronAuthorized = Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
  const sessionClient = cronAuthorized ? null : await createClient();
  const user = sessionClient ? (await sessionClient.auth.getUser()).data.user : null;
  if (!cronAuthorized && !user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({})) as { matchId?: number | string; deferV90?: boolean; automaticAttempt?: boolean };
    const manualMatchId = body.matchId == null ? null : Number(body.matchId);
    if (manualMatchId == null || !Number.isSafeInteger(manualMatchId) || manualMatchId <= 0) {
      return NextResponse.json({ error: "Selecciona un partido para sincronizar manualmente." }, { status: 400 });
    }
    const supabase = cronAuthorized || !sessionClient ? createAdminSupabaseClient() : sessionClient;
    const { data: mappings, error } = await supabase.from("external_match_mappings")
      .select("provider,external_match_id,match_id,lineup_synced_at,final_synced_at,next_result_sync_at,result_attempts,last_sync_error,match:matches!inner(id,date,status,season_id,competition_id,home_team_id,away_team_id)")
      .eq("provider", "highlightly").eq("match_id", manualMatchId).order("external_match_id", { ascending: true }).limit(1000);
    if (error) throw error;
    const candidates = mappings ?? [];
    if (manualMatchId != null && !candidates.length) {
      return NextResponse.json({ error: "Este partido no está asociado a Highlightly. Impórtalo primero desde su fecha." }, { status: 404 });
    }
    const results: Array<Record<string, unknown>> = [];
    for (const mapping of candidates) {
      const match = Array.isArray(mapping.match) ? mapping.match[0] : mapping.match;
      if (!match) continue;
      let attemptMapping: SyncMapping = mapping;
      try {
        if (cronAuthorized && body.automaticAttempt === true) {
          const attempts = Number(mapping.result_attempts ?? 0) + 1;
          const started = await supabase.from("external_match_mappings").update({ result_attempts: attempts, updated_at: new Date().toISOString() })
            .eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id)
            .is("final_synced_at", null).select("external_match_id").maybeSingle();
          if (started.error) throw new Error(started.error.message);
          if (!started.data) continue;
          attemptMapping = { ...mapping, result_attempts: attempts };
        }
        results.push({ phase: "resultado-final-y-participaciones", ...await syncHighlightlyResult(supabase, attemptMapping, match, {
          deferV90: cronAuthorized && body.deferV90 === true,
          automaticAttempt: cronAuthorized && body.automaticAttempt === true,
        }) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error sincronizando resultado.";
        if (cronAuthorized && body.automaticAttempt === true) {
          await scheduleAutomaticRetry(supabase, attemptMapping, Number(attemptMapping.result_attempts ?? 0), message);
        } else {
          await supabase.from("external_match_mappings").update({ last_sync_error: message, updated_at: new Date().toISOString() }).eq("provider", "highlightly").eq("external_match_id", mapping.external_match_id);
        }
        results.push({ phase: "resultado", matchId: mapping.match_id, error: message });
      }
    }
    return NextResponse.json({ ok: true, manual: true, checked: candidates.length, processed: results.length, results });
  } catch (error) {
    console.error("Error en sincronización automática Highlightly:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error en sincronización." }, { status: 500 });
  }
}

export async function GET() {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Falta configurar el acceso de administración a Supabase." }, { status: 503 });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: mappings, error } = await supabase.from("external_match_mappings")
      .select("external_match_id,match_id,final_synced_at,last_sync_error,result_attempts,next_result_sync_at,match:matches!inner(id,date,status,home_score,away_score,stadium,home_team_id,away_team_id,competition_id,season_id,stage_id)")
      .eq("provider", "highlightly").limit(1000);
    if (error) throw error;
    const rows = (mappings ?? []).map((mapping) => ({
      mapping,
      match: Array.isArray(mapping.match) ? mapping.match[0] : mapping.match,
    })).filter((item) => item.match);
    const teamIds = [...new Set(rows.flatMap(({ match }) => [Number(match.home_team_id), Number(match.away_team_id)]))];
    const competitionIds = [...new Set(rows.map(({ match }) => Number(match.competition_id)))];
    const stageIds = [...new Set(rows.map(({ match }) => Number(match.stage_id)))];
    const seasonIds = [...new Set(rows.map(({ match }) => Number(match.season_id)))];
    const [teamsResult, competitionsResult, stagesResult, seasonsResult] = await Promise.all([
      teamIds.length ? supabase.from("teams").select("id,name").in("id", teamIds) : Promise.resolve({ data: [], error: null }),
      competitionIds.length ? supabase.from("competitions").select("id,name").in("id", competitionIds) : Promise.resolve({ data: [], error: null }),
      stageIds.length ? supabase.from("stages").select("id,name").in("id", stageIds) : Promise.resolve({ data: [], error: null }),
      seasonIds.length ? supabase.from("seasons").select("id,name,start_date").in("id", seasonIds) : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [teamsResult, competitionsResult, stagesResult, seasonsResult]) if (result.error) throw result.error;
    const teams = teamsResult.data;
    const names = new Map((teams ?? []).map((team) => [Number(team.id), String(team.name)]));
    const competitionNames = new Map((competitionsResult.data ?? []).map((item) => [Number(item.id), String(item.name)]));
    const stageNames = new Map((stagesResult.data ?? []).map((item) => [Number(item.id), String(item.name)]));
    const seasonYears = new Map((seasonsResult.data ?? []).map((item) => [Number(item.id), Number(String(item.start_date ?? "").slice(0, 4)) || Number(String(item.name).match(/20\d{2}/)?.[0]) || null]));
    const matches = rows.map(({ mapping, match }) => ({
      matchId: Number(mapping.match_id),
      date: String(match.date),
      seasonYear: seasonYears.get(Number(match.season_id)) ?? null,
      status: String(match.status ?? ""),
      homeScore: match.home_score == null ? null : Number(match.home_score),
      awayScore: match.away_score == null ? null : Number(match.away_score),
      home: names.get(Number(match.home_team_id)) ?? "Equipo local",
      away: names.get(Number(match.away_team_id)) ?? "Equipo visitante",
      competitionId: Number(match.competition_id),
      competition: competitionNames.get(Number(match.competition_id)) ?? "",
      stageId: Number(match.stage_id),
      stage: stageNames.get(Number(match.stage_id)) ?? "",
      finalSynced: Boolean(mapping.final_synced_at),
      syncError: mapping.last_sync_error == null ? null : String(mapping.last_sync_error),
      resultAttempts: Number(mapping.result_attempts ?? 0),
      nextAttemptAt: mapping.next_result_sync_at == null ? null : String(mapping.next_result_sync_at),
    })).filter((match) => new Date(match.date).getTime() <= Date.now())
      .sort((a, b) => Number(Boolean(b.syncError)) - Number(Boolean(a.syncError))
        || Number(a.finalSynced) - Number(b.finalSynced)
        || new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Error consultando partidos importados:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron consultar los partidos." }, { status: 500 });
  }
}

