import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_UI } from '../src/game/config/layout';
import { resolveTileVisualStyle } from '../src/game/ui/tileVisualStyle';
import { resolveToolButtonStyle } from '../src/game/ui/toolButtonStyle';
import { findTrayPairRuns } from '../src/game/ui/trayPresentation';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('UI R2 material contracts', () => {
  it('covered Tile 只压暗 frame，图案保持饱和且 32px 状态不被透明度削弱', () => {
    const covered = resolveTileVisualStyle(false);
    const active = resolveTileVisualStyle(true);

    expect(covered.frameAlpha).toBeGreaterThanOrEqual(0.82);
    expect(covered.frameAlpha).toBeLessThanOrEqual(0.88);
    expect(covered.iconAlpha).toBe(1);
    expect(covered.overlayAlpha).toBeLessThanOrEqual(0.04);
    expect(active.iconAlpha).toBe(1);
    expect(active.frameAlpha).toBe(1);
  });

  it('active Tile 必须保留阴影与暖色外沿，关闭阴影会使断言变红', () => {
    const active = resolveTileVisualStyle(true);
    expect(active.shadowAlpha).toBeGreaterThanOrEqual(0.1);
    expect(active.shadowAlpha).toBeLessThanOrEqual(0.14);
    expect(active.outlineAlpha).toBeGreaterThan(0);
    expect(GAME_UI.tileActiveShadowOffset).toBe(3);
  });

  it('Tile 渲染不再用 Container 整体 alpha 压灰 covered 状态', () => {
    const source = readSource('src/game/scenes/GameScene.ts');
    const method = source.match(/private createTileVisual[\s\S]*?(?=\n  private makeTileInteractive)/)?.[0];
    expect(method).toBeDefined();
    expect(method).not.toContain('container.setAlpha');
    expect(method).toContain('resolveTileVisualStyle');
  });

  it('三个工具按钮共用圆角和描边宽度，阴影按主次危险递减', () => {
    const primary = resolveToolButtonStyle('primary', true);
    const secondary = resolveToolButtonStyle('secondary', true);
    const danger = resolveToolButtonStyle('danger', true);

    expect(GAME_UI.buttonRadius).toBeGreaterThanOrEqual(12);
    expect(GAME_UI.buttonRadius).toBeLessThanOrEqual(14);
    expect(new Set([primary.strokeWidth, secondary.strokeWidth, danger.strokeWidth]).size).toBe(1);
    expect(primary.shadowAlpha).toBeGreaterThan(secondary.shadowAlpha);
    expect(secondary.shadowAlpha).toBeGreaterThan(danger.shadowAlpha);
    expect(danger.shadowAlpha).toBeGreaterThan(0);
  });

  it('工具按钮 pressed 只下移并减弱阴影，disabled 完全无 enabled 阴影', () => {
    const primary = resolveToolButtonStyle('primary', true);
    const disabled = resolveToolButtonStyle('primary', false);
    const source = readSource('src/game/ui/RoundedButton.ts');

    expect(primary.pressedOffset).toBe(2);
    expect(primary.pressedShadowScale).toBeLessThan(1);
    expect(disabled.shadowAlpha).toBe(0);
    expect(source).toContain('style.pressedOffset');
    expect(source).not.toContain('container.setScale(0.96)');
  });

  it('Tray 空槽退居次级、已有牌保持完整，并识别相邻同类组合', () => {
    expect(GAME_UI.trayEmptySlotAlpha).toBeGreaterThanOrEqual(0.6);
    expect(GAME_UI.trayEmptySlotAlpha).toBeLessThanOrEqual(0.72);
    expect(GAME_UI.trayOccupiedSlotAlpha).toBe(1);
    expect(GAME_UI.trayOccupiedSlotAlpha).toBeGreaterThan(GAME_UI.trayEmptySlotAlpha);
    expect(findTrayPairRuns([
      { type: 'grass' },
      { type: 'grass' },
      { type: 'bell' },
      { type: 'paw' },
      { type: 'paw' },
      { type: 'paw' },
    ])).toEqual([
      { type: 'grass', start: 0, length: 2 },
      { type: 'paw', start: 3, length: 3 },
    ]);
  });

  it('HUD 保持 64px/16px 契约，设置图标降至 32px 但命中区仍为 48px', () => {
    expect(GAME_UI.surfaceRadius).toBe(16);
    expect(GAME_UI.surfaceFillAlpha).toBeGreaterThanOrEqual(0.9);
    expect(GAME_UI.surfaceFillAlpha).toBeLessThanOrEqual(0.94);
    expect(GAME_UI.surfaceShadowAlpha).toBeGreaterThanOrEqual(0.1);
    expect(GAME_UI.surfaceShadowAlpha).toBeLessThanOrEqual(0.12);
    expect(GAME_UI.settingsVisualSize).toBe(32);
    expect(GAME_UI.settingsHitSize).toBe(48);
  });
});
