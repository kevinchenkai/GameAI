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
function pieceSizeFor(availableW: number, cols: number, scale: number): number {
  return (availableW - LAYOUT.boardMarginPt * scale * 2) / cols;
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
  /**
   * ★ 设计像素 → 物理像素的倍率（见 game/ui/uiScale.ts）。
   *
   *   main.ts 按 DPR 放大了画布缓冲（否则手机上文字全糊），
   *   于是传进来的 viewportW/H 是**物理像素**。
   *   而 LAYOUT 里的 minPieceSizePt / boardMarginPt 是**设计像素**，
   *   两者必须换算到同一坐标系再比大小 ——
   *   漏乘的话，DPR=2 的手机上"最小棋子 38pt"会被当成 38 物理像素
   *   （实际只有 19 设计像素），于是**永远不会降到 7×7**，
   *   而那恰恰是这个阈值存在的意义。
   */
  scale = 1,
  /**
   * ★★ 关卡实际列数。**传了就以它为准，不再自行挑选。**
   *
   *   ⚠️ 这里曾是一个真实的 bug：本函数只按"棋子 ≥ 38pt"从
   *   `boardFallback` 里自选列数，而**完全不看关卡数据**。
   *   真机上 8 列永远满足 38pt，于是 fallback 从不触发 ——
   *   关卡明明是 7×7，棋盘却按 8 列的格子尺寸铺，
   *   结果是 **7 列 8 号格子**：右侧空一条、棋子没变大。
   *   （这正是"改 7×7 却看不出变大"的原因。）
   *
   *   列数属于**关卡数据**，不该由布局算法猜。不传时保留旧的
   *   自选行为，只为兼容既有单测。
   */
  requestedCols?: number,
): LayoutResult {
  const minPiece = LAYOUT.minPieceSizePt * scale;
  const margin = LAYOUT.boardMarginPt * scale;
  // —— 1. 扣 Safe Area ——
  const safeX = insets.left;
  const safeY = insets.top;
  const rawSafeW = Math.max(0, viewportW - insets.left - insets.right);
  const safeH = Math.max(0, viewportH - insets.top - insets.bottom);

  /**
   * ★★ 内容区限宽 + 居中 —— 电脑浏览器适配的第一步。
   *
   *   ⚠️ 原本内容区就是整个视口宽度。在 1280~1920 的窗口上，
   *   HUD 的"剩余步数"与目标计数被甩到屏幕两端相距一米远，
   *   旺财浮在正中一大片空白里 —— 就是用户说的"很乱"。
   *
   *   竖屏手机游戏在宽屏上不该拉伸铺满，正确做法是**限宽居中**，
   *   桌面上呈现为"居中的一条手机版式"。
   */
  const maxW = LAYOUT.maxContentWidthPt * scale;
  const safeW = Math.min(rawSafeW, maxW);
  /** 限宽后左右多出来的留白，整体居中 */
  const gutter = (rawSafeW - safeW) / 2;

  // —— 2~4. 选棋盘边长：棋子大小是约束，棋盘尺寸是可让步的那一方 ——
  // ★ 显式标注 number：boardFallback 是 readonly [8, 7] 元组，
  //   推断出的字面量类型会让下面的循环赋值不通过。
  let cols: number = LAYOUT.boardFallback[0];
  let pieceSizePt = pieceSizeFor(safeW, cols, scale);
  let belowMinimum = false;

  if (requestedCols !== undefined && requestedCols > 0) {
    // ★ 关卡说了算：棋子按这个列数**铺满可用宽度**。
    //   列数少 → 每格更大，这正是"改 7×7 让老人小孩看得清"的目的。
    cols = requestedCols;
    pieceSizePt = pieceSizeFor(safeW, cols, scale);
  } else {
    for (const candidate of LAYOUT.boardFallback) {
      const size = pieceSizeFor(safeW, candidate, scale);
      cols = candidate;
      pieceSizePt = size;
      if (size >= minPiece) break;
    }
  }

  if (pieceSizePt < minPiece) {
    // ★ 连最小棋盘都放不下 —— 触到硬底线，标记出来
    belowMinimum = true;
  }

  /**
   * ★★ 棋子**上限**：宽屏上棋盘不能无限放大。
   *
   *   ⚠️ 原本只有下限。实测 1920×1080 上棋子会长到 150pt
   *   （手机上 49pt），棋盘吃掉 1048px，把 HUD / 旺财 / 设置
   *   全挤成 0 高度。上限之外的宽度留白，棋盘居中即可。
   *
   *   注意这一步要在下面"高度不足再收缩"**之前**做 ——
   *   两个约束都是上限，先取小的那个，后面的收缩仍然有效。
   */
  const maxPiece = LAYOUT.maxPieceSizePt * scale;
  if (pieceSizePt > maxPiece) pieceSizePt = maxPiece;

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
  const maxBoardH = Math.max(0, safeH - margin * 2);
  let finalSide = boardSide;
  if (boardSide > maxBoardH) {
    finalSide = maxBoardH;
    pieceSizePt = cols > 0 ? finalSide / cols : 0;
    if (pieceSizePt < minPiece) belowMinimum = true;
  }

  const boardH = finalSide;
  const boardW = finalSide;

  // —— 5. 剩余高度按权重弹性分配 ——
  const leftover = Math.max(0, safeH - boardH - margin * 2);
  const { hud, pet, controls } = LAYOUT.weights;
  const totalWeight = hud + pet + controls;

  const hudH = (leftover * hud) / totalWeight;
  const petH = (leftover * pet) / totalWeight;
  const controlsH = (leftover * controls) / totalWeight;

  // —— 6. Pet 区不足 → 半身构图 ——
  const petCompact = petH < LAYOUT.petMinHeightPt * scale;

  /**
   * ★ 竖直堆叠：hud → board → pet → controls。
   *   `contentX` 已含限宽留白（gutter），**四个区块用同一个左边界**，
   *   整条版式才会作为一个整体居中 —— 只居中棋盘会让 HUD 与它错位。
   */
  const contentX = safeX + gutter;
  const boardX = contentX + (safeW - boardW) / 2;
  let cursorY = safeY;

  const hudRect: Rect = { x: contentX, y: cursorY, w: safeW, h: hudH };
  cursorY += hudH + margin;

  const boardRect: Rect = { x: boardX, y: cursorY, w: boardW, h: boardH };
  cursorY += boardH + margin;

  const petRect: Rect = { x: contentX, y: cursorY, w: safeW, h: petH };
  cursorY += petH;

  const controlsRect: Rect = { x: contentX, y: cursorY, w: safeW, h: controlsH };

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
