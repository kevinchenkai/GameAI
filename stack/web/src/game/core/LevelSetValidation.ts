import { LEVEL_CURVE } from '../config/levelCurve';
import { GAMEPLAY } from '../config/tuning';
import type { LevelDefinition } from '../types/level';

function totalTiles(level: LevelDefinition): number {
  return level.columns.reduce((sum, column) => sum + column.length, 0);
}

export function validateM3LevelSet(levels: readonly LevelDefinition[]): string[] {
  const errors: string[] = [];
  const sorted = [...levels].sort((first, second) => first.id - second.id);
  if (sorted.length !== LEVEL_CURVE.length) {
    errors.push(`level set must contain exactly ${LEVEL_CURVE.length} levels`);
  }

  for (const expected of LEVEL_CURVE) {
    const actual = sorted.find(({ id }) => id === expected.id);
    if (actual === undefined) {
      errors.push(`level ${expected.id} is missing`);
      continue;
    }
    const checks: readonly [boolean, string][] = [
      [actual.tileTypes.length === expected.typeCount, `type count must be ${expected.typeCount}`],
      [totalTiles(actual) === expected.tileCount, `tile count must be ${expected.tileCount}`],
      [actual.columnCount === expected.columnHeights.length, `column count must be ${expected.columnHeights.length}`],
      [actual.maxDepth === expected.maxDepth, `maxDepth must be ${expected.maxDepth}`],
      [Math.max(...actual.columns.map((column) => column.length)) === expected.maxDepth, `actual max depth must be ${expected.maxDepth}`],
      [actual.meta.generationKind === expected.kind, `generationKind must be ${expected.kind}`],
      [
        expected.kind === 'manual'
          ? actual.meta.source === 'hand-authored'
          : typeof actual.meta.seed === 'number',
        expected.kind === 'manual'
          ? 'manual level source must be hand-authored'
          : 'generated level must record its seed',
      ],
      [
        expected.kind === 'manual' ||
          (actual.meta.targetDepthSpread === expected.targetDepthSpread &&
            typeof actual.meta.achievedDepthSpread === 'number' &&
            actual.meta.achievedDepthSpread <= expected.targetDepthSpread),
        `generated layout must achieve depthSpread <= ${expected.targetDepthSpread}`,
      ],
    ];
    for (const [passes, message] of checks) {
      if (!passes) errors.push(`level ${expected.id}: ${message}`);
    }
  }

  for (const levelId of [1, 2]) {
    const level = sorted.find(({ id }) => id === levelId);
    if (
      level === undefined ||
      level.tileTypes.length * (GAMEPLAY.matchSize - 1) >= GAMEPLAY.traySize
    ) {
      errors.push(`level ${levelId}: tutorial safety proof requires 3×2 < 7`);
    }
  }

  const levelThree = sorted.find(({ id }) => id === 3);
  if (levelThree !== undefined) {
    const topCounts = new Map<string, number>();
    for (const column of levelThree.columns) {
      const top = column[column.length - 1];
      if (top !== undefined) topCounts.set(top, (topCounts.get(top) ?? 0) + 1);
    }
    if ([...topCounts.values()].some((count) => count > 2)) {
      errors.push('level 3: each initial top type count must be <= 2');
    }
  }

  const typeSteps = sorted
    .filter(
      (level, index) =>
        level.id >= 6 &&
        index > 0 &&
        level.tileTypes.length !== sorted[index - 1]?.tileTypes.length,
    )
    .map(({ id }) => id);
  if (typeSteps.join(',') !== '6,10,17') {
    errors.push(`type-count difficulty steps must be 6,10,17; actual ${typeSteps.join(',')}`);
  }
  return errors;
}
