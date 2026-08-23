import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAMEPLAY, SIMULATION } from '../src/game/config/tuning';
import { LevelLoader } from '../src/game/core/LevelLoader';
import { validateGreedyCurve } from '../src/game/core/LevelDifficultyValidation';
import {
  LEVEL_APPLY_PICK,
  levelToGameState,
  parseLevelDefinition,
  validateLevelDefinition,
  verifyLevelSolution,
  verifyLevelSolvable,
} from '../src/game/core/LevelValidation';
import { validateM3LevelSet } from '../src/game/core/LevelSetValidation';
import { applyPickToState } from '../src/game/core/rules/applyPick';
import { exceedsGreedyBuildThreshold, simulateLevel } from '../src/game/core/Simulator';

function loadFixture(): unknown {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'levels/demo001.json'), 'utf8'));
}

function loadM3RawLevels(): unknown[] {
  return fs
    .readdirSync(path.resolve(process.cwd(), 'levels'))
    .filter((filename) => /^level\d{3}\.json$/.test(filename))
    .sort()
    .map((filename) =>
      JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'levels', filename), 'utf8')),
    );
}

describe('level validation', () => {
  it('§64 JSON 通过 schema/count/depth/Solver/solution replay', () => {
    const level = parseLevelDefinition(loadFixture());
    expect(validateLevelDefinition(level)).toEqual([]);
    expect(() => verifyLevelSolvable(level)).not.toThrow();
    expect(() => verifyLevelSolution(level)).not.toThrow();
  });

  it('solution 是逐步序列并检查 expectedTileType 漂移', () => {
    const level = parseLevelDefinition(loadFixture());
    const first = level.solution[0];
    if (first === undefined) throw new Error('fixture solution is empty');
    first.expectedTileType = 'grass';
    expect(() => verifyLevelSolution(level)).toThrow('expected grass, actual paw');
  });

  it('非法计数与深度会在构建前被拦截', () => {
    const level = parseLevelDefinition(loadFixture());
    level.columns[0]?.push('paw');
    expect(validateLevelDefinition(level)).toContain('paw count must be divisible by 3');
    level.columns[0] = Array.from({ length: 4 }, () => 'paw');
    expect(validateLevelDefinition(level)).toContain('column depth must be <= level.maxDepth');
  });

  it('V0.3.1 容量占用超过 88% 时构建失败', () => {
    const level = parseLevelDefinition(loadFixture());
    level.maxDepth = 2;
    expect(validateLevelDefinition(level)).toContain(
      'tile count must be <= 10 (88% of configured capacity)',
    );
  });

  it('Level replay 直接使用同一个 applyPick 引用', () => {
    expect(LEVEL_APPLY_PICK).toBe(applyPickToState);
  });

  it('LevelLoader 加载、排序并按 id 创建 20 关状态', () => {
    const loader = new LevelLoader(loadM3RawLevels());
    expect(loader.count).toBe(20);
    expect(loader.list().map(({ id }) => id)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(loader.createState(20).columns.flat()).toHaveLength(63);
    expect(() => loader.get(21)).toThrow('level 21 was not found');
  });

  it('20 关严格匹配 V0.3.1 表，难度台阶落在 L6/L10/L17', () => {
    const levels = new LevelLoader(loadM3RawLevels()).list();
    expect(validateM3LevelSet(levels)).toEqual([]);
  });

  it('L1/L2 只用 3 种图案，未消除上限 3×2 小于 7', () => {
    const levels = new LevelLoader(loadM3RawLevels()).list();
    for (const level of levels.slice(0, 2)) {
      expect(level.tileTypes).toHaveLength(3);
      expect(level.tileTypes.length * (GAMEPLAY.matchSize - 1)).toBeLessThan(GAMEPLAY.traySize);
    }
  });

  it('L3 初始顶部没有三张同类，必须先学习暂存', () => {
    const level = new LevelLoader(loadM3RawLevels()).get(3);
    const counts = new Map<string, number>();
    for (const column of level.columns) {
      const top = column[column.length - 1];
      if (top !== undefined) counts.set(top, (counts.get(top) ?? 0) + 1);
    }
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
  });

  it('V0.3.4 Greedy 曲线允许 5pp 回落，超过才报错，单次上升超过 12pp 只告警', () => {
    expect(validateGreedyCurve([
      { levelId: 21, failRate: 0.05 },
      { levelId: 22, failRate: 0.18 },
    ])).toEqual({ errors: [], warnings: [expect.stringContaining('13.0pp')] });
    expect(validateGreedyCurve([
      { levelId: 21, failRate: 0.2 },
      { levelId: 22, failRate: 0.15 },
    ]).errors).toEqual([]);
    expect(validateGreedyCurve([
      { levelId: 21, failRate: 0.2 },
      { levelId: 22, failRate: 0.149 },
    ]).errors).toContainEqual(expect.stringContaining('decreased'));
  });

  it('V0.3.4 只保留红线硬门槛，三个五关分段均值必须递增', () => {
    expect(validateGreedyCurve([{ levelId: 6, failRate: 0.3 }]).errors).toEqual([]);

    const points = Array.from({ length: 15 }, (_, index) => {
      const levelId = index + 6;
      const failRate = levelId <= 10 ? 0.1 : levelId <= 15 ? 0.09 : 0.2;
      return { levelId, failRate };
    });
    expect(validateGreedyCurve(points).errors).toContainEqual(
      expect.stringContaining('segment averages must increase'),
    );
  });

  it('真实 20 关满足 Greedy 门槛且 Greedy/Cautious 有实质分化', () => {
    const levels = new LevelLoader(loadM3RawLevels()).list();
    let differentiated = 0;
    const greedyCurve: { levelId: number; failRate: number }[] = [];
    for (const level of levels) {
      const state = levelToGameState(level);
      const seed = level.id * 1000 + 17;
      const greedy = simulateLevel(state, 'greedy', SIMULATION.trialsPerStrategy, seed);
      const cautious = simulateLevel(state, 'cautious', SIMULATION.trialsPerStrategy, seed);
      expect(exceedsGreedyBuildThreshold(level.id, greedy.failRate)).toBe(false);
      greedyCurve.push({ levelId: level.id, failRate: greedy.failRate });
      if (level.id >= 6 && Math.abs(greedy.failRate - cautious.failRate) >= 0.02) {
        differentiated += 1;
      }
    }
    expect(differentiated).toBeGreaterThanOrEqual(5);
    expect(validateGreedyCurve(greedyCurve)).toEqual({ errors: [], warnings: [] });
  });
});
