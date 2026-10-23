import type { Metadata } from "next";
import PublicDirectory from "@/components/public/PublicDirectory";
import { getPublicFilters, getPublicTeams } from "@/services/public-data.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Equipos", description: "Explora los equipos activos registrados en Value90." };

export default async function PublicTeamsPage() {
  let initialFilters;
  let initialResult;
  try {
    [initialFilters, initialResult] = await Promise.all([
      getPublicFilters(), getPublicTeams(new URLSearchParams("page=1&limit=24&type=Club")),
    ]);
  } catch (error) { console.error("No se pudieron precargar los equipos:", error); }
  return <PublicDirectory kind="teams" initialFilters={initialFilters} initialResult={initialResult} />;
}
