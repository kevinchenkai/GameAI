/**
 * game/TurnController.ts —— 回合状态机与**输入闸门**（★ PATCH B / 冻结契约 7）
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

import type { CoreTurnSummary } from '../core/types';
import { notImplemented } from '../core/notImplemented';

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
}

/**
 * ★ 回到 READY_FOR_INPUT 的条件——**全部满足才行**。
 *
 * 这个设计的长期价值：Stage 0 没有技能，`skillOfferOpen` /
 * `petSkillExecuting` 恒为 false，闸门退化成"结算完就能输入"。
 * 但 **Stage 0.5 接入技能时不需要改输入架构**——只是让两个 flag
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
  };
}

// ——— 以下为 M4/M5 待实现 ———

/**
 * 缓存的玩家输入。
 * ★ 只在整段动画最后 INPUT_BUFFER.openBeforeEndMs 内接受（config/tuning.ts），
 *   且**在 READY_FOR_INPUT 才兑现**——不是 settled、也不是 turnResolved，
 *   否则会插到宠物反应或结算弹窗前面。
 * ★ 兑现前**必须重新验证合法性**（棋盘可能已变），非法则静默丢弃。
 */
export function bufferInput(_move: { a: unknown; b: unknown }): void {
  notImplemented('bufferInput', 'M4/M5');
}

export function advance(_state: TurnState, _phase: TurnPhase): TurnState {
  return notImplemented('advance', 'M4/M5');
}
