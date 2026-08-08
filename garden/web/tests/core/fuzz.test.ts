/**
 * 随机对局 fuzz —— 用大量随机走子撞出手写用例覆盖不到的边界。
 *
 * ★ 每次失败都能用种子精确复现（这正是 core/rng.ts 存在的理由）。
 *   断言的是**不变量**（invariant），不是具体数值：
 *   不变量在任何棋盘、任何走法下都必须成立。
 */

import { describe, expect, it } from 'vitest';
import { applyMove } from '../../src/core/resolver';
import { createSession, type SessionState } from '../../src/core/session';
import { findAllMatches, findAllValidMoves } from '../../src/core/matcher';
import { createRng } from '../../src/core/rng';
import { makeLevel } from './helpers';
import type { CoreGameEvent } from '../../src/core/types';

/** 每个 session 必须始终满足的不变量 */
function checkInvariants(s: SessionState, ctx: string): void {
  // 1. 非洞格必有棋子
  for (const [i, cell] of s.board.cells.entries()) {
    if (!cell.blocked && !cell.piece) {
      throw new Error(`${ctx}: 第 ${i} 格是空的（非洞）`);
    }
    if (cell.blocked && cell.piece) {
      throw new Error(`${ctx}: 第 ${i} 格是洞却有棋子`);
    }
  }

  // 2. ★ 棋子 id 全局唯一 —— 渲染层靠它追踪精灵
  const ids = s.board.cells.map((c) => c.piece?.id).filter((x): x is number => x !== undefined);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${ctx}: 棋子 id 有重复`);
  }

  // 3. ★ nextPieceId 必须大于盘上最大 id，否则后续会撞 id
  const maxId = Math.max(0, ...ids);
  if (s.nextPieceId <= maxId) {
    throw new Error(`${ctx}: nextPieceId(${s.nextPieceId}) <= 盘上最大 id(${maxId})`);
  }

  // 4. 棋盘稳定后不应残留匹配
  if (findAllMatches(s.board).length > 0) {
    throw new Error(`${ctx}: 结算后仍有未消除的匹配`);
  }

  // 5. 步数不为负
  if (s.movesLeft < 0) throw new Error(`${ctx}: movesLeft 为负`);
}

/** 事件序列必须满足的顺序约束（冻结契约 2） */
function checkEventOrder(events: readonly CoreGameEvent[], ctx: string): void {
  const ts = events.map((e) => e.t);
  if (ts.length === 0) return;

  const nSettled = ts.filter((t) => t === 'settled').length;
  const nResolved = ts.filter((t) => t === 'turnResolved').length;

  // 无效交换：只有 swap/swapBack，没有 settled/turnResolved
  if (ts.includes('swapBack')) {
    if (nSettled > 0 || nResolved > 0) {
      throw new Error(`${ctx}: 无效交换不应产出 settled/turnResolved`);
    }
    return;
  }

  if (nSettled !== 1) throw new Error(`${ctx}: settled 出现 ${nSettled} 次，应为 1`);
  if (nResolved !== 1) throw new Error(`${ctx}: turnResolved 出现 ${nResolved} 次，应为 1`);

  const iSettled = ts.indexOf('settled');
  const iResolved = ts.indexOf('turnResolved');
  if (iResolved < iSettled) throw new Error(`${ctx}: turnResolved 出现在 settled 之前`);
  if (iResolved !== ts.length - 1) throw new Error(`${ctx}: turnResolved 不是最后一个事件`);

  // 所有 cascade 事件必须在 settled 之前
  ts.forEach((t, i) => {
    if ((t === 'cascadeStart' || t === 'cascadeEnd' || t === 'match') && i > iSettled) {
      throw new Error(`${ctx}: ${t} 出现在 settled 之后`);
    }
  });

  // cascadeStart / cascadeEnd 必须配对
  const starts = ts.filter((t) => t === 'cascadeStart').length;
  const ends = ts.filter((t) => t === 'cascadeEnd').length;
  if (starts !== ends) throw new Error(`${ctx}: cascadeStart(${starts}) ≠ cascadeEnd(${ends})`);
}

/** 用随机 AI 打一整局 */
function playGame(seed: number, colors: number): void {
  const palette = (['red', 'orange', 'yellow', 'green', 'purple', 'blue'] as const).slice(0, colors);
  const level = makeLevel({ colors: [...palette], moves: 30 });
  let s = createSession(level, seed);
  const rng = createRng(seed ^ 0x5f3759df);

  checkInvariants(s, `seed=${seed} 开局`);

  for (let turn = 0; turn < 30; turn++) {
    const moves = findAllValidMoves(s.board);
    if (moves.length === 0) break; // 死局已由结算内部 shuffle 处理
    const move = rng.pick(moves);
    const r = applyMove(s, move);

    const ctx = `seed=${seed} turn=${turn} move=(${move.a.col},${move.a.row})-(${move.b.col},${move.b.row})`;
    checkEventOrder(r.events, ctx);
    s = r.session;
    checkInvariants(s, ctx);
  }
}

describe('fuzz —— 随机对局不变量', () => {
  it('★ 6 色 × 40 个种子，每局 30 步，全程不变量成立', () => {
    for (let seed = 1; seed <= 40; seed++) {
      expect(() => playGame(seed, 6), `seed=${seed}`).not.toThrow();
    }
  });

  it('★ 4 色（新手关）× 30 个种子 —— 连锁更频繁，更容易撞出 bug', () => {
    for (let seed = 100; seed < 130; seed++) {
      expect(() => playGame(seed, 4), `seed=${seed}`).not.toThrow();
    }
  });

  it('★ 3 色（最易连锁）× 20 个种子', () => {
    for (let seed = 200; seed < 220; seed++) {
      expect(() => playGame(seed, 3), `seed=${seed}`).not.toThrow();
    }
  });

  it('★ 带洞的非矩形棋盘 × 20 个种子', () => {
    for (let seed = 300; seed < 320; seed++) {
      const level = makeLevel({
        board: {
          cols: 8,
          rows: 8,
          blocked: [
            { col: 0, row: 0 },
            { col: 7, row: 0 },
            { col: 3, row: 3 },
            { col: 4, row: 4 },
          ],
        },
        moves: 20,
      });
      let s = createSession(level, seed);
      const rng = createRng(seed);
      checkInvariants(s, `seed=${seed} 开局`);
      for (let turn = 0; turn < 20; turn++) {
        const moves = findAllValidMoves(s.board);
        if (moves.length === 0) break;
        const r = applyMove(s, rng.pick(moves));
        checkEventOrder(r.events, `seed=${seed} turn=${turn}`);
        s = r.session;
        checkInvariants(s, `seed=${seed} turn=${turn}`);
      }
    }
  });

  it('★ 整局可复现：同种子同走法，结果逐字节一致', () => {
    const run = (): string => {
      const level = makeLevel({ moves: 15 });
      let s = createSession(level, 777);
      const rng = createRng(777);
      for (let i = 0; i < 15; i++) {
        const moves = findAllValidMoves(s.board);
        if (moves.length === 0) break;
        s = applyMove(s, rng.pick(moves)).session;
      }
      return JSON.stringify(s);
    };
    expect(run()).toBe(run());
  });
});
