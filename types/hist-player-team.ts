export interface HistPlayerTeam {
  id: number;

  playerId: number;
  teamId: number;
  seasonId: number;

  shirtNumber: number | null;
  positionId: number | null;

  startDate: string | null;
  endDate: string | null;

  active: boolean;
}