import "server-only";
import { calculateV90Stage } from "@/services/v90-engine.service";
import { compareV90Stages } from "@/lib/v90-stage-chronology";

type AdminSupabase = Parameters<typeof calculateV90Stage>[1];
type SeasonMatch = { id: number; season_id: number; competition_id: number; stage_id: number; date: string; status: string };

/** Rebuild the selected round and every later round affected by historical context. */
export async function recalculateV90Forward(supabase: NonNullable<AdminSupabase>, matchId: number) {
  const { data: target, error: targetError } = await supabase.from("matches")
    .select("id,season_id,competition_id,stage_id,date,status")
    .eq("id", matchId).maybeSingle();
  if (targetError) throw new Error(`No se pudo localizar el partido para actualizar V90: ${targetError.message}`);
  if (!target) throw new Error("No se encontró el partido para actualizar V90.");

  const { data: stages, error: stagesError } = await supabase.from("stages")
    .select("id,name").eq("season_id", target.season_id);
  if (stagesError) throw new Error(`No se pudieron ordenar las fases de la temporada: ${stagesError.message}`);
  const stageNameById = new Map((stages ?? []).map((stage) => [Number(stage.id), String(stage.name)]));

  const rows: SeasonMatch[] = [];
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await supabase.from("matches")
      .select("id,season_id,competition_id,stage_id,date,status")
      .eq("season_id", target.season_id).eq("status", "Jugado")
      .order("date", { ascending: true }).order("id", { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`No se pudieron cargar los partidos de la temporada para V90: ${error.message}`);
    const page = (data ?? []) as SeasonMatch[];
    rows.push(...page);
    if (page.length < 1000) break;
  }

  const targetDate = new Date(target.date).getTime();
  const targetStageName = stageNameById.get(Number(target.stage_id));
  const affected = rows.filter((row) => {
    if (row.competition_id !== Number(target.competition_id)) return new Date(row.date).getTime() >= targetDate;
    const chronology = compareV90Stages(stageNameById.get(row.stage_id), targetStageName);
    return chronology == null
      ? new Date(row.date).getTime() >= targetDate
      : chronology >= 0;
  });
  const groups = new Map<string, SeasonMatch[]>();
  for (const row of affected) {
    const key = `${row.competition_id}:${row.stage_id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  // Preserve the V90 engine's same-competition stage ordering while keeping
  // cross-competition stages in calendar order.
  const pending = [...groups.entries()].map(([key, matches]) => ({
    key,
    competitionId: matches[0].competition_id,
    stageId: matches[0].stage_id,
    stageName: stageNameById.get(matches[0].stage_id) ?? null,
    date: Math.min(...matches.map((match) => new Date(match.date).getTime())),
    matchIds: matches.map((match) => match.id),
  }));
  const ordered: typeof pending = [];
  const compareGroups = (left: (typeof pending)[number], right: (typeof pending)[number]) => {
    const chronology = compareV90Stages(left.stageName, right.stageName);
    return chronology ?? (left.date - right.date);
  };
  while (pending.length) {
    const ready = pending.filter((candidate) => !pending.some((other) =>
      other.competitionId === candidate.competitionId && compareGroups(other, candidate) < 0));
    ready.sort((a, b) => a.date - b.date || a.competitionId - b.competitionId || a.stageId - b.stageId);
    const next = ready[0] ?? pending[0];
    ordered.push(next);
    pending.splice(pending.indexOf(next), 1);
  }

  const results = [];
  for (const group of ordered) {
    const result = await calculateV90Stage(group.matchIds, supabase);
    if (!result.success && result.status === "ERROR") {
      throw new Error(`No se pudo recalcular V90 en la jornada/fase ${group.stageId}: ${result.message}`);
    }
    results.push(result);
  }
  return {
    stagesRecalculated: results.length,
    matchesRecalculated: results.reduce((sum, result) => sum + result.matches.length, 0),
    calculated: results.reduce((sum, result) => sum + result.matches.reduce((part, item) => part + item.calculated, 0), 0),
    pending: results.reduce((sum, result) => sum + result.matches.reduce((part, item) => part + item.pending, 0), 0),
  };
}
