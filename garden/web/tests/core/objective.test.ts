/**
 * objective 单测 + 胜负判定
 *
 * ★ 最关键的一条：**用最后一步达成目标算赢，不算输。**
 *   那是玩家最爽的时刻，判他输会毁掉整局体验。
 */

import { describe, expect, it } from 'vitest';
import {
  accumulateProgress,
  computeRating,
  isAllComplete,
  objectiveKey,
  remainingCounts,
} from '../../src/core/objective';
import { applyMove } from '../../src/core/resolver';
import { makeLevel, makeSession, P } from './helpers';
import type { CoreGameEvent, LevelConfig } from '../../src/core/types';

const collectRed = (count: number): LevelConfig =>
  makeLevel({ objectives: [{ kind: 'collect', piece: 'red', count }] });

const matchEvent = (color: 'red' | 'green', n: number): CoreGameEvent => ({
  t: 'match',
  positions: Array.from({ length: n }, (_, i) => P(i, 0)),
  color,
  cascadeLevel: 0,
});

describe('objectiveKey —— 三类目标的稳定标识', () => {
  it('三类互不冲突', () => {
    const keys = [
      objectiveKey({ kind: 'collect', piece: 'red', count: 1 }),
      objectiveKey({ kind: 'clearObstacle', obstacle: 'ice', count: 1 }),
      objectiveKey({ kind: 'dropDown', item: 'acorn', count: 1 }),
    ];
    expect(new Set(keys).size).toBe(3);
  });

  it('同类不同参数的 key 不同', () => {
    expect(objectiveKey({ kind: 'collect', piece: 'red', count: 1 })).not.toBe(
      objectiveKey({ kind: 'collect', piece: 'blue', count: 1 }),
    );
  });
});

describe('accumulateProgress —— 只认事件，不看棋盘', () => {
  it('match 事件按颜色累计', () => {
    const p = accumulateProgress(collectRed(10), {}, [matchEvent('red', 3)]);
    expect(p['collect:red']).toBe(3);
  });

  it('多次累加', () => {
    const level = collectRed(10);
    let p = accumulateProgress(level, {}, [matchEvent('red', 3)]);
    p = accumulateProgress(level, p, [matchEvent('red', 4)]);
    expect(p['collect:red']).toBe(7);
  });

  it('★ 非本关目标的颜色被忽略（不污染进度表）', () => {
    const p = accumulateProgress(collectRed(10), {}, [matchEvent('green', 5)]);
    expect(p['collect:green']).toBeUndefined();
  });

  it('obstacleClear 累计破障目标', () => {
    const level = makeLevel({ objectives: [{ kind: 'clearObstacle', obstacle: 'ice', count: 3 }] });
    const p = accumulateProgress(level, {}, [
      { t: 'obstacleClear', pos: P(0, 0), kind: 'ice' },
      { t: 'obstacleClear', pos: P(1, 0), kind: 'ice' },
    ]);
    expect(p['clearObstacle:ice']).toBe(2);
  });

  it('obstacleHit 不计入（只有清除才算）', () => {
    const level = makeLevel({ objectives: [{ kind: 'clearObstacle', obstacle: 'ice', count: 3 }] });
    const p = accumulateProgress(level, {}, [
      { t: 'obstacleHit', pos: P(0, 0), kind: 'ice', hpLeft: 1 },
    ]);
    expect(p['clearObstacle:ice']).toBeUndefined();
  });

  it('不修改传入的 progress', () => {
    const before = { 'collect:red': 2 };
    accumulateProgress(collectRed(10), before, [matchEvent('red', 3)]);
    expect(before['collect:red']).toBe(2);
  });
});

describe('isAllComplete / remainingCounts', () => {
  it('未达标时未完成，remaining 反映差额', () => {
    const level = collectRed(10);
    const p = { 'collect:red': 7 };
    expect(isAllComplete(level, p)).toBe(false);
    expect(remainingCounts(level, p)).toEqual({ 'collect:red': 3 });
  });

  it('刚好达标即完成', () => {
    expect(isAllComplete(collectRed(10), { 'collect:red': 10 })).toBe(true);
  });

  it('超额达标也完成，remaining 夹到 0 不为负', () => {
    const level = collectRed(10);
    expect(isAllComplete(level, { 'collect:red': 15 })).toBe(true);
    expect(remainingCounts(level, { 'collect:red': 15 })).toEqual({ 'collect:red': 0 });
  });

  it('多目标：全部达标才算完成', () => {
    const level = makeLevel({
      objectives: [
        { kind: 'collect', piece: 'red', count: 5 },
        { kind: 'collect', piece: 'blue', count: 5 },
      ],
    });
    expect(isAllComplete(level, { 'collect:red': 5 })).toBe(false);
    expect(isAllComplete(level, { 'collect:red': 5, 'collect:blue': 5 })).toBe(true);
  });

  it('空进度表时 remaining 等于全额', () => {
    expect(remainingCounts(collectRed(10), {})).toEqual({ 'collect:red': 10 });
  });
});

