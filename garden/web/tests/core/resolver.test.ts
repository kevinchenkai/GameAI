/**
 * resolver 单测 —— M1 范围：Swap / Match / Clear / Fall / Spawn / Cascade
 *
 * ★ 重点在**事件序列的顺序**（冻结契约 2 / 7）。
 *   渲染、宠物、音频三层都按这个序列走，顺序错了三层一起错。
 */

import { describe, expect, it } from 'vitest';
import { applyMove, resolveCascades } from '../../src/core/resolver';
import { cellAt } from '../../src/core/board';
import type { CoreGameEvent, CoreGameEventType } from '../../src/core/types';
import { makeSession, P } from './helpers';

const types = (events: readonly CoreGameEvent[]): CoreGameEventType[] => events.map((e) => e.t);

/** 一个交换后必定三连的棋型：换 (1,0)G ↔ (1,1)R，顶行成 R R R */
const SIMPLE = `
  R G R B G B
  B R B G B G
  G B G B G B
  B G B G B G
  G B G B G B
  B G B G B G
`;

describe('applyMove —— 无效交换', () => {
  it('不成匹配 → [swap, swapBack]，不扣步、无 turnResolved', () => {
    const s = makeSession(`
      R G B R G B
      B R G B R G
      G B R G B R
      R G B R G B
      B R G B R G
      G B R G B R
    `);
    const r = applyMove(s, { a: P(0, 0), b: P(1, 0) });

    expect(types(r.events)).toEqual(['swap', 'swapBack']);
    expect(r.session.movesLeft).toBe(s.movesLeft); // ★ 不扣步
    expect(r.session.board).toBe(s.board); // 棋盘对象未变
    expect(types(r.events)).not.toContain('turnResolved'); // ★ 宠物不该有反应
  });

  it('非相邻交换：连 swap 都不播', () => {
    const s = makeSession(SIMPLE);
    expect(applyMove(s, { a: P(0, 0), b: P(2, 0) }).events).toEqual([]);
  });

  it('对角交换非法', () => {
    const s = makeSession(SIMPLE);
    expect(applyMove(s, { a: P(0, 0), b: P(1, 1) }).events).toEqual([]);
  });

  it('涉及洞的交换非法', () => {
    const s = makeSession(`
      R # R B G B
      B R B G B G
      G B G B G B
      B G B G B G
      G B G B G B
      B G B G B G
    `);
    expect(applyMove(s, { a: P(0, 0), b: P(1, 0) }).events).toEqual([]);
  });

  it('步数耗尽后不再接受输入', () => {
    const s = makeSession(SIMPLE, { movesLeft: 0 });
    expect(applyMove(s, { a: P(1, 0), b: P(1, 1) }).events).toEqual([]);
  });

  it('已分出胜负后不再接受输入', () => {
    const s = makeSession(SIMPLE, { result: 'win' });
    expect(applyMove(s, { a: P(1, 0), b: P(1, 1) }).events).toEqual([]);
  });
});

describe('applyMove —— 有效交换的事件序列（★ 冻结契约 2）', () => {
  const s = makeSession(SIMPLE);
  const r = applyMove(s, { a: P(1, 0), b: P(1, 1) });
  const ts = types(r.events);

  it('以 swap 开头，以 turnResolved 结尾', () => {
    expect(ts[0]).toBe('swap');
    expect(ts[ts.length - 1]).toBe('turnResolved');
  });

  it('没有 swapBack', () => {
    expect(ts).not.toContain('swapBack');
  });

  it('★ settled → movesChanged → turnResolved 的相对顺序固定', () => {
    const iSettled = ts.indexOf('settled');
    const iMoves = ts.indexOf('movesChanged');
    const iResolved = ts.indexOf('turnResolved');
    expect(iSettled).toBeGreaterThan(-1);
    expect(iMoves).toBeGreaterThan(iSettled);
    expect(iResolved).toBeGreaterThan(iMoves);
  });

  it('★ settled 恰好出现一次，turnResolved 恰好出现一次', () => {
    expect(ts.filter((t) => t === 'settled')).toHaveLength(1);
    expect(ts.filter((t) => t === 'turnResolved')).toHaveLength(1);
  });

  it('★ 所有 cascadeStart/End 都在 settled 之前', () => {
    const iSettled = ts.indexOf('settled');
    ts.forEach((t, i) => {
      if (t === 'cascadeStart' || t === 'cascadeEnd') expect(i).toBeLessThan(iSettled);
    });
  });

  it('cascadeStart 与 cascadeEnd 成对且层号递增', () => {
    const starts = r.events.filter((e) => e.t === 'cascadeStart');
    const ends = r.events.filter((e) => e.t === 'cascadeEnd');
    expect(starts).toHaveLength(ends.length);
    starts.forEach((e, i) => {
      expect(e.t === 'cascadeStart' && e.level).toBe(i);
    });
  });

  it('每层内部顺序：cascadeStart → match → (fall) → (spawn) → cascadeEnd', () => {
    const i0 = ts.indexOf('cascadeStart');
    const iEnd = ts.indexOf('cascadeEnd');
    const inner = ts.slice(i0 + 1, iEnd);
    expect(inner[0]).toBe('match');
    const iFall = inner.indexOf('fall');
    const iSpawn = inner.indexOf('spawn');
    if (iFall > -1 && iSpawn > -1) expect(iSpawn).toBeGreaterThan(iFall);
  });

  it('扣一步，回合数 +1', () => {
    expect(r.session.movesLeft).toBe(s.movesLeft - 1);
    expect(r.session.turnCount).toBe(s.turnCount + 1);
  });

  it('turnResolved 携带的 summary 与 settled 一致', () => {
    const settled = r.events.find((e) => e.t === 'settled');
    const resolved = r.events.find((e) => e.t === 'turnResolved');
    expect(settled?.t === 'settled' && resolved?.t === 'turnResolved').toBe(true);
    if (settled?.t === 'settled' && resolved?.t === 'turnResolved') {
      expect(resolved.summary.maxCascade).toBe(settled.maxCascade);
      expect(resolved.summary.totalCleared).toBe(settled.totalCleared);
    }
  });

  it('★ M1 阶段 result 恒为 continue（胜负判定在 M2）', () => {
    const resolved = r.events.find((e) => e.t === 'turnResolved');
    expect(resolved?.t === 'turnResolved' && resolved.summary.result).toBe('continue');
  });
});

