export interface Participation {
  id: number;

  matchId: number;

  playerId: number;

  teamId: number;

  positionId: number;

  shirtNumber: number;

  isStartingXI: boolean;

  minutesPlayed: number;

  captain: boolean;

  substituteInMinute: number | null;

  substituteOutMinute: number | null;
}