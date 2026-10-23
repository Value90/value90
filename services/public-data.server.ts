import "server-only";

import { createClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;
const PUBLIC_CACHE_MS = 60_000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type Row = Record<string, unknown>;
interface CommonsPlayerPhoto {
  imageUrl: string;
  pageUrl: string;
  license: string;
  licenseUrl: string | null;
  attribution: string;
}
type CommonsImage = CommonsPlayerPhoto;
type CacheEntry<T> = { expiresAt: number; promise: Promise<T> };

const cache = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const current = cache.get(key) as CacheEntry<T> | undefined;
  if (current && current.expiresAt > Date.now()) return current.promise;

  const promise = load();
  cache.set(key, { expiresAt: Date.now() + PUBLIC_CACHE_MS, promise });
  if (cache.size > 100) {
    for (const [entryKey, entry] of cache) {
      if (entry.expiresAt <= Date.now()) cache.delete(entryKey);
    }
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
  }
  void promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
  });
  return promise;
}

async function readAll<T>(
  queryPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function positiveId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getMadridToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function getActiveSeasonId(): Promise<number | null> {
  const { data, error } = await supabase.from("seasons").select("id").eq("active", true).order("start_date", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id == null ? null : Number(data.id);
}

function pageNumber(value: string | null): number {
  const parsed = Number(value ?? 1);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100_000) : 1;
}

function getPageSize(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? Math.min(50, Math.max(1, parsed)) : fallback;
}

function safeSearch(value: string | null): string {
  return (value ?? "").trim().slice(0, 80).replace(/[%,_()]/g, " ");
}

function madridWallTimeToUtc(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) throw new Error("Fecha local no válida.");
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const wallClock = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  let instant = wallClock;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const offset = representedAsUtc - Math.floor(instant / 1000) * 1000;
    const next = wallClock - offset;
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant).toISOString();
}

function madridDateToUtc(date: string): string {
  return madridWallTimeToUtc(date);
}

function getMatchDisplayStatus(dateValue: string, statusValue: string, homeScore: number | null, awayScore: number | null): string {
  let kickoff = Number.NaN;
  try { kickoff = new Date(madridWallTimeToUtc(dateValue)).getTime(); } catch { /* preserve the stored status if the date is invalid */ }
  if (!Number.isFinite(kickoff)) return statusValue;
  const now = Date.now();
  const hasResult = homeScore !== null && awayScore !== null;
  if (now >= kickoff && now < kickoff + 2 * 60 * 60 * 1000) return "EN VIVO";
  if (hasResult && now >= kickoff + 2 * 60 * 60 * 1000) return "Finalizado";
  return statusValue;
}

function normalizeForMatch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}

function plainMetadata(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;/g, "'").replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim();
}

async function findCommonsPlayerPhoto(playerName: string, teamName?: string): Promise<CommonsPlayerPhoto | null> {
  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    const query: Record<string, string> = {
      action: "query", generator: "search", gsrsearch: `intitle:\"${playerName}\"`, gsrnamespace: "6", gsrlimit: "8",
      prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "640", iiextmetadatalanguage: "en", format: "json", origin: "*",
    };
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Value90 player-profile image lookup" },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return null;
      const result = await response.json() as { query?: { pages?: Record<string, { title?: string; imageinfo?: Array<{ thumburl?: string; url?: string; descriptionurl?: string; width?: number; height?: number; extmetadata?: Record<string, { value?: unknown }> }> }> } };
    const expectedName = normalizeForMatch(playerName);
    const nameTokens = expectedName.split(" ").filter((token) => token.length > 2);
    if (nameTokens.length < 2) return null;
    const candidates = Object.values(result.query?.pages ?? []).flatMap((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || !info.descriptionurl) return [];
      const width = Number(info.width ?? 0);
      const height = Number(info.height ?? 0);
      const aspect = width / Math.max(1, height);
      // Portrait or near-square, sufficiently large images only; this excludes most distant pitch/action shots.
      if (Math.min(width, height) < 360 || aspect > 1.28 || aspect < 0.48) return [];
      const metadata = info.extmetadata ?? {};
      const title = normalizeForMatch(String(page.title ?? "").replace(/^File:/, ""));
      const description = normalizeForMatch(plainMetadata(metadata.ImageDescription?.value));
      const searchable = `${title} ${description}`;
      const allNameTokensPresent = nameTokens.every((token) => searchable.includes(token));
      if (!allNameTokensPresent) return [];
      const license = plainMetadata(metadata.LicenseShortName?.value);
      const licenseUrl = plainMetadata(metadata.LicenseUrl?.value);
      const isReusableLicense = /\bcc\s*by(?:-sa)?\b|\bcc0\b|public domain/i.test(license);
      if (!isReusableLicense) return [];
      const categories = normalizeForMatch(plainMetadata(metadata.Categories?.value));
      const footballContext = /football|soccer|la liga|liga espanola|fc | cf |real madrid|barcelona/.test(`${searchable} ${categories}`);
      if (!footballContext) return [];
      const titleMatch = nameTokens.every((token) => title.includes(token));
      const descriptionMatch = nameTokens.every((token) => description.includes(token));
      if (!titleMatch && !descriptionMatch) return [];
      return [{
        score: Number(titleMatch) * 2 + Number(descriptionMatch) * 2 + Number(/portrait|headshot|close up|closeup/.test(`${title} ${description}`)) * 3 + Number(aspect < 0.95) + Number(/football|soccer|la liga|liga espanola/.test(`${description} ${categories}`)) + Number(Boolean(teamName && normalizeForMatch(searchable + " " + categories).includes(normalizeForMatch(teamName)))),
        photo: {
          imageUrl: info.thumburl,
          pageUrl: info.descriptionurl,
          license,
          licenseUrl: /^https:\/\//i.test(licenseUrl) ? licenseUrl : null,
          attribution: plainMetadata(metadata.Attribution?.value) || plainMetadata(metadata.Artist?.value) || "Autor indicado en la fuente",
        } satisfies CommonsPlayerPhoto,
      }];
    });
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.photo ?? null;
  } catch (error) {
    console.warn("No se pudo consultar Wikimedia Commons para la ficha:", error);
    return null;
  }
}

