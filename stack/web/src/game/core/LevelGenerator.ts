import { GAMEPLAY } from '../config/tuning';
import type { LevelCurveEntry } from '../config/levelCurve';
import type { LevelDefinition } from '../types/level';
import { TILE_TYPES, type TileType } from '../types/tile';
import { SeededRandom } from './SeededRandom';

interface TileGroup {
  id: number;
  type: TileType;
}

function generatedGroups(entry: LevelCurveEntry, rng: SeededRandom): TileGroup[] {
  const types = TILE_TYPES.slice(0, entry.typeCount);
  const groupCount = entry.tileCount / GAMEPLAY.matchSize;
  const groups = Array.from({ length: groupCount }, (_, index) => {
    const type = types[index % types.length];
    if (type === undefined) throw new Error(`level ${entry.id}: missing tile type`);
    return { id: index, type };
  });
  return rng.shuffle(groups);
}

function safePickGroups(groups: readonly TileGroup[], batchWidth: number, rng: SeededRandom): TileGroup[] {
  const picks: TileGroup[] = [];
  for (let start = 0; start < groups.length; start += batchWidth) {
    const batch = groups.slice(start, start + batchWidth);
    for (let round = 0; round < GAMEPLAY.matchSize; round += 1) {
      picks.push(...(round === 0 ? batch : rng.shuffle(batch)));
    }
  }
  return picks;
}

function findBatchSchedule(
  picks: readonly TileGroup[],
  initialRemaining: readonly number[],
  previousColumn: number | null,
  targetDepthSpread: number,
  rng: SeededRandom,
): number[] | null {
  const schedule: number[] = [];
  const remaining = [...initialRemaining];
  const depthsByGroup = new Map<number, number[]>();

  function search(index: number, lastColumn: number | null): boolean {
    if (index === picks.length) return true;
    const pick = picks[index];
    if (pick === undefined) return false;
    const placedDepths = depthsByGroup.get(pick.id) ?? [];
    const available = remaining.flatMap((count, columnIndex) => {
      if (count <= 0) return [];
      const depth = count - 1;
      const depths = [...placedDepths, depth];
      return Math.max(...depths) - Math.min(...depths) <= targetDepthSpread
        ? [columnIndex]
        : [];
    });
    const ordered = rng.shuffle(available).sort((first, second) => {
      const depthDifference = (remaining[second] ?? 0) - (remaining[first] ?? 0);
      if (depthDifference !== 0) return depthDifference;
      const firstRepeats = first === lastColumn ? 1 : 0;
      const secondRepeats = second === lastColumn ? 1 : 0;
      return firstRepeats - secondRepeats;
    });
    for (const columnIndex of ordered) {
      const depth = (remaining[columnIndex] ?? 0) - 1;
      remaining[columnIndex] = depth;
      depthsByGroup.set(pick.id, [...placedDepths, depth]);
      schedule.push(columnIndex);
      if (search(index + 1, columnIndex)) return true;
      schedule.pop();
      remaining[columnIndex] = depth + 1;
      depthsByGroup.set(pick.id, placedDepths);
    }
    return false;
  }

  return search(0, previousColumn) ? schedule : null;
}

function placePicks(
  picks: readonly TileGroup[],
  heights: readonly number[],
  targetDepthSpread: number,
  batchWidth: number,
  rng: SeededRandom,
): {
  columns: TileType[][];
  solution: LevelDefinition['solution'];
  achievedDepthSpread: number;
} {
  const remaining = [...heights];
  const topToBottom = heights.map(() => [] as TileType[]);
  const solution: LevelDefinition['solution'] = [];
  const depthsByGroup = new Map<number, number[]>();
  let previousColumn: number | null = null;

  const batchPickCount = batchWidth * GAMEPLAY.matchSize;
  for (let start = 0; start < picks.length; start += batchPickCount) {
    const batch = picks.slice(start, start + batchPickCount);
    const batchSchedule = findBatchSchedule(
      batch,
      remaining,
      previousColumn,
      targetDepthSpread,
      rng,
    );
    if (batchSchedule === null) {
      throw new Error(`unable to place batch within depthSpread=${targetDepthSpread}`);
    }
    batch.forEach((pick, batchIndex) => {
      const columnIndex = batchSchedule[batchIndex];
      if (columnIndex === undefined) throw new Error('batch schedule is incomplete');
      const groupDepths = depthsByGroup.get(pick.id) ?? [];
      const depth = (remaining[columnIndex] ?? 0) - 1;
      topToBottom[columnIndex]?.push(pick.type);
      remaining[columnIndex] = depth;
      depthsByGroup.set(pick.id, [...groupDepths, depth]);
      solution.push({ columnIndex, expectedTileType: pick.type });
      previousColumn = columnIndex;
    });
  }

  if (remaining.some((count) => count !== 0)) throw new Error('column schedule did not fill targets');
  const achievedDepthSpread = Math.max(
    0,
    ...[...depthsByGroup.values()].map((depths) => Math.max(...depths) - Math.min(...depths)),
  );
  return { columns: topToBottom.map((column) => column.reverse()), solution, achievedDepthSpread };
}

export function generateLevel(entry: LevelCurveEntry, seed = entry.seed): LevelDefinition {
  const rng = new SeededRandom(seed);
  const tileTypes = TILE_TYPES.slice(0, entry.typeCount);
  const groups: TileGroup[] = entry.manualGroupOrder === undefined
    ? generatedGroups(entry, rng)
    : entry.manualGroupOrder.map((type, id) => ({ id, type }));
  const batchWidth = entry.targetDepthSpread <= 1 ? 1 : 3;
  const picks = safePickGroups(groups, batchWidth, rng);
  const { columns, solution, achievedDepthSpread } = placePicks(
    picks,
    entry.columnHeights,
    entry.targetDepthSpread,
    batchWidth,
    rng,
  );

  return {
    id: entry.id,
    name: `StackPop ${String(entry.id).padStart(2, '0')}`,
    schemaVersion: 1,
    levelRevision: 1,
    columnCount: entry.columnHeights.length,
    maxDepth: entry.maxDepth,
    traySize: GAMEPLAY.traySize,
    tileTypes: [...tileTypes],
    columns,
    tools: { undo: GAMEPLAY.undoLimit, shuffle: GAMEPLAY.shuffleLimit, hint: 0 },
    stars: { three: entry.targetSeconds, two: Math.ceil(entry.targetSeconds * 1.25) },
    solution,
    meta: {
      generationKind: entry.kind,
      ...(entry.kind === 'generated' ? { seed } : { source: 'hand-authored' }),
      targetDepthSpread: entry.targetDepthSpread,
      achievedDepthSpread,
      targetSeconds: entry.targetSeconds,
      designGoal: entry.designGoal,
    },
  };
}
