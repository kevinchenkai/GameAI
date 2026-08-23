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
      if (delta < 0) {
        errors.push(
          `level ${point.levelId}: Greedy curve decreased from ${previous.failRate} to ${point.failRate}`,
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
  return { errors, warnings };
}

export function measureGreedyCurve(
  levels: readonly LevelDefinition[],
  trials: number = SIMULATION.trialsPerStrategy,
): GreedyCurvePoint[] {
  return [...levels]
    .sort((first, second) => first.id - second.id)
    .map((level) => ({
      levelId: level.id,
      failRate: simulateLevel(
        levelToGameState(level),
        'greedy',
        trials,
        level.id * 1000 + 17,
      ).failRate,
    }));
}
