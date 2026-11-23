
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ============================================================
 * AUTORIZACIÓN
 * ============================================================
 */

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (
    error ||
    !user ||
    user.email?.toLocaleLowerCase() !== "pastues@icloud.com"
  ) {
    return {
      supabase,
      error: "No autorizado.",
    };
  }

  return {
    supabase,
    error: null,
  };
}

/*
 * ============================================================
 * GET: OBTENER COMPETICIONES PENDIENTES
 * ============================================================
 */

export async function GET() {
  const { supabase, error } = await requireAdmin();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const { data, error: queryError } = await supabase
      .from("external_competition_mappings")
      .select(`
        id,
        provider,
        external_competition_id,
        external_competition_name,
        competition_id,
        status,
        created_at,
        reviewed_at
      `)
      .eq("provider", "highlightly")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    if (queryError) {
      throw queryError;
    }

    return NextResponse.json({
      ok: true,
      pending: data ?? [],
      total: data?.length ?? 0,
    });
  } catch (queryError) {
    console.error(
      "Error obteniendo competiciones pendientes:",
      queryError
    );

    return NextResponse.json(
      {
        error:
          queryError instanceof Error
            ? queryError.message
            : "No se pudieron obtener las competiciones pendientes.",
      },
      { status: 500 }
    );
  }
}

/*
 * ============================================================
 * POST: VINCULAR COMPETICIÓN PENDIENTE
 * ============================================================
 */

export async function POST(request: NextRequest) {
  const { supabase, error } = await requireAdmin();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  let body: {
    externalCompetitionId?: number;
    competitionId?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición no es válido." },
      { status: 400 }
    );
  }

  const externalCompetitionId = Number(
    body.externalCompetitionId
  );

  const competitionId = Number(body.competitionId);

  if (
    !Number.isInteger(externalCompetitionId) ||
    externalCompetitionId <= 0 ||
    !Number.isInteger(competitionId) ||
    competitionId <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Debes indicar una competición de Highlightly y una competición de Value90 válidas.",
      },
      { status: 400 }
    );
  }

  try {
    // Comprobar que la competición de Value90 existe.
    const { data: competition, error: competitionError } =
      await supabase
        .from("competitions")
        .select("id, name")
        .eq("id", competitionId)
        .maybeSingle();

    if (competitionError) {
      throw competitionError;
    }

    if (!competition) {
      return NextResponse.json(
        { error: "La competición seleccionada no existe en Value90." },
        { status: 404 }
      );
    }

    // Resolver únicamente una incidencia que esté pendiente.
    const { data: mapping, error: updateError } = await supabase
      .from("external_competition_mappings")
      .update({
        competition_id: competitionId,
        status: "linked",
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("provider", "highlightly")
      .eq("external_competition_id", externalCompetitionId)
      .eq("status", "pending")
      .select(`
        id,
        provider,
        external_competition_id,
        external_competition_name,
        competition_id,
        status,
        reviewed_at
      `)
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!mapping) {
      return NextResponse.json(
        {
          error:
            "No se encontró una incidencia pendiente para esa competición. Puede que ya esté resuelta.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Competición vinculada correctamente.",
      mapping,
      competitionName: competition.name,
    });
  } catch (saveError) {
    console.error(
      "Error vinculando competición:",
      saveError
    );

    return NextResponse.json(
      {
        error:
          saveError instanceof Error
            ? saveError.message
            : "No se pudo vincular la competición.",
      },
      { status: 500 }
    );
  }
}
