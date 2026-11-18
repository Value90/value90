/** Chronological sort key for league rounds and common cup phases. */
export function v90StageChronologyKey(name: string | null | undefined): number | null {
  if (!name) return null;
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const round = normalized.match(/jornada\s+(\d+)/);
  if (round) return 60 + Number(round[1]);
  if (/preliminary|ronda preliminar/.test(normalized)) return 10;
  if (/1st qualifying|first qualifying|primera ronda clasificatoria/.test(normalized)) return 20;
  if (/2nd qualifying|second qualifying|segunda ronda clasificatoria/.test(normalized)) return 30;
  if (/3rd qualifying|third qualifying|tercera ronda clasificatoria/.test(normalized)) return 40;
  if (/4th qualifying|fourth qualifying|cuarta ronda clasificatoria/.test(normalized)) return 45;
  if (/knockout.*play.?offs?|play.?offs?.*knockout/.test(normalized)) return 70;
  if (/play.?offs|play.?off|eliminatoria previa/.test(normalized)) return 50;
  if (/league stage|fase liga|group stage|fase de grupos/.test(normalized)) return 60;
  if (/round of 32|dieciseisavos/.test(normalized)) return 75;
  if (/round of 16|octavos/.test(normalized)) return 80;
  if (/quarter.?final|cuartos/.test(normalized)) return 90;
  if (/semi.?final|semifinal/.test(normalized)) return 100;
  if (/third place|tercer puesto/.test(normalized)) return 105;
  if (/final/.test(normalized)) return 110;
  return null;
}

export function compareV90Stages(leftName: string | null | undefined, rightName: string | null | undefined) {
  const left = v90StageChronologyKey(leftName);
  const right = v90StageChronologyKey(rightName);
  return left == null || right == null ? null : left - right;
}
