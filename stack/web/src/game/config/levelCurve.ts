import type { TileType } from '../types/tile';

export interface LevelCurveEntry {
  id: number;
  typeCount: number;
  tileCount: number;
  columnHeights: readonly number[];
  maxDepth: number;
  targetSeconds: number;
  seed: number;
  targetDepthSpread: number;
  targetGreedyFailRate?: number;
  kind: 'manual' | 'generated';
  designGoal: string;
  manualGroupOrder?: readonly TileType[];
}

const MANUAL_GROUPS: Readonly<Record<number, readonly TileType[]>> = {
  1: ['paw', 'grass', 'watering', 'paw', 'grass', 'watering'],
  2: ['paw', 'grass', 'watering', 'paw', 'grass', 'watering', 'paw', 'grass'],
  3: ['paw', 'grass', 'watering', 'bell', 'paw', 'grass', 'watering', 'bell', 'paw', 'grass'],
  4: [
    'paw',
    'grass',
    'watering',
    'bell',
    'paw',
    'grass',
    'watering',
    'bell',
    'paw',
    'grass',
    'watering',
    'bell',
  ],
  5: [
    'paw',
    'grass',
    'watering',
    'bell',
    'paw',
    'grass',
    'watering',
    'bell',
    'paw',
    'grass',
    'watering',
    'bell',
    'paw',
    'grass',
  ],
};

const SELECTED_SEEDS: Readonly<Record<number, number>> = {
  3: 118_758,
  5: 130_785,
  6: 164_515,
  7: 198_245,
  8: 184_461,
  9: 234_029,
  10: 331_111,
  11: 222_299,
  12: 2_322_888,
  13: 463_977,
  14: 1_107_470,
  15: 697_736,
  16: 2_299_428,
  17: 1_010_685,
  18: 624_708,
  19: 5_789_950,
  20: 4_984_266,
};

const GREEDY_FAIL_RATE_TARGETS: Readonly<Record<number, number>> = {
  6: 0.08,
  7: 0.1,
  8: 0.12,
  9: 0.14,
  10: 0.16,
  11: 0.18,
  12: 0.2,
  13: 0.21,
  14: 0.22,
  15: 0.24,
  16: 0.25,
  17: 0.26,
  18: 0.28,
  19: 0.29,
  20: 0.3,
};

function entry(
  id: number,
  typeCount: number,
  tileCount: number,
  columnHeights: readonly number[],
  maxDepth: number,
  targetSeconds: number,
  designGoal: string,
  targetDepthSpread: number,
): LevelCurveEntry {
  const kind = id <= 5 ? 'manual' : 'generated';
  const manualGroupOrder = MANUAL_GROUPS[id];
  const targetGreedyFailRate = GREEDY_FAIL_RATE_TARGETS[id];
  return {
    id,
    typeCount,
    tileCount,
    columnHeights,
    maxDepth,
    targetSeconds,
    seed: SELECTED_SEEDS[id] ?? 73_001 + id * 9_973,
    targetDepthSpread,
    kind,
    designGoal,
    ...(manualGroupOrder === undefined ? {} : { manualGroupOrder }),
    ...(targetGreedyFailRate === undefined ? {} : { targetGreedyFailRate }),
  };
}

export const LEVEL_CURVE: readonly LevelCurveEntry[] = [
  entry(1, 3, 18, [6, 5, 4, 3], 6, 25, '教「只点顶部」', 0),
  entry(2, 3, 24, [7, 6, 5, 4, 2], 7, 32, '教「三枚同类自动消除」', 0),
  entry(3, 4, 30, [8, 7, 6, 5, 4], 8, 40, '教「槽位可暂存不同类」', 1),
  entry(4, 4, 36, [8, 7, 6, 6, 5, 4], 8, 49, '第一次需要观察全局', 1),
  entry(5, 4, 42, [9, 8, 7, 7, 6, 5], 9, 57, '巩固', 1),
  entry(6, 5, 42, [9, 8, 7, 7, 6, 5], 9, 57, '首个真实难度台阶', 1),
  entry(7, 5, 45, [9, 9, 8, 7, 6, 6], 9, 61, '槽位开始有压力', 1),
  entry(8, 5, 48, [10, 9, 8, 8, 7, 6], 10, 65, '首个明显陷阱', 1),
  entry(9, 5, 48, [10, 9, 8, 8, 7, 6], 10, 65, '需要撤回意识', 2),
  entry(10, 6, 51, [10, 10, 9, 8, 7, 7], 10, 69, '第二个难度台阶', 2),
  entry(11, 6, 51, [10, 10, 9, 8, 7, 7], 10, 69, '中等', 2),
  entry(12, 6, 54, [11, 10, 9, 9, 8, 7], 11, 73, '中等', 2),
  entry(13, 6, 54, [11, 10, 9, 9, 8, 7], 11, 73, '长局', 2),
  entry(14, 6, 57, [11, 11, 10, 9, 8, 8], 11, 77, '顶部干扰', 2),
  entry(15, 6, 57, [11, 11, 10, 9, 8, 8], 11, 77, '深层干扰', 2),
  entry(16, 6, 60, [12, 11, 10, 10, 9, 8], 12, 81, '第二阶段收束', 2),
  entry(17, 7, 60, [12, 11, 10, 10, 9, 8], 12, 81, '第三个难度台阶', 2),
  entry(18, 7, 60, [12, 11, 10, 10, 9, 8], 12, 81, '高压', 2),
  entry(19, 7, 63, [12, 12, 11, 10, 9, 9], 12, 85, '需要规划', 2),
  entry(20, 7, 63, [12, 12, 11, 10, 9, 9], 12, 85, '阶段挑战', 2),
];
