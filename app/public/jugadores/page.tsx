import type { Metadata } from "next";
import PublicDirectory from "@/components/public/PublicDirectory";
import { getPublicFilters, getPublicPlayers } from "@/services/public-data.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Jugadores", description: "Busca jugadores y consulta su equipo actual en Value90." };

export default async function PublicPlayersPage() {
  let initialFilters;
  let initialResult;
  try {
    [initialFilters, initialResult] = await Promise.all([
      getPublicFilters(), getPublicPlayers(new URLSearchParams("page=1&limit=24")),
    ]);
  } catch (error) { console.error("No se pudieron precargar los jugadores:", error); }
  return <PublicDirectory kind="players" initialFilters={initialFilters} initialResult={initialResult} />;
}
