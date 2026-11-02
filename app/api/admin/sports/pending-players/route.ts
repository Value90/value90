import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
    .replace(/\b(fc|cf|club|de|del|the|afc|sc)\b/g, " ").replace(/[^a-z0-9]/g, "");
}

function editSimilarity(a: string, b: string) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  if (Math.abs(a.length - b.length) / Math.max(a.length, b.length) > 0.55) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1));
    }
    previous = current;
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

function similarity(source: string, candidate: string) {
  const left = normalize(source);
  const right = normalize(candidate);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftTokens = new Set(source.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").split(/[^a-z0-9]+/).filter(Boolean));
  const rightTokens = new Set(candidate.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").split(/[^a-z0-9]+/).filter(Boolean));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const tokenScore = shared ? (2 * shared) / (leftTokens.size + rightTokens.size) : 0;
  const sortedTokenScore = normalize([...leftTokens].sort().join(" ")) === normalize([...rightTokens].sort().join(" ")) ? 1 : 0;
  return Math.max(editSimilarity(left, right), tokenScore, sortedTokenScore);
}

function playerSuggestions(sourceName: string, players: Array<{ id: number; name: string; short_name: string | null; country_id: number | null; birth_date: string | null }>, excludedId: number | null) {
  return players.flatMap((player) => {
    if (Number(player.id) === excludedId) return [];
    const score = Math.max(similarity(sourceName, player.name), similarity(sourceName, player.short_name ?? ""));
    return score >= 0.4 ? [{ id: Number(player.id), name: String(player.name), score: Math.round(score * 100), countryId: player.country_id == null ? null : Number(player.country_id), birthDate: player.birth_date }] : [];
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "es")).slice(0, 5);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para revisar jugadores." }, { status: 401 });

  const { data: mappings, error } = await supabase.from("external_player_mappings")
    .select("provider,external_player_key,external_player_id,player_id,status,source_name,team_id,season_id,shirt_number,position_id,match_id,is_starting_xi,captain,minutes_played,substitute_in_minute,substitute_out_minute,review_decision")
    .eq("status", "pending").order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = mappings ?? [];
  if (!rows.length) return NextResponse.json({ pending: [] });

  const teamIds = [...new Set(rows.map((row) => Number(row.team_id)))];
  const matchIds = [...new Set(rows.map((row) => Number(row.match_id)))];
  const matchesResult = await supabase.from("matches").select("id,date,status,home_team_id,away_team_id").in("id", matchIds);
  if (matchesResult.error) return NextResponse.json({ error: matchesResult.error.message }, { status: 500 });
  const allTeamIds = [...new Set([...teamIds, ...(matchesResult.data ?? []).flatMap((match) => [Number(match.home_team_id), Number(match.away_team_id)])])];
  const teamsResult = allTeamIds.length
    ? await supabase.from("teams").select("id,name").in("id", allTeamIds)
    : { data: [], error: null };
  if (teamsResult.error) return NextResponse.json({ error: teamsResult.error.message }, { status: 500 });
  const players: Array<{ id: number; name: string; short_name: string | null; country_id: number | null; birth_date: string | null; active: boolean }> = [];
  for (let from = 0; ; from += 1000) {
    const page = await supabase.from("players").select("id,name,short_name,country_id,birth_date,active").order("name").range(from, from + 999);
    if (page.error) return NextResponse.json({ error: page.error.message }, { status: 500 });
    players.push(...(page.data ?? []));
    if ((page.data ?? []).length < 1000) break;
  }
  const teams = new Map((teamsResult.data ?? []).map((team) => [Number(team.id), team]));
  const matches = new Map((matchesResult.data ?? []).map((match) => [Number(match.id), match]));
  const playerById = new Map(players.map((player) => [Number(player.id), player]));
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.provider}:${row.external_player_key}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  const pending = [...grouped.entries()].map(([groupKey, occurrences]) => {
    const first = occurrences[0];
    const positionId = occurrences.find((item) => item.position_id != null)?.position_id ?? null;
    const provisionalIds = [...new Set(occurrences.map((item) => Number(item.player_id)).filter(Number.isFinite))];
    const provisionalId = provisionalIds.length === 1 ? provisionalIds[0] : null;
    const provisional = provisionalId == null ? null : playerById.get(provisionalId) ?? null;
    return {
      provider: first.provider,
      external_player_key: first.external_player_key,
      source_name: first.source_name,
      team_id: Number(first.team_id),
      team_name: teams.get(Number(first.team_id))?.name ?? "Equipo por identificar",
      season_id: Number(first.season_id),
      shirt_number: first.shirt_number == null ? null : Number(first.shirt_number),
      position_id: positionId == null ? null : Number(positionId),
      is_starting_xi: Boolean(first.is_starting_xi),
      provisional_player: provisional ? { id: Number(provisional.id), name: String(provisional.name), shortName: String(provisional.short_name ?? ""), countryId: provisional.country_id == null ? null : Number(provisional.country_id), birthDate: provisional.birth_date ?? null, active: Boolean(provisional.active) } : null,
      suggestions: playerSuggestions(String(first.source_name), players, provisionalId),
      occurrences: occurrences.map((item) => {
        const match = matches.get(Number(item.match_id));
        return {
          match_id: Number(item.match_id),
          date: match?.date ?? null,
          fixture: match ? `${teams.get(Number(match.home_team_id))?.name ?? "Local"} vs. ${teams.get(Number(match.away_team_id))?.name ?? "Visitante"}` : `Partido ${item.match_id}`,
          status: match?.status ?? null,
          is_starting_xi: Boolean(item.is_starting_xi),
          minutes_played: item.minutes_played == null ? null : Number(item.minutes_played),
        };
      }).sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? ""))),
      _key: groupKey,
    };
  });
  return NextResponse.json({ pending });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para asociar jugadores." }, { status: 401 });
  const body = await request.json().catch(() => null) as { provider?: string; external_player_key?: string; player_id?: number; position_id?: number; decision?: "matched_existing" | "confirmed_new" } | null;
  if (!body?.external_player_key || !Number.isInteger(body.player_id) || !["matched_existing", "confirmed_new"].includes(body.decision ?? "")) {
    return NextResponse.json({ error: "Selecciona una ficha y confirma si es existente o una nueva ficha revisada." }, { status: 400 });
  }

  const provider = body.provider ?? "highlightly";
  const { data: mappings, error: mappingError } = await supabase.from("external_player_mappings").select("*")
    .eq("provider", provider).eq("external_player_key", body.external_player_key).eq("status", "pending");
  if (mappingError || !mappings?.length) return NextResponse.json({ error: mappingError?.message ?? "La incidencia ya no está pendiente." }, { status: 404 });
  const { data: player, error: playerError } = await supabase.from("players").select("id").eq("id", body.player_id).maybeSingle();
  if (playerError || !player) return NextResponse.json({ error: playerError?.message ?? "El jugador seleccionado no existe." }, { status: 404 });
  if (mappings.some((mapping) => !mapping.position_id && !body.position_id)) {
    return NextResponse.json({ error: "Selecciona una posición para completar la ficha de participación." }, { status: 400 });
  }

  const matchIds = [...new Set(mappings.map((item) => Number(item.match_id)))];
  const oldPlayerIds = [...new Set(mappings.map((item) => Number(item.player_id)).filter((id) => Number.isFinite(id) && id !== Number(player.id)))];
  const [oldParticipationResult, existingRosterResult] = await Promise.all([
    oldPlayerIds.length ? supabase.from("participations").select("*").in("match_id", matchIds).in("player_id", oldPlayerIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("hist_player_teams").select("id,player_id,team_id,season_id,position_id,shirt_number,active")
      .eq("player_id", player.id).in("team_id", [...new Set(mappings.map((item) => Number(item.team_id)))])
      .in("season_id", [...new Set(mappings.map((item) => Number(item.season_id)))]),
  ]);
  if (oldParticipationResult.error) return NextResponse.json({ error: oldParticipationResult.error.message }, { status: 500 });
  if (existingRosterResult.error) return NextResponse.json({ error: existingRosterResult.error.message }, { status: 500 });
  const oldParticipationByMatch = new Map((oldParticipationResult.data ?? []).map((row) => [Number(row.match_id), row]));

  const participationRows = mappings.flatMap((mapping) => {
    const oldRow = oldParticipationByMatch.get(Number(mapping.match_id));
    const minutes = oldRow ? Number(oldRow.minutes_played) : Number(mapping.minutes_played ?? 0);
    const enteredAt = oldRow?.substitute_in_minute ?? mapping.substitute_in_minute ?? null;
    if (!mapping.is_starting_xi && minutes <= 0 && enteredAt == null) return [];
    const oldParticipation = oldRow ? { ...oldRow } : {};
    delete oldParticipation.id;
    delete oldParticipation.created_at;
    return [{
      ...oldParticipation,
      match_id: Number(mapping.match_id), player_id: Number(player.id), team_id: Number(mapping.team_id),
      position_id: oldRow?.position_id ?? mapping.position_id ?? body.position_id,
      shirt_number: mapping.shirt_number ?? oldRow?.shirt_number ?? 0,
      is_starting_xi: Boolean(mapping.is_starting_xi), minutes_played: minutes,
      captain: Boolean(mapping.captain ?? oldRow?.captain),
      substitute_in_minute: enteredAt,
      substitute_out_minute: oldRow?.substitute_out_minute ?? mapping.substitute_out_minute ?? null,
    }];
  });
  if (participationRows.some((row) => row.position_id == null)) {
    return NextResponse.json({ error: "Falta una posición en una de las participaciones. Completa la posición antes de vincular." }, { status: 400 });
  }
  if (participationRows.length) {
    const saved = await supabase.from("participations").upsert(participationRows, { onConflict: "match_id,player_id" });
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 500 });
  }

  const rosterKeys = new Set<string>();
  const rosterRows = participationRows.flatMap((row) => {
    const mapping = mappings.find((item) => Number(item.match_id) === row.match_id);
    if (!mapping) return [];
    const key = `${mapping.team_id}:${mapping.season_id}`;
    if (rosterKeys.has(key)) return [];
    rosterKeys.add(key);
    return [{ player_id: Number(player.id), team_id: Number(mapping.team_id), season_id: Number(mapping.season_id), position_id: Number(row.position_id), shirt_number: Number(row.shirt_number ?? 0), active: true }];
  });
  const existingRoster = new Map((existingRosterResult.data ?? []).map((row) => [`${row.team_id}:${row.season_id}`, row]));
  const reactivatedRosterIds = rosterRows.flatMap((row) => {
    const existing = existingRoster.get(`${row.team_id}:${row.season_id}`);
    return existing && !existing.active ? [Number(existing.id)] : [];
  });
  if (reactivatedRosterIds.length) {
    const reactivated = await supabase.from("hist_player_teams").update({ active: true }).in("id", reactivatedRosterIds);
    if (reactivated.error) return NextResponse.json({ error: reactivated.error.message }, { status: 500 });
  }
  const missingRosterRows = rosterRows.filter((row) => !existingRoster.has(`${row.team_id}:${row.season_id}`));
  if (missingRosterRows.length) {
    const saved = await supabase.from("hist_player_teams").insert(missingRosterRows);
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 500 });
  }

  const updatedMappings = await supabase.from("external_player_mappings").update({
    player_id: player.id, status: "linked", review_decision: body.decision,
    reviewed_at: new Date().toISOString(), position_id: body.position_id ?? undefined, updated_at: new Date().toISOString(),
  }).eq("provider", provider).eq("external_player_key", body.external_player_key).eq("status", "pending");
  if (updatedMappings.error) return NextResponse.json({ error: updatedMappings.error.message }, { status: 500 });

  const oldRows = oldParticipationResult.data ?? [];
  if (oldRows.length) {
    const removed = await supabase.from("participations").delete().in("id", oldRows.map((row) => Number(row.id)));
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  }

  const affectedRosterRows = await supabase.from("hist_player_teams").select("id,player_id,team_id,season_id")
    .in("player_id", oldPlayerIds);
  if (affectedRosterRows.error) return NextResponse.json({ error: affectedRosterRows.error.message }, { status: 500 });
  const mappingPairs = new Set(mappings.map((item) => `${item.team_id}:${item.season_id}`));
  const obsoleteRosterIds = (affectedRosterRows.data ?? []).filter((row) => mappingPairs.has(`${row.team_id}:${row.season_id}`)).map((row) => Number(row.id));
  if (obsoleteRosterIds.length) {
    const archived = await supabase.from("hist_player_teams").update({ active: false }).in("id", obsoleteRosterIds);
    if (archived.error) return NextResponse.json({ error: archived.error.message }, { status: 500 });
  }

  let deactivatedProvisionalPlayers = 0;
  for (const oldPlayerId of oldPlayerIds) {
    const [otherMappings, otherParticipations, activeRoster, ratings, stats, marketValue, marketHistory] = await Promise.all([
      supabase.from("external_player_mappings").select("external_player_key", { count: "exact", head: true }).eq("player_id", oldPlayerId),
      supabase.from("participations").select("id", { count: "exact", head: true }).eq("player_id", oldPlayerId),
      supabase.from("hist_player_teams").select("id", { count: "exact", head: true }).eq("player_id", oldPlayerId).eq("active", true),
      supabase.from("fact_player_v90_match").select("id", { count: "exact", head: true }).eq("player_id", oldPlayerId),
      supabase.from("player_match_stats").select("id", { count: "exact", head: true }).eq("player_id", oldPlayerId),
      supabase.from("player_market_values").select("player_id", { count: "exact", head: true }).eq("player_id", oldPlayerId),
      supabase.from("player_market_value_history").select("id", { count: "exact", head: true }).eq("player_id", oldPlayerId),
    ]);
    if ([otherMappings, otherParticipations, activeRoster, ratings, stats, marketValue, marketHistory].some((result) => result.error)) continue;
    if (![otherMappings, otherParticipations, activeRoster, ratings, stats, marketValue, marketHistory].some((result) => result.count)) {
      const archived = await supabase.from("players").update({ active: false }).eq("id", oldPlayerId);
      if (!archived.error) deactivatedProvisionalPlayers += 1;
    }
  }

  return NextResponse.json({ ok: true, linkedParticipations: participationRows.length, rosterTeams: rosterRows.length, deactivatedProvisionalPlayers, decision: body.decision });
}
