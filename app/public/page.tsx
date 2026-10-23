import PublicHome from "@/components/public/PublicHome";
import { getPublicOverview } from "@/services/public-data.server";

export const dynamic = "force-dynamic";

export default async function PublicPage() {
  let initialData;
  try { initialData = await getPublicOverview(); }
  catch (error) { console.error("No se pudo precargar la portada pública:", error); }
  return <PublicHome initialData={initialData} />;
}
