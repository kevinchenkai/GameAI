/**
 * game/input/gesture.ts —— 手势识别（纯逻辑，可在 Node 单测）
 *
 * ★ 为什么单独成文件、且不 import Phaser：
 *   手势 bug 是"手滑了但没反应""滑错了格"这类**只在真机上偶发**的问题。
 *   把判定抽成纯函数，才能用脚本枚举各种滑动轨迹去测，
 *   而不是靠人在手机上反复试。
 *
 * ★ 两种输入方式都要支持（框架 §10.2）：
 *   - **滑动**：按住 A 往 B 方向滑 —— 年轻玩家的默认习惯
 *   - **点选**：点 A 再点 B —— ★ 50+ 用户与手抖用户的救命通道
 *     （老年用户"按住拖动"的失败率远高于"点两下"）
 */

import type { Pos } from '../../core/types';
import { INPUT } from '../../config/tuning';

export type GesturePhase = 'down' | 'move' | 'up';

/** 一次指针事件（已换算到布局坐标系） */
export interface PointerSample {
  readonly phase: GesturePhase;
  readonly x: number;
  readonly y: number;
  /** 单调递增的时间戳（ms）。由调用方传入，便于测试注入 */
  readonly t: number;
}

/**
 * 识别结果。
 * ★ `null` 表示"还没识别出动作"，不是错误 —— 手势天然是渐进的。
 */
export type GestureResult =
  | { readonly kind: 'swap'; readonly a: Pos; readonly b: Pos }
  /** 点选了第一个格子（等待第二次点击）。UI 应给出选中反馈 */
  | { readonly kind: 'select'; readonly pos: Pos }
  /** 取消选中（点了同一格，或点到棋盘外） */
  | { readonly kind: 'deselect' }
  | null;

/** 手势识别器的内部状态。★ 不可变 —— 便于测试与回放 */
export interface GestureState {
  /** 按下时所在的格子（滑动判定的起点） */
  readonly downCell: Pos | null;
  readonly downX: number;
  readonly downY: number;
  readonly downT: number;
  /** 点选模式下已选中的格子 */
  readonly selected: Pos | null;
  /** 本次按下已经产生过 swap —— 防止一次滑动触发多次 */
  readonly consumed: boolean;
}

export function createGestureState(): GestureState {
  return { downCell: null, downX: 0, downY: 0, downT: 0, selected: null, consumed: false };
}

const samePos = (a: Pos, b: Pos): boolean => a.col === b.col && a.row === b.row;

const isAdjacent = (a: Pos, b: Pos): boolean =>
  Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;

/**
 * ★ 把滑动方向**吸附到四个正交方向**。
 *   斜着滑是常态（尤其手抖用户），按 |dx| vs |dy| 取主轴，
 *   而不是要求玩家滑出精确的水平/垂直线。
 */
function dominantDirection(dx: number, dy: number): { dc: number; dr: number } {
  return Math.abs(dx) >= Math.abs(dy)
    ? { dc: dx > 0 ? 1 : -1, dr: 0 }
    : { dc: 0, dr: dy > 0 ? 1 : -1 };
}

export interface GestureStep {
  readonly state: GestureState;
  readonly result: GestureResult;
}

/**
 * 推进一步手势识别。
 *
 * @param cellOf 像素 → 格子（由 layout.cellAtPoint 提供）。棋盘外返回 null
 * @param inBounds 格子是否可交互（洞、空格返回 false）
 */
export function stepGesture(
  state: GestureState,
  sample: PointerSample,
  cellOf: (x: number, y: number) => Pos | null,
  inBounds: (p: Pos) => boolean,
): GestureStep {
  const cell = cellOf(sample.x, sample.y);

  // ——————————————— 按下 ———————————————
  if (sample.phase === 'down') {
    return {
      state: {
        ...state,
        downCell: cell,
        downX: sample.x,
        downY: sample.y,
        downT: sample.t,
        consumed: false,
      },
      result: null,
    };
  }

  // ——————————————— 移动中：滑动判定 ———————————————
  if (sample.phase === 'move') {
    const from = state.downCell;
    if (from === null || state.consumed || !inBounds(from)) return { state, result: null };

    const dx = sample.x - state.downX;
    const dy = sample.y - state.downY;
    // ★ 阈值以**格子边长的比例**表达，不是固定像素 ——
    //   否则同一份手感在大屏上过灵敏、小屏上滑不动。
    if (Math.hypot(dx, dy) < INPUT.swipeThresholdRatio * INPUT.referenceCellPt) {
      return { state, result: null };
    }

    const { dc, dr } = dominantDirection(dx, dy);
    const to: Pos = { col: from.col + dc, row: from.row + dr };
    if (!inBounds(to)) return { state, result: null };

    return {
      // ★ consumed：一次按下只产出一次 swap。
      //   否则玩家滑一条长线会连续触发多次交换。
      //   同时清掉 selected —— 滑动优先，避免两种模式打架。
      state: { ...state, consumed: true, selected: null },
      result: { kind: 'swap', a: from, b: to },
    };
  }

  // ——————————————— 抬起：点选判定 ———————————————
  const from = state.downCell;
  const released: GestureState = { ...state, downCell: null };

  // 滑动已经处理过了，抬起不再产生动作
  if (state.consumed) return { state: { ...released, consumed: false }, result: null };

  // 位移过大 → 是一次失败的滑动，不是点击
  const moved = Math.hypot(sample.x - state.downX, sample.y - state.downY);
  const isTap =
    from !== null &&
    cell !== null &&
    samePos(from, cell) &&
    moved < INPUT.tapMaxMovePt &&
    sample.t - state.downT <= INPUT.tapMaxDurationMs;

  if (!isTap) {
    // 点到棋盘外 → 取消当前选中（给玩家一个"反悔"的出口）
    if (cell === null && state.selected !== null) {
      return { state: { ...released, selected: null }, result: { kind: 'deselect' } };
    }
    return { state: released, result: null };
  }

  if (!inBounds(cell)) return { state: released, result: null };

  const prev = state.selected;

  // 第一次点：选中
  if (prev === null) {
    return { state: { ...released, selected: cell }, result: { kind: 'select', pos: cell } };
  }

  // 点同一格：取消
  if (samePos(prev, cell)) {
    return { state: { ...released, selected: null }, result: { kind: 'deselect' } };
  }

  // 点相邻格：交换
  if (isAdjacent(prev, cell)) {
    return { state: { ...released, selected: null }, result: { kind: 'swap', a: prev, b: cell } };
  }

  // ★ 点了不相邻的格子 → **改选新格**，而不是报错或忽略。
  //   老年用户点错位置是常态，让他直接重选比"必须先取消"友好得多。
  return { state: { ...released, selected: cell }, result: { kind: 'select', pos: cell } };
}
