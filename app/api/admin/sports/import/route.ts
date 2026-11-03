import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHighlightlyMatches, type HighlightlyMatch } from "@/lib/highlightly.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEASON_YEAR = 2026;
const TARGETS = {
  laliga: { leagueId: 119924, competition: "laliga" as const, competitionName: "LaLiga" },
  champions: { leagueId: 2486, competition: "champions" as const, competitionName: "Champions League" },
} as const;
const MAX_DATE_RANGE_DAYS = 31;

const TEAM_ALIASES: Record<string, string[]> = {
  "deportivo la coruna": ["RC. Deportivo de A Coruña"], "real sociedad": ["Real Sociedad de Fútbol"],
  "real betis": ["Real Betis Balompie"], "bayern munich": ["FC Bayern München"],
  "slovan bratislava": ["ŠK Slovan Bratislava"], porto: ["FC. Oporto"], "fc porto": ["FC. Oporto"],
  napoli: ["Napoles"], espanyol: ["RCD. Espanyol"], alaves: ["Deportivo Alavés"],
  "celta de vigo": ["RC. Celta de Vigo"], lille: ["LOSC Lille"], lens: ["RC Lens"],
  fenerbahce: ["Fenerbahçe"], inter: ["Inter de Milán"], como: ["Como 1907"],
  "slavia praha": ["SK Slavia Praga"], "sabah fa": ["Sabah FK"], viking: ["Viking FK"],
  feyenoord: ["Feyenoord Rotterdam"], "aek athens fc": ["AEK Athens"], "bodø/glimt": ["Bodo/Glimt"],
  "lask linz": ["Linzer Athletik-Sport-Klub"], osasuna: ["CA. Osasuna"], levante: ["Levante UD."],
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(fc|cf|club|de|del|the|afc|sc)\b/g, " ").replace(/[^a-z0-9]/g, "");
}

