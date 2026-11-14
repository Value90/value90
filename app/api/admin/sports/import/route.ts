import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getHighlightlyMatches, type HighlightlyMatch } from "@/lib/highlightly.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_SEASON_YEAR = 2026;
const TARGETS = {
  laliga: { leagueId: 119924, competition: "laliga" as const, competitionName: "LaLiga", matchesPerRound: 10, totalMatches: 380 },
  champions: { leagueId: 2486, competition: "champions" as const, competitionName: "Champions League", matchesPerRound: 18, totalMatches: 144 },
  worldcup: { leagueId: 1635, competition: "worldcup" as const, competitionName: "Copa Mundial FIFA", matchesPerRound: 16, totalMatches: 104 },
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
  mallorca: ["RCD Mallorca"], oviedo: ["Real Oviedo"],
  spain: ["España"], england: ["Inglaterra"], "cape verde": ["Cabo Verde"],
  "bosnia & herzegovina": ["Bosnia y Herzegovina"], "bosnia and herzegovina": ["Bosnia y Herzegovina"],
  "congo dr": ["RD. del Congo"], "dr congo": ["RD. del Congo"], "ivory coast": ["Costa de Marfil"],
  "cote d'ivoire": ["Costa de Marfil"], netherlands: ["Países Bajos"], "south africa": ["Sudáfrica"],
  "saudi arabia": ["Arabia Saudí"], turkey: ["TurquIa"], türkiye: ["TurquIa"], tunisia: ["Tunez"],
  "south korea": ["Corea del Sur"], "korea republic": ["Corea del Sur"], "czech republic": ["República Checa"],
  curacao: ["Curazao"], "united states": ["Estados Unidos"], usa: ["Estados Unidos"],
  france: ["Francia"], switzerland: ["Suiza"], norway: ["Noruega"], belgium: ["Bélgica"],
  morocco: ["Marruecos"], egypt: ["Egipto"], brazil: ["Brasil"], algeria: ["Argelia"],
  croatia: ["Croacia"], sweden: ["Suecia"], germany: ["Alemania"], japan: ["Japón"],
  jordan: ["Jordania"], "new zealand": ["Nueva Zelanda"], iraq: ["Irak"], scotland: ["Escocia"],
  qatar: ["Catar"],
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(fc|cf|club|de|del|the|afc|sc)\b/g, " ").replace(/[^a-z0-9]/g, "");
}

