/**
 * game/render/layout.ts —— 布局算法（M0 骨架，实现见 M4）
 *
 * ★ **布局是算法，不是固定百分比**（框架 §10.1）。
 *   硬编码百分比会在小屏上把棋子挤到不可用。
 *   实现必须反过来：**先保证棋子尺寸，再分配剩余空间**。
 */

import { notImplemented } from '../../core/notImplemented';

export interface SafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface LayoutResult {
  readonly boardCols: number;
  readonly boardRows: number;
  readonly pieceSizePt: number;
  readonly boardRect: { x: number; y: number; w: number; h: number };
  readonly hudRect: { x: number; y: number; w: number; h: number };
  readonly petRect: { x: number; y: number; w: number; h: number };
  readonly controlsRect: { x: number; y: number; w: number; h: number };
  /** Pet 区高度不足时改用「半身」构图 */
  readonly petCompact: boolean;
}

/**
 * 步骤（LAYOUT 常量见 config/tuning.ts）：
 *   1. 读 Safe Area（刘海、Home Indicator、浏览器地址栏）
 *   2. 算水平可用宽度
 *   3. 由宽度推导最大棋盘边长（正方形）
 *   4. ★ 校验棋子 ≥ minPieceSizePt，不满足 → 降 8×8 → 7×7
 *      （**而不是继续缩小棋子**）
 *   5. 剩余高度按 hud : pet : controls 权重弹性分配
 *   6. Pet 区不足 petMinHeightPt 则 petCompact = true
 */
export function computeLayout(
  _viewportW: number,
  _viewportH: number,
  _insets: SafeAreaInsets,
): LayoutResult {
  return notImplemented('computeLayout', 'M4');
}