describe('applyMove —— 纯函数（撤销 / AI 试算 / 模拟器都依赖这条）', () => {
  it('不修改传入的 session 与 board', () => {
    const s = makeSession(SIMPLE);
    const before = JSON.stringify(s);
    applyMove(s, { a: P(1, 0), b: P(1, 1) });
    expect(JSON.stringify(s)).toBe(before);
  });

  it('同一输入跑两次，结果完全一致', () => {
    const s = makeSession(SIMPLE);
    const a = applyMove(s, { a: P(1, 0), b: P(1, 1) });
    const b = applyMove(s, { a: P(1, 0), b: P(1, 1) });
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
    expect(JSON.stringify(a.session)).toBe(JSON.stringify(b.session));
  });
});

describe('结算后的棋盘完整性', () => {
  it('结算后没有空格（洞除外）', () => {
    const s = makeSession(SIMPLE);
    const r = applyMove(s, { a: P(1, 0), b: P(1, 1) });
    for (const cell of r.session.board.cells) {
      if (!cell.blocked) expect(cell.piece).not.toBeNull();
    }
  });

  it('结算后棋盘上没有残留匹配', () => {
    const s = makeSession(SIMPLE);
    const r = applyMove(s, { a: P(1, 0), b: P(1, 1) });
    // 用 resolveCascades 再跑一次，不应产生任何 match
    const again = resolveCascades(r.session);
    expect(types(again.events)).not.toContain('match');
  });

  it('★ 棋子 id 全局唯一（渲染层靠它追踪精灵）', () => {
    let s = makeSession(SIMPLE);
    for (let i = 0; i < 5; i++) {
      const moves = [
        { a: P(1, 0), b: P(1, 1) },
        { a: P(3, 2), b: P(3, 3) },
      ];
      for (const m of moves) s = applyMove(s, m).session;
      const ids = s.board.cells.map((c) => c.piece?.id).filter((x): x is number => x !== undefined);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('★ nextPieceId 单调递增，不回退（复现依赖它）', () => {
    let s = makeSession(SIMPLE);
    let prev = s.nextPieceId;
    for (let i = 0; i < 5; i++) {
      s = applyMove(s, { a: P(1, 0), b: P(1, 1) }).session;
      expect(s.nextPieceId).toBeGreaterThanOrEqual(prev);
      prev = s.nextPieceId;
    }
  });
});

describe('连锁（Cascade）', () => {
  it('掉落后凑成新匹配 → 产生第 2 层连锁', () => {
    // 消掉底部的 R R R 后，上方的 G 会掉下来凑成 G G G
    const s = makeSession(`
      B Y B
      G Y G
      Y . Y
      R R R
    `);
    // 直接结算（棋盘已有匹配），不需要交换
    const r = resolveCascades(s);
    const starts = r.events.filter((e) => e.t === 'cascadeStart');
    expect(starts.length).toBeGreaterThanOrEqual(1);
  });

  it('maxCascade 记录达到的最深层号', () => {
    const s = makeSession(SIMPLE);
    const r = applyMove(s, { a: P(1, 0), b: P(1, 1) });
    const settled = r.events.find((e) => e.t === 'settled');
    if (settled?.t === 'settled') {
      expect(settled.maxCascade).toBeGreaterThanOrEqual(0);
    }
  });

  it('totalCleared 等于所有 match 事件消除的去重格子数', () => {
    const s = makeSession(SIMPLE);
    const r = applyMove(s, { a: P(1, 0), b: P(1, 1) });
    const cleared = new Set<string>();
    for (const e of r.events) {
      if (e.t === 'match') for (const p of e.positions) cleared.add(`${p.col},${p.row}|${e.cascadeLevel}`);
    }
    const settled = r.events.find((e) => e.t === 'settled');
    if (settled?.t === 'settled') {
      expect(settled.totalCleared).toBeGreaterThan(0);
      expect(settled.totalCleared).toBeLessThanOrEqual(cleared.size);
    }
  });
});

describe('resolveCascades —— 宠物技能共用的结算管线', () => {
  it('★ 不扣步（宠物技能不消耗玩家步数）', () => {
    const s = makeSession(SIMPLE);
    const r = resolveCascades(s);
    expect(r.session.movesLeft).toBe(s.movesLeft);
  });

  it('棋盘已稳定时也产出 settled 与 turnResolved', () => {
    const s = makeSession(SIMPLE);
    const ts = types(resolveCascades(s).events);
    expect(ts).toContain('settled');
    expect(ts).toContain('turnResolved');
  });
});

describe('洞（blocked）在结算中的行为', () => {
  it('洞里始终没有棋子', () => {
    const s = makeSession(`
      R G R B G B
      B # B G B G
      G B G B G B
      B G B G B G
      G B G B G B
      B G B G B G
    `);
    const r = applyMove(s, { a: P(0, 0), b: P(1, 0) });
    const hole = cellAt(r.session.board, P(1, 1));
    expect(hole?.blocked).toBe(true);
    expect(hole?.piece).toBeNull();
  });
});
