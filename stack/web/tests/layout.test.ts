import { describe, expect, it } from 'vitest';
import { LAYOUT } from '../src/game/config/layout';
import {
  calculateBottomAlignedBoardPlacements,
  calculateCenteredBoardTop,
  calculateGameLayout,
  isDesktopViewport,
  isLandscapePhone,
} from '../src/game/layout/GameLayout';
import { hitTestTopTile, type TileHitArea } from '../src/game/layout/hitTest';

const MOBILE_VIEWPORTS = [
  [375, 812],
  [390, 844],
  [430, 932],
  [360, 800],
] as const;

describe('responsive layout', () => {
  it.each(MOBILE_VIEWPORTS)('%d×%d 下六列与深度 12 不溢出', (width, height) => {
    const layout = calculateGameLayout(width, height, 6, 12);
    const boardWidth = layout.tileSize * 6 + LAYOUT.tileGap * 5;
    expect(layout.tileSize).toBeGreaterThanOrEqual(LAYOUT.tileSizeMin);
    expect(layout.tileSize).toBeLessThanOrEqual(LAYOUT.tileSizeMax);
    expect(layout.contentLeft + boardWidth).toBeLessThanOrEqual(width - LAYOUT.contentPadding);
    expect(layout.boardBottom).toBeLessThanOrEqual(
      layout.trayTop - LAYOUT.trayLabelOffset - LAYOUT.sectionGap + 0.01,
    );
  });

  it.each(LAYOUT.overlapCandidates)('支持 overlap=%s 的对比档', (ratio) => {
    const layout = calculateGameLayout(375, 812, 6, 10, ratio);
    expect(layout.overlapRatio).toBeCloseTo(ratio, 4);
  });

  it('桌面容器保持 480px 内且 700px 高时深度 12 不遮挡 Tray', () => {
    const layout = calculateGameLayout(480, 700, 6, 12);
    expect(layout.contentWidth).toBeLessThanOrEqual(LAYOUT.maxContentWidth);
    expect(layout.traySlotSize).toBeGreaterThanOrEqual(LAYOUT.toolButtonMinSize);
    expect(layout.boardBottom).toBeLessThanOrEqual(
      layout.trayTop - LAYOUT.trayLabelOffset - LAYOUT.sectionGap + 0.01,
    );
  });

  it('桌面判定必须同时满足宽、高与 fine pointer', () => {
    expect(isDesktopViewport(1920, 1080, true)).toBe(true);
    expect(isDesktopViewport(896, 414, false)).toBe(false);
    expect(isDesktopViewport(1280, 700, false)).toBe(false);
  });

  it('896×414 触屏走横屏手机提示，桌面不走', () => {
    expect(isLandscapePhone(896, 414, false)).toBe(true);
    expect(isLandscapePhone(1920, 1080, true)).toBe(false);
  });

  it('重叠命中从最顶层开始', () => {
    const areas: readonly TileHitArea[] = [
      { tileId: 'bottom', columnIndex: 0, depth: 0, x: 0, y: 0, width: 50, height: 50 },
      { tileId: 'top', columnIndex: 0, depth: 1, x: 0, y: 40, width: 50, height: 50 },
    ];
    expect(hitTestTopTile(areas, 25, 45)?.tileId).toBe('top');
  });

  it('六列 ground truth 保持不变', () => {
    const layout = calculateGameLayout(375, 812, 6, 12);
    expect(layout.tileSize).toBeCloseTo(52.1667, 3);
    expect(layout.rowStep).toBeCloseTo(44.3417, 3);
  });

  it('实际深度变浅时只居中内容，不改变布局尺寸或 Tray', () => {
    const layout = calculateGameLayout(414, 760, 5, 8);
    const spaceBeforeTray = LAYOUT.trayLabelOffset + LAYOUT.sectionGap;
    const centeredTop = calculateCenteredBoardTop(layout, 5, spaceBeforeTray);
    const contentBottom = centeredTop + layout.tileSize + 4 * layout.rowStep;
    const boardAreaBottom = layout.trayTop - spaceBeforeTray;
    expect(centeredTop).toBeGreaterThan(layout.boardTop);
    expect(centeredTop - layout.boardTop).toBeCloseTo(boardAreaBottom - contentBottom, 6);
    expect(layout.tileSize).toBeCloseTo(calculateGameLayout(414, 760, 5, 8).tileSize, 8);
    expect(layout.trayTop).toBeCloseTo(calculateGameLayout(414, 760, 5, 8).trayTop, 8);
  });

  it('底部基线让每列可点 Tile 逐位对齐，并由基线向上生长', () => {
    const layout = calculateGameLayout(390, 844, 5, 8);
    const depths = [8, 7, 5, 2, 0] as const;
    const gap = LAYOUT.tileGap;
    const spaceBeforeTray = LAYOUT.trayLabelOffset + LAYOUT.sectionGap;
    const hitExtension = 6;
    const placements = calculateBottomAlignedBoardPlacements(
      layout,
      depths,
      gap,
      spaceBeforeTray,
      hitExtension,
    );
    const actualMaxDepth = Math.max(...depths);
    const expectedBaseline =
      calculateCenteredBoardTop(layout, actualMaxDepth, spaceBeforeTray) +
      (actualMaxDepth - 1) * layout.rowStep;
    const topTiles = placements.filter(({ isTop }) => isTop);

    expect(topTiles).toHaveLength(4);
    expect(topTiles.map(({ columnIndex }) => columnIndex)).toEqual([0, 1, 2, 3]);
    expect(topTiles.map(({ y }) => y)).toEqual(topTiles.map(() => expectedBaseline));
    expect(placements.find(({ columnIndex, depth }) => columnIndex === 0 && depth === 0)?.y)
      .toBeCloseTo(expectedBaseline - 7 * layout.rowStep, 8);
    expect(placements.find(({ columnIndex, depth }) => columnIndex === 3 && depth === 0)?.y)
      .toBeCloseTo(expectedBaseline - layout.rowStep, 8);
  });

  it('R2-0 严格居中把最大单块空白减半，同时守住可点牌基线', () => {
    const layout = calculateGameLayout(402, 773, 6, 12);
    const spaceBeforeTray = LAYOUT.trayLabelOffset + LAYOUT.sectionGap;
    const expectedBlankByDepth = new Map([
      [8, 83.95],
      [4, 167.91],
      [2, 209.88],
      [1, 230.87],
    ]);

    for (const depth of [8, 4, 2, 1]) {
      const depths = Array.from({ length: 6 }, (_, index) => Math.max(1, depth - index));
      const placements = calculateBottomAlignedBoardPlacements(
        layout,
        depths,
        LAYOUT.tileGap,
        spaceBeforeTray,
        6,
      );
      const boardAreaBottom = layout.trayTop - spaceBeforeTray;
      const contentTop = Math.min(...placements.map((placement) => placement.y));
      const contentBottom = Math.max(
        ...placements.map((placement) => placement.y + layout.tileSize),
      );
      const topBlank = contentTop - layout.boardTop;
      const bottomBlank = boardAreaBottom - contentBottom;
      const maxBlank = Math.max(topBlank, bottomBlank);

      const constantBaseline = boardAreaBottom - layout.tileSize;
      const previousContentTop = constantBaseline - (depth - 1) * layout.rowStep;
      const previousMaxBlank = previousContentTop - layout.boardTop;
      const improvement = (previousMaxBlank - maxBlank) / previousMaxBlank;

      expect(maxBlank).toBeCloseTo(expectedBlankByDepth.get(depth)!, 2);
      expect(maxBlank / layout.viewportHeight).toBeLessThanOrEqual(depth === 1 ? 0.3 : 0.28);
      expect(Math.abs(topBlank - bottomBlank)).toBeLessThanOrEqual(1);
      expect(improvement).toBeGreaterThanOrEqual(0.45);

      const clickableTiles = placements.filter(({ isTop }) => isTop);
      expect(clickableTiles).toHaveLength(depths.length);
      const clickableBaseline = clickableTiles[0]!.y;
      clickableTiles.forEach((placement) => {
        expect(placement.y).toBeCloseTo(clickableBaseline, 5);
      });
    }
  });

  it('R2-0 反向验证：恢复恒定 baseline 会让门槛 1、3 变红', () => {
    const layout = calculateGameLayout(402, 773, 6, 12);
    const spaceBeforeTray = LAYOUT.trayLabelOffset + LAYOUT.sectionGap;
    const boardAreaBottom = layout.trayTop - spaceBeforeTray;
    const constantBaseline = boardAreaBottom - layout.tileSize;
    const legacyBlanks = [8, 4, 2, 1].map((depth) => {
      const contentTop = constantBaseline - (depth - 1) * layout.rowStep;
      return contentTop - layout.boardTop;
    });
    const revertedCandidateBlanks = [...legacyBlanks];
    const revertedImprovements = revertedCandidateBlanks.map(
      (blank, index) => (legacyBlanks[index]! - blank) / legacyBlanks[index]!,
    );

    expect(revertedCandidateBlanks.some((blank) => blank / layout.viewportHeight > 0.28))
      .toBe(true);
    expect(revertedImprovements.every((improvement) => improvement >= 0.45)).toBe(false);
  });

  it('每列只有列尾命中区可点，边界内外反向验证明确', () => {
    const layout = calculateGameLayout(375, 812, 6, 12);
    const placements = calculateBottomAlignedBoardPlacements(
      layout,
      [12, 10, 8, 6, 4, 2],
      LAYOUT.tileGap,
      LAYOUT.trayLabelOffset + LAYOUT.sectionGap,
      6,
    );
    const topAreas: readonly TileHitArea[] = placements
      .filter(({ isTop }) => isTop)
      .map(({ columnIndex, depth, hitArea }) => ({
        tileId: `c${columnIndex}-d${depth}`,
        columnIndex,
        depth,
        ...hitArea,
      }));

    expect(topAreas).toHaveLength(6);
    for (const area of topAreas) {
      expect(
        hitTestTopTile(areasForColumn(topAreas, area.columnIndex), area.x + area.width / 2, area.y + area.height / 2),
      ).toEqual(area);
      expect(
        hitTestTopTile(areasForColumn(topAreas, area.columnIndex), area.x - 0.01, area.y + area.height / 2),
      ).toBeNull();
    }
    expect(placements.filter(({ isTop }) => !isTop)).toHaveLength(36);
  });
});

function areasForColumn(areas: readonly TileHitArea[], columnIndex: number): readonly TileHitArea[] {
  return areas.filter((area) => area.columnIndex === columnIndex);
}
