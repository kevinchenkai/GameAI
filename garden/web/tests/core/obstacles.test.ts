/**
 * obstacles 单测 —— 统一「hp + 受伤条件」模型的四种触发方式（框架 §4.2）
 *
 * Stage 0 只启用 ice，但四种的行为都测，因为统一模型的价值就在于
 * 新增障碍不改结算逻辑 —— 那得先证明这个模型确实覆盖了四种。
 */

import { describe, expect, it } from 'vitest';
import { OBSTACLE_TRIGGER, countObstacles, damageObstacles } from '../../src/core/obstacles';
import { locksPieceBeneath } from '../../src/core/types';
import { cellAt } from '../../src/core/board';
import { findAllMatches } from '../../src/core/matcher';
import { applyMove } from '../../src/core/resolver';
import { decorate, makeBoard, makeSession, P } from './helpers';

const BASE = `
  RGBRGB
  GBRGBR
  BRGBRG
  RGBRGB
  GBRGBR
  BRGBRG
`;

describe('受伤条件表 —— 统一模型的全部内容', () => {
  it('四种障碍都有明确的受伤条件', () => {
    expect(OBSTACLE_TRIGGER).toEqual({
      ice: 'sameCell',
      grass: 'sameCell',
      crate: 'adjacent',
      flower: 'adjacent',
    });
  });

  it('★ 四种障碍都不封锁其下的棋子（含 ice）', () => {
    // 初版把 ice 做成"封锁"，与它自己的受伤条件（sameCell）互相矛盾：
    // 封锁 → 本格永不匹配 → 本格永不被消除 → 冰永远打不掉。
    // 详见 types.ts 的 locksPieceBeneath 注释。
    for (const kind of ['ice', 'grass', 'crate', 'flower'] as const) {
      expect(locksPieceBeneath(kind)).toBe(false);
    }
  });
});

describe('damageObstacles —— 本格型（ice / grass）', () => {
  it('ice 每次扣 1 hp，产出 obstacleHit', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'ice', 2]] });
    const r = damageObstacles(b, [P(1, 1)]);
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toEqual({ t: 'obstacleHit', pos: P(1, 1), kind: 'ice', hpLeft: 1 });
    expect(cellAt(r.board, P(1, 1))?.obstacle?.hp).toBe(1);
  });

  it('ice hp 归零 → obstacleClear，障碍消失', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'ice', 1]] });
    const r = damageObstacles(b, [P(1, 1)]);
    expect(r.events[0]).toEqual({ t: 'obstacleClear', pos: P(1, 1), kind: 'ice' });
    expect(cellAt(r.board, P(1, 1))?.obstacle).toBeNull();
  });

  it('★ 邻格消除不影响本格型障碍', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'ice', 2]] });
    expect(damageObstacles(b, [P(1, 0)]).events).toHaveLength(0);
  });

  it('grass 一次清（扣满 hp）', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'grass', 3]] });
    const r = damageObstacles(b, [P(1, 1)]);
    expect(r.events[0]?.t).toBe('obstacleClear');
  });
});

describe('damageObstacles —— 邻接型（crate / flower）', () => {
  it('邻格消除时 crate 受伤', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'crate', 2]] });
    const r = damageObstacles(b, [P(1, 0)]); // 正上方
    expect(r.events[0]).toEqual({ t: 'obstacleHit', pos: P(1, 1), kind: 'crate', hpLeft: 1 });
  });

  it('★ 本格消除不影响邻接型（它不在消除范围里，是旁观者）', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'crate', 2]] });
    expect(damageObstacles(b, [P(1, 1)]).events).toHaveLength(0);
  });

  it('★ 一次结算内同一障碍只扣一次血 —— 否则大爆炸能瞬秒所有木箱', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'crate', 3]] });
    // 上下左右四格同时被消除
    const r = damageObstacles(b, [P(1, 0), P(0, 1), P(2, 1), P(1, 2)]);
    expect(r.events).toHaveLength(1);
    expect(cellAt(r.board, P(1, 1))?.obstacle?.hp).toBe(2); // 只扣了 1
  });

  it('对角相邻不算邻接（只认正交四邻）', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'crate', 2]] });
    expect(damageObstacles(b, [P(0, 0)]).events).toHaveLength(0);
  });

  it('flower hp 归零 = 开花完成，产出 obstacleClear', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'flower', 1]] });
    expect(damageObstacles(b, [P(1, 0)]).events[0]?.t).toBe('obstacleClear');
  });
});

