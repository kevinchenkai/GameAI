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

export interface BoardTilePlacement {
  columnIndex: number;
  depth: number;
  x: number;
  y: number;
  isTop: boolean;
  hitArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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

/**
 * 在固定的棋盘预留区中垂直居中当前实际卡牌。
 *
 * 布局仍按关卡声明的最大深度求解，卡片尺寸与 Tray 位置不会逐步变化；
 * 这里只移动实际棋盘内容，把空白平均分到上下两侧。
 */
export function calculateCenteredBoardTop(
  layout: GameLayout,
  actualMaxDepth: number,
  spaceBeforeTray: number,
): number {
  const depth = Math.max(1, actualMaxDepth);
  const contentHeight = layout.tileSize + Math.max(0, depth - 1) * layout.rowStep;
  const boardAreaBottom = layout.trayTop - Math.max(0, spaceBeforeTray);
  const availableHeight = Math.max(0, boardAreaBottom - layout.boardTop);
  return layout.boardTop + Math.max(0, (availableHeight - contentHeight) / 2);
}

/**
 * 把每列数组末位（当前可点击 Tile）对齐在同一条公共基线，整块棋盘在预留区
 * 严格垂直居中，其余 Tile 由该基线向上生长。返回值同时包含实际命中区，
 * 渲染与测试共用同一套坐标，避免出现“画面改了但点击仍留在旧位置”的静默回归。
 */
export function calculateBottomAlignedBoardPlacements(
  layout: GameLayout,
  columnDepths: readonly number[],
  tileGap: number,
  spaceBeforeTray: number,
  hitExtension: number,
): BoardTilePlacement[] {
  const normalizedDepths = columnDepths.map((depth) => Math.max(0, Math.floor(depth)));
  const actualMaxDepth = Math.max(1, ...normalizedDepths);
  const centeredTop = calculateCenteredBoardTop(layout, actualMaxDepth, spaceBeforeTray);

  // Strictly center the current board content while keeping every column's clickable
  // tile on one shared baseline. The total slack originates earlier: calculateGameLayout
  // reserves the board region using maxDepth while trayTop stays anchored to the viewport.
  // R2-0 only redistributes that slack; recovering it would change the layout contract and
  // the six-column ground truth, so do not move trayTop from this placement helper.
  const baselineY = centeredTop + (actualMaxDepth - 1) * layout.rowStep;
  const extension = Math.max(0, hitExtension);
  const placements: BoardTilePlacement[] = [];

  normalizedDepths.forEach((columnDepth, columnIndex) => {
    const x = layout.contentLeft + columnIndex * (layout.tileSize + tileGap);
    for (let depth = 0; depth < columnDepth; depth += 1) {
      const isTop = depth === columnDepth - 1;
      const y = baselineY - (columnDepth - 1 - depth) * layout.rowStep;
      placements.push({
        columnIndex,
        depth,
        x,
        y,
        isTop,
        hitArea: {
          x: x - extension,
          y: y - extension,
          width: layout.tileSize + extension * 2,
          height: layout.tileSize + extension * 2,
        },
      });
    }
  });

  return placements;
}
