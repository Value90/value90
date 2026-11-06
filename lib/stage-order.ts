type StageOrderable = {
  name: string;
  displayOrder?: number | null;
  display_order?: number | null;
};

function stageNumber(name: string) {
  const numbers = name.match(/\d+/g);
  return numbers?.length ? Number(numbers[numbers.length - 1]) : null;
}

function displayOrder(stage: StageOrderable) {
  return Number(stage.displayOrder ?? stage.display_order ?? 0);
}

/** Ordena jornadas de mayor a menor y conserva el orden de fases sin número. */
export function sortStagesDescending<T extends StageOrderable>(stages: readonly T[]): T[] {
  return [...stages].sort((a, b) => {
    const numberA = stageNumber(a.name);
    const numberB = stageNumber(b.name);

    if (numberA !== null && numberB !== null && numberA !== numberB) {
      return numberB - numberA;
    }

    const orderDifference = displayOrder(b) - displayOrder(a);
    if (orderDifference !== 0) return orderDifference;

    if (numberA !== numberB) return numberA === null ? 1 : -1;

    return b.name.localeCompare(a.name, "es", { numeric: true, sensitivity: "base" });
  });
}
