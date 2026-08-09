/**
 * uiScale 单测 —— 设计像素 → 物理像素的换算
 *
 * ★ 这一层的失效方式很隐蔽：漏乘不报错，只是那个元素小一半。
 *   所以除了算得对，更要保证**任何情况下都不抛异常** ——
 *   抛了就是整个棋盘画不出来。
 */

import { describe, expect, it } from 'vitest';
import { fontPx, px, uiScale } from '../../src/game/ui/uiScale';

/** 造一个只有 uiScale 需要的那部分的假场景 */
function sceneWith(canvas: unknown): never {
  return { game: canvas === undefined ? undefined : { canvas } } as never;
}

describe('倍率计算', () => {
  it('DPR=2：缓冲 750 / CSS 375 → 2', () => {
    expect(uiScale(sceneWith({ width: 750, clientWidth: 375 }))).toBe(2);
  });

  it('DPR=1：缓冲与 CSS 相同 → 1', () => {
    expect(uiScale(sceneWith({ width: 375, clientWidth: 375 }))).toBe(1);
  });

  it('px() 按倍率放大', () => {
    expect(px(sceneWith({ width: 750, clientWidth: 375 }), 16)).toBe(32);
  });

  it('fontPx() 产出 Phaser 需要的 "NNpx" 字符串', () => {
    expect(fontPx(sceneWith({ width: 750, clientWidth: 375 }), 15)).toBe('30px');
  });
});

/**
 * ★★ 回归：取不到倍率时必须**降级为 1**，不能抛。
 *
 *   实测踩到：`uiScale` 原本写的是 `scene.game.canvas` ——
 *   只保护了 canvas，没保护 game。给 BoardView 接入 px() 后，
 *   **22 条单测同时报 "Cannot read properties of undefined (reading 'canvas')"**。
 *
 *   场景在 create() 之前、或被销毁之后，game 确实可能是 undefined。
 *   返回 1 等于按设计像素画（尺寸偏小但画面完整）；
 *   抛异常则整个棋盘都没了 —— 两者严重程度差很远。
 */
describe('★★ 退化输入一律降级为 1，绝不抛异常', () => {
  const CASES: [string, unknown][] = [
    ['game 为 undefined', undefined],
    ['canvas 为 null', null],
    ['canvas 无尺寸（未布局）', { width: 0, clientWidth: 0 }],
    ['clientWidth 为 0（除零）', { width: 750, clientWidth: 0 }],
    ['宽度为 NaN', { width: NaN, clientWidth: 375 }],
    ['宽度为负', { width: -750, clientWidth: 375 }],
  ];

  it.each(CASES)('%s → 返回 1', (_name, canvas) => {
    expect(() => uiScale(sceneWith(canvas))).not.toThrow();
    expect(uiScale(sceneWith(canvas))).toBe(1);
  });

  it('★ 降级时 px() 原样返回设计值，不产生 NaN', () => {
    const s = sceneWith(undefined);
    expect(px(s, 16)).toBe(16);
    expect(Number.isNaN(px(s, 16))).toBe(false);
  });
});
