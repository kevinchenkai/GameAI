/**
 * core/validateLevel.ts —— 关卡 Schema 校验（M0 骨架，实现见 M3）
 *
 * ★ 为什么必须有（框架 §11.2）：关卡未来会由 AI 批量生成，
 *   **TypeScript 类型只能保证结构，保证不了语义**——一个 blocked 坐标越界、
 *   或障碍放在洞里，类型检查全过，运行时才炸。
 *
 * ★ 校验纳入 `npm test`。非法关卡数据必须**报错中止，不静默失败**。
 */

import type { LevelConfig } from './types';
import { notImplemented } from './notImplemented';

export interface ValidationIssue {
  readonly code: ValidationCode;
  readonly message: string;
  readonly path?: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

/**
 * 必查项清单（框架 §11.2 表）。列成枚举而不是散在实现里，
 * 是为了让"漏了哪一条"一眼可查。
 */
export type ValidationCode =
  | 'BOARD_SIZE' //           cols/rows 在允许范围
  | 'POS_OUT_OF_BOUNDS' //    所有坐标在棋盘内
  | 'BLOCKED_DUPLICATE' //    blocked 去重
  | 'OBSTACLE_ILLEGAL' //     不在 blocked 格上、不重叠
  | 'OBJECTIVE_UNREACHABLE' // ★ 最重要：收集目标的颜色必须在 colors 里
  | 'STARS_THRESHOLD' //      three > two，且 two < moves
  | 'COLORS_COUNT' //         ≥3（少于 3 色无法形成有意义的匹配）
  | 'TUTORIAL_REF' //         引用的步骤/坐标存在
  | 'INITIAL_AUTO_MATCH' //   开局不自动 Match
  | 'INITIAL_NO_MOVE'; //     开局存在合法 Move

export const BOARD_LIMITS = { minCols: 5, maxCols: 9, minRows: 5, maxRows: 9 } as const;
export const MIN_COLORS = 3;

/**
 * ★ `OBJECTIVE_UNREACHABLE` 是全部检查里最重要的一条：
 *   它挡住"要求收集蓝莓、但本关颜色池里没有蓝莓"这种致命配置错误。
 *   人工审阅极易漏过，但对玩家是灾难——永远打不过。
 */
export function validateLevelConfig(_level: LevelConfig): ValidationResult {
  return notImplemented('validateLevelConfig', 'M3');
}

/** 抛错版本，供 npm test / 启动时使用——不静默失败 */
export function assertValidLevel(level: LevelConfig): void {
  const result = validateLevelConfig(level);
  if (!result.ok) {
    const detail = result.errors.map((e) => `[${e.code}] ${e.message}`).join('\n  ');
    throw new Error(`关卡 ${level.id} 校验未通过：\n  ${detail}`);
  }
}
