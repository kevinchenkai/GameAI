/**
 * core/petAction.ts —— 宠物→棋盘的**唯一**通道（冻结契约 4）
 *
 * ★ 这是 core/ 里唯一允许出现 "Pet" 字样的文件，理由是明确的：
 *   **core 只认识「命令」，不认识「谁发的」**。
 *   `PetActionCommand` 描述的是「对棋盘做什么」，不含任何宠物概念
 *   （没有能量、没有等级、没有旺财）。把它叫 Pet 只是为了标明来源边界。
 *
 * 数据流：
 *   Pet System → PetActionCommand → Core → CoreGameEvent[] → Render
 *   （决定做什么）                  （棋盘发生什么）
 *
 * ★ 边界收益：applyPetAction 与 applyMove 走**完全相同的结算管线**，
 *   所以宠物技能引发的连锁、障碍破坏、目标收集自动全部正确，
 *   不需要在宠物系统里重写一遍棋盘逻辑。也因此天然可被关卡模拟器测试。
 *
 * ⚠️ Stage 0 不实现技能（冻结范围），本文件是 Stage 0.5 的接口，提前定死避免返工。
 */

import type { CoreGameEvent, Pos, SpecialKind } from './types';
import type { SessionState } from './session';
import { notImplemented } from './notImplemented';

export interface PetActionCommand {
  readonly type: 'clearPositions' | 'convertToSpecial' | 'removeObstacle';
  readonly positions: readonly Pos[];
  readonly payload?: { readonly special?: SpecialKind };
}

export function applyPetAction(
  _session: SessionState,
  _command: PetActionCommand,
): { readonly session: SessionState; readonly events: readonly CoreGameEvent[] } {
  return notImplemented('applyPetAction', 'Stage 0.5');
}
