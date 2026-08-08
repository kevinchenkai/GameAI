/**
 * core/objective.ts —— 关卡目标判定
 */

import type { CoreGameEvent, LevelConfig, Objective, Rating } from './types';

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

/**
 * 从一段事件里累计目标进度。
 *
 * ★ 只认**事件**，不看棋盘 —— 事件序列是唯一真相源（框架 §2.3）。
 *   若改成"结算前后对比棋盘"，就会与渲染层的事件播放脱节，
 *   出现"画面消了 5 个、目标只算了 3 个"这类对不上的 bug。
 */
export function accumulateProgress(
  level: LevelConfig,
  progress: ObjectiveProgress,
  events: readonly CoreGameEvent[],
): ObjectiveProgress {
  const next: Record<string, number> = { ...progress };
  const bump = (key: string, n: number): void => {
    if (!level.objectives.some((o) => objectiveKey(o) === key)) return; // 非本关目标，忽略
    next[key] = (next[key] ?? 0) + n;
  };

  for (const e of events) {
    switch (e.t) {
      case 'match':
        // 收集类：按颜色计数。
        // ★ 特殊棋子炸掉的棋子不走 match 事件，走 specialFire —— 见下。
        bump(`collect:${e.color}`, e.positions.length);
        break;
      case 'obstacleClear':
        bump(`clearObstacle:${e.kind}`, 1);
        break;
      case 'collect':
        // dropDown 类（掉落物到底）由 resolver 显式产出
        bump(`dropDown:${e.target}`, e.count);
        break;
      default:
        break;
    }
  }
  return next;
}

/** 某个目标还差多少（≥0） */
function remainingOf(o: Objective, progress: ObjectiveProgress): number {
  return Math.max(0, o.count - (progress[objectiveKey(o)] ?? 0));
}

export function isAllComplete(level: LevelConfig, progress: ObjectiveProgress): boolean {
  return level.objectives.every((o) => remainingOf(o, progress) === 0);
}

/**
 * 各目标还差多少。
 * ★ 这是 levelLose 事件的 remaining 字段，也是宠物台词
 *   「只差 {n} 个啦！」的数据源（config/pet.ts）——
 *   失败文案永远指向"还差多少"，不指向"你失败了"。
 */
export function remainingCounts(
  level: LevelConfig,
  progress: ObjectiveProgress,
): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const o of level.objectives) {
    out[objectiveKey(o)] = remainingOf(o, progress);
  }
  return out;
}

/**
 * 按剩余步数评级。
 *
 * ★ 评级只看剩余步数，不看分数 —— 本项目没有分数系统（策划案的低压力定位）。
 *   `stars.three > stars.two` 由关卡 Schema 校验保证（validateLevel.ts）。
 */
export function computeRating(level: LevelConfig, movesLeft: number): Rating {
  if (movesLeft >= level.stars.three) return 3;
  if (movesLeft >= level.stars.two) return 2;
  return 1;
}
