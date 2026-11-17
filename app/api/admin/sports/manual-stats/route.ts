import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recalculateMatchOwnRating } from "@/lib/recalculate-match-own-rating.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAT_FIELDS = [
  "goals", "shots", "shots_on_target", "dribbles", "dribbles_completed", "assists", "duels", "duels_won",
  "saves", "tackles", "recoveries", "passes", "passes_completed", "yellow_cards", "red_cards",
] as const;

export async function POST(request: NextRequest) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para registrar estadísticas." }, { status: 401 });
  if (user.email?.toLowerCase() !== "pastues@icloud.com") return NextResponse.json({ error: "No tienes permiso para registrar estadísticas manualmente." }, { status: 403 });

  try {
    const body = await request.json() as { action?: string; matchId?: number; participationId?: number; stats?: Record<string, unknown> };
    const supabase = createAdminSupabaseClient();
    if (body.action === "recalculate") {
      const matchId = Number(body.matchId);
      if (!Number.isSafeInteger(matchId) || matchId <= 0) return NextResponse.json({ error: "Selecciona un partido válido." }, { status: 400 });
      const { data: match, error: matchError } = await supabase.from("matches")
        .select("id,season_id,competition_id,home_team_id").eq("id", matchId).single();
      if (matchError) throw new Error(matchError.message);
      const recalculation = await recalculateMatchOwnRating(supabase, matchId, match);
      return NextResponse.json({ ok: true, recalculation, highlightlyCallsUsed: 0 });
    }
    const participationId = Number(body.participationId);
    if (!Number.isSafeInteger(participationId) || participationId <= 0) {
      return NextResponse.json({ error: "Selecciona una participación válida." }, { status: 400 });
    }
    if (!body.stats || STAT_FIELDS.some((field) => !Number.isSafeInteger(Number(body.stats?.[field])) || Number(body.stats?.[field]) < 0)) {
      return NextResponse.json({ error: "Introduce un número entero igual o mayor que cero en cada estadística." }, { status: 400 });
    }

    const { data: participation, error: participationError } = await supabase.from("participations")
      .select("id,match_id,minutes_played").eq("id", participationId).maybeSingle();
    if (participationError) throw new Error(participationError.message);
    if (!participation) return NextResponse.json({ error: "La participación ya no existe." }, { status: 404 });
    if (Number(participation.minutes_played) <= 0) return NextResponse.json({ error: "Solo se registran estadísticas para jugadores que disputaron minutos." }, { status: 400 });
    const { data: existing, error: existingError } = await supabase.from("player_match_stats")
      .select("id").eq("participation_id", participationId).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) return NextResponse.json({ error: "Esta participación ya tiene estadísticas guardadas. Actualiza el progreso antes de editar datos existentes." }, { status: 409 });

    const row = Object.fromEntries(STAT_FIELDS.map((field) => [field, Number(body.stats?.[field])])) as Record<(typeof STAT_FIELDS)[number], number>;
    const { error: saveError } = await supabase.from("player_match_stats").insert({ participation_id: participationId, ...row });
    if (saveError) throw new Error(`No se pudieron guardar las estadísticas: ${saveError.message}`);

    const { data: match, error: matchError } = await supabase.from("matches")
      .select("id,season_id,competition_id,home_team_id").eq("id", participation.match_id).single();
    if (matchError) throw new Error(matchError.message);
    const recalculation = await recalculateMatchOwnRating(supabase, Number(match.id), match);
    return NextResponse.json({ ok: true, saved: true, recalculation, highlightlyCallsUsed: 0 });
  } catch (error) {
    console.error("Error guardando estadísticas manuales:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron guardar las estadísticas." }, { status: 500 });
  }
}
