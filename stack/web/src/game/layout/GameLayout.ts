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
