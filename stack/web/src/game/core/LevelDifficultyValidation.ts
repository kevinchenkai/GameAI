import { SIMULATION } from '../config/tuning';
import type { LevelDefinition } from '../types/level';
import { levelToGameState } from './LevelValidation';
import { exceedsGreedyBuildThreshold, simulateLevel } from './Simulator';

export interface GreedyCurvePoint {
  levelId: number;
  failRate: number;
}

export interface GreedyCurveValidation {
  errors: string[];
  warnings: string[];
}

export function validateGreedyCurve(
  points: readonly GreedyCurvePoint[],
): GreedyCurveValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sorted = [...points].sort((first, second) => first.levelId - second.levelId);
  let previous: GreedyCurvePoint | undefined;
  for (const point of sorted) {
    if (exceedsGreedyBuildThreshold(point.levelId, point.failRate)) {
      const threshold = point.levelId <= 5
        ? SIMULATION.tutorialMaxGreedyFailRate
        : SIMULATION.standardMaxGreedyFailRate;
      errors.push(`level ${point.levelId}: Greedy fail rate ${point.failRate} exceeds ${threshold}`);
    }
    if (previous !== undefined) {
      const delta = point.failRate - previous.failRate;
      if (delta < -SIMULATION.monotonicTolerance - Number.EPSILON) {
        errors.push(
          `level ${point.levelId}: Greedy curve decreased from ${previous.failRate} to ` +
            `${point.failRate} beyond ${SIMULATION.monotonicTolerance} tolerance`,
        );
      }
      if (delta > SIMULATION.adjacentFailRateWarningDelta) {
        warnings.push(
          `level ${previous.levelId}->${point.levelId}: Greedy jump ${(delta * 100).toFixed(1)}pp exceeds 12pp`,
        );
      }
    }
    previous = point;
  }

  const segments = [
    sorted.filter(({ levelId }) => levelId >= 6 && levelId <= 10),
    sorted.filter(({ levelId }) => levelId >= 11 && levelId <= 15),
    sorted.filter(({ levelId }) => levelId >= 16 && levelId <= 20),
  ];
  if (segments.every((segment) => segment.length === 5)) {
    const averages = segments.map(
      (segment) => segment.reduce((sum, point) => sum + point.failRate, 0) / segment.length,
    );
    const early = averages[0];
    const middle = averages[1];
    const late = averages[2];
    if (early === undefined || middle === undefined || late === undefined) {
      throw new Error('difficulty segment averages are incomplete');
    }
    if (!(early < middle && middle < late)) {
      errors.push(
        `segment averages must increase: L6-10=${early.toFixed(4)}, ` +
          `L11-15=${middle.toFixed(4)}, L16-20=${late.toFixed(4)}`,
      );
    }
  }
  return { errors, warnings };
}

export function measureGreedyCurve(
  levels: readonly LevelDefinition[],
  trials: number = SIMULATION.trialsPerStrategy,
  trialSeed = 17,
): GreedyCurvePoint[] {
  return [...levels]
    .sort((first, second) => first.id - second.id)
    .map((level) => ({
      levelId: level.id,
      failRate: simulateLevel(
        levelToGameState(level),
        'greedy',
        trials,
        level.id * 1000 + trialSeed,
      ).failRate,
    }));
}