const teamSearchAliases: Record<string, string> = {
  "españa": "Spain", "alemania": "Germany", "francia": "France", "inglaterra": "England", "escocia": "Scotland", "países bajos": "Netherlands", "bélgica": "Belgium", "portugal": "Portugal", "brasil": "Brazil", "argentina": "Argentina", "méxico": "Mexico", "mexico": "Mexico", "estados unidos": "United States", "república checa": "Czech Republic", "corea del sur": "South Korea", "nueva zelanda": "New Zealand", "arabia saudí": "Saudi Arabia", "costa de marfil": "Ivory Coast", "cabo verde": "Cape Verde", "curazao": "Curaçao", "rd. del congo": "DR Congo", "sudáfrica": "South Africa", "túnez": "Tunisia", "uzbekistan": "Uzbekistan", "turquía": "Turkey", "noruega": "Norway", "suecia": "Sweden", "suiza": "Switzerland", "bosnia y herzegovina": "Bosnia and Herzegovina", "haití": "Haiti", "catar": "Qatar", "egipto": "Egypt", "argelia": "Algeria", "ghana": "Ghana", "senegal": "Senegal", "paraguay": "Paraguay", "uruguay": "Uruguay", "colombia": "Colombia", "ecuador": "Ecuador", "japón": "Japan", "irán": "Iran", "irak": "Iraq", "jordania": "Jordan", "panamá": "Panama", "canadá": "Canada", "australia": "Australia", "austria": "Austria", "irlanda": "Ireland", "italia": "Italy", "dinamarca": "Denmark", "polonia": "Poland", "croacia": "Croatia", "rumanía": "Romania", "serbia": "Serbia", "camerún": "Cameroon", "nigeria": "Nigeria", "marruecos": "Morocco",
};
const normalizedTeamSearchAliases = Object.fromEntries(Object.entries(teamSearchAliases).map(([name, alias]) => [normalizeForMatch(name), alias]));

async function findCommonsTeamCrest(teamName: string): Promise<CommonsImage | null> {
  try {
    // Avoid historical badges when Wikidata or Commons returns an old version.
    const isCurrentCrestFile = (filename: string) => !/(?:historic|historical|former|old logo|previous|retro|vintage|escudo antiguo|escudo historico)/i.test(filename);
    const normalizedTeamName = normalizeForMatch(teamName);
    const alias = normalizedTeamSearchAliases[normalizedTeamName] ?? teamName;
    const national = Object.prototype.hasOwnProperty.call(normalizedTeamSearchAliases, normalizedTeamName);
    const wikidataSearch = async (search: string) => {
      const api = new URL("https://www.wikidata.org/w/api.php");
      for (const [key, value] of Object.entries({ action: "wbsearchentities", search, language: "en", format: "json", limit: "5" })) api.searchParams.set(key, value);
      const response = await fetch(api, { headers: { Accept: "application/json", "User-Agent": "Value90 team crest lookup" }, next: { revalidate: 604_800 } });
      if (!response.ok) return [] as Array<{ id: string; label: string; description: string }>;
      const result = await response.json() as { search?: Array<{ id: string; label?: string; description?: string }> };
      return (result.search ?? []).map((item) => ({ id: item.id, label: item.label ?? "", description: item.description ?? "" }));
    };
    let entity = (await wikidataSearch(national ? `${alias} national football team` : alias))
      .find((item) => /football club|association football club|national association football team|football team/.test(item.description.toLocaleLowerCase("en")));
    if ((!entity || national) && national) {
      const association = (await wikidataSearch(`${alias} football association`))
        .find((item) => /football association|football federation|governing body.*football|association football.*governing body/.test(item.description.toLocaleLowerCase("en")));
      if (association) entity = association;
    }
    if (entity) {
      const api = new URL("https://www.wikidata.org/w/api.php");
      for (const [key, value] of Object.entries({ action: "wbgetentities", ids: entity.id, props: "claims", format: "json" })) api.searchParams.set(key, value);
      const response = await fetch(api, { headers: { Accept: "application/json", "User-Agent": "Value90 team crest lookup" }, next: { revalidate: 604_800 } });
      if (response.ok) {
        const data = await response.json() as { entities?: Record<string, { claims?: Record<string, Array<{ rank?: string; mainsnak?: { datavalue?: { value?: unknown } } }>> }> };
        const claims = data.entities?.[entity.id]?.claims;
        const currentClaim = (property: string) => (claims?.[property] ?? []).find((claim) => claim.rank === "preferred") ?? (claims?.[property] ?? []).find((claim) => claim.rank !== "deprecated");
        const logoProperty = currentClaim("P154")?.mainsnak?.datavalue?.value;
        const crestProperty = currentClaim("P94")?.mainsnak?.datavalue?.value;
        const filename = typeof logoProperty === "string" ? logoProperty : typeof crestProperty === "string" && national ? crestProperty : "";
        if (filename && !/flag|bandera/i.test(filename) && isCurrentCrestFile(filename)) {
          const fileUrl = new URL("https://commons.wikimedia.org/w/api.php");
          for (const [key, value] of Object.entries({ action: "query", titles: `File:${filename}`, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "320", iiextmetadatalanguage: "en", format: "json" })) fileUrl.searchParams.set(key, value);
          const fileResponse = await fetch(fileUrl, { headers: { Accept: "application/json", "User-Agent": "Value90 team crest lookup" }, next: { revalidate: 604_800 } });
          if (fileResponse.ok) {
            const fileData = await fileResponse.json() as { query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: unknown }> }> }> } };
            const info = Object.values(fileData.query?.pages ?? {})[0]?.imageinfo?.[0];
            const metadata = info?.extmetadata ?? {};
            const license = plainMetadata(metadata.LicenseShortName?.value);
            if (info?.thumburl && info.descriptionurl && /\bcc\s*by(?:-sa)?\b|\bcc0\b|public domain/i.test(license)) {
              const licenseUrl = plainMetadata(metadata.LicenseUrl?.value);
              return { imageUrl: info.thumburl, pageUrl: info.descriptionurl, license, licenseUrl: /^https:\/\//i.test(licenseUrl) ? licenseUrl : null, attribution: plainMetadata(metadata.Attribution?.value) || plainMetadata(metadata.Artist?.value) || "Autor indicado en la fuente" };
            }
          }
        }
      }
    }

    const url = new URL("https://commons.wikimedia.org/w/api.php");
    const query: Record<string, string> = {
      action: "query", generator: "search", gsrsearch: `\"${alias}\" football team crest OR badge OR logo`, gsrnamespace: "6", gsrlimit: "12",
      prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "320", iiextmetadatalanguage: "en", format: "json", origin: "*",
    };
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Value90 team profile image lookup" }, next: { revalidate: 86_400 } });
    if (!response.ok) return null;
    const result = await response.json() as { query?: { pages?: Record<string, { title?: string; imageinfo?: Array<{ thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: unknown }> }> }> } };
    const tokens = normalizeForMatch(alias).split(" ").filter((token) => token.length > 2 && !["club", "association", "football", "fc", "cf"].includes(token));
    if (!tokens.length) return null;
    const candidates = Object.values(result.query?.pages ?? {}).flatMap((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || !info.descriptionurl) return [];
      const metadata = info.extmetadata ?? {};
      const title = normalizeForMatch(String(page.title ?? "").replace(/^File:/, ""));
      const description = normalizeForMatch(plainMetadata(metadata.ImageDescription?.value));
      if (!tokens.every((token) => title.includes(token)) || !/crest|logo|emblem|badge|escudo|coat of arms/.test(title) || /flag|bandera/.test(title) || !isCurrentCrestFile(title)) return [];
      const license = plainMetadata(metadata.LicenseShortName?.value);
      if (!/\bcc\s*by(?:-sa)?\b|\bcc0\b|public domain/i.test(license)) return [];
      const licenseUrl = plainMetadata(metadata.LicenseUrl?.value);
      const datedVersion = title.match(/\b(18|19|20)\d{2}\b/);
      return [{ score: Number(/crest|escudo/.test(title)) + Number(description.includes(normalizeForMatch(teamName))) + (datedVersion ? Number(datedVersion[0]) / 10_000 : 0), photo: {
        imageUrl: info.thumburl, pageUrl: info.descriptionurl, license,
        licenseUrl: /^https:\/\//i.test(licenseUrl) ? licenseUrl : null,
        attribution: plainMetadata(metadata.Attribution?.value) || plainMetadata(metadata.Artist?.value) || "Autor indicado en la fuente",
      } satisfies CommonsImage }];
    });
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.photo ?? null;
  } catch (error) {
    console.warn("No se pudo consultar Wikimedia Commons para el escudo:", error);
    return null;
  }
}

