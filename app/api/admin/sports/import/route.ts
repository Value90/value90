import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHighlightlyMatches, type HighlightlyMatch } from "@/lib/highlightly.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEASON_YEAR = 2026;
const TARGETS = [
  { scope: "laliga-november", leagueId: 119924, rounds: new Set([11, 12, 13, 14]), month: 11 },
  { scope: "champions-november", leagueId: 2486, rounds: new Set([4, 5]), month: 11 },
] as const;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(fc|cf|club|de|del|the|afc|sc)\b/g, " ").replace(/[^a-z0-9]/g, "");
}

function roundNumber(round: string) {
  const match = round.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function isFinished(match: HighlightlyMatch) {
  return /finished|full.?time|after over time/i.test(match.state?.description ?? "");
}

function parseScore(value: string | null | undefined) {
  const match = value?.match(/(\d+)\s*[-:]\s*(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] as const : [null, null] as const;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para importar partidos." }, { status: 401 });

    const { data: completedRuns, error: runsError } = await supabase
      .from("external_match_import_runs").select("scope").eq("provider", "highlightly").eq("season_year", SEASON_YEAR);
    if (runsError) throw new Error(`Falta aplicar la migración de sincronización: ${runsError.message}`);
    const completed = new Set((completedRuns ?? []).map((run) => run.scope));
    const targets = TARGETS.filter((target) => !completed.has(target.scope));
    if (!targets.length) {
      return NextResponse.json({ ok: true, alreadyImported: true, message: "Las jornadas solicitadas ya se importaron. No se gastaron llamadas." });
    }

    const [seasonsResult, competitionsResult, stagesResult, teamsResult] = await Promise.all([
      supabase.from("seasons").select("id,name,start_date,end_date,active"),
      supabase.from("competitions").select("id,name,short_name"),
      supabase.from("stages").select("id,season_id,name,display_order,active"),
      supabase.from("teams").select("id,name,short_name,stadium"),
    ]);
    for (const result of [seasonsResult, competitionsResult, stagesResult, teamsResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const season = (seasonsResult.data ?? []).find((item) => {
      const startYear = item.start_date ? Number(item.start_date.slice(0, 4)) : Number(normalize(item.name).match(/20\d{2}/)?.[0]);
      return startYear === SEASON_YEAR;
    });
    if (!season) throw new Error("No encuentro la temporada 2026/27 en la configuración. Créala antes de importar.");

    const imported: Array<{ competition: string; round: string; home: string; away: string; date: string }> = [];
    const skipped: Array<{ competition: string; round: string; home: string; away: string; reason: string }> = [];
    const missingTeams = new Set<string>();

    for (const target of targets) {
      const skippedAtStart = skipped.length;
      const matches: HighlightlyMatch[] = [];
      let total = Number.POSITIVE_INFINITY;
      for (let offset = 0; offset < total; offset += 100) {
        const response = await getHighlightlyMatches(target.leagueId, SEASON_YEAR, offset);
        const page = response.body;
        if (!page?.pagination || !Array.isArray(page.data)) throw new Error(`Respuesta de calendario no válida para ${target.scope}.`);
        matches.push(...page.data);
        total = page.pagination.totalCount;
        if (!page.data.length) break;
      }

      const competition = (competitionsResult.data ?? []).find((item) => {
        const name = normalize(`${item.name} ${item.short_name ?? ""}`);
        return target.scope.startsWith("laliga")
          ? name.includes("laliga") || name.includes("primeradivision")
          : name.includes("championsleague");
      });
      if (!competition) {
        throw new Error(`Crea o activa la competición correspondiente a ${target.scope} antes de importar. No se ha marcado este bloque como completado.`);
      }

      const targetMatches = matches.filter((match) => {
        const date = new Date(match.date);
        return date.getUTCFullYear() === SEASON_YEAR && date.getUTCMonth() + 1 === target.month
          && target.rounds.has(roundNumber(match.round) ?? -1);
      });
      if (targetMatches.length === 0) {
        throw new Error(`Highlightly no devolvió partidos para ${target.scope}; no se ha marcado como importado.`);
      }

      for (const match of targetMatches) {
        const homeKey = normalize(match.homeTeam.name);
        const awayKey = normalize(match.awayTeam.name);
        const home = (teamsResult.data ?? []).find((team) => normalize(team.name) === homeKey || normalize(team.short_name ?? "") === homeKey);
        const away = (teamsResult.data ?? []).find((team) => normalize(team.name) === awayKey || normalize(team.short_name ?? "") === awayKey);
        if (!home || !away) {
          if (!home) missingTeams.add(match.homeTeam.name);
          if (!away) missingTeams.add(match.awayTeam.name);
          skipped.push({ competition: competition.name, round: match.round, home: match.homeTeam.name, away: match.awayTeam.name, reason: "Falta crear o asociar uno de los equipos en Value90." });
          continue;
        }

        const round = roundNumber(match.round)!;
        let stage = (stagesResult.data ?? []).find((item) => item.season_id === season.id && roundNumber(item.name) === round);
        if (!stage) {
          const displayOrder = Math.max(0, ...(stagesResult.data ?? []).filter((item) => item.season_id === season.id).map((item) => Number(item.display_order))) + 1;
          const created = await supabase.from("stages").insert({ season_id: season.id, name: `Jornada ${round}`, display_order: displayOrder, active: true }).select("id,season_id,name,display_order,active").single();
          if (created.error) throw new Error(`No se pudo crear la jornada ${round}: ${created.error.message}`);
          stage = created.data;
          stagesResult.data?.push(stage);
        }

        const { data: existingMapping, error: mappingError } = await supabase.from("external_match_mappings")
          .select("match_id").eq("provider", "highlightly").eq("external_match_id", match.id).maybeSingle();
        if (mappingError) throw new Error(`Falta aplicar la migración de sincronización: ${mappingError.message}`);
        let localMatchId = existingMapping?.match_id as number | undefined;

        if (!localMatchId) {
          const { data: possibleDuplicate, error: duplicateError } = await supabase.from("matches")
            .select("id").eq("season_id", season.id).eq("competition_id", competition.id)
            .eq("home_team_id", home.id).eq("away_team_id", away.id).eq("date", match.date).maybeSingle();
          if (duplicateError) throw new Error(`No se pudo comprobar si el partido ya existía: ${duplicateError.message}`);
          if (possibleDuplicate) {
            localMatchId = Number(possibleDuplicate.id);
            const savedMapping = await supabase.from("external_match_mappings").upsert({ provider: "highlightly", external_match_id: match.id, match_id: localMatchId });
            if (savedMapping.error) throw new Error(`No se pudo asociar el partido existente: ${savedMapping.error.message}`);
          }
        }

        if (!localMatchId) {
          const score = parseScore(match.state?.score?.current);
          const { data: localMatch, error: insertError } = await supabase.from("matches").insert({
            competition_id: competition.id,
            season_id: season.id,
            stage_id: stage.id,
            home_team_id: home.id,
            away_team_id: away.id,
            home_score: isFinished(match) ? score[0] : null,
            away_score: isFinished(match) ? score[1] : null,
            home_penalty_score: null,
            away_penalty_score: null,
            date: match.date,
            stadium: null,
            status: isFinished(match) ? "Jugado" : /cancel/i.test(match.state?.description ?? "") ? "Cancelado" : "Programado",
            match_duration: 90,
          }).select("id").single();
          if (insertError) throw new Error(`No se pudo crear ${match.homeTeam.name}–${match.awayTeam.name}: ${insertError.message}`);
          localMatchId = localMatch.id;
          const savedMapping = await supabase.from("external_match_mappings").insert({ provider: "highlightly", external_match_id: match.id, match_id: localMatchId });
          if (savedMapping.error) throw new Error(`Partido creado, pero no se pudo guardar su referencia externa: ${savedMapping.error.message}`);
        }

        for (const team of [
          { external: match.homeTeam.id, local: home.id },
          { external: match.awayTeam.id, local: away.id },
        ]) {
          const mapped = await supabase.from("external_team_mappings").upsert({ provider: "highlightly", external_team_id: team.external, team_id: team.local }, { onConflict: "provider,external_team_id" });
          if (mapped.error) throw new Error(`No se pudo asociar el equipo ${team.local}: ${mapped.error.message}`);
        }
        imported.push({ competition: competition.name, round: match.round, home: match.homeTeam.name, away: match.awayTeam.name, date: match.date });
      }

      // Permite repetir el bloque mientras queden equipos o partidos por resolver.
      if (skipped.length === skippedAtStart) {
        const run = await supabase.from("external_match_import_runs").upsert({ provider: "highlightly", scope: target.scope, season_year: SEASON_YEAR, imported_count: imported.filter((item) => item.competition === competition.name).length, completed_at: new Date().toISOString() }, { onConflict: "provider,scope,season_year" });
        if (run.error) throw new Error(run.error.message);
      }
    }

    return NextResponse.json({
      ok: true,
      complete: skipped.length === 0,
      imported: imported.length,
      skipped: skipped.length,
      importedMatches: imported,
      skippedMatches: skipped,
      missingTeams: [...missingTeams],
      message: "Importación de calendario completada. Las alineaciones se sincronizarán antes del inicio según el proceso programado.",
    });
  } catch (error) {
    console.error("Error importando calendario Highlightly:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo importar el calendario." }, { status: 500 });
  }
}