function roundNumber(round: string) {
  const match = round.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function stageName(competition: "laliga" | "champions" | "worldcup", round: string) {
  const number = roundNumber(round);
  if (number != null && (competition === "laliga" || /league\s+stage|group\s+stage/i.test(round))) return `Jornada ${number}`;
  if (competition === "worldcup") {
    const normalized = normalize(round);
    if (/roundof32|roundofthirtytwo|dieciseisavos/.test(normalized)) return "Dieciseisavos de final";
    if (/roundof16|roundofsixteen|octavos/.test(normalized)) return "Octavos de final";
    if (/quarterfinal/.test(normalized)) return "Cuartos de final";
    if (/semifinal/.test(normalized)) return "Semifinal";
    if (/thirdplace/.test(normalized)) return "Tercer puesto";
    if (/final/.test(normalized)) return "Final";
    return round;
  }
  return `Champions League - ${round}`;
}

function providerSeasonYear(competition: keyof typeof TARGETS, seasonYear: number) {
  return competition === "worldcup" ? seasonYear + 1 : seasonYear;
}

async function fetchMatchesForSeason(leagueId: number, seasonYear: number) {
  const matches: HighlightlyMatch[] = [];
  let remaining: string | null = null;
  let limit: string | null = null;
  let requests = 0;
  let quotaExhausted = false;
  let total = Number.POSITIVE_INFINITY;
  for (let offset = 0; offset < total; offset += 100) {
    if (remaining === "0") { quotaExhausted = true; break; }
    const response = await getHighlightlyMatches(leagueId, seasonYear, offset);
    requests += 1;
    remaining = response.remaining;
    limit = response.limit;
    const page = response.body;
    if (!page?.pagination || !Array.isArray(page.data)) throw new Error("Highlightly devolvió una respuesta de calendario no válida.");
    matches.push(...page.data);
    total = page.pagination.totalCount;
    if (!page.data.length) break;
  }
  return { matches, remaining, limit, requests, quotaExhausted };
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

async function fetchMatchesForRound(leagueId: number, seasonYear: number, round: number, matchesPerRound: number) {
  const pages = new Map<number, HighlightlyMatch[]>();
  let total = 0;
  let remaining: string | null = null;
  let limit: string | null = null;
  let requests = 0;
  let quotaExhausted = false;
  const fetchPage = async (offset: number) => {
    const response = await getHighlightlyMatches(leagueId, seasonYear, offset);
    requests += 1;
    remaining = response.remaining;
    limit = response.limit;
    const page = response.body;
    if (!page?.pagination || !Array.isArray(page.data)) throw new Error("Highlightly devolvió una respuesta de calendario no válida.");
    total = page.pagination.totalCount;
    pages.set(offset, page.data);
    return page.data;
  };

  await fetchPage(0);
  const estimatedIndex = Math.max(0, total - round * matchesPerRound);
  const targetOffset = Math.floor(estimatedIndex / 100) * 100;
  if (!pages.has(targetOffset)) {
    if (remaining !== "0") await fetchPage(targetOffset);
    else quotaExhausted = true;
  }
  const filterRound = (matches: HighlightlyMatch[]) => matches.filter((match) =>
    Number(match.league?.season) === seasonYear && roundNumber(match.round) === round);
  let targetMatches = [...new Map([...pages.values()].flat().map((match) => [Number(match.id), match])).values()]
    .filter((match) => Number(match.league?.season) === seasonYear);
  let matchingRound = filterRound(targetMatches);

  // If the provider's ordering/count does not line up with the expected fixtures
  // per round, scan pages not already fetched before reporting an empty round.
  if (!matchingRound.length && !quotaExhausted) {
    for (let offset = 0; offset < total; offset += 100) {
      if (pages.has(offset)) continue;
      if (remaining === "0") { quotaExhausted = true; break; }
      await fetchPage(offset);
    }
    targetMatches = [...new Map([...pages.values()].flat().map((match) => [Number(match.id), match])).values()]
      .filter((match) => Number(match.league?.season) === seasonYear);
    matchingRound = filterRound(targetMatches);
  }
  return { matches: matchingRound, remaining, limit, requests, quotaExhausted };
}

async function fetchMatchesForDates(leagueId: number, seasonYear: number, dates: string[]) {
  const matches: HighlightlyMatch[] = [];
  let remaining: string | null = null;
  let limit: string | null = null;
  let requests = 0;
  let quotaExhausted = false;
  dateLoop: for (const [dateIndex, date] of dates.entries()) {
    let total = Number.POSITIVE_INFINITY;
    for (let offset = 0; offset < total; offset += 100) {
      const response = await getHighlightlyMatches(leagueId, seasonYear, offset, date);
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
    const cronSecret = process.env.CRON_SECRET;
    const validCron = Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
    const supabase = validCron ? createAdminSupabaseClient() : await createClient();
    if (!validCron) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Inicia sesión para importar partidos." }, { status: 401 });
    }

    const input = await request.json().catch(() => null) as {
      competition?: string; mode?: string; round?: number; startDate?: string; endDate?: string; seasonYear?: number;
    } | null;
    if (!input || typeof input.competition !== "string" || !Object.prototype.hasOwnProperty.call(TARGETS, input.competition)) {
      return NextResponse.json({ error: "Selecciona una competición compatible con Highlightly." }, { status: 400 });
    }
    const seasonYear = Number(input.seasonYear ?? DEFAULT_SEASON_YEAR);
    if (!Number.isInteger(seasonYear) || seasonYear < 1990 || seasonYear > 2100) {
      return NextResponse.json({ error: "Selecciona una temporada válida." }, { status: 400 });
    }
    const target = TARGETS[input.competition as keyof typeof TARGETS];
    const providerYear = providerSeasonYear(target.competition, seasonYear);
    let fetched: { matches: HighlightlyMatch[]; remaining: string | null; limit: string | null; requests: number; quotaExhausted: boolean };
    if (input.mode === "round") {
      const maxRound = target.competition === "laliga" ? 38 : target.competition === "champions" ? 8 : 3;
      if (!Number.isInteger(input.round) || Number(input.round) < 1 || Number(input.round) > maxRound) {
        return NextResponse.json({ error: `Selecciona una jornada entre 1 y ${maxRound}.` }, { status: 400 });
      }
      fetched = await fetchMatchesForRound(target.leagueId, providerYear, Number(input.round), target.matchesPerRound);
    } else if (input.mode === "dates") {
      if (!isDate(input.startDate) || !isDate(input.endDate)) {
        return NextResponse.json({ error: "Indica una fecha inicial y final válidas." }, { status: 400 });
      }
      const dates = dateRange(input.startDate, input.endDate);
      fetched = await fetchMatchesForDates(target.leagueId, providerYear, dates);
      fetched.matches = fetched.matches.filter((match) => Number(match.league?.season) === providerYear);
    } else if (input.mode === "season") {
      fetched = await fetchMatchesForSeason(target.leagueId, providerYear);
      fetched.matches = fetched.matches.filter((match) => Number(match.league?.season) === providerYear);
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
    let season = (seasonsResult.data ?? []).find((item) => {
      const startYear = item.start_date ? Number(item.start_date.slice(0, 4)) : Number(normalize(item.name).match(/20\d{2}/)?.[0]);
      return startYear === seasonYear;
    });
    if (!season) {
      const seasonName = `Temporada ${seasonYear}/${String(seasonYear + 1).slice(-2)}`;
      const created = await supabase.from("seasons").insert({
        name: seasonName,
        start_date: `${seasonYear}-07-01`,
        end_date: `${seasonYear + 1}-06-30`,
        active: false,
      }).select("id,name,start_date,end_date,active").single();
      if (created.error) throw new Error(`No se pudo preparar la temporada histórica ${seasonName}: ${created.error.message}`);
      season = created.data;
    }

    const competition = (competitionsResult.data ?? []).find((item) => {
      const name = normalize(`${item.name} ${item.short_name ?? ""}`);
      if (target.competition === "laliga") return name.includes("laliga") || name.includes("primeradivision");
      if (target.competition === "champions") return name.includes("championsleague");
      return (name.includes("mundial") && name.includes("fifa")) || name.includes("worldcup");
    });
    if (!competition) throw new Error(`Crea o activa ${target.competitionName} en Value90 antes de importar.`);
    const existingMatchesResult = await supabase.from("matches")
      .select("id,home_team_id,away_team_id,date")
      .eq("season_id", season.id).eq("competition_id", competition.id).order("id");
    if (existingMatchesResult.error) throw new Error(`No se pudieron preparar las asociaciones existentes: ${existingMatchesResult.error.message}`);
    const existingMatches = existingMatchesResult.data ?? [];

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
      const kickoff = new Date(match.date).getTime();
      const possibleDuplicate = existingMatches.find((candidate) => Number(candidate.home_team_id) === home.id
        && Number(candidate.away_team_id) === away.id
        && Math.abs(new Date(String(candidate.date)).getTime() - kickoff) <= 36 * 60 * 60_000);
      // Historical fixtures can have kickoff times corrected by the provider.
      // Match the same teams within 36 hours, preferring the oldest local row,
      // so repeating a calendar import updates the original instead of cloning it.
      if (possibleDuplicate && (!localMatchId || Number(possibleDuplicate.id) < Number(localMatchId))) {
        localMatchId = Number(possibleDuplicate.id);
        const savedMapping = await supabase.from("external_match_mappings").upsert({ provider: "highlightly", external_match_id: match.id, match_id: localMatchId });
        if (savedMapping.error) throw new Error(`No se pudo asociar el partido existente: ${savedMapping.error.message}`);
      }

      const score = parseScore(match.state?.score?.current);
      const matchData = {
        competition_id: competition.id, season_id: season.id, stage_id: stage.id,
        home_team_id: home.id, away_team_id: away.id,
        // La tabla de partidos requiere marcador no nulo; los pendientes usan 0-0.
        home_score: isFinished(match) ? score[0] ?? 0 : 0,
        away_score: isFinished(match) ? score[1] ?? 0 : 0,
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
        existingMatches.push({ id: localMatchId, home_team_id: home.id, away_team_id: away.id, date: match.date });
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