async function getRankingBase() {
  return cached("rankings-base", async () => {
    const [factRows, playerRows, teamRows] = await Promise.all([
      readAll<Row>((from, to) =>
        supabase
          .from("fact_player_v90_match")
          .select("player_id,match_id,team_id,total_weight,weighted_contribution,v90_match,calculated_at")
          .eq("active", true)
          .eq("status", "CALCULATED")
          .order("id", { ascending: false })
          .range(from, to),
      ),
      readAll<Row>((from, to) =>
        supabase.from("players").select("id,name").order("name").order("id").range(from, to),
      ),
      readAll<Row>((from, to) =>
        supabase.from("teams").select("id,name,short_name").order("name").order("id").range(from, to),
      ),
    ]);

    return {
      facts: factRows.map((row) => ({
        playerId: Number(row.player_id),
        matchId: Number(row.match_id),
        teamId: Number(row.team_id),
        weight: Number(row.total_weight),
        contribution: Number(row.weighted_contribution),
        v90: Number(row.v90_match),
        calculatedAt: String(row.calculated_at ?? ""),
      })),
      players: new Map(playerRows.map((row) => [Number(row.id), String(row.name)])),
      teams: new Map(teamRows.map((row) => [Number(row.id), {
        name: String(row.name),
        shortName: String(row.short_name ?? row.name),
      }])),
    };
  });
}

async function getFilteredMatchIds(competitionId: number | null, seasonId: number | null) {
  if (!competitionId && !seasonId) return null;
  return readAll<Row>((from, to) => {
    let query = supabase.from("matches").select("id").order("id");
    if (competitionId) query = query.eq("competition_id", competitionId);
    if (seasonId) query = query.eq("season_id", seasonId);
    return query.range(from, to);
  }).then((rows) => new Set(rows.map((row) => Number(row.id))));
}

