import { describe, expect, it } from 'vitest';
import { LAYOUT } from '../src/game/config/layout';
import {
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
});
