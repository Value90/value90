import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** External rating recognition was retired; match data now comes from Highlightly. */
export async function POST() {
  return NextResponse.json(
    { error: "La importación de valoraciones externas está desactivada. Sincroniza el partido desde Partidos para importar estadísticas y calcular V90." },
    { status: 410 },
  );
}
