/**
 * game/render/layout.ts —— 布局算法（框架 §10.1）
 *
 * ★ **布局是算法，不是固定百分比**。
 *   硬编码百分比会在小屏上把棋子挤到不可用。
 *   实现反过来：**先保证棋子尺寸，再分配剩余空间**。
 *
 * ★ 本文件**不 import Phaser** —— 纯函数，可在 Node 里单测。
 *   这不是契约要求（契约 1 只管 core/ 与 config/），是我自己的选择：
 *   布局 bug 只在特定屏幕尺寸下出现，能脚本化枚举屏幕尺寸才测得动。
 */

import { LAYOUT } from '../../config/tuning';

export interface SafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface LayoutResult {
  readonly boardCols: number;
  readonly boardRows: number;
  readonly pieceSizePt: number;
  readonly boardRect: Rect;
  readonly hudRect: Rect;
  readonly petRect: Rect;
  readonly controlsRect: Rect;
  /** Pet 区高度不足时改用「半身」构图 */
  readonly petCompact: boolean;
  /**
   * ★ 连 7×7 都放不下最小棋子 —— 已经触到硬底线。
   *   此时仍返回一个可用布局（棋子会小于 minPieceSizePt），
   *   但**显式标记出来**，而不是静默交付一个不可用的棋盘。
   */
  readonly belowMinimum: boolean;
}

const EMPTY: Rect = { x: 0, y: 0, w: 0, h: 0 };

/**
 * ★ 步骤 3：由可用宽度推导棋子边长。
 *   棋盘两侧各留 boardMarginPt，棋子是正方形。
 */
function pieceSizeFor(availableW: number, cols: number): number {
  return (availableW - LAYOUT.boardMarginPt * 2) / cols;
}

/**
 * 计算布局。
 *
 * 步骤（LAYOUT 常量见 config/tuning.ts）：
 *   1. 扣掉 Safe Area（刘海、Home Indicator、浏览器地址栏）
 *   2. 算水平可用宽度
 *   3. 由宽度推导棋子边长
 *   4. ★ 校验棋子 ≥ minPieceSizePt，不满足 → 降 8×8 → 7×7
 *      （**而不是继续缩小棋子**）
 *   5. 剩余高度按 hud : pet : controls 权重弹性分配
 *   6. Pet 区不足 petMinHeightPt 则 petCompact = true
 */
