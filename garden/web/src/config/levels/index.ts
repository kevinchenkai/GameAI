/**
 * config/levels/index.ts —— 关卡注册表
 *
 * ★ 关卡是**纯数据**。加一关 = 加一个文件 + 在这里注册，零代码改动。
 *   这样 Codex 可以直接产出关卡配置，我不需要介入。
 *
 * ★ 所有关卡必须过 validateLevelConfig()，且校验纳入 `npm test`
 *   （tests/core/levels.test.ts）。非法关卡**报错中止，不静默失败**。
 *
 * Stage 0 = 8 关。
 *
 * ★ 降难度的第一手段是**减颜色数**，不是减步数：
 *   4 色棋盘比 6 色容易得多，且玩家感知是"这关运气好"而不是"这关简单"。
 *   前 5 关 4 色，第 6~15 关 5 色，之后 6 色。
 */

import type { LevelConfig } from '../../core/types';

// M7 时逐关补齐。此处保持空数组而不是占位假数据——
// 假关卡会让 validateLevels 报出没意义的错，掩盖真问题。
export const LEVELS: readonly LevelConfig[] = [];

export function getLevel(id: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.id === id);
}

export const STAGE0_LEVEL_COUNT = 8;
