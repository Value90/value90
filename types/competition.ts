export interface Competition {
  id: number;
  name: string;
  shortName: string;
  countryId: number | null;
  competitionType:
    | "League"
    | "Cup"
    | "National Team";
  confederation: string;
  active: boolean;
}