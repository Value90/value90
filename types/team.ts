export interface Team {
  id: number;

  name: string;

  shortName: string;

  countryId: number;

  confederation: string;

  city: string;

  stadium: string;

  type: "Club" | "Selección";

  active: boolean;

  displayOrder: number;

  /*
   * Competición / liga a la que pertenece el club.
   *
   * Para selecciones nacionales puede ser null.
   */
  competitionId: number | null;
}