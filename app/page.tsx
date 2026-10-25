import type { Metadata } from "next";
import PublicHome from "@/components/public/PublicHome";
import { getPublicOverview } from "@/services/public-data.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Value90 | Rendimiento y valor del fútbol", description: "Consulta rankings, partidos, jugadores y equipos con datos de rendimiento Value90." };

export default async function Home() {
  let initialData;
  try { initialData = await getPublicOverview(); }
  catch (error) { console.error("No se pudo precargar la portada pública:", error); }
  return <PublicHome initialData={initialData} />;
}
