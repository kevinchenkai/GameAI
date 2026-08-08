/**
 * game/pet/hintSchedule.ts —— Hint 的**时序逻辑**（纯函数，可单测）
 *
 * ★★ 设计纪律（框架 §6.5）：「**提示，不催促**」
 *   - 永不弹窗、永不画大箭头
 *   - 3s 只是歪头看棋盘（thinking），玩家多半根本不会注意到
 *   - 5s 才真的指出一步（hint）
 *   - 10s 重复一次，**且不再出文字** —— 同一句话说两遍就从"可爱"变成"聒噪"
 *
 * ★ 为什么把时序单独抽出来：这是**最容易写出恼人体验**的一段代码。
 *   把"什么时候提示"做成纯函数，就能用测试把节奏钉死，
 *   而不是靠在真机上等 10 秒去感受。
 *
 * ★ 本文件不 import Phaser，也不碰棋盘 —— 只回答"现在该处于哪个提示阶段"。
 */

import { HINT_TIMING } from '../../config/pet';

/** 提示阶段。★ `none` 是绝大多数时间所处的状态 */
export type HintPhase = 'none' | 'thinking' | 'hint' | 'repeat';

export interface HintState {
  /** 上一次玩家操作（或棋盘停稳）的时间戳 */
  readonly idleSince: number;
  /** 当前已进入的阶段 —— 用于判断"是否刚跨过阈值" */
  readonly phase: HintPhase;
}

export function createHintState(now: number): HintState {
  return { idleSince: now, phase: 'none' };
}

/**
 * 按空闲时长决定应处的阶段。
 *
 * ★ 阈值用 `>=`：配置写 3000 就该在第 3000ms 触发，不是 3001。
 */
export function phaseFor(idleMs: number): HintPhase {
  if (idleMs >= HINT_TIMING.repeatAfterMs) return 'repeat';
  if (idleMs >= HINT_TIMING.hintAfterMs) return 'hint';
  if (idleMs >= HINT_TIMING.thinkingAfterMs) return 'thinking';
  return 'none';
}

/**
 * 推进状态机。返回**新状态**与"是否刚跨入新阶段"。
 *
 * ★ `justEntered` 是关键：表现层只应在**跨入瞬间**播一次动画。
 *   若每帧都按 phase 播，5s 之后旺财会每帧重启一次跑动动画，
 *   看起来像卡住了。
 */
export function tickHint(state: HintState, now: number): { state: HintState; justEntered: boolean } {
  const phase = phaseFor(now - state.idleSince);
  if (phase === state.phase) return { state, justEntered: false };
  return { state: { ...state, phase }, justEntered: true };
}

/**
 * 玩家有动作 → 计时归零。
 *
 * ★ 归零要**彻底**（phase 也回 none），否则从 repeat 退回 hint 时
 *   `justEntered` 会误判为"刚进入 hint"，凭空多播一次提示。
 */
export function resetHint(now: number): HintState {
  return createHintState(now);
}

/**
 * 该阶段是否要显示文字。
 *
 * ★ 只有**首次** hint 出文字（口头禅）；repeat 阶段静默。
 *   （PET_LINES.hintRepeat 是空数组，本函数是它的语义说明。）
 */
export function shouldSpeak(phase: HintPhase): boolean {
  return phase === 'hint';
}
