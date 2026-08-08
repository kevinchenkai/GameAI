/**
 * game/render/EventPlayer.ts —— CoreGameEvent[] → Phaser Timeline（M0 骨架，实现见 M4）
 *
 * ★ 渲染层**不维护自己的棋盘状态**，只按事件序列播动画（冻结契约：
 *   事件序列是唯一真相源）。想知道某格现在是什么，问 core，不要自己记。
 *
 * ★ 时长一律 = TIMING.x * TEMPO[current]（config/tuning.ts），
 *   不在这里写死数字。
 *
 * ★ 播放结束**不解锁输入** —— 输入归 TurnController 管（冻结契约 7）。
 */

import type { CoreGameEvent } from '../../core/types';

export interface EventPlayer {
  /** 播放一整段序列，resolve 时棋盘动画已结束（≠ 可输入） */
  play(events: readonly CoreGameEvent[]): Promise<void>;
  /** 整段剩余时长（ms），供输入缓存窗口判断 */
  remainingMs(): number;
  skipAll(): void;
}
