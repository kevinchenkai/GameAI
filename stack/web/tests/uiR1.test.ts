import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_UI } from '../src/game/config/layout';
import { resolveToolButtonStyle } from '../src/game/ui/toolButtonStyle';
import { resolveTrayPresentation } from '../src/game/ui/trayPresentation';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('UI R1 visual contracts', () => {
  it('棋盘图案主体占比恢复到 62%~68%，并留在 206px 安全区内', () => {
    const subjectRatio = GAME_UI.tileSourceSubjectRatio * GAME_UI.boardIconCanvasRatio;
    const subjectPixels = 256 * subjectRatio;
    const safePixels = 256 * GAME_UI.tileFrameSafeRatio;

    expect(subjectRatio).toBeGreaterThanOrEqual(0.62);
    expect(subjectRatio).toBeLessThanOrEqual(0.68);
    expect(subjectPixels).toBeLessThanOrEqual(safePixels);
    expect(subjectPixels).toBe(174);
    expect(safePixels).toBe(206);
  });

  it('Tray 只保留槽位与单层图案倍率，不再嵌套 tile_frame', () => {
    // 绘制代码已抽到 render/TrayRenderer（CodeReview §1），断言随之改指该文件。
    const renderer = readSource('src/game/render/TrayRenderer.ts');
    const trayTileMethod = renderer.match(
      /export function createTrayTile[\s\S]*$/,
    )?.[0];

    expect(trayTileMethod).toBeDefined();
    expect(trayTileMethod).not.toContain('tileFrame');
    expect(trayTileMethod).not.toContain('inset');
    expect(trayTileMethod).toContain('GAME_UI.trayIconCanvasRatio');
    expect(GAME_UI.tileSourceSubjectRatio * GAME_UI.trayIconCanvasRatio)
      .toBeCloseTo(0.6117, 3);
  });

  it('disabled primary 强制使用中性填充，反向检查黄色主填充会失败', () => {
    const enabledPrimary = resolveToolButtonStyle('primary', true);
    const disabledPrimary = resolveToolButtonStyle('primary', false);

    expect(enabledPrimary.fill).toBe(GAME_UI.primaryFill);
    expect(disabledPrimary.fill).toBe(GAME_UI.disabledFill);
    expect(disabledPrimary.fill).not.toBe(GAME_UI.primaryFill);
    expect(disabledPrimary.labelColor).toBe(GAME_UI.textDisabled);
  });

  it('设置命中区满足手机 44px 下限且大于可见图标', () => {
    expect(GAME_UI.settingsHitSize).toBeGreaterThanOrEqual(44);
    expect(GAME_UI.settingsHitSize).toBeGreaterThan(GAME_UI.settingsVisualSize);
  });

  it('运行时可点 Tile 直接使用布局返回的命中区扩展量', () => {
    // 绘制代码已抽到 render/BoardRenderer（CodeReview §1），断言随之改指该文件；
    // 守的仍是同一条：命中区由布局返回，不在渲染层另算一份。
    const renderer = readSource('src/game/render/BoardRenderer.ts');
    expect(renderer).toContain('placement.x - placement.hitArea.x');
    expect(renderer).toContain('makeTileInteractive(scene, container, placement');
  });

  it('背景 wash 使用已批准的 4%~14% 低冲淡档', () => {
    expect(GAME_UI.backgroundWashTopAlpha).toBe(0.04);
    expect(GAME_UI.backgroundWashBottomAlpha).toBe(0.14);
  });

  it('Tray 5/7 与 6/7 用文字而非只靠颜色表达压力', () => {
    expect(resolveTrayPresentation(4, 7)).toEqual({ level: 'normal', label: '4/7' });
    expect(resolveTrayPresentation(5, 7)).toEqual({ level: 'warning', label: '注意 5/7' });
    expect(resolveTrayPresentation(6, 7)).toEqual({ level: 'danger', label: '危险 6/7' });
    expect(resolveTrayPresentation(7, 7)).toEqual({ level: 'full', label: '已满 7/7' });
  });
});
