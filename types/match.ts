export interface Match {

  id: number;

  competitionId: number;

  seasonId: number;

  stageId: number;

  homeTeamId: number;

  awayTeamId: number;

  homeScore: number;

  awayScore: number;

  homePenaltyScore: number | null;

  awayPenaltyScore: number | null;

  date: string;

  stadium: string;

  status: "Programado" | "Jugado" | "Cancelado";

  matchDuration: number;

}
