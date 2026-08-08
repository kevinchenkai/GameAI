/**
 * game/TurnController.ts —— 回合状态机与**输入闸门**（★ 冻结契约 7）
 *
 * V1.1 初稿让渲染层在 `settled` 时解锁输入，这留了一个 race condition：
 *
 *   Cascade → settled → ★ 输入解锁 → levelWin → turnResolved
 *                         ↑
 *                 玩家可能抢在 Victory 流程启动前又走一步
 *
 * 概率低，但**架构不该允许这种状态存在**。
 *
 * 修正：输入解锁**不再由任何单个事件负责**，而由本文件的显式状态机管理。
 */

import type { CoreTurnSummary, Move } from '../core/types';

export type TurnPhase =
  | 'READY_FOR_INPUT' // ★ 唯一接受输入的状态
  | 'RESOLVING' // 连锁结算与播放中
  | 'BOARD_SETTLED' // 棋盘停了，但胜负未定
  | 'TURN_RESOLVED' // 结算完成
  | 'PRESENTATION'; // 宠物反应 / 技能窗口 / 结算弹窗

/**
 * READY_FOR_INPUT → RESOLVING → BOARD_SETTLED → TURN_RESOLVED
 *         ↑                                          ↓
 *         └───────────── PRESENTATION ←──────────────┘
 */
export interface TurnState {
  readonly phase: TurnPhase;
  readonly result: CoreTurnSummary['result'];
  /** 阻塞式宠物反应正在播（excited / victory / encourage） */
  readonly blockingPetReaction: boolean;
  /** 技能可点击窗口开着（Stage 0 恒 false） */
  readonly skillOfferOpen: boolean;
  /** 宠物技能正在执行，棋盘正在变更（Stage 0 恒 false） */
  readonly petSkillExecuting: boolean;
  readonly resultPopupOpen: boolean;
  /**
   * ★ 缓存的玩家输入。只在整段动画最后 INPUT_BUFFER.openBeforeEndMs 内接受，
   *   且**在 READY_FOR_INPUT 才兑现** —— 不是 settled、也不是 turnResolved，
   *   否则会插到宠物反应或结算弹窗前面。
   */
  readonly bufferedMove: Move | null;
}

/**
 * ★ 回到 READY_FOR_INPUT 的条件 —— **全部满足才行**。
 *
 * 这个设计的长期价值：Stage 0 没有技能，`skillOfferOpen` /
 * `petSkillExecuting` 恒为 false，闸门退化成"结算完就能输入"。
 * 但 **Stage 0.5 接入技能时不需要改输入架构** —— 只是让两个 flag
 * 真正起作用。这正是提前定死的意义。
 */
export function canAcceptInput(t: TurnState): boolean {
  return (
    t.phase === 'TURN_RESOLVED' &&
    t.result === 'continue' && // 没赢也没输
    !t.blockingPetReaction && // 没有阻塞式宠物反应在播
    !t.skillOfferOpen && // 没有技能窗口开着
    !t.petSkillExecuting && // 没有宠物技能在执行
    !t.resultPopupOpen // 没有结算弹窗
  );
}

export function createTurnState(): TurnState {
  return {
    phase: 'READY_FOR_INPUT',
    result: 'continue',
    blockingPetReaction: false,
    skillOfferOpen: false,
    petSkillExecuting: false,
    resultPopupOpen: false,
    bufferedMove: null,
  };
}

/**
 * ★ 合法的相位迁移。非法迁移**抛错而不是静默忽略** ——
 *   状态机走错是架构级 bug，静默会让它在真机上表现成"偶尔卡住不能操作"，
 *   那种问题极难定位。
 */
const ALLOWED: Readonly<Record<TurnPhase, readonly TurnPhase[]>> = {
  READY_FOR_INPUT: ['RESOLVING'],
  RESOLVING: ['BOARD_SETTLED'],
  BOARD_SETTLED: ['TURN_RESOLVED'],
  // 结算完可以直接回到可输入（无演出），也可以先走演出
  TURN_RESOLVED: ['PRESENTATION', 'READY_FOR_INPUT'],
  PRESENTATION: ['TURN_RESOLVED', 'READY_FOR_INPUT'],
};

export function canAdvance(from: TurnPhase, to: TurnPhase): boolean {
  return ALLOWED[from].includes(to);
}

export function advance(state: TurnState, phase: TurnPhase): TurnState {
  if (!canAdvance(state.phase, phase)) {
    throw new Error(
      `非法的回合相位迁移：${state.phase} → ${phase}。` +
        `合法目标：${ALLOWED[state.phase].join(' / ')}。`,
    );
  }
  // ★ 回到可输入状态时清空缓存 —— 缓存只对"刚刚那一段动画"有效
  if (phase === 'READY_FOR_INPUT') {
    return { ...state, phase, bufferedMove: null };
  }
  return { ...state, phase };
}

/** 应用一次结算结果（core 的 turnResolved） */
export function applySummary(state: TurnState, summary: CoreTurnSummary): TurnState {
  return { ...state, result: summary.result };
}

/**
 * ★ 缓存一次玩家输入。
 *
 *   `windowOpen` 由 timeline.isBufferWindowOpen() 判断 —— 窗口没开就直接丢弃。
 *   **后来的覆盖先前的**：玩家改主意时，最后一次滑动才是他想要的。
 */
export function bufferInput(state: TurnState, move: Move, windowOpen: boolean): TurnState {
  if (!windowOpen) return state;
  if (state.phase === 'READY_FOR_INPUT') return state; // 能直接走，不必缓存
  return { ...state, bufferedMove: move };
}

/**
 * ★ 取出缓存的输入。
 *
 * ⚠️ 调用方**必须重新验证合法性**再执行（棋盘可能已变），非法则静默丢弃。
 *   本函数只负责"取出并清空"，不负责判断合法 —— 合法性归 core 管。
 */
export function takeBufferedMove(state: TurnState): { state: TurnState; move: Move | null } {
  if (state.bufferedMove === null) return { state, move: null };
  return { state: { ...state, bufferedMove: null }, move: state.bufferedMove };
}

export function setFlags(
  state: TurnState,
  flags: Partial<
    Pick<
      TurnState,
      'blockingPetReaction' | 'skillOfferOpen' | 'petSkillExecuting' | 'resultPopupOpen'
    >
  >,
): TurnState {
  return { ...state, ...flags };
}
