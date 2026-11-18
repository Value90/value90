import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHighlightlyLeagues, getHighlightlyMatches } from "@/lib/highlightly.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAGUES = { laliga: 119924, champions: 2486, worldcup: 1635 } as const;
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

function madridToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para consultar el saldo." }, { status: 401 });

  const competition = request.nextUrl.searchParams.get("competition") ?? "";
  const competitionId = Number(request.nextUrl.searchParams.get("competitionId"));
  const competitionName = request.nextUrl.searchParams.get("competitionName")?.trim() ?? "";
  if (!Object.prototype.hasOwnProperty.call(LEAGUES, competition) && (!Number.isInteger(competitionId) || competitionId <= 0 || !competitionName)) return NextResponse.json({ error: "Selecciona una competición válida." }, { status: 400 });
  const seasonYear = Number(request.nextUrl.searchParams.get("seasonYear") ?? 2026);
  if (!Number.isInteger(seasonYear) || seasonYear < 1990 || seasonYear > 2100) return NextResponse.json({ error: "Selecciona una temporada válida." }, { status: 400 });

  try {
    const knownCompetition = Object.prototype.hasOwnProperty.call(LEAGUES, competition);
    const providerSeasonYear = competition === "worldcup" || (!knownCompetition && /world cup|mundial/i.test(competitionName)) ? seasonYear + 1 : seasonYear;
    let leagueId: number | null = knownCompetition ? Number(LEAGUES[competition as keyof typeof LEAGUES]) : null;
    if (!leagueId) {
      const lookup = await getHighlightlyLeagues({ leagueName: competitionName, season: providerSeasonYear });
      const requested = normalize(competitionName);
      const league = lookup.body?.data?.find((item) => normalize(item.name) === requested && item.seasons?.some((entry) => entry.season === providerSeasonYear));
      if (!league) return NextResponse.json({ error: `Highlightly no ofrece «${competitionName}» para la temporada ${providerSeasonYear}.` }, { status: 404 });
      leagueId = league.id;
    }
    if (leagueId == null) throw new Error("No se pudo resolver la competición en Highlightly.");
    const response = await getHighlightlyMatches(leagueId, providerSeasonYear, 0, madridToday(), 1);
    const limitHeader = response.limit;
    const remaining = response.remaining;
    return NextResponse.json({
      remaining: remaining == null ? null : Number(remaining),
      limit: limitHeader == null ? null : Number(limitHeader),
      checkedAt: new Date().toISOString(),
      callsUsed: knownCompetition ? 1 : 2,
      note: knownCompetition ? "Consultar el saldo utiliza una llamada a Highlightly." : "Consultar el saldo de otra liga utiliza una llamada para resolverla y otra para leer el contador.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo consultar el saldo de Highlightly." }, { status: 502 });
  }
}
