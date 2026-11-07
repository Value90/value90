export interface OwnMatchRating {
  matchId: number;
  playerId: number;
  ownRating: number;
}

/** Loads the latest non-evaluation model output for the requested matches. */
export async function getLatestOwnMatchRatings(matchIds: number[]): Promise<OwnMatchRating[]> {
  const uniqueMatchIds = [...new Set(matchIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (!uniqueMatchIds.length) return [];
  const response = await fetch("/api/admin/own-ratings", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar las valoraciones propias.");
  const matchIdSet = new Set(uniqueMatchIds);
  return ((payload.finalRatings ?? []) as OwnMatchRating[])
    .filter((rating) => matchIdSet.has(Number(rating.matchId)))
    .map((rating) => ({
      matchId: Number(rating.matchId),
      playerId: Number(rating.playerId),
      ownRating: Number(rating.ownRating),
    }));
}