export function computeLayout(
  viewportW: number,
  viewportH: number,
  insets: SafeAreaInsets,
): LayoutResult {
  // —— 1. 扣 Safe Area ——
  const safeX = insets.left;
  const safeY = insets.top;
  const safeW = Math.max(0, viewportW - insets.left - insets.right);
  const safeH = Math.max(0, viewportH - insets.top - insets.bottom);

  // —— 2~4. 选棋盘边长：棋子大小是约束，棋盘尺寸是可让步的那一方 ——
  // ★ 显式标注 number：boardFallback 是 readonly [8, 7] 元组，
  //   推断出的字面量类型会让下面的循环赋值不通过。
  let cols: number = LAYOUT.boardFallback[0];
  let pieceSizePt = pieceSizeFor(safeW, cols);
  let belowMinimum = false;

  for (const candidate of LAYOUT.boardFallback) {
    const size = pieceSizeFor(safeW, candidate);
    cols = candidate;
    pieceSizePt = size;
    if (size >= LAYOUT.minPieceSizePt) break;
  }

  if (pieceSizePt < LAYOUT.minPieceSizePt) {
    // ★ 连最小棋盘都放不下 —— 触到硬底线，标记出来
    belowMinimum = true;
  }

  /**
   * ★ 尺寸绝不允许为负。
   *
   *   视口极小（或 Phaser 还没量到容器，scale 报 0×0）时，
   *   `可用宽度 - 边距×2` 会变成负数，棋子边长跟着变负 ——
   *   棋盘会以负尺寸画出来，表现是**整个棋盘不见了，且没有任何报错**。
   *   （M4 实测遇到过：scale 报 0×0，算出 pieceSizePt = -4.57。）
   *
   *   钳到 0 而不是抛错：视口为 0 是**暂态**（转屏、地址栏收起、
   *   容器还没布局完），下一帧 resize 就会给出正确尺寸。
   *   这时候崩掉比画不出来更糟。belowMinimum 已经把异常标出来了。
   */
  if (!Number.isFinite(pieceSizePt) || pieceSizePt < 0) {
    pieceSizePt = 0;
    belowMinimum = true;
  }

  const rows = cols; // 正方形棋盘
  const boardSide = pieceSizePt * cols;

  // —— 高度不足时，棋盘还要再让一步 ——
  // 宽度够但高度不够（横屏、或极扁的窗口）时，棋盘按高度收缩，
  // 否则棋盘会溢出屏幕。棋子随之变小，同样计入 belowMinimum。
  // ★ 高度不足以容纳任何棋盘时，`maxBoardH` 会 ≤ 0 ——
  //   此时钳到 0（而不是跳过收缩），否则棋盘会以"满宽 × 无高度"画出去。
  const maxBoardH = Math.max(0, safeH - LAYOUT.boardMarginPt * 2);
  let finalSide = boardSide;
  if (boardSide > maxBoardH) {
    finalSide = maxBoardH;
    pieceSizePt = cols > 0 ? finalSide / cols : 0;
    if (pieceSizePt < LAYOUT.minPieceSizePt) belowMinimum = true;
  }

  const boardH = finalSide;
  const boardW = finalSide;

  // —— 5. 剩余高度按权重弹性分配 ——
  const leftover = Math.max(0, safeH - boardH - LAYOUT.boardMarginPt * 2);
  const { hud, pet, controls } = LAYOUT.weights;
  const totalWeight = hud + pet + controls;

  const hudH = (leftover * hud) / totalWeight;
  const petH = (leftover * pet) / totalWeight;
  const controlsH = (leftover * controls) / totalWeight;

  // —— 6. Pet 区不足 → 半身构图 ——
  const petCompact = petH < LAYOUT.petMinHeightPt;

  // —— 竖直堆叠：hud → board → pet → controls ——
  const boardX = safeX + (safeW - boardW) / 2;
  let cursorY = safeY;

  const hudRect: Rect = { x: safeX, y: cursorY, w: safeW, h: hudH };
  cursorY += hudH + LAYOUT.boardMarginPt;

  const boardRect: Rect = { x: boardX, y: cursorY, w: boardW, h: boardH };
  cursorY += boardH + LAYOUT.boardMarginPt;

  const petRect: Rect = { x: safeX, y: cursorY, w: safeW, h: petH };
  cursorY += petH;

  const controlsRect: Rect = { x: safeX, y: cursorY, w: safeW, h: controlsH };

  return {
    boardCols: cols,
    boardRows: rows,
    pieceSizePt,
    boardRect,
    hudRect,
    petRect,
    controlsRect,
    petCompact,
    belowMinimum,
  };
}

/**
 * 格子中心的像素坐标。
 *
 * ★ 渲染层与输入层**共用这一个函数**（正反变换必须来自同一处），
 *   否则"看到的位置"与"点到的位置"会缓慢漂移。
 */
export function cellCenter(layout: LayoutResult, col: number, row: number): { x: number; y: number } {
  const s = layout.pieceSizePt;
  return {
    x: layout.boardRect.x + col * s + s / 2,
    y: layout.boardRect.y + row * s + s / 2,
  };
}

/**
 * 像素坐标 → 格子。棋盘外返回 null。
 *
 * ★ 与 cellCenter 互为逆变换 —— 单测锁死这一点。
 */
export function cellAtPoint(
  layout: LayoutResult,
  x: number,
  y: number,
): { col: number; row: number } | null {
  const s = layout.pieceSizePt;
  if (s <= 0) return null;
  const col = Math.floor((x - layout.boardRect.x) / s);
  const row = Math.floor((y - layout.boardRect.y) / s);
  if (col < 0 || row < 0 || col >= layout.boardCols || row >= layout.boardRows) return null;
  return { col, row };
}

export { EMPTY as EMPTY_RECT };
