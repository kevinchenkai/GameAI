/**
 * tests/core/skeleton.test.ts —— 骨架自检
 *
 * ★ 这组测试防的是一个具体的坑：M0 骨架最初用 `export declare function` 占位，
 *   tsc 与 vite build **全部通过**，但 `declare` 是纯类型声明，运行时
 *   根本没有这个导出——`npm run validate-levels` 一跑就
 *   `SyntaxError: does not provide an export named 'validateLevelConfig'`。
 *
 *   "编译通过"在骨架阶段会给出虚假的安全感。下面逐个真的 import 一遍，
 *   确保每个模块**在运行时也确实导出了**它声称的东西。
 */

import { describe, expect, it } from 'vitest';

import * as board from '../../src/core/board';
import * as matcher from '../../src/core/matcher';
import * as resolver from '../../src/core/resolver';
import * as special from '../../src/core/special';
import * as obstacles from '../../src/core/obstacles';
import * as generator from '../../src/core/generator';
import * as objective from '../../src/core/objective';
import * as session from '../../src/core/session';
import * as petAction from '../../src/core/petAction';
import * as validateLevel from '../../src/core/validateLevel';
import * as save from '../../src/meta/save';
import * as layout from '../../src/game/render/layout';
import * as turnController from '../../src/game/TurnController';

const MODULES: Array<[string, Record<string, unknown>, readonly string[]]> = [
  ['core/board', board, ['createEmptyBoard', 'swapPieces', 'idx', 'inBounds', 'isAdjacent']],
  ['core/matcher', matcher, ['findAllMatches', 'wouldMatch', 'hasAnyValidMove', 'findAllValidMoves']],
  ['core/resolver', resolver, ['applyMove', 'resolveCascades', 'shuffleIfDeadlocked']],
  ['core/special', special, ['specialFromMatch', 'specialAffectedArea', 'comboAffectedArea']],
  ['core/obstacles', obstacles, ['damageObstacles', 'OBSTACLE_TRIGGER']],
  ['core/generator', generator, ['generateInitialBoard', 'generateRefill', 'shuffleBoard']],
  ['core/objective', objective, ['objectiveKey', 'accumulateProgress', 'computeRating']],
  ['core/session', session, ['createSession', 'serializeSession', 'deserializeSession']],
  ['core/petAction', petAction, ['applyPetAction']],
  ['core/validateLevel', validateLevel, ['validateLevelConfig', 'assertValidLevel']],
  ['meta/save', save, ['loadSave', 'saveSave', 'createDefaultSave']],
  ['game/render/layout', layout, ['computeLayout']],
  ['game/TurnController', turnController, ['canAcceptInput', 'createTurnState', 'advance']],
];

describe('骨架 —— 每个模块在运行时真的导出了它声称的东西', () => {
  it.each(MODULES)('%s', (_name, mod, exports) => {
    for (const key of exports) {
      expect(mod[key], `缺少导出 ${key}`).toBeDefined();
    }
  });
});

describe('未实现的函数抛出明确错误，而不是静默返回 undefined', () => {
  it('错误信息指明该在哪个 Milestone 补', () => {
    // M1/M3/M4 已实现的不再列在这里；随 Milestone 推进逐条移走
    expect(() => save.loadSave()).toThrow(/M7/);
  });

  it('★ M4 已实现：computeLayout 不再是占位', () => {
    const r = layout.computeLayout(375, 812, { top: 0, right: 0, bottom: 0, left: 0 });
    expect(r.pieceSizePt).toBeGreaterThan(0);
    expect(r.boardCols).toBeGreaterThan(0);
  });

  it('★ Stage 0 不实现的技能通道也抛错，不会被误用', () => {
    expect(() =>
      petAction.applyPetAction({} as never, { type: 'clearPositions', positions: [] }),
    ).toThrow(/Stage 0\.5/);
  });
});

describe('骨架里已经能用的东西确实能用', () => {
  it('board 的纯函数不是占位，可以直接调', () => {
    expect(board.isAdjacent({ col: 1, row: 1 }, { col: 1, row: 2 })).toBe(true);
    expect(board.isAdjacent({ col: 1, row: 1 }, { col: 2, row: 2 })).toBe(false); // 对角不算
    expect(board.idx({ cols: 8 }, { col: 3, row: 2 })).toBe(19);
    expect(board.posEquals({ col: 1, row: 1 }, { col: 1, row: 1 })).toBe(true);
  });

  it('objectiveKey 为三类目标生成互不冲突的 key', () => {
    const keys = [
      objective.objectiveKey({ kind: 'collect', piece: 'red', count: 10 }),
      objective.objectiveKey({ kind: 'clearObstacle', obstacle: 'ice', count: 5 }),
      objective.objectiveKey({ kind: 'dropDown', item: 'acorn', count: 2 }),
    ];
    expect(new Set(keys).size).toBe(3);
  });

  it('OBSTACLE_TRIGGER 覆盖全部四种障碍', () => {
    expect(Object.keys(obstacles.OBSTACLE_TRIGGER).sort()).toEqual([
      'crate',
      'flower',
      'grass',
      'ice',
    ]);
    // Stage 0 只启用 ice，受伤条件是本格消除
    expect(obstacles.OBSTACLE_TRIGGER.ice).toBe('sameCell');
  });
});