export async function getPublicRankings(params: URLSearchParams) {
  const page = pageNumber(params.get("page"));
  const limit = getPageSize(params.get("limit"), 20);
  const query = safeSearch(params.get("q")).toLocaleLowerCase("es");
  const teamId = positiveId(params.get("teamId"));
  const competitionId = positiveId(params.get("competitionId"));
  const requestedSeason = params.get("seasonId");
  const seasonId = requestedSeason === "all" ? null : positiveId(requestedSeason) ?? await getActiveSeasonId();
  const positionId = positiveId(params.get("positionId"));
  const requestedMinimum = Math.floor(Number(params.get("minMatches")) || 1);
  const minMatches = Math.max(1, Math.min(1000, requestedMinimum));

  const ranked = await cached(
    `public-ranking:${query}:${teamId ?? "all"}:${competitionId ?? "all"}:${seasonId ?? "all"}:${positionId ?? "all"}:${minMatches}`,
    async () => {
  const [base, matchIds, positionPlayerIds] = await Promise.all([
    getRankingBase(),
    getFilteredMatchIds(competitionId, seasonId),
    positionId
      ? readAll<Row>((from, to) => {
          let request = supabase
            .from("hist_player_teams")
            .select("id,player_id")
            .eq("active", true)
            .eq("position_id", positionId);
          if (teamId) request = request.eq("team_id", teamId);
          if (seasonId) request = request.eq("season_id", seasonId);
          return request.order("id").range(from, to);
        }).then((rows) => new Set(rows.map((row) => Number(row.player_id))))
      : Promise.resolve(null),
  ]);

  const aggregates = new Map<number, {
    contribution: number;
    weight: number;
    matches: number;
    teamId: number;
    latestAt: string;
  }>();

  for (const fact of base.facts) {
    if (teamId && fact.teamId !== teamId) continue;
    if (matchIds && !matchIds.has(fact.matchId)) continue;
    if (positionPlayerIds && !positionPlayerIds.has(fact.playerId)) continue;

    const aggregate = aggregates.get(fact.playerId) ?? {
      contribution: 0,
      weight: 0,
      matches: 0,
      teamId: fact.teamId,
      latestAt: "",
    };
    aggregate.contribution += Number.isFinite(fact.contribution) ? fact.contribution : 0;
    aggregate.weight += Number.isFinite(fact.weight) ? fact.weight : 0;
    aggregate.matches += 1;
    if (fact.calculatedAt > aggregate.latestAt) {
      aggregate.latestAt = fact.calculatedAt;
      aggregate.teamId = fact.teamId;
    }
    aggregates.set(fact.playerId, aggregate);
  }

  return Array.from(aggregates, ([playerId, aggregate]) => ({
    playerId,
    playerName: base.players.get(playerId) ?? "Jugador",
    teamId: aggregate.teamId,
    teamName: base.teams.get(aggregate.teamId)?.name ?? "Sin equipo",
    score: aggregate.weight > 0 ? aggregate.contribution / aggregate.weight : 0,
    matches: aggregate.matches,
  }))
    .filter((item) => item.score > 0 && item.matches >= minMatches && (!query || item.playerName.toLocaleLowerCase("es").includes(query)))
    .sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName, "es"));
    },
  );

  const start = (page - 1) * limit;
  return { items: ranked.slice(start, start + limit), total: ranked.length, page, pageSize: limit };
}

export async function getPublicFilters() {
  return cached("public-filters", async () => {
  const [competitions, seasons, teams, stages, positions] = await Promise.all([
    supabase.from("competitions").select("id,name,active").order("name"),
    supabase.from("seasons").select("id,name,active,start_date").order("start_date", { ascending: false }),
    supabase.from("teams").select("id,name,short_name,active").order("name"),
    supabase.from("stages").select("id,name,season_id,active,display_order").order("display_order"),
    supabase.from("positions").select("id,name,short_name,active,display_order").order("display_order"),
  ]);
  for (const result of [competitions, seasons, teams, stages, positions]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    competitions: competitions.data ?? [],
    seasons: seasons.data ?? [],
    teams: teams.data ?? [],
    stages: stages.data ?? [],
    positions: positions.data ?? [],
  };
  });
}

export async function getPublicStatistics() {
  return cached("public-statistics", async () => {
  const [counts, base] = await Promise.all([Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("competitions").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("matches").select("id", { count: "exact", head: true }),
  ]), getRankingBase()]);
  for (const result of counts) if (result.error) throw new Error(result.error.message);
  const playerScores = new Map<number, { contribution: number; weight: number }>();
  let matchRatingTotal = 0;
  let matchRatingCount = 0;
  for (const fact of base.facts) {
    if (Number.isFinite(fact.v90)) { matchRatingTotal += fact.v90; matchRatingCount += 1; }
    const aggregate = playerScores.get(fact.playerId) ?? { contribution: 0, weight: 0 };
    aggregate.contribution += fact.contribution;
    aggregate.weight += fact.weight;
    playerScores.set(fact.playerId, aggregate);
  }
  const validPlayerScores = Array.from(playerScores.values()).filter((item) => item.weight > 0).map((item) => item.contribution / item.weight);
  return {
    players: counts[0].count ?? 0,
    teams: counts[1].count ?? 0,
    competitions: counts[2].count ?? 0,
    matches: counts[3].count ?? 0,
    calculatedRatings: base.facts.length,
    playersWithRating: validPlayerScores.length,
    averagePlayerV90: validPlayerScores.length ? validPlayerScores.reduce((sum, item) => sum + item, 0) / validPlayerScores.length : null,
    averageMatchV90: matchRatingCount ? matchRatingTotal / matchRatingCount : null,
  };
  });
}

