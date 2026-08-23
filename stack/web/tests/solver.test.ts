import { describe, expect, it } from 'vitest';
import { createDemoState } from '../src/game/config/demoLevel';
import { applyPickToState } from '../src/game/core/rules/applyPick';
import { SeededRandom } from '../src/game/core/SeededRandom';
import {
  SOLVER_APPLY_PICK,
  SolverBudgetExceeded,
  applySolverPick,
  canSolve,
  getDistinctPickColumns,
  hashState,
  solve,
  solverStateFromGame,
  type SolverState,
} from '../src/game/core/Solver';
import type { TileType } from '../src/game/types/tile';

describe('Solver', () => {
  it('空状态可解', () => {
    expect(canSolve({ columns: [[], [], [], [], [], []], tray: [] })).toBe(true);
  });

  it('§64 的 12 张 Demo 可解并返回逐步序列', () => {
    const result = solve(solverStateFromGame(createDemoState()));
    expect(result.solvable).toBe(true);
    expect(result.solution).toHaveLength(12);
    expect(result.solution[0]).toEqual({ columnIndex: 0, expectedTileType: 'paw' });
  });

  it('支持先铺垫不同类型再收割', () => {
    const state: SolverState = {
      columns: [
        ['bell', 'paw'],
        ['grass', 'paw'],
        ['watering', 'grass'],
        ['bell', 'watering'],
        ['grass', 'bell'],
        ['watering', 'paw'],
      ],
      tray: [],
    };
    expect(canSolve(state)).toBe(true);
  });

  it('tray 已满不可解', () => {
    const state: SolverState = {
      columns: [['paw'], [], [], [], [], []],
      tray: ['grass', 'watering', 'bell', 'fish', 'yarn', 'bone', 'flowerpot'],
    };
    expect(canSolve(state)).toBe(false);
  });

  it('任一类型总数不能被三整除时不可解', () => {
    expect(canSolve({ columns: [['paw'], ['paw'], [], [], [], []], tray: [] })).toBe(false);
  });

  it('canonical hash 忽略列顺序与 tray 顺序', () => {
    const first: SolverState = {
      columns: [['bell', 'paw'], ['fish', 'grass'], []],
      tray: ['watering', 'paw'],
    };
    const second: SolverState = {
      columns: [[], ['fish', 'grass'], ['bell', 'paw']],
      tray: ['paw', 'watering'],
    };
    expect(hashState(first)).toBe(hashState(second));
  });

  it('P0-1：顶部相同但完整列不同，必须保留两个动作', () => {
    const state: SolverState = {
      columns: [['bell', 'paw'], ['fish', 'paw'], [], [], [], []],
      tray: [],
    };
    expect(getDistinctPickColumns(state)).toEqual([0, 1]);
  });

  it('P0-1：完整列完全相同时只保留一个动作', () => {
    const state: SolverState = {
      columns: [['bell', 'paw'], ['bell', 'paw'], [], [], [], []],
      tray: [],
    };
    expect(getDistinctPickColumns(state)).toEqual([0]);
  });

  it('超出节点预算会明确抛错', () => {
    const state = solverStateFromGame(createDemoState());
    expect(() => solve(state, { maxNodes: 0 })).toThrow(SolverBudgetExceeded);
  });

  it('Solver 直接使用 RuleEngine 的同一 applyPick 引用', () => {
    expect(SOLVER_APPLY_PICK).toBe(applyPickToState);
  });

  it('P0-1 随机对拍：200 个局面与无对称剪枝真值一致', () => {
    const rng = new SeededRandom(20260823);
    const candidateTypes: readonly TileType[] = ['paw', 'grass', 'watering', 'bell'];

    for (let caseIndex = 0; caseIndex < 200; caseIndex += 1) {
      const typeCount = 1 + rng.nextInt(candidateTypes.length);
      const columnCount = 2 + rng.nextInt(3);
      const columns: TileType[][] = Array.from({ length: columnCount }, () => []);
      const tiles = candidateTypes
        .slice(0, typeCount)
        .flatMap((type) => Array.from({ length: 3 }, () => type));
      for (const type of rng.shuffle(tiles)) columns[rng.nextInt(columnCount)]?.push(type);

      let state: SolverState = { columns, tray: [] };
      const setupMoves = rng.nextInt(4);
      for (let move = 0; move < setupMoves; move += 1) {
        const legal = state.columns.flatMap((column, index) =>
          column.length > 0 && state.tray.length < 7 ? [index] : [],
        );
        if (legal.length === 0) break;
        const selected = legal[rng.nextInt(legal.length)];
        if (selected === undefined) break;
        state = applySolverPick(state, selected);
      }

      const baseline = canSolve(state, { maxNodes: 500_000, useSymmetryPruning: false });
      const pruned = canSolve(state, { maxNodes: 500_000, useSymmetryPruning: true });
      expect(pruned, `random case ${caseIndex}`).toBe(baseline);
    }
  });
});
