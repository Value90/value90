export interface PlayerMatchStat {
  id: number;

  participationId: number;

  /*
   * ============================================================
   * OFENSIVAS
   * ============================================================
   */

  goals: number | null;

  shots: number | null;

  shotsOnTarget: number | null;

  dribbles: number | null;

  dribblesCompleted: number | null;

  assists: number | null;

  /*
   * ============================================================
   * DEFENSIVAS
   * ============================================================
   */

  duels: number | null;

  duelsWon: number | null;

  clearances: number | null;

  saves: number | null;

  tackles: number | null;

  recoveries: number | null;

  /*
   * ============================================================
   * DISTRIBUCIÓN
   * ============================================================
   */

  passes: number | null;

  passesCompleted: number | null;

  errorsLeadingToGoal: number | null;

  yellowCards: number | null;

  redCards: number | null;
}