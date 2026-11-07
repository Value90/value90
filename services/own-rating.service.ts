import { supabase } from "@/lib/supabase";

export interface OwnMatchRating {
  matchId: number;
  playerId: number;
  ownRating: number;
}

/** Loads the latest non-evaluation model output for the requested matches. */
export async function getLatestOwnMatchRatings(matchIds: number[]): Promise<OwnMatchRating[]> {
  const uniqueMatchIds = [...new Set(matchIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (!uniqueMatchIds.length) return [];

  const { data: runs, error: runsError } = await supabase
    .from("own_rating_runs")
    .select("id,season_id,competition_id,created_at")
    .is("evaluation_source_run_id", null)
    .order("created_at", { ascending: false });
  if (runsError) throw runsError;

  const latestRuns = new Map<string, string>();
  for (const run of runs ?? []) {
    const scope = `${run.season_id}:${run.competition_id}`;
    if (!latestRuns.has(scope)) latestRuns.set(scope, String(run.id));
  }
  const runIds = [...latestRuns.values()];
  if (!runIds.length) return [];

  const output: OwnMatchRating[] = [];
  for (let matchOffset = 0; matchOffset < uniqueMatchIds.length; matchOffset += 100) {
    const batchMatchIds = uniqueMatchIds.slice(matchOffset, matchOffset + 100);
    for (let from = 0; from < 100_000; from += 1000) {
      const { data, error } = await supabase
        .from("own_match_ratings")
        .select("match_id,player_id,own_rating")
        .in("run_id", runIds)
        .in("match_id", batchMatchIds)
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (error) throw error;
      const page = data ?? [];
      output.push(...page.map((row) => ({
        matchId: Number(row.match_id),
        playerId: Number(row.player_id),
        ownRating: Number(row.own_rating),
      })));
      if (page.length < 1000) break;
    }
  }
  return output;
}
