import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_UI, COLORS } from '../src/game/config/layout';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

/**
 * ★ 视觉参数必须集中在 GAME_UI / COLORS，不散落在场景里。
 *
 *   动机：散落的 alpha 与 tint **不会报错**，只是调色时容易漏改——
 *   和漏乘 px() 是同一类「无症状」缺陷，靠人 review 抓不到。
 *   这里用源码扫描而非 AST 规则，因为要拦的是「字面量出现在渲染层」
 *   这个事实本身，不依赖具体写法。
 */
const RENDER_SOURCES = [
  'src/game/scenes/GameScene.ts',
  'src/game/scenes/HowToPlayScene.ts',
  'src/game/scenes/HomeScene.ts',
  'src/game/scenes/LevelSelectScene.ts',
];

/** 0 与 1 是「完全透明 / 完全不透明」的语义端点，不算需要调的参数 */
const ALPHA_LITERAL = /(?:setAlpha\(|alpha:\s*)(0\.\d+|\.\d+)/g;
/** 十六进制颜色字面量 */
const COLOR_LITERAL = /(?:setTint\(|setFillStyle\(|setColor\(['"]?#?)(0x[0-9a-fA-F]{6})/g;

describe('视觉 token 集中度', () => {
  it.each(RENDER_SOURCES)('%s 不含硬编码 alpha 字面量', (file) => {
    const source = readSource(file);
    const found = [...source.matchAll(ALPHA_LITERAL)].map((m) => m[1]);
    expect(found).toEqual([]);
  });

  it.each(RENDER_SOURCES)('%s 不含硬编码颜色字面量', (file) => {
    const source = readSource(file);
    const found = [...source.matchAll(COLOR_LITERAL)].map((m) => m[1]);
    expect(found).toEqual([]);
  });

  it('本轮迁移的 token 保持原值（重构不得改变外观）', () => {
    expect(GAME_UI.settingsDisabledAlpha).toBe(0.5);
    expect(GAME_UI.trayPairGlowEnterAlpha).toBe(0.25);
    expect(GAME_UI.trayWarningPulseAlpha).toBe(0.82);
    expect(GAME_UI.resultStarUnearnedAlpha).toBe(0.48);
    expect(GAME_UI.resultPanelEnterAlpha).toBe(0.72);
    expect(GAME_UI.resultPanelEnterScale).toBe(0.86);
    expect(COLORS.resultStarUnearnedTint).toBe(0xaebbc5);
  });
});
