export interface Season {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export const seasons: Season[] = [
  {
    id: 1,
    name: "Temporada 2025/26",
    startDate: "2025-08-01",
    endDate: "2026-06-30",
    active: true,
  },
];