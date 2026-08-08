/**
 * core/obstacles.ts —— 障碍行为（M0 骨架，实现见 M2）
 *
 * 四种障碍抽象成同一个「hp + 受伤条件」模型（框架 §4.2），
 * 差异只在受伤条件：
 *   ice    本格消除
 *   grass  本格消除（一次清）
 *   crate  邻接消除或爆炸
 *   flower 邻接消除（hp 归零 = 开花完成，可被收集）
 *
 * 好处：新增障碍 = 加一条配置 + 一个受伤条件，**不改结算逻辑**。
 * Stage 0 只启用 ice。
 */

import type { BoardState, CoreGameEvent, ObstacleKind, Pos } from './types';
import { notImplemented } from './notImplemented';

export type DamageTrigger = 'sameCell' | 'adjacent';

/** 各障碍的受伤条件——这张表是「统一模型」的全部内容 */
export const OBSTACLE_TRIGGER: Readonly<Record<ObstacleKind, DamageTrigger>> = {
  ice: 'sameCell',
  grass: 'sameCell',
  crate: 'adjacent',
  flower: 'adjacent',
};

/**
 * 对一次消除结算所有受影响的障碍。
 * 产出 obstacleHit / obstacleClear 事件。
 */
export function damageObstacles(
  _board: BoardState,
  _clearedPositions: readonly Pos[],
): { readonly board: BoardState; readonly events: readonly CoreGameEvent[] } {
  return notImplemented('damageObstacles', 'M2');
}
