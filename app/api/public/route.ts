import { NextResponse, type NextRequest } from "next/server";
import {
  getPublicCompetitions,
  getPublicFilters,
  getPublicMatches,
  getPublicOverview,
  getPublicPlayers,
  getPublicRankings,
  getPublicStatistics,
  getPublicTeams,
} from "@/services/public-data.server";

export const runtime = "nodejs";

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const section = params.get("section");

  try {
    let result: unknown;
    switch (section) {
      case "overview": result = await getPublicOverview(); break;
      case "players": result = await getPublicPlayers(params); break;
      case "teams": result = await getPublicTeams(params); break;
      case "competitions": result = await getPublicCompetitions(params); break;
      case "matches": result = await getPublicMatches(params); break;
      case "rankings": result = await getPublicRankings(params); break;
      case "statistics": result = await getPublicStatistics(); break;
      case "filters": result = await getPublicFilters(); break;
      default:
        return NextResponse.json({ error: "Sección pública no válida." }, { status: 400 });
    }

    const headers = section === "matches" || section === "overview"
      ? { "Cache-Control": "no-store" }
      : cacheHeaders;
    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error("Error cargando datos públicos:", error);
    return NextResponse.json(
      { error: "No se han podido cargar los datos. Inténtalo de nuevo." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
