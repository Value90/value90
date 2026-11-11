import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHighlightlyMatches } from "@/lib/highlightly.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAGUES = { laliga: 119924, champions: 2486 } as const;

function madridToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para consultar el saldo." }, { status: 401 });

  const competition = request.nextUrl.searchParams.get("competition") ?? "laliga";
  if (!Object.prototype.hasOwnProperty.call(LEAGUES, competition)) return NextResponse.json({ error: "Selecciona una competición válida." }, { status: 400 });
  const seasonYear = Number(request.nextUrl.searchParams.get("seasonYear") ?? 2026);
  if (!Number.isInteger(seasonYear) || seasonYear < 1990 || seasonYear > 2100) return NextResponse.json({ error: "Selecciona una temporada válida." }, { status: 400 });

  try {
    const response = await getHighlightlyMatches(LEAGUES[competition as keyof typeof LEAGUES], seasonYear, 0, madridToday(), 1);
    const limitHeader = response.limit;
    const remaining = response.remaining;
    return NextResponse.json({
      remaining: remaining == null ? null : Number(remaining),
      limit: limitHeader == null ? null : Number(limitHeader),
      checkedAt: new Date().toISOString(),
      callsUsed: 1,
      note: "Consultar el saldo utiliza una llamada a Highlightly.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo consultar el saldo de Highlightly." }, { status: 502 });
  }
}
