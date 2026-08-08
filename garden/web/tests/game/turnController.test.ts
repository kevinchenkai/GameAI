/**
 * TurnController 单测 —— ★ 冻结契约 7 的机器化保障
 *
 * 这是**整个 M4 最重要的一份测试**。它锁的是：
 *   `settled` 不解锁输入，输入只在 READY_FOR_INPUT 开放。
 *
 * 初稿的 race condition：
 *   Cascade → settled → 输入解锁 → levelWin → turnResolved
 *                         ↑ 玩家可能抢在 Victory 流程前又走一步
 * 概率低，但架构不该允许这种状态存在。
 */

import { describe, expect, it } from 'vitest';
import {
  advance,
  applySummary,
  bufferInput,
  canAcceptInput,
  canAdvance,
  createTurnState,
  setFlags,
  takeBufferedMove,
  type TurnPhase,
  type TurnState,
} from '../../src/game/TurnController';
import type { Move } from '../../src/core/types';

const MOVE: Move = { a: { col: 0, row: 0 }, b: { col: 1, row: 0 } };

const ALL_PHASES: TurnPhase[] = [
  'READY_FOR_INPUT',
  'RESOLVING',
  'BOARD_SETTLED',
  'TURN_RESOLVED',
  'PRESENTATION',
];

/** 走完一整个回合，停在 TURN_RESOLVED */
function resolvedState(): TurnState {
  let s = createTurnState();
  s = advance(s, 'RESOLVING');
  s = advance(s, 'BOARD_SETTLED');
  s = advance(s, 'TURN_RESOLVED');
  return s;
}

describe('★★ 冻结契约 7：settled 不解锁输入', () => {
  it('★ BOARD_SETTLED 状态下不能输入', () => {
    let s = createTurnState();
    s = advance(s, 'RESOLVING');
    s = advance(s, 'BOARD_SETTLED');
    expect(canAcceptInput(s)).toBe(false);
  });

  it('★ 结算中（RESOLVING）不能输入', () => {
    const s = advance(createTurnState(), 'RESOLVING');
    expect(canAcceptInput(s)).toBe(false);
  });

  it('★ 演出中（PRESENTATION）不能输入', () => {
    const s = advance(resolvedState(), 'PRESENTATION');
    expect(canAcceptInput(s)).toBe(false);
  });

  it('★ 只有 TURN_RESOLVED 且各条件满足才能输入', () => {
    expect(canAcceptInput(resolvedState())).toBe(true);
  });

  it('★ 除 TURN_RESOLVED 外，任何相位都不能输入', () => {
    for (const phase of ALL_PHASES) {
      if (phase === 'TURN_RESOLVED') continue;
      const s: TurnState = { ...resolvedState(), phase };
      expect(canAcceptInput(s)).toBe(false);
    }
  });
});

describe('★ 闸门的每一个条件都真的起作用', () => {
  it('赢了 → 不能输入（Victory Flow 优先）', () => {
    const s = applySummary(resolvedState(), {
      maxCascade: 1,
      totalCleared: 3,
      specialCreated: [],
      result: 'win',
    });
    expect(canAcceptInput(s)).toBe(false);
  });

  it('输了 → 不能输入', () => {
    const s = applySummary(resolvedState(), {
      maxCascade: 1,
      totalCleared: 3,
      specialCreated: [],
      result: 'lose',
    });
    expect(canAcceptInput(s)).toBe(false);
  });

  it.each([
    ['blockingPetReaction', { blockingPetReaction: true }],
    ['skillOfferOpen', { skillOfferOpen: true }],
    ['petSkillExecuting', { petSkillExecuting: true }],
    ['resultPopupOpen', { resultPopupOpen: true }],
  ] as const)('%s 为 true → 不能输入', (_name, flag) => {
    expect(canAcceptInput(setFlags(resolvedState(), flag))).toBe(false);
  });

  it('★ Stage 0 无技能：两个技能 flag 恒 false，闸门退化成"结算完就能输入"', () => {
    const s = resolvedState();
    expect(s.skillOfferOpen).toBe(false);
    expect(s.petSkillExecuting).toBe(false);
    expect(canAcceptInput(s)).toBe(true);
  });
});

