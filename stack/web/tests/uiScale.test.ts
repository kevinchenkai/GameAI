import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { fontPx, px, uiScale } from '../src/game/ui/uiScale';
import { calculateGameLayout, scaleLayout } from '../src/game/layout/GameLayout';
import { PROTOTYPE_UI } from '../src/game/config/layout';

function fakeScene(canvasWidth: number, clientWidth: number): Phaser.Scene {
  return { game: { canvas: { width: canvasWidth, clientWidth } } } as unknown as Phaser.Scene;
}

describe('uiScale：DPR 换算', () => {
  it('缓冲宽 / CSS 宽 = 倍率', () => {
    expect(uiScale(fakeScene(750, 375))).toBe(2);
    expect(uiScale(fakeScene(375, 375))).toBe(1);
  });

  it('拿不到 canvas 时降级为 1，绝不抛异常（场景销毁后仍可能被调用）', () => {
    expect(uiScale({} as Phaser.Scene)).toBe(1);
    expect(uiScale({ game: undefined } as unknown as Phaser.Scene)).toBe(1);
    expect(uiScale(fakeScene(750, 0))).toBe(1);
    expect(uiScale(fakeScene(Number.NaN, 375))).toBe(1);
  });

  it('px / fontPx 按倍率放大，fontPx 取整并带单位', () => {
    const scene = fakeScene(750, 375);
    expect(px(scene, 16)).toBe(32);
    expect(fontPx(scene, 17)).toBe('34px');
    expect(fontPx(fakeScene(375, 375), 17)).toBe('17px');
  });
});

describe('scaleLayout：布局等比放大', () => {
  it('scale=1 原样返回', () => {
    const base = calculateGameLayout(375, 812, 6, 12);
    expect(scaleLayout(base, 1)).toBe(base);
  });

  it('几何量全部乘倍率，overlapRatio 是比值保持不变', () => {
    const base = calculateGameLayout(375, 812, 6, 12);
    const scaled = scaleLayout(base, 2);
    expect(scaled.tileSize).toBeCloseTo(base.tileSize * 2);
    expect(scaled.rowStep).toBeCloseTo(base.rowStep * 2);
    expect(scaled.contentWidth).toBeCloseTo(base.contentWidth * 2);
    expect(scaled.trayTop).toBeCloseTo(base.trayTop * 2);
    expect(scaled.toolButtonSize).toBeCloseTo(base.toolButtonSize * 2);
    expect(scaled.overlapRatio).toBe(base.overlapRatio);   // 比值不缩放
  });

  it('★ 关键：先按 CSS 求解再放大 ≠ 直接把物理像素喂进去', () => {
    // 直接喂物理像素：算法以为屏幕变大，tileSize 撞上 tileSizeMax 上限
    const naive = calculateGameLayout(750, 1624, 6, 12);
    // 正确做法：按 CSS 求解再整体放大
    const correct = scaleLayout(calculateGameLayout(375, 812, 6, 12), 2);
    expect(correct.tileSize).not.toBeCloseTo(naive.tileSize);
    // 正确做法下，卡片占内容区的比例与设计稿一致
    const base = calculateGameLayout(375, 812, 6, 12);
    expect(correct.tileSize / correct.contentWidth).toBeCloseTo(base.tileSize / base.contentWidth);
  });
});

describe('★ 模糊修复：DPR=2 时字号必须翻倍', () => {
  it('iPhone(DPR2) 上标题/正文字号是设计值的 2 倍', () => {
    const iphone = fakeScene(750, 375);
    expect(fontPx(iphone, 46)).toBe('92px');                       // 首页大标题
    expect(fontPx(iphone, 17)).toBe('34px');                       // 正文
    expect(fontPx(iphone, PROTOTYPE_UI.titleFontSize))
      .toBe(`${PROTOTYPE_UI.titleFontSize * 2}px`);
  });

  it('DPR=1 桌面维持设计值，不会被放大', () => {
    const desktop = fakeScene(1280, 1280);
    expect(fontPx(desktop, 46)).toBe('46px');
    expect(fontPx(desktop, 17)).toBe('17px');
  });

  it('DPR=3 被上限钳到 2（避免 9 倍填充率掉帧）—— 由 main.ts 保证，此处校验换算本身', () => {
    // main.ts 的 renderScale() 上限为 2，故 canvas 实际倍率最多 2
    const capped = fakeScene(375 * 2, 375);
    expect(fontPx(capped, 20)).toBe('40px');
  });
});
