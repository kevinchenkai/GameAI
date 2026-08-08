/**
 * game/ui/hudModel.ts —— HUD 要显示什么（纯逻辑，零 Phaser）
 *
 * ★ 把"显示什么"与"怎么画"拆开：
 *   前者是可以断言的（还剩几步、目标完成没有、要不要告警），
 *   后者只能靠眼睛。拆开之后，容易错的那一半能进单测。
 *
 * ★ 本文件不 import Phaser，规则同 render/layout.ts。
 */

import { objectiveKey, remainingCounts } from '../../core/objective';
import type { LevelConfig, Objective, ObstacleKind, PieceColor } from '../../core/types';
import type { ObjectiveProgress } from '../../core/objective';

/** 步数告警阈值 —— 到这个数就该提醒了 */
export const MOVES_WARN_AT = 5;

export interface ObjectiveView {
  readonly key: string;
  readonly kind: Objective['kind'];
  /** collect 类才有颜色，用来取棋子贴图 */
  readonly color: PieceColor | null;
  /**
   * 破障类的障碍种类，用来取对应贴图。
   * ★ 保留原值而不是在这里直接决定贴图：Stage 0 只有冰，但 ObstacleKind
   *   是开放类型，把"障碍 → 冰贴图"写死会在加木箱时**静默画错**。
   */
  readonly obstacle: ObstacleKind | null;
  readonly need: number;
  readonly done: number;
  readonly remaining: number;
  readonly complete: boolean;
}

export interface HudModel {
  readonly movesLeft: number;
  /**
   * ★ 步数吃紧。
   *   ⚠️ 这**不是**用来吓唬人的 —— 低压力定位下它只改变颜色，
   *   不做闪烁、不加音效、不弹提示。50+ 用户对"红色闪烁"的反应是紧张，
   *   而紧张恰恰是本项目要避免的东西。
   */
  readonly movesLow: boolean;
  readonly objectives: readonly ObjectiveView[];
  readonly allComplete: boolean;
}

function colorOf(o: Objective): PieceColor | null {
  return o.kind === 'collect' ? o.piece : null;
}

function obstacleOf(o: Objective): ObstacleKind | null {
  return o.kind === 'clearObstacle' ? o.obstacle : null;
}

function needOf(o: Objective): number {
  return o.count;
}

/**
 * 由关卡 + 进度算出 HUD 该显示的内容。
 *
 * ★ `done` 用 `need - remaining` 反推，而不是直接读 progress：
 *   progress 会**超额累计**（一次连锁消掉 7 个，目标只要 5 个，
 *   progress 记的是 7）。直接显示会出现「7/5」这种读起来像出错的东西。
 */
export function buildHudView(
  level: LevelConfig,
  progress: ObjectiveProgress,
  movesLeft: number,
): HudModel {
  const remaining = remainingCounts(level, progress);

  const objectives = level.objectives.map((o): ObjectiveView => {
    const key = objectiveKey(o);
    const need = needOf(o);
    const rem = remaining[key] ?? need;
    return {
      key,
      kind: o.kind,
      color: colorOf(o),
      obstacle: obstacleOf(o),
      need,
      done: need - rem,
      remaining: rem,
      complete: rem === 0,
    };
  });

  return {
    movesLeft,
    movesLow: movesLeft <= MOVES_WARN_AT,
    objectives,
    allComplete: objectives.every((o) => o.complete),
  };
}
