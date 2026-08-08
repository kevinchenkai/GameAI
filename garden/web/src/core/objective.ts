/**
 * core/objective.ts —— 关卡目标判定（M0 骨架，实现见 M2）
 */

import type { CoreGameEvent, LevelConfig, Objective, Rating } from './types';
import { notImplemented } from './notImplemented';

/** 目标进度：key 由 objectiveKey() 生成 */
export type ObjectiveProgress = Readonly<Record<string, number>>;

/** 目标的稳定标识，用于进度表与 levelLose 的 remaining 字段 */
export function objectiveKey(o: Objective): string {
  switch (o.kind) {
    case 'collect':
      return `collect:${o.piece}`;
    case 'clearObstacle':
      return `clearObstacle:${o.obstacle}`;
    case 'dropDown':
      return `dropDown:${o.item}`;
  }
}

/** 从一段事件里累计目标进度 */
export function accumulateProgress(
  _level: LevelConfig,
  _progress: ObjectiveProgress,
  _events: readonly CoreGameEvent[],
): ObjectiveProgress {
  return notImplemented('accumulateProgress', 'M2');
}

export function isAllComplete(_level: LevelConfig, _progress: ObjectiveProgress): boolean {
  return notImplemented('isAllComplete', 'M2');
}

/** 各目标还差多少——levelLose 事件的 remaining 字段，也是「只差 {n} 个啦！」的数据源 */
export function remainingCounts(
  _level: LevelConfig,
  _progress: ObjectiveProgress,
): Readonly<Record<string, number>> {
  return notImplemented('remainingCounts', 'M2');
}

/** 按剩余步数评级（level.stars.two / three） */
export function computeRating(_level: LevelConfig, _movesLeft: number): Rating {
  return notImplemented('computeRating', 'M2');
}
