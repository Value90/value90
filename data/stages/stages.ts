export interface Stage {
  id: number;
  name: string;
  competitionId: number;
  seasonId: number;
  type:
    | "Jornada"
    | "Grupo"
    | "Play-off"
    | "Octavos"
    | "Cuartos"
    | "Semifinal"
    | "Final";
}

export const stages: Stage[] = [
  {
    id: 1,
    name: "Jornada 1",
    competitionId: 1,
    seasonId: 1,
    type: "Jornada",
  },
];