/**
 * game/pet/PetController.ts —— 宠物状态机与表现层（M0 骨架，实现见 M6）
 *
 * 消费 CoreGameEvent[]，按 §6.2 分两层反应：
 *   - `match` 事件      → 轻反应，可在连锁中叠加，**绝不阻塞棋盘**
 *   - `turnResolved` 事件 → 重反应，走 resolvePetDecision()，**一段连锁最多一次**
 *
 * ★ 永不消费裸 `settled`（冻结契约 3）——那时胜负还未知。
 */

import type { CoreGameEvent } from '../../core/types';
import type { PetDecision } from './reactionResolver';
import type { PetRuntimeState } from './state';
import { notImplemented } from '../../core/notImplemented';

export interface PetController {
  /** 事件入口。内部按上述两层分派 */
  consume(events: readonly CoreGameEvent[]): void;
  /** 当前 runtime，供 TurnController 查询是否有阻塞式反应在播 */
  readonly runtime: PetRuntimeState;
  /** 重反应是否正在播——TurnController 的 canAcceptInput 要看它 */
  isBlocking(): boolean;
  /** 累计重反应时长是否已超 PET_ANIM_BUDGET.maxHeavyRatio，超则自动降级 */
  isOverBudget(): boolean;
}

export function applyDecision(_decision: PetDecision): void {
  notImplemented('applyDecision', 'M6');
}

/** Puppet 5 层的 Idle 微动作循环（IDLE_MICRO），零动画预算成本 */
export function startIdleMicroMotion(): void {
  notImplemented('startIdleMicroMotion', 'M6');
}
