import type { Metadata } from "next";
import PublicMatches from "@/components/public/PublicMatches";
import { getMadridToday, getPublicFilters, getPublicMatches } from "@/services/public-data.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Partidos", description: "Busca partidos de Value90 por fecha, competición, temporada, jornada y equipo." };

export default async function PublicMatchesPage() {
  let initialFilters;
  let initialResult;
  try {
    [initialFilters, initialResult] = await Promise.all([
      getPublicFilters(), getPublicMatches(new URLSearchParams(`page=1&limit=24&date=${getMadridToday()}`)),
    ]);
  } catch (error) { console.error("No se pudieron precargar los partidos:", error); }
  return <PublicMatches initialFilters={initialFilters} initialResult={initialResult} />;
}
