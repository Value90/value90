export interface Player {
  id: number;
  name: string;
  shortName: string;
  countryId: number | null;
  teamId: number;
  shirtNumber: number;
  positionId: number;
  birthDate: string;
  active: boolean;
}

export const players: Player[] = [
  {
    id: 1,
    name: "Lamine Yamal",
    shortName: "L. Yamal",
    countryId: 1,
    teamId: 3,
    shirtNumber: 10,
    positionId: 8,
    birthDate: "2007-07-13",
    active: true,
  },
  {
    id: 2,
    name: "Jude Bellingham",
    shortName: "Bellingham",
    countryId: 6,
    teamId: 2,
    shirtNumber: 5,
    positionId: 7,
    birthDate: "2003-06-29",
    active: true,
  },
];