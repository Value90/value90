export const OWN_RATING_MODEL_VERSION = "V90-STAT-0.1";

const ALL_FEATURES = [
  "goals", "assists", "shots", "shots_on_target", "dribbles_completed",
  "duels_won", "tackles", "recoveries", "saves", "passes_completed",
  "yellow_cards", "red_cards", "minutes_fraction",
] as const;

export type PositionGroup = "goalkeeper" | "defender" | "midfielder" | "forward" | "other";

export interface OwnRatingSample {
  participationId: number;
  playerId: number;
  matchId: number;
  positionId: number;
  positionName: string;
  stageNumber: number;
  minutesPlayed: number;
  externalAverage: number | null;
  stats: Record<string, number | null | undefined>;
}

interface RatingModel {
  group: PositionGroup;
  source: "position" | "global";
  trainingSamples: number;
  features: string[];
  means: number[];
  scales: number[];
  intercept: number;
  coefficients: number[];
  ridge: number;
}

const POSITION_FEATURES: Record<Exclude<PositionGroup, "other">, string[]> = {
  goalkeeper: ["saves", "recoveries", "tackles", "passes_completed", "duels_won", "goals", "assists", "shots_on_target", "yellow_cards", "red_cards", "minutes_fraction"],
  defender: ["tackles", "recoveries", "duels_won", "passes_completed", "assists", "goals", "shots_on_target", "dribbles_completed", "yellow_cards", "red_cards", "minutes_fraction"],
  midfielder: ["passes_completed", "recoveries", "tackles", "duels_won", "assists", "goals", "shots_on_target", "dribbles_completed", "shots", "yellow_cards", "red_cards", "minutes_fraction"],
  forward: ["goals", "assists", "shots_on_target", "shots", "dribbles_completed", "duels_won", "tackles", "recoveries", "yellow_cards", "red_cards", "minutes_fraction"],
};

export function getPositionGroup(value: string): PositionGroup {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/portero|goalkeeper|arquero|\bgk\b|\bpor\b/.test(normalized)) return "goalkeeper";
  if (/defensa|defender|central|lateral|\bdf\b|\bdfc\b/.test(normalized)) return "defender";
  if (/medio|midfielder|centrocampista|mediocentro|volante|\bmc\b|\bmco\b|\bmcd\b/.test(normalized)) return "midfielder";
  if (/delantero|forward|extremo|punta|\bdc\b|\bsd\b|\bei\b|\bed\b/.test(normalized)) return "forward";
  return "other";
}

function featuresFor(sample: OwnRatingSample): Record<string, number> {
  const minutes = Math.max(0, Math.min(120, Number(sample.minutesPlayed) || 0));
  const denominator = Math.max(30, minutes);
  const result: Record<string, number> = { minutes_fraction: Math.min(1.33, minutes / 90) };
  for (const key of ALL_FEATURES) {
    if (key === "minutes_fraction") continue;
    const raw = Math.max(0, Number(sample.stats[key]) || 0);
    const per90 = raw * 90 / denominator;
    // Cap rare short-cameo spikes so a single event does not dominate a rating.
    result[key] = Math.min(key === "goals" ? 5 : 25, per90);
  }
  return result;
}

function solve(matrix: number[][], values: number[]): number[] {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-10) continue;
    for (let item = column; item <= size; item += 1) augmented[column][item] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let item = column; item <= size; item += 1) augmented[row][item] -= factor * augmented[column][item];
    }
  }
  return augmented.map((row, index) => Number.isFinite(row[size]) ? row[size] : (index === 0 ? 5 : 0));
}