describe('★ 相位迁移：非法迁移抛错而不是静默忽略', () => {
  it('合法路径走得通', () => {
    expect(() => {
      let s = createTurnState();
      s = advance(s, 'RESOLVING');
      s = advance(s, 'BOARD_SETTLED');
      s = advance(s, 'TURN_RESOLVED');
      s = advance(s, 'PRESENTATION');
      s = advance(s, 'READY_FOR_INPUT');
    }).not.toThrow();
  });

  it('★ 跳过 RESOLVING 直接到 TURN_RESOLVED → 抛错', () => {
    expect(() => advance(createTurnState(), 'TURN_RESOLVED')).toThrow(/非法的回合相位迁移/);
  });

  it('★ 从 RESOLVING 直接回 READY_FOR_INPUT → 抛错（这正是那个 race condition）', () => {
    const s = advance(createTurnState(), 'RESOLVING');
    expect(() => advance(s, 'READY_FOR_INPUT')).toThrow();
  });

  it('★ 从 BOARD_SETTLED 直接回 READY_FOR_INPUT → 抛错（settled 不解锁输入）', () => {
    let s = advance(createTurnState(), 'RESOLVING');
    s = advance(s, 'BOARD_SETTLED');
    expect(() => advance(s, 'READY_FOR_INPUT')).toThrow();
  });

  it('TURN_RESOLVED 可以直接回可输入（无演出的普通回合）', () => {
    expect(() => advance(resolvedState(), 'READY_FOR_INPUT')).not.toThrow();
  });

  it('★ 错误信息里写明合法目标（便于定位）', () => {
    expect(() => advance(createTurnState(), 'TURN_RESOLVED')).toThrow(/RESOLVING/);
  });

  it('canAdvance 与 advance 结论一致', () => {
    for (const from of ALL_PHASES) {
      for (const to of ALL_PHASES) {
        const s: TurnState = { ...createTurnState(), phase: from };
        const ok = canAdvance(from, to);
        if (ok) expect(() => advance(s, to)).not.toThrow();
        else expect(() => advance(s, to)).toThrow();
      }
    }
  });
});

describe('★ 输入缓存', () => {
  it('窗口没开 → 直接丢弃', () => {
    const s = advance(createTurnState(), 'RESOLVING');
    expect(bufferInput(s, MOVE, false).bufferedMove).toBeNull();
  });

  it('窗口开着 → 缓存下来', () => {
    const s = advance(createTurnState(), 'RESOLVING');
    expect(bufferInput(s, MOVE, true).bufferedMove).toEqual(MOVE);
  });

  it('★ 已经可以输入了就不必缓存（直接走正常路径）', () => {
    const s = resolvedState();
    // resolvedState 停在 TURN_RESOLVED；READY_FOR_INPUT 才是"能直接走"
    const ready = advance(s, 'READY_FOR_INPUT');
    expect(bufferInput(ready, MOVE, true).bufferedMove).toBeNull();
  });

  it('★ 后来的覆盖先前的（玩家改主意时，最后一次滑动才是他想要的）', () => {
    const other: Move = { a: { col: 5, row: 5 }, b: { col: 5, row: 6 } };
    let s = advance(createTurnState(), 'RESOLVING');
    s = bufferInput(s, MOVE, true);
    s = bufferInput(s, other, true);
    expect(s.bufferedMove).toEqual(other);
  });

  it('takeBufferedMove 取出后清空（不会被兑现两次）', () => {
    let s = advance(createTurnState(), 'RESOLVING');
    s = bufferInput(s, MOVE, true);
    const first = takeBufferedMove(s);
    expect(first.move).toEqual(MOVE);
    expect(takeBufferedMove(first.state).move).toBeNull();
  });

  it('★ 回到 READY_FOR_INPUT 时清空缓存 —— 缓存只对刚才那段动画有效', () => {
    let s = advance(createTurnState(), 'RESOLVING');
    s = bufferInput(s, MOVE, true);
    s = advance(s, 'BOARD_SETTLED');
    s = advance(s, 'TURN_RESOLVED');
    expect(s.bufferedMove).toEqual(MOVE); // 中途还在
    s = advance(s, 'READY_FOR_INPUT');
    expect(s.bufferedMove).toBeNull(); // 兑现时机已过则丢弃
  });
});

describe('不可变性', () => {
  it('所有操作都返回新对象，不改入参', () => {
    const s = createTurnState();
    advance(s, 'RESOLVING');
    setFlags(s, { resultPopupOpen: true });
    bufferInput(s, MOVE, true);
    expect(s.phase).toBe('READY_FOR_INPUT');
    expect(s.resultPopupOpen).toBe(false);
    expect(s.bufferedMove).toBeNull();
  });
});
