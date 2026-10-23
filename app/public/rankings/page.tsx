import type { Metadata } from "next";
import PublicRankings from "@/components/public/PublicRankings";
import { getPublicFilters, getPublicRankings } from "@/services/public-data.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Rankings V90", description: "Filtra y consulta la clasificación Value90 por jugador, competición, temporada, equipo y posición." };

export default async function PublicRankingsPage() {
  let initialFilters;
  let initialResult;
  try {
    initialFilters = await getPublicFilters();
    const currentSeasonId = initialFilters.seasons.find((season) => season.active)?.id;
    const params = new URLSearchParams("page=1&limit=20&minMatches=1");
    if (currentSeasonId) params.set("seasonId", String(currentSeasonId));
    initialResult = await getPublicRankings(params);
  } catch (error) { console.error("No se pudo precargar el ranking:", error); }
  return <PublicRankings initialFilters={initialFilters} initialResult={initialResult} />;
}
