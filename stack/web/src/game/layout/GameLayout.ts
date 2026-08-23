import { LAYOUT } from '../config/layout';

export interface GameLayout {
  viewportWidth: number;
  viewportHeight: number;
  contentLeft: number;
  contentWidth: number;
  headerTop: number;
  headerHeight: number;
  boardTop: number;
  boardBottom: number;
  tileSize: number;
  rowStep: number;
  overlapRatio: number;
  trayTop: number;
  traySlotSize: number;
  toolsTop: number;
  toolButtonSize: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateGameLayout(
  viewportWidth: number,
  viewportHeight: number,
  columnCount: number,
  maxDepth: number,
  requestedOverlapRatio: number = LAYOUT.overlapRatio,
): GameLayout {
  const contentWidth = Math.min(
    LAYOUT.maxContentWidth - LAYOUT.contentPadding * 2,
    viewportWidth - LAYOUT.contentPadding * 2,
  );
  const contentLeft = (viewportWidth - contentWidth) / 2;
  const horizontalTileSize =
    (contentWidth - (columnCount - 1) * LAYOUT.tileGap) / columnCount;
  const traySlotSize = (contentWidth - 6 * LAYOUT.trayGap) / 7;
  const toolButtonSize = Math.max(LAYOUT.toolButtonMinSize, Math.min(52, traySlotSize + 4));
  const toolsTop = viewportHeight - LAYOUT.contentPadding - toolButtonSize;
  const trayTop = toolsTop - LAYOUT.sectionGap - traySlotSize;
  const headerTop = LAYOUT.contentPadding;
  const headerHeight = Math.max(LAYOUT.headerMinHeight, viewportHeight * 0.1);
  const boardTop = headerTop + headerHeight;
  const boardAvailable = trayTop - LAYOUT.trayLabelOffset - LAYOUT.sectionGap - boardTop;
  const verticalDenominator = 1 + Math.max(0, maxDepth - 1) * requestedOverlapRatio;
  const verticalTileSize = boardAvailable / verticalDenominator;
  const tileSize = clamp(
    Math.min(horizontalTileSize, verticalTileSize),
    LAYOUT.tileSizeMin,
    LAYOUT.tileSizeMax,
  );
  const maxRowStep = maxDepth > 1 ? (boardAvailable - tileSize) / (maxDepth - 1) : tileSize;
  const desiredRowStep = tileSize * requestedOverlapRatio;
  const minimumRowStep = Math.min(tileSize * LAYOUT.overlapRatioMin, maxRowStep);
  const rowStep = maxDepth > 1
    ? Math.max(0, Math.max(minimumRowStep, Math.min(desiredRowStep, maxRowStep)))
    : tileSize;
  const overlapRatio = rowStep / tileSize;
  const boardBottom = boardTop + tileSize + Math.max(0, maxDepth - 1) * rowStep;

  return {
    viewportWidth,
    viewportHeight,
    contentLeft,
    contentWidth,
    headerTop,
    headerHeight,
    boardTop,
    boardBottom,
    tileSize,
    rowStep,
    overlapRatio,
    trayTop,
    traySlotSize,
    toolsTop,
    toolButtonSize,
  };
}

export function isDesktopViewport(width: number, height: number, hasFinePointer: boolean): boolean {
  return width >= LAYOUT.desktopMinWidth && height >= LAYOUT.desktopMinHeight && hasFinePointer;
}

export function isLandscapePhone(width: number, height: number, hasFinePointer: boolean): boolean {
  return width > height && !hasFinePointer;
}

/**
 * 把按 CSS 像素算出的布局整体放大到物理像素。
 *
 * ★ 为什么不直接把物理像素喂给 calculateGameLayout：
 *   那样它会以为视口变大了，排出「更大的棋盘」而非「更清晰的棋盘」，
 *   且 tileSize 会撞上 tileSizeMax 上限。先按设计尺寸求解、再等比放大，
 *   布局比例与设计稿完全一致，calculateGameLayout 及其单测也无需改动。
 *
 * `overlapRatio` 是比值，放大时保持不变。
 */
export function scaleLayout(layout: GameLayout, scale: number): GameLayout {
  if (scale === 1) return layout;
  return {
    viewportWidth: layout.viewportWidth * scale,
    viewportHeight: layout.viewportHeight * scale,
    contentLeft: layout.contentLeft * scale,
    contentWidth: layout.contentWidth * scale,
    headerTop: layout.headerTop * scale,
    headerHeight: layout.headerHeight * scale,
    boardTop: layout.boardTop * scale,
    boardBottom: layout.boardBottom * scale,
    tileSize: layout.tileSize * scale,
    rowStep: layout.rowStep * scale,
    overlapRatio: layout.overlapRatio,
    trayTop: layout.trayTop * scale,
    traySlotSize: layout.traySlotSize * scale,
    toolsTop: layout.toolsTop * scale,
    toolButtonSize: layout.toolButtonSize * scale,
  };
}
