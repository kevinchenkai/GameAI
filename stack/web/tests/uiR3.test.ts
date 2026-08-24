import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_UI } from '../src/game/config/layout';
import { resolveToolButtonStyle } from '../src/game/ui/toolButtonStyle';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('UI R3 help and result contracts', () => {
  it('玩法页所有操作命中区满足 44px 手机下限', () => {
    expect(GAME_UI.helpBackHitHeight).toBeGreaterThanOrEqual(44);
    expect(GAME_UI.helpButtonHeight).toBeGreaterThanOrEqual(44);
  });

  it('玩法页以四种图示代替纯文字说明', () => {
    const scene = readSource('src/game/scenes/HowToPlayScene.ts');
    expect(scene).toContain('drawPageVisual');
    expect(scene).toContain('点最下方');
    expect(scene).toContain('露出的卡牌');
    expect(scene).toContain('SCENE_TEXTURES.Game.traySlot.key');
    expect(scene).toContain('危险 6/7');
    expect(scene).toContain('SCENE_TEXTURES.Game.undo.key');
    expect(scene).toContain('SCENE_TEXTURES.Game.star.key');
  });

  it('玩法页沿用统一按钮语义且不再缩放交互元素', () => {
    const scene = readSource('src/game/scenes/HowToPlayScene.ts');
    expect(scene).toContain('createRoundedButton');
    expect(scene).not.toContain('setScale(1.03)');
    expect(resolveToolButtonStyle('primary', true).fill).toBe(GAME_UI.primaryFill);
    expect(resolveToolButtonStyle('secondary', true).fill).toBe(GAME_UI.secondaryFill);
  });

  it('工具栏、结果弹窗和玩法页共用 RoundedButton 唯一渲染实现', () => {
    const gameScene = readSource('src/game/scenes/GameScene.ts');
    const helpScene = readSource('src/game/scenes/HowToPlayScene.ts');
    const roundedButton = readSource('src/game/ui/RoundedButton.ts');

    expect(gameScene).toContain('createRoundedButton');
    expect(helpScene).toContain('createRoundedButton');
    expect(roundedButton).toContain('resolveToolButtonStyle');
    expect(roundedButton).toContain('fillRoundedRect');
    expect(roundedButton).toContain('style.pressedOffset');
    expect(gameScene).not.toContain('resolveToolButtonStyle');
    expect(helpScene).not.toContain('resolveToolButtonStyle');
  });

  it('结果弹窗保持紧凑并使用三张独立统计卡', () => {
    expect(GAME_UI.resultPanelHeight).toBeLessThanOrEqual(320);
    expect(GAME_UI.resultFailPanelHeight).toBeLessThan(GAME_UI.resultPanelHeight);
    expect(GAME_UI.resultPanelWidthRatio).toBeLessThanOrEqual(0.86);
    expect(GAME_UI.resultStatHeight).toBeGreaterThanOrEqual(40);
    expect(GAME_UI.resultButtonGap).toBeGreaterThanOrEqual(8);

    const scene = readSource('src/game/scenes/GameScene.ts');
    const resultBlock = scene.match(/private drawResult\([\s\S]*?(?=\n  private enqueuePick)/)?.[0];
    expect(resultBlock).toBeDefined();
    expect(resultBlock).toContain('drawResultStat');
    expect(resultBlock).toContain('GAME_UI.resultPanelHeight');
    expect(resultBlock).toContain('fillRoundedRect');
    expect(resultBlock).not.toContain('buttonWidth + 6');
  });

  it('结果按钮保留主次、危险状态且失败页不展示无效打乱操作', () => {
    const scene = readSource('src/game/scenes/GameScene.ts');
    const resultBlock = scene.match(/private drawResult\([\s\S]*?(?=\n  private enqueuePick)/)?.[0] ?? '';
    expect(resultBlock).toContain("'primary'");
    expect(resultBlock).toContain("'secondary'");
    expect(resultBlock).toContain("'danger'");
    expect(resultBlock).not.toContain("'打乱', false");
    expect(resultBlock).toContain('撤回一步，回到槽位未满时');
    expect(GAME_UI.resultButtonHeight).toBeGreaterThanOrEqual(44);
  });

  it('重来确认复用结果按钮材质，不保留第三套矩形按钮', () => {
    const scene = readSource('src/game/scenes/GameScene.ts');
    const confirmation = scene.match(/private drawRestartConfirmation\([\s\S]*?(?=\n  private drawResult)/)?.[0] ?? '';
    expect(confirmation).toContain('drawResultButton');
    expect(confirmation).toContain("'secondary'");
    expect(confirmation).toContain("'danger'");
    expect(scene).not.toContain('drawConfirmationButton');
  });

  it('胜利反馈可跳过并尊重系统减少动态效果设置', () => {
    const scene = readSource('src/game/scenes/GameScene.ts');
    expect(scene).toContain("prefers-reduced-motion: reduce");
    expect(scene).toContain('animateWinResult');
    expect(scene).toContain('playVictoryParticles');
    expect(scene).toContain('skipLayer.once');
    const totalMs = GAME_UI.resultStarInitialDelayMs
      + 2 * GAME_UI.resultStarStaggerMs
      + GAME_UI.resultStarEnterMs
      + GAME_UI.resultParticleMs;
    expect(totalMs).toBeLessThanOrEqual(1200);
  });
});