describe('damageObstacles —— 边界', () => {
  it('空消除列表返回原盘', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'ice', 2]] });
    const r = damageObstacles(b, []);
    expect(r.board).toBe(b);
    expect(r.events).toHaveLength(0);
  });

  it('不改入参', () => {
    const b = decorate(makeBoard(BASE), { obstacles: [[P(1, 1), 'ice', 2]] });
    damageObstacles(b, [P(1, 1)]);
    expect(cellAt(b, P(1, 1))?.obstacle?.hp).toBe(2);
  });

  it('countObstacles 统计正确', () => {
    const b = decorate(makeBoard(BASE), {
      obstacles: [
        [P(1, 1), 'ice', 2],
        [P(2, 2), 'ice', 1],
        [P(3, 3), 'crate', 1],
      ],
    });
    expect(countObstacles(b, 'ice')).toBe(2);
    expect(countObstacles(b, 'crate')).toBe(1);
    expect(countObstacles(b, 'grass')).toBe(0);
  });
});

/**
 * ★ 冰的正确语义：**盖在棋子上的一层，棋子照常参与匹配**。
 *   每次这一格被消除，冰掉一层血；血空了冰才消失，棋子才真正被清走。
 *
 *   这是模拟器跑出「关卡 8 通过率 0%、obstacleHit 0 次」后修正的 ——
 *   初版做成"封锁"，与 sameCell 受伤条件互相矛盾，冰永远打不掉。
 */
describe('★ 冰是"一层护甲"，不是"锁"', () => {
  const iced = decorate(
    makeBoard(`
      RRRGBR
      GBRGBR
      BRGBRG
      RGBRGB
      GBRGBR
      BRGBRG
    `),
    { obstacles: [[P(1, 0), 'ice', 1]] },
  );

  it('被冰覆盖的棋子**照常参与匹配** —— 顶行 RRR 仍然成立', () => {
    expect(findAllMatches(iced)).toHaveLength(1);
  });

  it('被冰覆盖的棋子照常可被交换', () => {
    const s = makeSession(BASE);
    const board = decorate(s.board, { obstacles: [[P(0, 0), 'ice', 1]] });
    // BASE 盘上这个交换本身凑不出 3 连 → 应弹回，但**不是**被冰拒绝
    const events = applyMove({ ...s, board }, { a: P(0, 0), b: P(1, 0) }).events;
    expect(events.map((e) => e.t)).toEqual(['swap', 'swapBack']);
  });

  it('★ 冰挡住一次消除：棋子留在原地，冰掉一层', () => {
    const s = makeSession(`
      RRRGBR
      GBRGBR
      BRGBRG
      RGBRGB
      GBRGBR
      BRGBRG
    `);
    const board = decorate(s.board, { obstacles: [[P(1, 0), 'ice', 2]] });
    const r = applyMove({ ...s, board }, { a: P(3, 0), b: P(3, 1) });

    const hit = r.events.find((e) => e.t === 'obstacleHit');
    expect(hit?.t === 'obstacleHit' && hit.kind).toBe('ice');
    // 冰还在（hp 2→1），其下棋子被护住
    expect(cellAt(r.session.board, P(1, 0))?.obstacle?.hp).toBe(1);
  });

  it('★ 冰血空后消失，其下棋子才会被清走', () => {
    const thawed = damageObstacles(iced, [P(1, 0)]).board;
    expect(cellAt(thawed, P(1, 0))?.obstacle).toBeNull();
    expect(cellAt(thawed, P(1, 0))?.piece).not.toBeNull(); // 棋子仍在，下一次消除才走
  });

  it('★ 端到端：冰最终能被打掉（初版这条永远做不到）', () => {
    const s = makeSession(`
      RRRGBR
      GBRGBR
      BRGBRG
      RGBRGB
      GBRGBR
      BRGBRG
    `);
    const board = decorate(s.board, { obstacles: [[P(1, 0), 'ice', 1]] });
    const r = applyMove({ ...s, board }, { a: P(3, 0), b: P(3, 1) });
    expect(r.events.some((e) => e.t === 'obstacleClear')).toBe(true);
  });
});
