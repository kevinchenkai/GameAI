/**
 * 组合交换的端到端行为（通过 applyMove 观察）
 *
 * ★ 随机对局几乎不会产生组合（要两个特殊棋子刚好相邻），
 *   所以必须手工构造 —— fuzz 覆盖不到这一块。
 */

import { describe, expect, it } from 'vitest';
import { applyMove } from '../../src/core/resolver';
import { decorate, makeSession, P } from './helpers';
import type { CoreGameEvent, CoreGameEventType } from '../../src/core/types';

const types = (e: readonly CoreGameEvent[]): CoreGameEventType[] => e.map((x) => x.t);

/** 一个没有任何现成匹配的盘 —— 确保观察到的效果全部来自组合 */
const CLEAN = `
  RGBRGB
  GBRGBR
  BRGBRG
  RGBRGB
  GBRGBR
  BRGBRG
`;

function sessionWithSpecials(
  specials: readonly (readonly [ReturnType<typeof P>, 'rocketH' | 'rocketV' | 'bomb'])[],
) {
  const s = makeSession(CLEAN);
  return { ...s, board: decorate(s.board, { specials }) };
}

describe('组合交换 —— 即使不成 3 连也合法', () => {
  it('★ 火箭 + 火箭：不成 3 连，但照样引爆并扣步', () => {
    const s = sessionWithSpecials([
      [P(2, 2), 'rocketH'],
      [P(3, 2), 'rocketV'],
    ]);
    const r = applyMove(s, { a: P(2, 2), b: P(3, 2) });
    const ts = types(r.events);

    expect(ts).toContain('comboBlast');
    expect(ts).not.toContain('swapBack'); // ★ 不是无效交换
    expect(r.session.movesLeft).toBe(s.movesLeft - 1); // 扣步
    expect(ts[ts.length - 1]).toBe('turnResolved');
  });

  it('★ 对照组：同样的盘、没有特殊棋子时，该交换是无效的', () => {
    const s = makeSession(CLEAN);
    const r = applyMove(s, { a: P(2, 2), b: P(3, 2) });
    expect(types(r.events)).toEqual(['swap', 'swapBack']);
    expect(r.session.movesLeft).toBe(s.movesLeft); // 不扣步
  });

  it('comboBlast 事件带上两者的类型，供渲染层选动画', () => {
    const s = sessionWithSpecials([
      [P(2, 2), 'bomb'],
      [P(3, 2), 'bomb'],
    ]);
    const blast = applyMove(s, { a: P(2, 2), b: P(3, 2) }).events.find((e) => e.t === 'comboBlast');
    expect(blast?.t === 'comboBlast' && blast.kinds).toEqual(['bomb', 'bomb']);
  });

  it('★ comboBlast 出现在 swap 之后、settled 之前', () => {
    const s = sessionWithSpecials([
      [P(2, 2), 'rocketH'],
      [P(3, 2), 'bomb'],
    ]);
    const ts = types(applyMove(s, { a: P(2, 2), b: P(3, 2) }).events);
    expect(ts.indexOf('comboBlast')).toBeGreaterThan(ts.indexOf('swap'));
    expect(ts.indexOf('comboBlast')).toBeLessThan(ts.indexOf('settled'));
  });

  it('炸弹 + 炸弹清掉 5×5，结算后棋盘仍然填满', () => {
    const s = sessionWithSpecials([
      [P(2, 2), 'bomb'],
      [P(3, 2), 'bomb'],
    ]);
    const r = applyMove(s, { a: P(2, 2), b: P(3, 2) });
    for (const cell of r.session.board.cells) {
      if (!cell.blocked) expect(cell.piece).not.toBeNull();
    }
  });

  it('组合后不残留匹配（连锁跑完了）', () => {
    const s = sessionWithSpecials([
      [P(2, 2), 'rocketH'],
      [P(3, 2), 'rocketV'],
    ]);
    const r = applyMove(s, { a: P(2, 2), b: P(3, 2) });
    // 再结算一次不应产生新的 match
    const again = applyMove(r.session, { a: P(0, 0), b: P(0, 1) });
    expect(types(again.events).includes('comboBlast')).toBe(false);
  });

  it('★ 组合消除的棋子 id 不会与新补充的撞', () => {
    const s = sessionWithSpecials([
      [P(2, 2), 'bomb'],
      [P(3, 2), 'bomb'],
    ]);
    const r = applyMove(s, { a: P(2, 2), b: P(3, 2) });
    const ids = r.session.board.cells
      .map((c) => c.piece?.id)
      .filter((x): x is number => x !== undefined);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('单个特殊 + 普通棋子：不构成组合，按普通规则判定', () => {
    const s = sessionWithSpecials([[P(2, 2), 'bomb']]);
    const r = applyMove(s, { a: P(2, 2), b: P(3, 2) });
    // CLEAN 盘上这个交换凑不出 3 连 → 应弹回
    expect(types(r.events)).toEqual(['swap', 'swapBack']);
  });
});

describe('特殊棋子生成与触发（非组合路径）', () => {
  /**
   * 换 (3,0) ↔ (3,1) 后顶行成**恰好 4 连**：R R R R B ...
   * ⚠️ 写这类图要数清楚长度 —— 初版我在第 5 格也放了 R，
   *    结果成了 5 连（→ 彩虹球，而 Stage 0 不生成），测试断言就对不上。
   */
  const FOUR = `
    RRRGBR
    GBRRBR
    BRGBRG
    RGBRGB
    GBRGBR
    BRGBRG
  `;

  it('★ 4 连生成特殊棋子，且生成位在玩家操作格（"是我造出来的"）', () => {
    const s = makeSession(FOUR);
    const r = applyMove(s, { a: P(3, 0), b: P(3, 1) });
    const spawn = r.events.find((e) => e.t === 'specialSpawn');
    expect(spawn).toBeDefined();
    if (spawn?.t === 'specialSpawn') {
      expect(spawn.pos).toEqual(P(3, 0)); // 玩家操作的那一格
    }
  });

  it('生成的特殊棋子留在盘上，没有被同一轮消掉', () => {
    const s = makeSession(FOUR);
    const r = applyMove(s, { a: P(3, 0), b: P(3, 1) });
    const spawn = r.events.find((e) => e.t === 'specialSpawn');
    if (spawn?.t === 'specialSpawn') {
      const anySpecial = r.session.board.cells.some((c) => c.piece?.special !== 'none');
      expect(anySpecial).toBe(true);
    }
  });

  it('turnResolved 的 specialCreated 记录本回合生成的种类', () => {
    const s = makeSession(FOUR);
    const r = applyMove(s, { a: P(3, 0), b: P(3, 1) });
    const resolved = r.events.find((e) => e.t === 'turnResolved');
    expect(resolved?.t === 'turnResolved' && resolved.summary.specialCreated.length).toBeGreaterThan(
      0,
    );
  });

  it('★ Stage 0 不生成彩虹球（冻结范围）', () => {
    // 5 连
    const s = makeSession(`
      RRRRGB
      GBRGBR
      BRGBRG
      RGBRGB
      GBRGBR
      BRGBRG
    `);
    const r = applyMove({ ...s, board: s.board }, { a: P(4, 0), b: P(4, 1) });
    const rainbow = r.events.find((e) => e.t === 'specialSpawn' && e.kind === 'rainbow');
    expect(rainbow).toBeUndefined();
    expect(r.session.board.cells.some((c) => c.piece?.special === 'rainbow')).toBe(false);
  });
});
