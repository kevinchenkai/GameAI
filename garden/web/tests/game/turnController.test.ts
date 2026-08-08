import { describe, expect, it } from 'vitest';
import { canAcceptInput, createTurnState, type TurnState } from '../../src/game/TurnController';

function state(over: Partial<TurnState> = {}): TurnState {
  return { ...createTurnState(), phase: 'TURN_RESOLVED', ...over };
}

describe('canAcceptInput —— 输入闸门（PATCH B / 冻结契约 7）', () => {
  it('五个条件全满足才放行', () => {
    expect(canAcceptInput(state())).toBe(true);
  });

  it('★ BOARD_SETTLED 不解锁输入 —— 这是 PATCH B 修的那个竞态', () => {
    expect(canAcceptInput(state({ phase: 'BOARD_SETTLED' }))).toBe(false);
  });

  it('RESOLVING / PRESENTATION 都不解锁', () => {
    expect(canAcceptInput(state({ phase: 'RESOLVING' }))).toBe(false);
    expect(canAcceptInput(state({ phase: 'PRESENTATION' }))).toBe(false);
  });

  it('★ 赢了 / 输了都不再接受输入', () => {
    expect(canAcceptInput(state({ result: 'win' }))).toBe(false);
    expect(canAcceptInput(state({ result: 'lose' }))).toBe(false);
  });

  it('阻塞式宠物反应在播时不接受输入', () => {
    expect(canAcceptInput(state({ blockingPetReaction: true }))).toBe(false);
  });

  it('技能窗口开着时不接受输入（窗口期棋盘未变，可安全取消）', () => {
    expect(canAcceptInput(state({ skillOfferOpen: true }))).toBe(false);
  });

  it('技能执行中不接受输入（棋盘正在变更，不可回退）', () => {
    expect(canAcceptInput(state({ petSkillExecuting: true }))).toBe(false);
  });

  it('结算弹窗开着时不接受输入', () => {
    expect(canAcceptInput(state({ resultPopupOpen: true }))).toBe(false);
  });

  it('★ 任一条件不满足即拒绝 —— 逐条穷举，防止将来把 && 写成 ||', () => {
    const blockers: Partial<TurnState>[] = [
      { phase: 'BOARD_SETTLED' },
      { phase: 'RESOLVING' },
      { phase: 'PRESENTATION' },
      { phase: 'READY_FOR_INPUT' }, // 已在该状态，不需要再次"回到"
      { result: 'win' },
      { result: 'lose' },
      { blockingPetReaction: true },
      { skillOfferOpen: true },
      { petSkillExecuting: true },
      { resultPopupOpen: true },
    ];
    for (const b of blockers) {
      expect(canAcceptInput(state(b))).toBe(false);
    }
  });

  it('★ Stage 0 退化行为：两个技能 flag 恒 false 时，闸门等价于"结算完就能输入"', () => {
    const stage0 = state({ skillOfferOpen: false, petSkillExecuting: false });
    expect(canAcceptInput(stage0)).toBe(true);
    expect(canAcceptInput({ ...stage0, phase: 'BOARD_SETTLED' })).toBe(false);
  });

  it('初始状态是 READY_FOR_INPUT', () => {
    expect(createTurnState().phase).toBe('READY_FOR_INPUT');
  });
});
