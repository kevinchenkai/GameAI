/**
 * layout 单测 —— 布局算法（框架 §10.1）
 *
 * ★ 布局 bug 只在**特定屏幕尺寸**下出现。人在手机上试不出来，
 *   必须脚本枚举真实机型。下面的尺寸都是真机数据，不是编的。
 */

import { describe, expect, it } from 'vitest';
import { cellAtPoint, cellCenter, computeLayout } from '../../src/game/render/layout';
import { LAYOUT } from '../../src/config/tuning';

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

/** 真机 CSS 像素尺寸（竖屏） */
const DEVICES = [
  { name: 'iPhone SE (最窄的现役机型)', w: 375, h: 667, insets: NO_INSETS },
  { name: 'iPhone 13 mini', w: 375, h: 812, insets: { top: 50, right: 0, bottom: 34, left: 0 } },
  { name: 'iPhone 14', w: 390, h: 844, insets: { top: 47, right: 0, bottom: 34, left: 0 } },
  { name: 'iPhone 14 Pro Max', w: 430, h: 932, insets: { top: 59, right: 0, bottom: 34, left: 0 } },
  { name: 'Android 主流', w: 412, h: 915, insets: { top: 24, right: 0, bottom: 0, left: 0 } },
  { name: 'iPad mini', w: 744, h: 1133, insets: NO_INSETS },
] as const;

describe('★ 真机尺寸下棋子都不小于硬底线', () => {
  it.each(DEVICES.map((d) => [d.name, d] as const))('%s', (_name, d) => {
    const r = computeLayout(d.w, d.h, d.insets);
    expect(r.pieceSizePt).toBeGreaterThanOrEqual(LAYOUT.minPieceSizePt);
    expect(r.belowMinimum).toBe(false);
  });
});

describe('★ 棋子大小是约束，棋盘尺寸是结果', () => {
  it('宽度够 → 用 8×8', () => {
    const r = computeLayout(390, 844, NO_INSETS);
    expect(r.boardCols).toBe(8);
  });

  it('★ 宽度不足以让 8 列达标 → 降到 7×7，而不是继续缩小棋子', () => {
    // 8 列需要 38*8+32 = 336pt；7 列需要 38*7+32 = 298pt
    const r = computeLayout(320, 800, NO_INSETS);
    expect(r.boardCols).toBe(7);
    expect(r.pieceSizePt).toBeGreaterThanOrEqual(LAYOUT.minPieceSizePt);
  });

  it('★ 连 7×7 都放不下 → 显式标记 belowMinimum，不静默交付废棋盘', () => {
    const r = computeLayout(240, 700, NO_INSETS);
    expect(r.belowMinimum).toBe(true);
  });
});

describe('★ 棋盘不溢出可用区域', () => {
  it.each(DEVICES.map((d) => [d.name, d] as const))('%s 棋盘在安全区内', (_name, d) => {
    const r = computeLayout(d.w, d.h, d.insets);
    expect(r.boardRect.x).toBeGreaterThanOrEqual(d.insets.left - 0.01);
    expect(r.boardRect.x + r.boardRect.w).toBeLessThanOrEqual(d.w - d.insets.right + 0.01);
    expect(r.boardRect.y).toBeGreaterThanOrEqual(d.insets.top - 0.01);
  });

  it('★ 各区域竖直方向不重叠、不越出屏幕', () => {
    for (const d of DEVICES) {
      const r = computeLayout(d.w, d.h, d.insets);
      const bottom = r.controlsRect.y + r.controlsRect.h;
      expect(bottom).toBeLessThanOrEqual(d.h - d.insets.bottom + 0.01);
      // 顺序：hud → board → pet → controls
      expect(r.hudRect.y + r.hudRect.h).toBeLessThanOrEqual(r.boardRect.y + 0.01);
      expect(r.boardRect.y + r.boardRect.h).toBeLessThanOrEqual(r.petRect.y + 0.01);
      expect(r.petRect.y + r.petRect.h).toBeLessThanOrEqual(r.controlsRect.y + 0.01);
    }
  });

  it('★ 极扁的窗口（横屏 / 地址栏占满）棋盘也不溢出', () => {
    const r = computeLayout(800, 360, NO_INSETS);
    expect(r.boardRect.y + r.boardRect.h).toBeLessThanOrEqual(360 + 0.01);
  });
});

describe('petCompact', () => {
  it('高屏幕不需要半身构图', () => {
    expect(computeLayout(390, 900, NO_INSETS).petCompact).toBe(false);
  });

  it('★ 矮屏幕 pet 区不足 → 改半身构图（而不是把旺财压扁）', () => {
    expect(computeLayout(390, 500, NO_INSETS).petCompact).toBe(true);
  });
});

