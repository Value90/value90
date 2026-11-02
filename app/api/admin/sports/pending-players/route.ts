import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para revisar jugadores." }, { status: 401 });
  const { data, error } = await supabase.from("external_player_mappings")
    .select("provider,external_player_key,source_name,team_id,season_id,shirt_number,position_id,match_id,is_starting_xi")
    .eq("status", "pending").order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pending: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para asociar jugadores." }, { status: 401 });
  const body = await request.json().catch(() => null) as { provider?: string; external_player_key?: string; match_id?: number; player_id?: number; position_id?: number } | null;
  if (!body?.external_player_key || !Number.isInteger(body.match_id) || !Number.isInteger(body.player_id)) {
    return NextResponse.json({ error: "Selecciona un jugador y una ficha pendiente válida." }, { status: 400 });
  }
  const { data: mappings, error: mappingError } = await supabase.from("external_player_mappings").select("*")
    .eq("provider", body.provider ?? "highlightly").eq("external_player_key", body.external_player_key).eq("status", "pending");
  if (mappingError || !mappings?.length) return NextResponse.json({ error: mappingError?.message ?? "La ficha pendiente ya no existe." }, { status: 404 });
  const { data: player, error: playerError } = await supabase.from("players").select("id").eq("id", body.player_id).maybeSingle();
  if (playerError || !player) return NextResponse.json({ error: playerError?.message ?? "El jugador seleccionado no existe." }, { status: 404 });
  if (mappings.some((mapping) => !mapping.position_id && !body.position_id)) {
    return NextResponse.json({ error: "Selecciona la posición del jugador antes de asociarlo." }, { status: 400 });
  }
  const participationRows = mappings.map((mapping) => ({
    match_id: mapping.match_id, player_id: player.id, team_id: mapping.team_id, position_id: mapping.position_id ?? body.position_id,
    shirt_number: mapping.shirt_number, is_starting_xi: mapping.is_starting_xi, minutes_played: mapping.is_starting_xi ? 90 : 0,
    captain: mapping.captain ?? false, substitute_in_minute: null, substitute_out_minute: null,
  }));
  const { error: participationError } = await supabase.from("participations").upsert(participationRows, { onConflict: "match_id,player_id" });
  if (participationError) return NextResponse.json({ error: participationError.message }, { status: 500 });
  const mappingUpdate: Record<string, unknown> = { player_id: player.id, status: "linked", updated_at: new Date().toISOString() };
  if (body.position_id) mappingUpdate.position_id = body.position_id;
  const { error } = await supabase.from("external_player_mappings").update(mappingUpdate)
    .eq("provider", body.provider ?? "highlightly").eq("external_player_key", body.external_player_key).eq("status", "pending");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, linkedParticipations: mappings.length });
}