function fit(samples: OwnRatingSample[], group: PositionGroup, features: string[], source: "position" | "global"): RatingModel | null {
  const labeled = samples.filter((sample) => sample.externalAverage != null && Number.isFinite(sample.externalAverage));
  if (labeled.length < features.length + 4) return null;
  const rows = labeled.map((sample) => featuresFor(sample));
  const means = features.map((feature) => rows.reduce((sum, row) => sum + row[feature], 0) / rows.length);
  const scales = features.map((feature, index) => {
    const variance = rows.reduce((sum, row) => sum + (row[feature] - means[index]) ** 2, 0) / rows.length;
    return Math.sqrt(variance) || 1;
  });
  const matrixSize = features.length + 1;
  const normal = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0) as number[]);
  const target = Array(matrixSize).fill(0) as number[];
  labeled.forEach((sample, index) => {
    const vector = [1, ...features.map((_, featureIndex) => (rows[index][features[featureIndex]] - means[featureIndex]) / scales[featureIndex])];
    const rating = Number(sample.externalAverage);
    for (let row = 0; row < matrixSize; row += 1) {
      target[row] += vector[row] * rating;
      for (let column = 0; column < matrixSize; column += 1) normal[row][column] += vector[row] * vector[column];
    }
  });
  const ridge = 8;
  for (let index = 1; index < matrixSize; index += 1) normal[index][index] += ridge;
  const coefficients = solve(normal, target);
  const targets = labeled.map((sample) => Number(sample.externalAverage));
  const targetMean = targets.reduce((sum, value) => sum + value, 0) / targets.length;
  for (let index = 0; index < features.length; index += 1) {
    const feature = features[index];
    const expectsNegative = feature === "yellow_cards" || feature === "red_cards";
    coefficients[index + 1] = expectsNegative
      ? Math.min(0, coefficients[index + 1])
      : Math.max(0, coefficients[index + 1]);
  }
  // Keep the position average calibrated after enforcing sensible coefficient signs.
  coefficients[0] = targetMean;
  return { group, source, trainingSamples: labeled.length, features, means, scales, intercept: coefficients[0], coefficients: coefficients.slice(1), ridge };
}

function modelsFor(samples: OwnRatingSample[]): { global: RatingModel; positions: Partial<Record<PositionGroup, RatingModel>> } | null {
  const global = fit(samples, "other", [...ALL_FEATURES], "global");
  if (!global) return null;
  const positions: Partial<Record<PositionGroup, RatingModel>> = {};
  for (const group of ["goalkeeper", "defender", "midfielder", "forward"] as const) {
    const groupSamples = samples.filter((sample) => getPositionGroup(sample.positionName) === group);
    const groupModel = fit(groupSamples, group, POSITION_FEATURES[group], "position");
    if (groupModel) positions[group] = groupModel;
  }
  return { global, positions };
}

function predict(model: RatingModel, sample: OwnRatingSample): number {
  const row = featuresFor(sample);
  const result = model.intercept + model.features.reduce((sum, feature, index) =>
    sum + ((row[feature] - model.means[index]) / model.scales[index]) * model.coefficients[index], 0);
  return Math.max(0, Math.min(10, result));
}

function modelFor(models: NonNullable<ReturnType<typeof modelsFor>>, sample: OwnRatingSample): RatingModel {
  return models.positions[getPositionGroup(sample.positionName)] ?? models.global;
}

export function trainOwnRatings(samples: OwnRatingSample[]) {
  const labeled = samples.filter((sample) => sample.externalAverage != null && Number.isFinite(sample.externalAverage));
  const crossValidationErrors: number[] = [];
  const stageNumbers = [...new Set(labeled.map((sample) => sample.stageNumber))];
  for (const heldOutStage of stageNumbers) {
    const train = labeled.filter((sample) => sample.stageNumber !== heldOutStage);
    const validation = labeled.filter((sample) => sample.stageNumber === heldOutStage);
    const models = modelsFor(train);
    if (!models) continue;
    for (const sample of validation) crossValidationErrors.push(predict(modelFor(models, sample), sample) - Number(sample.externalAverage));
  }
  const models = modelsFor(labeled);
  if (!models) return null;
  const mae = crossValidationErrors.length
    ? crossValidationErrors.reduce((sum, value) => sum + Math.abs(value), 0) / crossValidationErrors.length
    : null;
  const rmse = crossValidationErrors.length
    ? Math.sqrt(crossValidationErrors.reduce((sum, value) => sum + value ** 2, 0) / crossValidationErrors.length)
    : null;
  const ratings = samples.map((sample) => {
    const model = modelFor(models, sample);
    const ownRating = Math.round(predict(model, sample) * 1000) / 1000;
    const external = sample.externalAverage == null ? null : Number(sample.externalAverage);
    return {
      ...sample,
      ownRating,
      externalAverage: external,
      absoluteError: external == null ? null : Math.round(Math.abs(ownRating - external) * 1000) / 1000,
      modelSource: model.source,
    };
  });
  return {
    ratings,
    trainingSamples: labeled.length,
    ratedSamples: ratings.length,
    crossValidationMae: mae == null ? null : Math.round(mae * 10000) / 10000,
    crossValidationRmse: rmse == null ? null : Math.round(rmse * 10000) / 10000,
    positionModels: { global: models.global, ...models.positions },
    fallbackPositions: (["goalkeeper", "defender", "midfielder", "forward"] as const)
      .filter((group) => !models.positions[group]),
  };
}