describe('★ cellCenter / cellAtPoint 必须互为逆变换', () => {
  it('每个格子的中心都能被反查回自己', () => {
    const r = computeLayout(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });
    for (let col = 0; col < r.boardCols; col++) {
      for (let row = 0; row < r.boardRows; row++) {
        const c = cellCenter(r, col, row);
        expect(cellAtPoint(r, c.x, c.y)).toEqual({ col, row });
      }
    }
  });

  it('棋盘外返回 null', () => {
    const r = computeLayout(390, 844, NO_INSETS);
    expect(cellAtPoint(r, r.boardRect.x - 10, r.boardRect.y + 10)).toBeNull();
    expect(cellAtPoint(r, r.boardRect.x + 10, r.boardRect.y - 10)).toBeNull();
    expect(cellAtPoint(r, r.boardRect.x + r.boardRect.w + 10, r.boardRect.y + 10)).toBeNull();
    expect(cellAtPoint(r, r.boardRect.x + 10, r.boardRect.y + r.boardRect.h + 10)).toBeNull();
  });

  it('★ 边界像素归属明确（相邻格不重叠、无空隙）', () => {
    const r = computeLayout(390, 844, NO_INSETS);
    const s = r.pieceSizePt;
    // 第 0 格与第 1 格的交界
    const boundary = r.boardRect.x + s;
    expect(cellAtPoint(r, boundary - 0.01, r.boardRect.y + 1)?.col).toBe(0);
    expect(cellAtPoint(r, boundary + 0.01, r.boardRect.y + 1)?.col).toBe(1);
  });
});

describe('Safe Area', () => {
  it('★ 刘海与 Home Indicator 确实被扣掉（否则棋盘会被挡）', () => {
    const withInsets = computeLayout(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });
    const without = computeLayout(390, 844, NO_INSETS);
    expect(withInsets.hudRect.y).toBeGreaterThanOrEqual(47);
    expect(withInsets.controlsRect.y + withInsets.controlsRect.h).toBeLessThanOrEqual(844 - 34 + 0.01);
    // 竖直空间变少 → 各弹性区域变矮
    expect(withInsets.petRect.h).toBeLessThan(without.petRect.h);
  });

  it('横向 inset（横屏刘海）也被扣掉', () => {
    const r = computeLayout(844, 390, { top: 0, right: 47, bottom: 21, left: 47 });
    expect(r.boardRect.x).toBeGreaterThanOrEqual(47);
    expect(r.boardRect.x + r.boardRect.w).toBeLessThanOrEqual(844 - 47 + 0.01);
  });
});

/**
 * ★★ 退化输入 —— 这组曾经只断言"不抛错"，太弱了。
 *
 *   M4 实测遇到过：Phaser 还没量到容器时 scale 报 0×0，
 *   算出 `pieceSizePt = -4.57`，棋盘以负尺寸绘制 ——
 *   **整个棋盘不见了，且没有任何报错**。
 *   "不抛错"通过了，但结果完全不可用。所以这里必须断言**数值合理**。
 */
describe('★★ 退化输入：不崩，且不产出负数尺寸', () => {
  const DEGENERATE: Array<[string, number, number, typeof NO_INSETS]> = [
    ['零尺寸视口（Phaser 还没量到容器）', 0, 0, NO_INSETS],
    ['只有宽度为 0', 0, 800, NO_INSETS],
    ['只有高度为 0', 375, 0, NO_INSETS],
    ['视口比边距还小', 10, 10, NO_INSETS],
    ['inset 大于视口', 100, 100, { top: 200, right: 200, bottom: 200, left: 200 }],
    ['负数视口（异常输入）', -100, -100, NO_INSETS],
  ];

  it.each(DEGENERATE)('%s', (_name, w, h, insets) => {
    const r = computeLayout(w, h, insets);

    // ★ 关键：所有尺寸都不能是负数或 NaN
    expect(Number.isFinite(r.pieceSizePt)).toBe(true);
    expect(r.pieceSizePt).toBeGreaterThanOrEqual(0);
    for (const rect of [r.boardRect, r.hudRect, r.petRect, r.controlsRect]) {
      expect(Number.isFinite(rect.w)).toBe(true);
      expect(Number.isFinite(rect.h)).toBe(true);
      expect(rect.w).toBeGreaterThanOrEqual(0);
      expect(rect.h).toBeGreaterThanOrEqual(0);
    }
    // 棋盘尺寸必须是正整数
    expect(r.boardCols).toBeGreaterThan(0);
    expect(r.boardRows).toBeGreaterThan(0);
  });

  it('★ 退化时 belowMinimum 必须为 true（异常要被标出来，不能静默）', () => {
    for (const [, w, h, insets] of DEGENERATE) {
      expect(computeLayout(w, h, insets).belowMinimum).toBe(true);
    }
  });

  it('★ pieceSizePt 为 0 时 cellAtPoint 返回 null，不做除零', () => {
    const r = computeLayout(0, 0, NO_INSETS);
    expect(r.pieceSizePt).toBe(0);
    expect(cellAtPoint(r, 10, 10)).toBeNull();
  });
});
