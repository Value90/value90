import "server-only";

const BASE_URL = "https://soccer.highlightly.net";

export interface HighlightlyLeague {
  id: number;
  name: string;
  country: { code: string; name: string };
  seasons: Array<{ season: number }>;
}

export interface HighlightlyMatch {
  id: number;
  round: string;
  date: string;
  state: {
    clock: number | null;
    score: { current: string | null; penalties: string | null };
    description: string;
  };
  homeTeam: { id: number; name: string; logo?: string };
  awayTeam: { id: number; name: string; logo?: string };
  venue?: { id?: number; name?: string } | null;
  stadium?: string | null;
  league: { id: number; name: string; season: number };
}

export interface HighlightlyPlayer {
  id?: number;
  name: string;
  number: number;
  position?: "Goalkeeper" | "Defender" | "Midfielder" | "Forward" | null;
}

export interface HighlightlyLineupTeam {
  id: number;
  name: string;
  formation: string;
  initialLineup: HighlightlyPlayer[][];
  substitutes: HighlightlyPlayer[];
}

export interface HighlightlyLineups {
  homeTeam: HighlightlyLineupTeam;
  awayTeam: HighlightlyLineupTeam;
}

export interface HighlightlyEvent {
  team?: { id: number; name: string } | null;
  time?: string | null;
  type?: string | null;
  playerId?: number;
  player?: string;
  substituted?: string;
}

export interface HighlightlyBoxScorePlayer {
  id: number;
  name: string;
  fullName?: string;
  shirtNumber?: number;
  isCaptain: boolean;
  position?: "Goalkeeper" | "Defender" | "Midfielder" | "Forward";
  minutesPlayed: number;
  isSubstitute: boolean;
}

export interface HighlightlyBoxScoreTeam {
  team: { id: number; name: string };
  players: HighlightlyBoxScorePlayer[];
}

interface HighlightlyPage<T> {
  data: T[];
  plan?: { tier?: string; message?: string };
  pagination?: { totalCount: number; offset: number; limit: number };
}

async function request<T>(path: string, params?: Record<string, string | number>) {
  const apiKey = process.env.HIGHLIGHTLY_API_KEY?.trim();
  if (!apiKey) throw new Error("Falta configurar HIGHLIGHTLY_API_KEY en el servidor.");

  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, String(value));

  const response = await fetch(url, {
    headers: { "x-rapidapi-key": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => null) as ({ message?: string; statusCode?: number } & Record<string, unknown>) | null;
  if (!response.ok) {
    throw new Error(body?.message || `Highlightly devolvió HTTP ${response.status}.`);
  }
  return {
    body: body as T,
    remaining: response.headers.get("x-ratelimit-requests-remaining"),
    limit: response.headers.get("x-ratelimit-requests-limit"),
  };
}

export async function getHighlightlyLeagues(params: { leagueName?: string; countryCode?: string; season?: number }) {
  const query: Record<string, string | number> = { limit: 100, ...params };
  return request<HighlightlyPage<HighlightlyLeague>>("/leagues", query);
}

export async function getHighlightlyMatches(leagueId: number, season: number, offset: number, date?: string, limit = 100) {
  return request<HighlightlyPage<HighlightlyMatch>>("/matches", {
    leagueId,
    season,
    limit,
    offset,
    timezone: "Europe/Madrid",
    ...(date ? { date } : {}),
  });
}

export async function getHighlightlyLineups(matchId: number) {
  return request<HighlightlyLineups>(`/lineups/${matchId}`);
}

export async function getHighlightlyMatch(matchId: number) {
  return request<HighlightlyMatch | HighlightlyMatch[]>(`/matches/${matchId}`);
}

export async function getHighlightlyEvents(matchId: number) {
  return request<HighlightlyEvent[]>(`/events/${matchId}`);
}

export async function getHighlightlyBoxScore(matchId: number) {
  return request<HighlightlyBoxScoreTeam[]>(`/box-score/${matchId}`);
}

