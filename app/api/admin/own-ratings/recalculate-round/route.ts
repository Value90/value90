import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { recalculateMatchOwnRating } from "@/lib/recalculate-match-own-rating.server";
import { recalculateV90Forward } from "@/lib/recalculate-v90-forward.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para calcular V90." }, { status: 401 });
  if (user.email?.toLowerCase() !== "pastues@icloud.com") {
    return NextResponse.json({ error: "No tienes permiso para recalcular V90." }, { status: 403 });
  }

  try {
    const input = await request.json() as { seasonId?: number; competitionId?: number; stageId?: number };
    const seasonId = Number(input.seasonId);
    const competitionId = Number(input.competitionId);
    const stageId = Number(input.stageId);
    if (![seasonId, competitionId, stageId].every((value) => Number.isSafeInteger(value) && value > 0)) {
      return NextResponse.json({ error: "Selecciona temporada, competición y jornada." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: matches, error } = await supabase.from("matches")
      .select("id,season_id,competition_id,stage_id,home_team_id,status")
      .eq("season_id", seasonId).eq("competition_id", competitionId).eq("stage_id", stageId)
      .eq("status", "Jugado").order("date", { ascending: true });
    if (error) throw new Error(`No se pudieron cargar los partidos de la jornada: ${error.message}`);
    if (!matches?.length) return NextResponse.json({ error: "La jornada no contiene partidos jugados para calcular." }, { status: 422 });

    let ownRatings = 0;
    for (const match of matches) {
      const result = await recalculateMatchOwnRating(supabase, Number(match.id), match, { calculateV90: false });
      ownRatings += result.calculated;
    }
    const v90 = await recalculateV90Forward(supabase, Number(matches[0].id));
    return NextResponse.json({
      ok: true,
      matchCount: matches.length,
      ownRatings,
      v90,
      message: `Jornada recalculada: ${matches.length} partidos, ${ownRatings} valoraciones propias. También se actualizaron las jornadas posteriores afectadas.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo recalcular la jornada.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
