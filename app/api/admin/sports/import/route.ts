import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getHighlightlyLeagues, getHighlightlyMatches, type HighlightlyMatch } from "@/lib/highlightly.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_SEASON_YEAR = 2026;
const TARGETS = {
  laliga: { leagueId: 119924, competition: "laliga" as const, competitionName: "LaLiga", matchesPerRound: 10, totalMatches: 380 },
  champions: { leagueId: 2486, competition: "champions" as const, competitionName: "Champions League", matchesPerRound: 18, totalMatches: 144 },
  premier: { leagueId: 33973, competition: "premier" as const, competitionName: "Premier League", matchesPerRound: 10, totalMatches: 380 },
  worldcup: { leagueId: 1635, competition: "worldcup" as const, competitionName: "Copa Mundial FIFA", matchesPerRound: 16, totalMatches: 104 },
} as const;
const MAX_DATE_RANGE_DAYS = 31;

const TEAM_ALIASES: Record<string, string[]> = {
  "deportivo la coruna": ["RC. Deportivo de A Coruña"], "real sociedad": ["Real Sociedad de Fútbol"],
  "real betis": ["Real Betis Balompie"], "bayern munich": ["FC Bayern München"],
  "slovan bratislava": ["ŠK Slovan Bratislava"], porto: ["FC. Oporto"], "fc porto": ["FC. Oporto"],
  napoli: ["Napoles"], espanyol: ["RCD. Espanyol"], alaves: ["Deportivo Alavés"],
  "celta de vigo": ["RC. Celta de Vigo"], lille: ["LOSC Lille"], lens: ["RC Lens"],
  arsenal: ["Arsenal FC."], "aston villa": ["Aston Villa FC."], bournemouth: ["AFC Bournemouth"],
  brighton: ["Brighton & Hove Albion FC."], "manchester city": ["Manchester City FC."],
  "manchester united": ["Manchester United FC."], "newcastle united": ["Newcastle United FC."],
  "nottingham forest": ["Nottingham Forest FC."], tottenham: ["Tottenham Hotspur FC."],
  sunderland: ["Sunderland Association FC."], "west ham": ["West Ham United FC."],
  wolves: ["Wolverhampton Wanderers FC."],
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

function stageName(competition: "laliga" | "champions" | "premier" | "worldcup" | "other", round: string) {
  const number = roundNumber(round);
  if (number != null && (competition === "laliga" || competition === "premier" || competition === "other" || /league\s+stage|group\s+stage/i.test(round))) return `Jornada ${number}`;
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
  return competition === "champions" ? `Champions League - ${round}` : round;
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
    const cronAuthorized = Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
    const session = cronAuthorized ? null : await createClient();
    if (!cronAuthorized) {
      const { data: { user } } = await session!.auth.getUser();
      if (!user) return NextResponse.json({ error: "Inicia sesión para importar partidos." }, { status: 401 });
    }
    const supabase = cronAuthorized ? createAdminSupabaseClient() : session!;

    const input = await request.json().catch(() => null) as {
      competition?: string; competitionId?: number; competitionName?: string; mode?: string; round?: number; startDate?: string; endDate?: string; seasonYear?: number; onlyMissing?: boolean;
    } | null;
    const legacyTarget = input?.competition && Object.prototype.hasOwnProperty.call(TARGETS, input.competition)
      ? TARGETS[input.competition as keyof typeof TARGETS]
      : null;
    if (!input || (!legacyTarget && (!Number.isInteger(input.competitionId) || Number(input.competitionId) <= 0 || !input.competitionName?.trim()))) {
      return NextResponse.json({ error: "Selecciona una competición disponible en Value90." }, { status: 400 });
    }
    const seasonYear = Number(input.seasonYear ?? DEFAULT_SEASON_YEAR);
    if (!Number.isInteger(seasonYear) || seasonYear < 1990 || seasonYear > 2100) {
      return NextResponse.json({ error: "Selecciona una temporada válida." }, { status: 400 });
    }
    
const providerName =
  legacyTarget?.competitionName ?? input.competitionName!.trim();

const genericWorldCup =
  !legacyTarget && /world cup|mundial/i.test(providerName);

const providerYear = legacyTarget
  ? providerSeasonYear(legacyTarget.competition, seasonYear)
  : genericWorldCup
    ? seasonYear + 1
    : seasonYear;

let providerLeagueId: number | null =
  legacyTarget?.leagueId ?? null;

let providerLeagueName = providerName;

// Comprobar primero si ya existe una equivalencia vinculada.
if (!providerLeagueId && input.competitionId) {
  const { data: mappings, error: mappingError } = await supabase
    .from("external_competition_mappings")
    .select(
      "external_competition_id, external_competition_name, status"
    )
    .eq("provider", "highlightly")
    .eq("competition_id", input.competitionId)
    .eq("status", "linked")
    .order("reviewed_at", { ascending: false })
    .limit(1);

  if (mappingError) {
    throw new Error(
      `No se pudo leer la vinculación con Highlightly: ${mappingError.message}`
    );
  }

  const mapping = mappings?.[0];

  if (mapping) {
    providerLeagueId = Number(mapping.external_competition_id);
    providerLeagueName =
      mapping.external_competition_name ?? providerName;
  }
}

// Si no existe equivalencia, buscar la competición en Highlightly.
if (!providerLeagueId) {
  const leagueResponse = await getHighlightlyLeagues({
    leagueName: providerName,
    season: providerYear,
  });

  const availableLeagues = (leagueResponse.body?.data ?? [])
    .filter((league) =>
      league.seasons?.some(
        (entry) => entry.season === providerYear
      )
    );

  const requestedName = normalize(providerName);

  const exactMatches = availableLeagues.filter(
    (league) => normalize(league.name) === requestedName
  );

  // Coincidencia exacta: podemos guardar la equivalencia.
  if (exactMatches.length === 1) {
    const league = exactMatches[0];

    providerLeagueId = league.id;
    providerLeagueName = league.name;

    if (input.competitionId) {
      const { error: mappingSaveError } = await supabase
        .from("external_competition_mappings")
        .upsert(
          {
            provider: "highlightly",
            external_competition_id: league.id,
            external_competition_name: league.name,
            competition_id: input.competitionId,
            status: "linked",
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "provider,external_competition_id",
          }
        );

      if (mappingSaveError) {
        throw new Error(
          `No se pudo guardar la equivalencia: ${mappingSaveError.message}`
        );
      }
    }
  } else {
    // Si hay varias coincidencias, no elegimos una automáticamente.
    // Si hay una única candidata, registramos una incidencia pendiente.
    if (availableLeagues.length === 1 && input.competitionId) {
      const league = availableLeagues[0];

      const { error: pendingError } = await supabase
        .from("external_competition_mappings")
        .upsert(
          {
            provider: "highlightly",
            external_competition_id: league.id,
            external_competition_name: league.name,
            competition_id: null,
            status: "pending",
            reviewed_at: null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "provider,external_competition_id",
            ignoreDuplicates: true,
          }
        );

      if (pendingError) {
        throw new Error(
          `No se pudo registrar la incidencia: ${pendingError.message}`
        );
      }

      return NextResponse.json(
        {
          ok: false,
          pendingCompetition: true,
          externalCompetitionId: league.id,
          externalCompetitionName: league.name,
          message:
            `La competición «${league.name}» de Highlightly necesita vincularse manualmente con «${providerName}» en Value90.`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          availableLeagues.length === 0
            ? `Highlightly no ofrece «${providerName}» para la temporada ${providerYear}.`
            : `Se encontraron varias competiciones para «${providerName}». No se ha seleccionado ninguna para evitar una asociación incorrecta.`,
        candidates: availableLeagues.map((league) => ({
          id: league.id,
          name: league.name,
        })),
      },
      { status: 409 }
    );
  }
}

if (providerLeagueId == null) {
  return NextResponse.json(
    {
      error:
        "No se pudo resolver la competición en Highlightly.",
    },
    { status: 404 }
  );
}

    const competitionKind = legacyTarget?.competition ?? (genericWorldCup ? "worldcup" : "other");
    let fetched: { matches: HighlightlyMatch[]; remaining: string | null; limit: string | null; requests: number; quotaExhausted: boolean };
    if (input.mode === "round") {
      const maxRound = legacyTarget?.competition === "laliga" || legacyTarget?.competition === "premier" ? 38 : legacyTarget?.competition === "champions" ? 8 : legacyTarget?.competition === "worldcup" ? 3 : 50;
      if (!Number.isInteger(input.round) || Number(input.round) < 1 || Number(input.round) > maxRound) {
        return NextResponse.json({ error: `Selecciona una jornada entre 1 y ${maxRound}.` }, { status: 400 });
      }
      if (legacyTarget) fetched = await fetchMatchesForRound(providerLeagueId, providerYear, Number(input.round), legacyTarget.matchesPerRound);
      else {
        fetched = await fetchMatchesForSeason(providerLeagueId, providerYear);
        fetched.matches = fetched.matches.filter((match) => roundNumber(match.round) === Number(input.round));
      }
    } else if (input.mode === "dates") {
      if (!isDate(input.startDate) || !isDate(input.endDate)) {
        return NextResponse.json({ error: "Indica una fecha inicial y final válidas." }, { status: 400 });
      }
      const dates = dateRange(input.startDate, input.endDate);
      fetched = await fetchMatchesForDates(providerLeagueId, providerYear, dates);
      fetched.matches = fetched.matches.filter((match) => Number(match.league?.season) === providerYear);
    } else if (input.mode === "season") {
      fetched = await fetchMatchesForSeason(providerLeagueId, providerYear);
      fetched.matches = fetched.matches.filter((match) => Number(match.league?.season) === providerYear);
    } else {
      return NextResponse.json({ error: "Selecciona si quieres importar una jornada o un periodo." }, { status: 400 });
    }

    const targetMatches = [...new Map(fetched.matches.map((match) => [Number(match.id), match])).values()];
    if (!targetMatches.length) {
      return NextResponse.json({ ok: true, imported: 0, skipped: 0, callsUsed: fetched.requests + (legacyTarget ? 0 : 1), callsRemaining: fetched.remaining, callsLimit: fetched.limit, quotaExhausted: fetched.quotaExhausted, message: "Highlightly no devolvió partidos para esos filtros." });
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

    const competition = input.competitionId != null
      ? (competitionsResult.data ?? []).find((item) => Number(item.id) === Number(input.competitionId))
      : (competitionsResult.data ?? []).find((item) => {
      const name = normalize(`${item.name} ${item.short_name ?? ""}`);
      if (legacyTarget?.competition === "laliga") return name.includes("laliga") || name.includes("primeradivision");
      if (legacyTarget?.competition === "champions") return name.includes("championsleague");
      if (legacyTarget?.competition === "premier") return name.includes("premierleague");
      return (name.includes("mundial") && name.includes("fifa")) || name.includes("worldcup");
    });
    if (!competition) throw new Error(`No se encontró la competición «${providerName}» en Value90. Créala primero en Configuración > Competiciones.`);
    const existingMatchesResult = await supabase.from("matches")
      .select("id,home_team_id,away_team_id,date")
      .eq("season_id", season.id).eq("competition_id", competition.id).order("id");
    if (existingMatchesResult.error) throw new Error(`No se pudieron preparar las asociaciones existentes: ${existingMatchesResult.error.message}`);
    const existingMatches = existingMatchesResult.data ?? [];
    const externalIds = targetMatches.map((match) => Number(match.id));
    const existingMappings = new Map<number, { matchId: number; finalSyncedAt: string | null; nextResultSyncAt: string | null; resultAttempts: number }>();
    for (let offset = 0; offset < externalIds.length; offset += 100) {
      const { data, error } = await supabase.from("external_match_mappings")
        .select("external_match_id,match_id,final_synced_at,next_result_sync_at,result_attempts").eq("provider", "highlightly")
        .in("external_match_id", externalIds.slice(offset, offset + 100));
      if (error) throw new Error(`No se pudieron consultar las asociaciones de Highlightly: ${error.message}`);
      for (const mapping of data ?? []) existingMappings.set(Number(mapping.external_match_id), {
        matchId: Number(mapping.match_id), finalSyncedAt: mapping.final_synced_at == null ? null : String(mapping.final_synced_at),
        nextResultSyncAt: mapping.next_result_sync_at == null ? null : String(mapping.next_result_sync_at), resultAttempts: Number(mapping.result_attempts ?? 0),
      });
    }

    const imported: Array<{ round: string; home: string; away: string; date: string }> = [];
    const skipped: Array<{ round: string; home: string; away: string; reason: string }> = [];
    const missingTeams = new Set<string>();
    const teamMappings = new Map<number, number>();
    for (const match of targetMatches) {
      let home = findTeam(teamsResult.data ?? [], match.homeTeam.name);
      let away = findTeam(teamsResult.data ?? [], match.awayTeam.name);
      // International calendars can include clubs that have not appeared in
      // Value90 yet. Keep generated records inactive until an admin adds their
      // country/stadium details; the fixtures can still be imported.
      if (legacyTarget?.competition === "champions" || legacyTarget?.competition === "premier") {
        for (const [side, teamName] of [["home", match.homeTeam.name], ["away", match.awayTeam.name]] as const) {
          if ((side === "home" ? home : away) || !teamName?.trim()) continue;
          let provisional = findTeam(teamsResult.data ?? [], teamName);
          if (!provisional) {
            const created = await supabase.from("teams").insert({
              name: teamName.trim(), short_name: teamName.trim(), type: "Club", active: false,
              country_id: null, confederation: null, city: null, stadium: null,
            }).select("id,name,short_name,stadium").single();
            if (created.error) throw new Error(`No se pudo guardar el club provisional ${teamName}: ${created.error.message}`);
            teamsResult.data?.push(created.data);
            provisional = created.data;
          }
          if (side === "home") home = provisional;
          else away = provisional;
        }
      }
      if (!home || !away) {
        if (!home) missingTeams.add(match.homeTeam.name);
        if (!away) missingTeams.add(match.awayTeam.name);
        skipped.push({ round: match.round, home: match.homeTeam.name, away: match.awayTeam.name, reason: "Falta crear o asociar uno de los equipos en Value90." });
        continue;
      }

      const currentStageName = stageName(competitionKind, match.round);
      let stage = (stagesResult.data ?? []).find((item) => item.season_id === season.id && item.name === currentStageName);
      if (!stage) {
        const displayOrder = Math.max(0, ...(stagesResult.data ?? []).filter((item) => item.season_id === season.id).map((item) => Number(item.display_order))) + 1;
        const created = await supabase.from("stages").insert({ season_id: season.id, name: currentStageName, display_order: displayOrder, active: true }).select("id,season_id,name,display_order,active").single();
        if (created.error) throw new Error(`No se pudo crear la jornada/fase ${currentStageName}: ${created.error.message}`);
        stage = created.data;
        stagesResult.data?.push(stage);
      }

      const previousMapping = existingMappings.get(Number(match.id));
      let localMatchId = previousMapping?.matchId;
      const kickoff = new Date(match.date).getTime();
      const possibleDuplicate = existingMatches.find((candidate) => Number(candidate.home_team_id) === home.id
        && Number(candidate.away_team_id) === away.id
        && Math.abs(new Date(String(candidate.date)).getTime() - kickoff) <= 36 * 60 * 60_000);
      if (input.onlyMissing && (localMatchId || possibleDuplicate)) continue;
      // Historical fixtures can have kickoff times corrected by the provider.
      // Match the same teams within 36 hours, preferring the oldest local row,
      // so repeating a calendar import updates the original instead of cloning it.
      if (possibleDuplicate && (!localMatchId || Number(possibleDuplicate.id) < Number(localMatchId))) {
        localMatchId = Number(possibleDuplicate.id);
        existingMappings.set(Number(match.id), previousMapping
          ? { ...previousMapping, matchId: localMatchId }
          : { matchId: localMatchId, finalSyncedAt: null, nextResultSyncAt: null, resultAttempts: 0 });
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
        existingMatches.push({ id: localMatchId, home_team_id: home.id, away_team_id: away.id, date: match.date });
      }

      for (const team of [{ external: match.homeTeam.id, local: home.id }, { external: match.awayTeam.id, local: away.id }]) {
        teamMappings.set(Number(team.external), team.local);
      }
      const scheduledAt = kickoff + 2 * 60 * 60_000;
      const shouldSchedule = !previousMapping?.finalSyncedAt && previousMapping?.resultAttempts !== 5
        && scheduledAt >= Date.now() - 48 * 60 * 60_000;
      const nextResultSyncAt = previousMapping?.finalSyncedAt
        ? null
        : previousMapping?.resultAttempts && previousMapping.resultAttempts > 0
          ? previousMapping.nextResultSyncAt
          : shouldSchedule ? new Date(scheduledAt).toISOString() : null;
      const savedMapping = await supabase.from("external_match_mappings").upsert({
        provider: "highlightly", external_match_id: match.id, match_id: localMatchId,
        next_result_sync_at: nextResultSyncAt,
      }, { onConflict: "provider,external_match_id" });
      if (savedMapping.error) throw new Error(`No se pudo guardar la referencia externa del partido ${match.id}: ${savedMapping.error.message}`);
      imported.push({ round: match.round, home: match.homeTeam.name, away: match.awayTeam.name, date: match.date });
    }

    if (teamMappings.size) {
      const mapped = await supabase.from("external_team_mappings").upsert(
        [...teamMappings].map(([external_team_id, team_id]) => ({ provider: "highlightly", external_team_id, team_id })),
        { onConflict: "provider,external_team_id" },
      );
      if (mapped.error) throw new Error(`No se pudieron asociar los equipos de Highlightly: ${mapped.error.message}`);
    }

    return NextResponse.json({
      ok: true, imported: imported.length, skipped: skipped.length, importedMatches: imported,
      skippedMatches: skipped, missingTeams: [...missingTeams], callsUsed: fetched.requests + (legacyTarget ? 0 : 1),
      callsRemaining: fetched.remaining, callsLimit: fetched.limit, quotaExhausted: fetched.quotaExhausted,
      message: `Importación completada${fetched.quotaExhausted ? " parcialmente: se alcanzó el límite diario de llamadas" : ""}. Se utilizaron ${fetched.requests + (legacyTarget ? 0 : 1)} llamada(s) a Highlightly.`,
    });
  } catch (error) {
    console.error("Error importando calendario Highlightly:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo importar el calendario." }, { status: 500 });
  }
}
