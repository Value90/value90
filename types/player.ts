export interface Player {
  id: number;

  name: string;

  shortName: string;

  countryId: number | null;

  birthDate: string | null;

  active: boolean;
}