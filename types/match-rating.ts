export interface MatchRating {
  id: number;

  matchId: number;
  playerId: number;
  participationId: number;

  marcaRating: number | null;
  asRating: number | null;
  sofascoreRating: number | null;
  flashscoreRating: number | null;

  externalAverage: number | null;

  value90MatchRating: number | null;
  finalMatchRating: number | null;

  confidence: number | null;

  calculationVersion: string | null;
  calculatedAt: string | null;
}