export async function getPublicPlayers(params: URLSearchParams) {
  const page = pageNumber(params.get("page"));
  const pageSize = getPageSize(params.get("limit"), 24);
  const q = safeSearch(params.get("q"));
  const teamId = positiveId(params.get("teamId"));
  const competitionId = positiveId(params.get("competitionId"));
  const seasonId = positiveId(params.get("seasonId"));

  let teamIds: number[] | null = null;
  if (competitionId || seasonId) {
    const links = await readAll<Row>((from, to) => {
      let request = supabase.from("hist_team_competitions").select("id,team_id").eq("active", true);
      if (competitionId) request = request.eq("competition_id", competitionId);
      if (seasonId) request = request.eq("season_id", seasonId);
      return request.order("id").range(from, to);
    });
    teamIds = Array.from(new Set(links.map((row) => Number(row.team_id))));
  }
  if (teamId) teamIds = teamIds ? teamIds.filter((id) => id === teamId) : [teamId];

  let playerIds: number[] | null = null;
  if (teamIds || seasonId) {
    if (teamIds?.length === 0) return { items: [], total: 0, page, pageSize };
      const histories = await readAll<Row>((from, to) => {
      let request = supabase.from("hist_player_teams").select("id,player_id")
        .eq("active", true);
      if (teamIds) request = request.in("team_id", teamIds);
      if (seasonId) request = request.eq("season_id", seasonId);
      return request.order("id").range(from, to);
    });
    playerIds = Array.from(new Set(histories.map((row) => Number(row.player_id))));
    if (playerIds.length === 0) return { items: [], total: 0, page, pageSize };
  }

  let playersQuery = supabase.from("players").select("id,name", { count: "exact" })
    .eq("active", true).order("name", { ascending: true });
  if (q) playersQuery = playersQuery.ilike("name", `%${q}%`);
  if (playerIds) playersQuery = playersQuery.in("id", playerIds);
  const { data, error, count } = await playersQuery.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((row) => Number(row.id));
  const histories = ids.length
    ? await (() => {
        let request = supabase.from("hist_player_teams").select("id,player_id,team_id,season_id,shirt_number,position_id")
          .in("player_id", ids).eq("active", true);
        if (teamIds) request = request.in("team_id", teamIds);
        if (seasonId) request = request.eq("season_id", seasonId);
        return request.order("season_id", { ascending: false }).order("id");
      })()
    : { data: [], error: null };
  if (histories.error) throw new Error(histories.error.message);
  const latestHistory = new Map<number, Row>();
  for (const item of histories.data ?? []) if (!latestHistory.has(Number(item.player_id))) latestHistory.set(Number(item.player_id), item as Row);
  const listedTeamIds = Array.from(new Set(Array.from(latestHistory.values()).map((row) => Number(row.team_id))));
  const teamRows = listedTeamIds.length
    ? await supabase.from("teams").select("id,name,short_name").in("id", listedTeamIds)
    : { data: [], error: null };
  if (teamRows.error) throw new Error(teamRows.error.message);
  const teamMap = new Map((teamRows.data ?? []).map((team) => [Number(team.id), team]));

  return {
    items: rows.map((player) => {
      const history = latestHistory.get(Number(player.id));
      const team = history ? teamMap.get(Number(history.team_id)) : null;
      return {
        id: Number(player.id),
        name: player.name,
        teamId: team ? Number(team.id) : null,
        teamName: team?.name ?? "Sin equipo asignado",
        shirtNumber: history?.shirt_number == null ? null : Number(history.shirt_number),
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getPublicTeams(params: URLSearchParams) {
  const q = safeSearch(params.get("q")).toLocaleLowerCase("es");
  const competitionId = positiveId(params.get("competitionId"));
  const seasonId = positiveId(params.get("seasonId"));
  const page = pageNumber(params.get("page"));
  const pageSize = getPageSize(params.get("limit"), 24);
  const requestedType = params.get("type") === "Selección" ? "Selección" : "Club";

  let allowedIds: Set<number> | null = null;
  if (competitionId || seasonId) {
    const links = await readAll<Row>((from, to) => {
      let request = supabase.from("hist_team_competitions").select("id,team_id").eq("active", true);
      if (competitionId) request = request.eq("competition_id", competitionId);
      if (seasonId) request = request.eq("season_id", seasonId);
      return request.order("id").range(from, to);
    });
    allowedIds = new Set(links.map((row) => Number(row.team_id)));
    if (allowedIds.size === 0) return { items: [], total: 0, page, pageSize };
  }

  const allTeams = await readAll<Row>((from, to) => {
    let request = supabase.from("teams").select("*")
      .eq("active", true).order("name").order("id").range(from, to);
    request = request.eq("type", requestedType);
    if (allowedIds) request = request.in("id", Array.from(allowedIds));
    return request;
  });
  const filtered = allTeams.filter((team) =>
    !q || `${team.name} ${team.short_name ?? ""} ${team.city ?? ""}`.toLocaleLowerCase("es").includes(q),
  );
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map((team) => ({
      id: Number(team.id), name: String(team.name), shortName: String(team.short_name ?? ""),
      city: String(team.city ?? ""), type: String(team.type ?? ""), countryId: team.country_id == null ? null : Number(team.country_id),
      foundationYear: team.foundation_year == null ? null : Number(team.foundation_year),
      stadiumCapacity: team.stadium_capacity == null ? null : Number(team.stadium_capacity),
    })),
    total: filtered.length, page, pageSize,
  };
}

export async function getPublicCompetitions(params: URLSearchParams) {
  const seasonId = positiveId(params.get("seasonId"));
  const q = safeSearch(params.get("q")).toLocaleLowerCase("es");
  const page = pageNumber(params.get("page"));
  const pageSize = getPageSize(params.get("limit"), 24);
  return cached(`public-competitions:${seasonId ?? "all"}:${q}:${page}:${pageSize}`, async () => {
  const [competitionRows, teamLinks] = await Promise.all([
    readAll<Row>((from, to) => supabase.from("competitions").select("id,name,short_name,country_id,competition_type")
      .eq("active", true).order("name").order("id").range(from, to)),
    readAll<Row>((from, to) => {
      let request = supabase.from("hist_team_competitions").select("id,competition_id,team_id")
        .eq("active", true);
      if (seasonId) request = request.eq("season_id", seasonId);
      return request.order("id").range(from, to);
    }),
  ]);
  const linksByCompetition = new Map<number, Set<number>>();
  for (const row of teamLinks) {
    const id = Number(row.competition_id);
    const set = linksByCompetition.get(id) ?? new Set<number>();
    set.add(Number(row.team_id));
    linksByCompetition.set(id, set);
  }
  const filteredRows = competitionRows.filter((row) => !q || String(row.name).toLocaleLowerCase("es").includes(q));
  const matchCounts = await Promise.all(filteredRows.map(async (row) => {
    let request = supabase.from("matches").select("id", { count: "exact", head: true })
      .eq("competition_id", Number(row.id));
    if (seasonId) request = request.eq("season_id", seasonId);
    const result = await request;
    if (result.error) throw new Error(result.error.message);
    return [Number(row.id), result.count ?? 0] as const;
  }));
  const matchesByCompetition = new Map(matchCounts);
  const items = filteredRows.map((row) => ({
      id: Number(row.id), name: String(row.name), shortName: String(row.short_name ?? ""),
      countryId: row.country_id == null ? null : Number(row.country_id),
      type: String(row.competition_type ?? ""),
      teams: linksByCompetition.get(Number(row.id))?.size ?? 0,
      matches: matchesByCompetition.get(Number(row.id)) ?? 0,
    }));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
  });
}

export async function getPublicMatches(params: URLSearchParams) {
  const page = pageNumber(params.get("page"));
  const pageSize = getPageSize(params.get("limit"), 24);
  const competitionId = positiveId(params.get("competitionId"));
  const seasonId = positiveId(params.get("seasonId"));
  const stageId = positiveId(params.get("stageId"));
  const teamId = positiveId(params.get("teamId"));
  const requestedDate = params.get("date");
  const date = requestedDate === "all" ? null : (requestedDate?.match(/^\d{4}-\d{2}-\d{2}$/) ? requestedDate : getMadridToday());

  let request = supabase.from("matches")
    .select("id,competition_id,season_id,stage_id,home_team_id,away_team_id,home_score,away_score,date,status", { count: "exact" })
    .order("date", { ascending: false }).order("id", { ascending: false });
  if (competitionId) request = request.eq("competition_id", competitionId);
  if (seasonId) request = request.eq("season_id", seasonId);
  if (stageId) request = request.eq("stage_id", stageId);
  if (teamId) request = request.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  if (date) {
    const [year, month, day] = date.split("-").map(Number);
    const nextLocalDay = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
    request = request.gte("date", madridDateToUtc(date)).lt("date", madridDateToUtc(nextLocalDay));
  }
  const { data, error, count } = await request.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const teamIds = Array.from(new Set(rows.flatMap((row) => [Number(row.home_team_id), Number(row.away_team_id)])));
  const competitionIds = Array.from(new Set(rows.map((row) => Number(row.competition_id))));
  const stageIds = Array.from(new Set(rows.map((row) => Number(row.stage_id))));
  const [teamResult, competitionResult, stageResult] = await Promise.all([
    teamIds.length ? supabase.from("teams").select("id,name,short_name").in("id", teamIds) : Promise.resolve({ data: [], error: null }),
    competitionIds.length ? supabase.from("competitions").select("id,name").in("id", competitionIds) : Promise.resolve({ data: [], error: null }),
    stageIds.length ? supabase.from("stages").select("id,name").in("id", stageIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (teamResult.error) throw new Error(teamResult.error.message);
  if (competitionResult.error) throw new Error(competitionResult.error.message);
  if (stageResult.error) throw new Error(stageResult.error.message);
  const teamMap = new Map((teamResult.data ?? []).map((team) => [Number(team.id), team]));
  const competitionMap = new Map((competitionResult.data ?? []).map((item) => [Number(item.id), String(item.name)]));
  const stageMap = new Map((stageResult.data ?? []).map((item) => [Number(item.id), String(item.name)]));
  return {
    items: rows.map((match) => {
      const homeScore = match.home_score == null ? null : Number(match.home_score);
      const awayScore = match.away_score == null ? null : Number(match.away_score);
      return {
      id: Number(match.id), competitionId: Number(match.competition_id), seasonId: Number(match.season_id),
      stageId: Number(match.stage_id), date: String(match.date), status: getMatchDisplayStatus(String(match.date), String(match.status), homeScore, awayScore),
      homeTeamId: Number(match.home_team_id), awayTeamId: Number(match.away_team_id),
      homeScore, awayScore,
      homeTeam: teamMap.get(Number(match.home_team_id))?.name ?? "Equipo local",
      awayTeam: teamMap.get(Number(match.away_team_id))?.name ?? "Equipo visitante",
      competitionName: competitionMap.get(Number(match.competition_id)) ?? "Competición",
      stageName: stageMap.get(Number(match.stage_id)) ?? "Jornada",
    }; }),
    total: count ?? 0, page, pageSize,
  };
}

export async function getPublicOverview() {
  const [counts, rankings, matches, ratingCount] = await Promise.all([
    Promise.all([
      supabase.from("players").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("teams").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("matches").select("id", { count: "exact", head: true }),
    ]),
    getPublicRankings(new URLSearchParams("page=1&limit=4")),
    getPublicMatches(new URLSearchParams(`page=1&limit=50&date=${getMadridToday()}`)),
    supabase.from("fact_player_v90_match").select("id", { count: "exact", head: true }).eq("active", true).eq("status", "CALCULATED"),
  ]);
  for (const result of [...counts, ratingCount]) if (result.error) throw new Error(result.error.message);
  return {
    statistics: { players: counts[0].count ?? 0, teams: counts[1].count ?? 0, matches: counts[2].count ?? 0, calculatedRatings: ratingCount.count ?? 0 },
    featuredPlayers: rankings.items,
    matches: matches.items,
  };
}

export async function getPublicPlayerProfile(playerId: number) {
  const { data: player, error: playerError } = await supabase.from("players").select("id,name,short_name,birth_date,country_id,active").eq("id", playerId).maybeSingle();
  if (playerError) throw new Error(playerError.message);
  if (!player) return null;
  const [historyResult, factsResult, seasonsResult, positionsResult, countryResult, marketValueResult] = await Promise.all([
    supabase.from("hist_player_teams").select("id,team_id,season_id,shirt_number,position_id,start_date,end_date,active").eq("player_id", playerId).order("season_id", { ascending: false }).order("id", { ascending: false }),
    supabase.from("fact_player_v90_match").select("id,match_id,team_id,rival_team_id,total_weight,weighted_contribution,v90_match").eq("player_id", playerId).eq("active", true).eq("status", "CALCULATED"),
    supabase.from("seasons").select("id,name,active,start_date").order("start_date", { ascending: false }),
    supabase.from("positions").select("id,name,short_name"),
    player.country_id == null ? Promise.resolve({ data: [], error: null }) : supabase.from("countries").select("id,name").eq("id", player.country_id).limit(1),
    supabase.from("player_market_values").select("current_value_eur,previous_value_eur,change_percent,period_start,updated_at,market_rating,eligible_matches").eq("player_id", playerId).maybeSingle(),
  ]);
  for (const result of [historyResult, factsResult, seasonsResult, positionsResult, countryResult]) if (result.error) throw new Error(result.error.message);
  const histories = historyResult.data ?? [];
  const facts = factsResult.data ?? [];
  const teamIds = Array.from(new Set([...histories.map((row) => Number(row.team_id)), ...facts.flatMap((row) => [Number(row.team_id), Number(row.rival_team_id)])]));
  const matchIds = Array.from(new Set(facts.map((row) => Number(row.match_id))));
  const [teamsResult, matchesResult] = await Promise.all([
    teamIds.length ? supabase.from("teams").select("id,name,short_name,city,country_id").in("id", teamIds) : Promise.resolve({ data: [], error: null }),
    matchIds.length ? supabase.from("matches").select("id,season_id,date,home_team_id,away_team_id,home_score,away_score").in("id", matchIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);
  const teamMap = new Map((teamsResult.data ?? []).map((team) => [Number(team.id), team]));
  const seasonMap = new Map((seasonsResult.data ?? []).map((season) => [Number(season.id), season]));
  const positionMap = new Map((positionsResult.data ?? []).map((position) => [Number(position.id), position]));
  const matchMap = new Map((matchesResult.data ?? []).map((match) => [Number(match.id), match]));
  const activeSeason = (seasonsResult.data ?? []).find((season) => season.active);
  const currentHistory = histories.find((history) => Number(history.season_id) === Number(activeSeason?.id)) ?? histories.find((history) => history.active);
  const currentTeam = currentHistory ? { ...teamMap.get(Number(currentHistory.team_id)), shirtNumber: currentHistory.shirt_number, position: positionMap.get(Number(currentHistory.position_id))?.name ?? positionMap.get(Number(currentHistory.position_id))?.short_name ?? null } : null;
  const photoPromise = findCommonsPlayerPhoto(String(player.name), currentTeam?.name == null ? undefined : String(currentTeam.name));
  const summaries = new Map<number, { seasonId: number; seasonName: string; weighted: number; weight: number; matches: number; teams: Set<number> }>();
  for (const fact of facts) {
    const match = matchMap.get(Number(fact.match_id));
    if (!match) continue;
    const seasonId = Number(match.season_id);
    const season = seasonMap.get(seasonId);
    const summary = summaries.get(seasonId) ?? { seasonId, seasonName: String(season?.name ?? "Temporada"), weighted: 0, weight: 0, matches: 0, teams: new Set<number>() };
    const weight = Number(fact.total_weight) || 0;
    summary.weighted += Number(fact.weighted_contribution) || 0;
    summary.weight += weight;
    summary.matches += 1;
    summary.teams.add(Number(fact.team_id));
    summaries.set(seasonId, summary);
  }
  return {
    player: { id: Number(player.id), name: String(player.name), shortName: String(player.short_name ?? ""), birthDate: player.birth_date, country: countryResult.data?.[0]?.name ?? null, active: Boolean(player.active) },
    photo: await photoPromise,
    currentSeason: activeSeason ? { id: Number(activeSeason.id), name: String(activeSeason.name) } : null,
    currentTeam,
    marketValue: marketValueResult.error || !marketValueResult.data ? null : {
      valueEur: Number(marketValueResult.data.current_value_eur),
      previousValueEur: marketValueResult.data.previous_value_eur == null ? null : Number(marketValueResult.data.previous_value_eur),
      changePercent: marketValueResult.data.change_percent == null ? null : Number(marketValueResult.data.change_percent),
      periodStart: String(marketValueResult.data.period_start),
      updatedAt: String(marketValueResult.data.updated_at),
      marketRating: Number(marketValueResult.data.market_rating),
      eligibleMatches: Number(marketValueResult.data.eligible_matches),
    },
    history: histories.map((history) => ({ season: seasonMap.get(Number(history.season_id))?.name ?? "Temporada", team: teamMap.get(Number(history.team_id))?.name ?? "Equipo", shirtNumber: history.shirt_number, position: positionMap.get(Number(history.position_id))?.name ?? null, startDate: history.start_date, endDate: history.end_date, current: Boolean(history.active) })),
    seasons: Array.from(summaries.values()).map((summary) => ({ seasonId: summary.seasonId, seasonName: summary.seasonName, score: summary.weight > 0 ? summary.weighted / summary.weight : null, matches: summary.matches, teams: Array.from(summary.teams).map((id) => teamMap.get(id)?.name ?? "Equipo") })).sort((a, b) => b.seasonId - a.seasonId),
    matchHistory: facts.flatMap((fact) => {
      const match = matchMap.get(Number(fact.match_id));
      if (!match) return [];
      const season = seasonMap.get(Number(match.season_id));
      const homeTeamId = Number(match.home_team_id);
      const awayTeamId = Number(match.away_team_id);
      return [{
        id: Number(fact.id),
        seasonId: Number(match.season_id),
        seasonName: String(season?.name ?? "Temporada"),
        date: String(match.date),
        homeTeam: teamMap.get(homeTeamId)?.name ?? "Equipo local",
        awayTeam: teamMap.get(awayTeamId)?.name ?? "Equipo visitante",
        homeScore: match.home_score == null ? null : Number(match.home_score),
        awayScore: match.away_score == null ? null : Number(match.away_score),
        rating: Number(fact.v90_match),
      }];
    }).sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export async function getPublicTeamProfile(teamId: number) {
  const { data: team, error: teamError } = await supabase.from("teams")
    .select("*")
    .eq("id", teamId).maybeSingle();
  if (teamError) throw new Error(teamError.message);
  if (!team) return null;

  const now = new Date().toISOString();
  const [seasonResult, countryResult, rosterResult, recentResult, upcomingResult, crestPromise] = await Promise.all([
    supabase.from("seasons").select("id,name,active,start_date").eq("active", true).order("start_date", { ascending: false }).limit(1).maybeSingle(),
    team.country_id == null ? Promise.resolve({ data: [], error: null }) : supabase.from("countries").select("id,name").eq("id", team.country_id).limit(1),
    supabase.from("hist_player_teams").select("id,player_id,season_id,shirt_number,position_id")
      .eq("team_id", teamId).eq("active", true).order("id", { ascending: false }),
    supabase.from("matches").select("id,competition_id,date,status,home_team_id,away_team_id,home_score,away_score")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).lt("date", now).order("date", { ascending: false }).limit(8),
    supabase.from("matches").select("id,competition_id,date,status,home_team_id,away_team_id,home_score,away_score")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).gte("date", now).order("date", { ascending: true }).limit(8),
    findCommonsTeamCrest(String(team.name)),
  ]);
  for (const result of [seasonResult, countryResult, rosterResult, recentResult, upcomingResult]) if (result.error) throw new Error(result.error.message);
  const activeSeasonId = seasonResult.data?.id == null ? null : Number(seasonResult.data.id);
  const rosterHistories = (rosterResult.data ?? []).filter((item) => activeSeasonId === null || Number(item.season_id) === activeSeasonId);
  const playerIds = Array.from(new Set(rosterHistories.map((item) => Number(item.player_id))));
  const positionIds = Array.from(new Set(rosterHistories.map((item) => Number(item.position_id)).filter(Number.isFinite)));
  const matches = [...(recentResult.data ?? []), ...(upcomingResult.data ?? [])];
  const opponentIds = Array.from(new Set(matches.flatMap((item) => [Number(item.home_team_id), Number(item.away_team_id)])));
  const competitionIds = Array.from(new Set(matches.map((item) => Number(item.competition_id))));
  const [playersResult, positionsResult, teamsResult, competitionsResult, marketValuesResult] = await Promise.all([
    playerIds.length ? supabase.from("players").select("id,name").in("id", playerIds) : Promise.resolve({ data: [], error: null }),
    positionIds.length ? supabase.from("positions").select("id,name,short_name").in("id", positionIds) : Promise.resolve({ data: [], error: null }),
    opponentIds.length ? supabase.from("teams").select("id,name,short_name").in("id", opponentIds) : Promise.resolve({ data: [], error: null }),
    competitionIds.length ? supabase.from("competitions").select("id,name").in("id", competitionIds) : Promise.resolve({ data: [], error: null }),
    playerIds.length ? supabase.from("player_market_values").select("player_id,current_value_eur,updated_at").in("player_id", playerIds) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [playersResult, positionsResult, teamsResult, competitionsResult]) if (result.error) throw new Error(result.error.message);
  const playerMap = new Map((playersResult.data ?? []).map((item) => [Number(item.id), String(item.name)]));
  const positionMap = new Map((positionsResult.data ?? []).map((item) => [Number(item.id), String(item.name ?? item.short_name ?? "") ]));
  const teamsMap = new Map((teamsResult.data ?? []).map((item) => [Number(item.id), String(item.name)]));
  const competitionsMap = new Map((competitionsResult.data ?? []).map((item) => [Number(item.id), String(item.name)]));
  const mapMatch = (match: Row) => {
    const homeTeamId = Number(match.home_team_id);
    const awayTeamId = Number(match.away_team_id);
    const homeScore = match.home_score == null ? null : Number(match.home_score);
    const awayScore = match.away_score == null ? null : Number(match.away_score);
    return {
      id: Number(match.id), date: String(match.date),
      status: getMatchDisplayStatus(String(match.date), String(match.status), homeScore, awayScore),
      homeTeamId, awayTeamId, homeTeam: teamsMap.get(homeTeamId) ?? "Equipo local", awayTeam: teamsMap.get(awayTeamId) ?? "Equipo visitante",
      homeScore, awayScore, competition: competitionsMap.get(Number(match.competition_id)) ?? "Competición",
      opponent: teamsMap.get(homeTeamId === teamId ? awayTeamId : homeTeamId) ?? "Rival",
    };
  };
  return {
    team: { id: Number(team.id), name: String(team.name), shortName: String(team.short_name ?? ""), city: String(team.city ?? ""), type: String(team.type ?? ""), country: countryResult.data?.[0]?.name ?? null, active: Boolean(team.active), foundationYear: team.foundation_year == null ? null : Number(team.foundation_year), stadium: String(team.stadium ?? ""), stadiumCapacity: team.stadium_capacity == null ? null : Number(team.stadium_capacity) },
    marketValue: marketValuesResult.error || !marketValuesResult.data?.length ? null : {
      totalEur: (marketValuesResult.data ?? []).reduce((total, item) => total + Number(item.current_value_eur || 0), 0),
      valuedPlayers: (marketValuesResult.data ?? []).length,
      updatedAt: (marketValuesResult.data ?? []).reduce<string | null>((latest, item) => !latest || String(item.updated_at) > latest ? String(item.updated_at) : latest, null),
    },
    currentSeason: seasonResult.data ? { id: Number(seasonResult.data.id), name: String(seasonResult.data.name) } : null,
    crest: await crestPromise,
    roster: rosterHistories.map((item) => ({ playerId: Number(item.player_id), name: playerMap.get(Number(item.player_id)) ?? "Jugador", position: positionMap.get(Number(item.position_id)) || null, shirtNumber: item.shirt_number == null ? null : Number(item.shirt_number) })).sort((a, b) => a.name.localeCompare(b.name, "es")),
    recentMatches: (recentResult.data ?? []).map(mapMatch),
    upcomingMatches: (upcomingResult.data ?? []).map(mapMatch),
  };
}
