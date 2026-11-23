
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHighlightlyLeagues } from "@/lib/highlightly.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]/g, "");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user ||
    user.email?.toLocaleLowerCase() !== "pastues@icloud.com"
  ) {
    return { supabase, error: "No autorizado." };
  }

  return { supabase, error: null };
}

/*
 * ============================================================
 * CONSULTAR COMPETICIONES DE HIGHLIGHTLY
 * ============================================================
 */

export async function GET(request: NextRequest) {
  const { supabase, error } = await requireAdmin();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const query =
    request.nextUrl.searchParams.get("query")?.trim() ?? "";

  const season = Number(
    request.nextUrl.searchParams.get("season") ??
      new Date().getUTCFullYear()
  );

  const competitionId = Number(
    request.nextUrl.searchParams.get("competitionId")
  );

  if (
    !query ||
    !Number.isInteger(season) ||
    season <= 0
  ) {
    return NextResponse.json(
      { error: "Indica el nombre y la temporada." },
      { status: 400 }
    );
  }

  try {
    const response = await getHighlightlyLeagues({
      leagueName: query,
      season,
    });

    const leagues = (response.body?.data ?? [])
      .map((league) => ({
        id: league.id,
        name: league.name,
        country: league.country?.name ?? "Sin país",
        availableForSeason:
          league.seasons?.some(
            (entry) => entry.season === season
          ) ?? false,
      }))
      .filter(
        (league) =>
          league.availableForSeason ||
          normalize(league.name).includes(normalize(query))
      );

    let mappedId: number | null = null;

    if (
      Number.isInteger(competitionId) &&
      competitionId > 0
    ) {
      const { data, error: lookupError } = await supabase
        .from("external_competition_mappings")
        .select("external_competition_id")
        .eq("provider", "highlightly")
        .eq("competition_id", competitionId)
        .eq("status", "linked")
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      mappedId = data
        ? Number(data.external_competition_id)
        : null;
    }

    return NextResponse.json({
      leagues,
      mappedId,
      remaining: response.remaining,
      limit: response.limit,
    });
  } catch (lookupError) {
    console.error(
      "Error consultando ligas de Highlightly:",
      lookupError
    );

    return NextResponse.json(
      {
        error:
          lookupError instanceof Error
            ? lookupError.message
            : "No se pudieron consultar las competiciones de Highlightly.",
      },
      { status: 502 }
    );
  }
}

/*
 * ============================================================
 * GUARDAR EQUIVALENCIA DE COMPETICIÓN
 * ============================================================
 */

export async function PUT(request: NextRequest) {
  const { supabase, error } = await requireAdmin();

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  let body: {
    competitionId?: number;
    externalCompetitionId?: number;
    externalName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición no es válido." },
      { status: 400 }
    );
  }

  const competitionId = Number(body.competitionId);
  const externalCompetitionId = Number(
    body.externalCompetitionId
  );
  const externalName = body.externalName?.trim();

  if (
    !Number.isInteger(competitionId) ||
    competitionId <= 0 ||
    !Number.isInteger(externalCompetitionId) ||
    externalCompetitionId <= 0 ||
    !externalName
  ) {
    return NextResponse.json(
      {
        error:
          "La competición de Value90 y la liga de Highlightly son obligatorias.",
      },
      { status: 400 }
    );
  }

  try {
    const { data, error: saveError } = await supabase
      .from("external_competition_mappings")
      .upsert(
        {
          provider: "highlightly",
          competition_id: competitionId,
          external_competition_id: externalCompetitionId,
          external_competition_name: externalName,
          status: "linked",
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "provider,external_competition_id",
        }
      )
      .select(
        "id, provider, competition_id, external_competition_id, external_competition_name, status, reviewed_at"
      )
      .single();

    if (saveError) {
      console.error(
        "Error guardando equivalencia de competición:",
        saveError
      );

      return NextResponse.json(
        { error: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mapping: data,
    });
  } catch (saveError) {
    console.error(
      "Error inesperado guardando equivalencia:",
      saveError
    );

    return NextResponse.json(
      {
        error:
          saveError instanceof Error
            ? saveError.message
            : "No se pudo guardar la equivalencia.",
      },
      { status: 500 }
    );
  }
}