describe('computeRating —— 按剩余步数评级', () => {
  const level = makeLevel({ stars: { two: 5, three: 10 } });

  it('剩余步数分档', () => {
    expect(computeRating(level, 12)).toBe(3);
    expect(computeRating(level, 10)).toBe(3); // 阈值含等于
    expect(computeRating(level, 9)).toBe(2);
    expect(computeRating(level, 5)).toBe(2);
    expect(computeRating(level, 4)).toBe(1);
    expect(computeRating(level, 0)).toBe(1); // 用尽最后一步通关仍有 1 星
  });
});

describe('★ 胜负判定（通过 applyMove 观察端到端行为）', () => {
  /** 换 (1,0)G ↔ (1,1)R，顶行成 R R R */
  const SIMPLE = `
    R G R B G B
    B R B G B G
    G B G B G B
    B G B G B G
    G B G B G B
    B G B G B G
  `;

  it('达成目标 → levelWin，且 result = win', () => {
    const s = makeSession(SIMPLE, { movesLeft: 5 });
    const withGoal = { ...s, level: { ...s.level, objectives: [{ kind: 'collect' as const, piece: 'red' as const, count: 1 }] } };
    const r = applyMove(withGoal, { a: P(1, 0), b: P(1, 1) });

    const win = r.events.find((e) => e.t === 'levelWin');
    expect(win).toBeDefined();
    expect(r.session.result).toBe('win');
  });

  it('★ levelWin 出现在 settled 之后、turnResolved 之前（冻结契约 2）', () => {
    const s = makeSession(SIMPLE, { movesLeft: 5 });
    const withGoal = { ...s, level: { ...s.level, objectives: [{ kind: 'collect' as const, piece: 'red' as const, count: 1 }] } };
    const ts = applyMove(withGoal, { a: P(1, 0), b: P(1, 1) }).events.map((e) => e.t);

    const iSettled = ts.indexOf('settled');
    const iWin = ts.indexOf('levelWin');
    const iResolved = ts.indexOf('turnResolved');
    expect(iWin).toBeGreaterThan(iSettled);
    expect(iResolved).toBeGreaterThan(iWin);
  });

  it('步数用尽且目标未达成 → levelLose', () => {
    const s = makeSession(SIMPLE, { movesLeft: 1 });
    const hard = { ...s, level: { ...s.level, objectives: [{ kind: 'collect' as const, piece: 'red' as const, count: 999 }] } };
    const r = applyMove(hard, { a: P(1, 0), b: P(1, 1) });

    expect(r.events.find((e) => e.t === 'levelLose')).toBeDefined();
    expect(r.session.result).toBe('lose');
  });

  it('★★ 用最后一步达成目标 —— 判赢，不判输', () => {
    const s = makeSession(SIMPLE, { movesLeft: 1 });
    const withGoal = { ...s, level: { ...s.level, objectives: [{ kind: 'collect' as const, piece: 'red' as const, count: 1 }] } };
    const r = applyMove(withGoal, { a: P(1, 0), b: P(1, 1) });

    expect(r.session.result).toBe('win');
    expect(r.events.find((e) => e.t === 'levelWin')).toBeDefined();
    expect(r.events.find((e) => e.t === 'levelLose')).toBeUndefined();
  });

  it('levelLose 携带 remaining，供「只差 {n} 个啦！」使用', () => {
    const s = makeSession(SIMPLE, { movesLeft: 1 });
    const hard = { ...s, level: { ...s.level, objectives: [{ kind: 'collect' as const, piece: 'red' as const, count: 999 }] } };
    const lose = applyMove(hard, { a: P(1, 0), b: P(1, 1) }).events.find((e) => e.t === 'levelLose');

    expect(lose?.t === 'levelLose' && lose.remaining['collect:red']).toBeGreaterThan(0);
  });

  it('未完成也未耗尽 → continue，无 levelWin/levelLose', () => {
    const s = makeSession(SIMPLE, { movesLeft: 10 });
    const hard = { ...s, level: { ...s.level, objectives: [{ kind: 'collect' as const, piece: 'red' as const, count: 999 }] } };
    const r = applyMove(hard, { a: P(1, 0), b: P(1, 1) });

    expect(r.session.result).toBe('continue');
    const ts = r.events.map((e) => e.t);
    expect(ts).not.toContain('levelWin');
    expect(ts).not.toContain('levelLose');
  });

  it('★ 已分胜负后不再接受输入', () => {
    const s = makeSession(SIMPLE, { movesLeft: 5, result: 'win' });
    expect(applyMove(s, { a: P(1, 0), b: P(1, 1) }).events).toEqual([]);
  });
});
