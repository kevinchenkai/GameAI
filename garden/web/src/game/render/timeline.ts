/**
 * game/render/timeline.ts —— 事件序列 → 时间轴（纯逻辑，可在 Node 单测）
 *
 * ★ 为什么把"排期"从"播放"里拆出来：
 *   `EventPlayer` 必须碰 Phaser（建 Tween、动精灵），因而不可单测。
 *   但**「哪个事件在第几毫秒播、整段多长」是纯算术**，
 *   而这恰恰是输入缓存窗口（INPUT_BUFFER.openBeforeEndMs）依赖的数字。
 *   算错了，缓存窗口就会开在错误的时刻 —— 那是很难在真机上定位的 bug。
 *
 * ★ 时长一律 = TIMING.x × TEMPO[current]，本文件不写死任何数字。
 */

import type { CoreGameEvent } from '../../core/types';
import { TEMPO, TIMING, type Tempo } from '../../config/tuning';

/** 一个事件在时间轴上的排期 */
export interface ScheduledEvent {
  readonly event: CoreGameEvent;
  /** 相对整段开头的偏移（ms） */
  readonly atMs: number;
  /** 本事件自身的动画时长（ms） */
  readonly durationMs: number;
}

export interface Timeline {
  readonly items: readonly ScheduledEvent[];
  /** 整段总时长（ms） */
  readonly totalMs: number;
}

/** 一个事件占多长时间（未乘节奏系数） */
function baseDuration(e: CoreGameEvent): number {
  switch (e.t) {
    case 'swap':
      return TIMING.swap;
    case 'swapBack':
      // 弹回 = 换过去再换回来
      return TIMING.swap * 2;
    case 'match':
      return TIMING.matchPop;
    case 'specialFire':
    case 'comboBlast':
      return TIMING.specialFire;
    case 'fall': {
      // ★ 下落时长取**最长的那一列**，不是每格累加 ——
      //   所有棋子是同时落的。
      let maxRows = 0;
      for (const m of e.moves) maxRows = Math.max(maxRows, m.to.row - m.from.row);
      return maxRows * TIMING.fallPerRow;
    }
    case 'spawn':
      // 新棋子从盘外落入，按一格计
      return TIMING.fallPerRow;
    case 'cascadeEnd':
      return TIMING.cascadeGap;
    case 'shuffle':
      return TIMING.matchPop * 2;
    // —— 以下是**瞬时标记**，不占时间 ——
    case 'specialSpawn':
    case 'obstacleHit':
    case 'obstacleClear':
    case 'collect':
    case 'cascadeStart':
    case 'settled':
    case 'movesChanged':
    case 'levelWin':
    case 'levelLose':
    case 'turnResolved':
      return 0;
  }
}

/**
 * ★ 哪些事件与**前一个事件并行**播放（不推进时间游标）。
 *
 *   典型例子：`match` 与它触发的 `obstacleHit`、`collect` 必须同时发生 ——
 *   玩家看到的是"消除的同时冰裂了"，不是"消除完，停一下，冰再裂"。
 *   后者会让每一步都拖长，在低压力定位下尤其致命。
 */
function isParallelWithPrevious(e: CoreGameEvent): boolean {
  switch (e.t) {
    case 'obstacleHit':
    case 'obstacleClear':
    case 'collect':
    case 'specialSpawn':
      return true;
    default:
      return false;
  }
}

/**
 * 把事件序列排到时间轴上。
 *
 * ★ 纯函数：同样的输入永远得到同样的时间轴 —— 单测才锁得住。
 */
export function buildTimeline(events: readonly CoreGameEvent[], tempo: Tempo): Timeline {
  const scale = TEMPO[tempo];
  const items: ScheduledEvent[] = [];

  let cursor = 0;
  let previousEnd = 0;

  for (const event of events) {
    const durationMs = baseDuration(event) * scale;
    const parallel = isParallelWithPrevious(event);
    // 并行事件与**前一个事件同时开始**，故回到 previousEnd
    const atMs = parallel ? previousEnd : cursor;

    items.push({ event, atMs, durationMs });

    if (parallel) {
      // 并行事件可能比主事件长，整段要能容纳它
      cursor = Math.max(cursor, atMs + durationMs);
    } else {
      previousEnd = cursor;
      cursor += durationMs;
    }
  }

  return { items, totalMs: cursor };
}

/**
 * ★ 输入缓存窗口是否已开启。
 *
 *   窗口只在整段最后 INPUT_BUFFER.openBeforeEndMs 内开放（config/tuning.ts），
 *   理由是**坐标语义漂移**：玩家在 Cascade 中途看到的棋盘不是结算后的棋盘，
 *   他对着一个正在下落的位置滑动，缓存执行时换的可能是完全不同的两个棋子。
 *
 * ⚠️ 开着窗口 ≠ 可以执行。缓存的 Move 只在 READY_FOR_INPUT 兑现，
 *   且兑现前必须重新验证合法性（冻结契约 7）。
 */
export function isBufferWindowOpen(timeline: Timeline, elapsedMs: number, openBeforeEndMs: number): boolean {
  return timeline.totalMs - elapsedMs <= openBeforeEndMs;
}
