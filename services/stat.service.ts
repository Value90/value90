import {
  stats as initialStats,
} from "@/data/stats/stats";

import type { Stat } from "@/types/stat";

export type { Stat } from "@/types/stat";

let stats: Stat[] = [...initialStats];

export function getStats(): Stat[] {
  return [...stats].sort(
    (a, b) =>
      a.displayOrder - b.displayOrder
  );
}