function roundNumber(round: string) {
  const match = round.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function stageName(competition: "laliga" | "champions", round: string) {
  const number = roundNumber(round);
  if (number != null && (competition === "laliga" || /league\s+stage/i.test(round))) return `Jornada ${number}`;
  return `Champions League - ${round}`;
}

function findTeam(teams: Array<{ id: number; name: string; short_name: string | null; stadium: string | null }>, name: string) {
  const key = normalize(name);
  return teams.find((team) => normalize(team.name) === key || normalize(team.short_name ?? "") === key)
    ?? TEAM_ALIASES[name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()]
      ?.map((alias) => teams.find((team) => normalize(team.name) === normalize(alias) || normalize(team.short_name ?? "") === normalize(alias)))
      .find(Boolean);
}

function isFinished(match: HighlightlyMatch) {
  return /finished|full.?time|after (penalt|over.?time)|awarded/i.test(match.state?.description ?? "");
}

function isCancelled(match: HighlightlyMatch) {
  return /cancel|abandoned/i.test(match.state?.description ?? "");
}

function parseScore(value: string | null | undefined) {
  const match = value?.match(/(\d+)\s*[-:]\s*(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] as const : [null, null] as const;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function dateRange(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  if (days < 1 || days > MAX_DATE_RANGE_DAYS) throw new Error(`El intervalo debe incluir entre 1 y ${MAX_DATE_RANGE_DAYS} días.`);
  return Array.from({ length: days }, (_, index) => new Date(startDate.getTime() + index * 86_400_000).toISOString().slice(0, 10));
}

async function fetchAllLeagueMatches(leagueId: number) {
  const matches: HighlightlyMatch[] = [];
  let total = Number.POSITIVE_INFINITY;
  let remaining: string | null = null;
  let limit: string | null = null;
  let requests = 0;
  let quotaExhausted = false;
  for (let offset = 0; offset < total; offset += 100) {
    const response = await getHighlightlyMatches(leagueId, SEASON_YEAR, offset);
    requests += 1;
    remaining = response.remaining;
    limit = response.limit;
    const page = response.body;
    if (!page?.pagination || !Array.isArray(page.data)) throw new Error("Highlightly devolvió una respuesta de calendario no válida.");
    matches.push(...page.data);
    total = page.pagination.totalCount;
    if (!page.data.length) break;
    if (remaining === "0" && offset + 100 < total) {
      quotaExhausted = true;
      break;
    }
  }
  return { matches, remaining, limit, requests, quotaExhausted };
}

async function fetchMatchesForDates(leagueId: number, dates: string[]) {
  const matches: HighlightlyMatch[] = [];
  let remaining: string | null = null;
  let limit: string | null = null;
  let requests = 0;
  let quotaExhausted = false;
  dateLoop: for (const [dateIndex, date] of dates.entries()) {
    let total = Number.POSITIVE_INFINITY;
    for (let offset = 0; offset < total; offset += 100) {
      const response = await getHighlightlyMatches(leagueId, SEASON_YEAR, offset, date);
      requests += 1;
      remaining = response.remaining;
      limit = response.limit;
      const page = response.body;
      if (!page?.pagination || !Array.isArray(page.data)) throw new Error(`Highlightly devolvió una respuesta no válida para ${date}.`);
      matches.push(...page.data);
      total = page.pagination.totalCount;
      if (!page.data.length) break;
      if (remaining === "0" && (offset + 100 < total || dateIndex < dates.length - 1)) {
        quotaExhausted = true;
        break dateLoop;
      }
    }
  }
  return { matches, remaining, limit, requests, quotaExhausted };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para importar partidos." }, { status: 401 });

    const input = await request.json().catch(() => null) as {
      competition?: string; mode?: string; round?: number; startDate?: string; endDate?: string;
    } | null;
    if (!input || typeof input.competition !== "string" || !Object.prototype.hasOwnProperty.call(TARGETS, input.competition)) {
      return NextResponse.json({ error: "Selecciona LaLiga o Champions League." }, { status: 400 });
    }
    const target = TARGETS[input.competition as keyof typeof TARGETS];
    let fetched: { matches: HighlightlyMatch[]; remaining: string | null; limit: string | null; requests: number; quotaExhausted: boolean };
    if (input.mode === "round") {
      const maxRound = target.competition === "laliga" ? 38 : 8;
      if (!Number.isInteger(input.round) || Number(input.round) < 1 || Number(input.round) > maxRound) {
        return NextResponse.json({ error: `Selecciona una jornada entre 1 y ${maxRound}.` }, { status: 400 });
      }
      fetched = await fetchAllLeagueMatches(target.leagueId);
      fetched.matches = fetched.matches.filter((match) => Number(match.league?.season) === SEASON_YEAR && roundNumber(match.round) === Number(input.round));
    } else if (input.mode === "dates") {
      if (!isDate(input.startDate) || !isDate(input.endDate)) {
        return NextResponse.json({ error: "Indica una fecha inicial y final válidas." }, { status: 400 });
      }
      const dates = dateRange(input.startDate, input.endDate);
      fetched = await fetchMatchesForDates(target.leagueId, dates);
      fetched.matches = fetched.matches.filter((match) => Number(match.league?.season) === SEASON_YEAR);
    } else {
      return NextResponse.json({ error: "Selecciona si quieres importar una jornada o un periodo." }, { status: 400 });
    }

    const targetMatches = [...new Map(fetched.matches.map((match) => [Number(match.id), match])).values()];
    if (!targetMatches.length) {
      return NextResponse.json({ ok: true, imported: 0, skipped: 0, callsUsed: fetched.requests, callsRemaining: fetched.remaining, callsLimit: fetched.limit, quotaExhausted: fetched.quotaExhausted, message: "Highlightly no devolvió partidos para esos filtros." });
    }

    const [seasonsResult, competitionsResult, stagesResult, teamsResult] = await Promise.all([
      supabase.from("seasons").select("id,name,start_date,end_date,active"),
      supabase.from("competitions").select("id,name,short_name"),
      supabase.from("stages").select("id,season_id,name,display_order,active"),
      supabase.from("teams").select("id,name,short_name,stadium"),
    ]);
    for (const result of [seasonsResult, competitionsResult, stagesResult, teamsResult]) {
      if (result.error) throw new Error(result.error.message);
    }
    const season = (seasonsResult.data ?? []).find((item) => {
      const startYear = item.start_date ? Number(item.start_date.slice(0, 4)) : Number(normalize(item.name).match(/20\d{2}/)?.[0]);
      return startYear === SEASON_YEAR;
    });
    if (!season) throw new Error("No encuentro la temporada 2026/27 en la configuración. Créala antes de importar.");

    const competition = (competitionsResult.data ?? []).find((item) => {
      const name = normalize(`${item.name} ${item.short_name ?? ""}`);
      return target.competition === "laliga"
        ? name.includes("laliga") || name.includes("primeradivision")
        : name.includes("championsleague");
    });
    if (!competition) throw new Error(`Crea o activa ${target.competitionName} en Value90 antes de importar.`);

    const imported: Array<{ round: string; home: string; away: string; date: string }> = [];
    const skipped: Array<{ round: string; home: string; away: string; reason: string }> = [];
    const missingTeams = new Set<string>();
    for (const match of targetMatches) {
      const home = findTeam(teamsResult.data ?? [], match.homeTeam.name);
      const away = findTeam(teamsResult.data ?? [], match.awayTeam.name);
      if (!home || !away) {
        if (!home) missingTeams.add(match.homeTeam.name);
        if (!away) missingTeams.add(match.awayTeam.name);
        skipped.push({ round: match.round, home: match.homeTeam.name, away: match.awayTeam.name, reason: "Falta crear o asociar uno de los equipos en Value90." });
        continue;
      }

      const currentStageName = stageName(target.competition, match.round);
      let stage = (stagesResult.data ?? []).find((item) => item.season_id === season.id && item.name === currentStageName);
      if (!stage) {
        const displayOrder = Math.max(0, ...(stagesResult.data ?? []).filter((item) => item.season_id === season.id).map((item) => Number(item.display_order))) + 1;
        const created = await supabase.from("stages").insert({ season_id: season.id, name: currentStageName, display_order: displayOrder, active: true }).select("id,season_id,name,display_order,active").single();
        if (created.error) throw new Error(`No se pudo crear la jornada/fase ${currentStageName}: ${created.error.message}`);
        stage = created.data;
        stagesResult.data?.push(stage);
      }

      const { data: existingMapping, error: mappingError } = await supabase.from("external_match_mappings")
        .select("match_id").eq("provider", "highlightly").eq("external_match_id", match.id).maybeSingle();
      if (mappingError) throw new Error(`No se pudo consultar la asociación Highlightly: ${mappingError.message}`);
      let localMatchId = existingMapping?.match_id as number | undefined;
      if (!localMatchId) {
        const { data: possibleDuplicate, error: duplicateError } = await supabase.from("matches")
          .select("id").eq("season_id", season.id).eq("competition_id", competition.id)
          .eq("home_team_id", home.id).eq("away_team_id", away.id).eq("date", match.date).maybeSingle();
        if (duplicateError) throw new Error(`No se pudo comprobar si el partido ya existía: ${duplicateError.message}`);
        if (possibleDuplicate) {
          localMatchId = Number(possibleDuplicate.id);
          const savedMapping = await supabase.from("external_match_mappings").upsert({ provider: "highlightly", external_match_id: match.id, match_id: localMatchId });
          if (savedMapping.error) throw new Error(`No se pudo asociar el partido existente: ${savedMapping.error.message}`);
        }
      }

      const score = parseScore(match.state?.score?.current);
      const matchData = {
        competition_id: competition.id, season_id: season.id, stage_id: stage.id,
        home_team_id: home.id, away_team_id: away.id,
        home_score: isFinished(match) ? score[0] : null,
        away_score: isFinished(match) ? score[1] : null,
        date: match.date,
        stadium: match.venue?.name ?? match.stadium ?? home.stadium ?? null,
        status: isFinished(match) ? "Jugado" : isCancelled(match) ? "Cancelado" : "Programado",
        match_duration: 90,
      };
      if (localMatchId) {
        const updated = await supabase.from("matches").update(matchData).eq("id", localMatchId);
        if (updated.error) throw new Error(`No se pudo actualizar ${match.homeTeam.name}–${match.awayTeam.name}: ${updated.error.message}`);
      } else {
        const { data: localMatch, error: insertError } = await supabase.from("matches").insert(matchData).select("id").single();
        if (insertError) throw new Error(`No se pudo crear ${match.homeTeam.name}–${match.awayTeam.name}: ${insertError.message}`);
        localMatchId = Number(localMatch.id);
        const savedMapping = await supabase.from("external_match_mappings").insert({ provider: "highlightly", external_match_id: match.id, match_id: localMatchId });
        if (savedMapping.error) throw new Error(`Partido creado, pero no se pudo guardar su referencia externa: ${savedMapping.error.message}`);
      }

      for (const team of [{ external: match.homeTeam.id, local: home.id }, { external: match.awayTeam.id, local: away.id }]) {
        const mapped = await supabase.from("external_team_mappings").upsert({ provider: "highlightly", external_team_id: team.external, team_id: team.local }, { onConflict: "provider,external_team_id" });
        if (mapped.error) throw new Error(`No se pudo asociar el equipo ${team.local}: ${mapped.error.message}`);
      }
      imported.push({ round: match.round, home: match.homeTeam.name, away: match.awayTeam.name, date: match.date });
    }

    return NextResponse.json({
      ok: true, imported: imported.length, skipped: skipped.length, importedMatches: imported,
      skippedMatches: skipped, missingTeams: [...missingTeams], callsUsed: fetched.requests,
      callsRemaining: fetched.remaining, callsLimit: fetched.limit, quotaExhausted: fetched.quotaExhausted,
      message: `Importación completada${fetched.quotaExhausted ? " parcialmente: se alcanzó el límite diario de llamadas" : ""}. Se utilizaron ${fetched.requests} llamada(s) a Highlightly.`,
    });
  } catch (error) {
    console.error("Error importando calendario Highlightly:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo importar el calendario." }, { status: 500 });
  }
}
