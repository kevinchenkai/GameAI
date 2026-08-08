import { describe, expect, it } from 'vitest';
import {
  ALL_COLORS,
  MIN_LUMINANCE_SEPARATION,
  PIECE_DEFS,
  type PieceDef,
} from '../../src/config/pieces';

/** ITU-R BT.709 —— 与美术工单 §1.2 用的是同一个公式 */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('config/pieces —— 色板灰度可分辨性', () => {
  it('六色齐备', () => {
    expect(ALL_COLORS).toHaveLength(6);
    for (const c of ALL_COLORS) expect(PIECE_DEFS[c]).toBeDefined();
  });

  it('记录的 luminance 与色值实际算出来的一致（防止改色忘了改注释）', () => {
    for (const c of ALL_COLORS) {
      const def = PIECE_DEFS[c];
      expect(luminance(def.hex)).toBeCloseTo(def.luminance, 0);
    }
  });

  it('★ 任意两色灰度差 ≥ 阈值 —— 这是原色板 4 对冲突的修正结果', () => {
    const defs: PieceDef[] = ALL_COLORS.map((c) => PIECE_DEFS[c]);
    const conflicts: string[] = [];

    for (let i = 0; i < defs.length; i++) {
      for (let j = i + 1; j < defs.length; j++) {
        const a = defs[i]!;
        const b = defs[j]!;
        const delta = Math.abs(a.luminance - b.luminance);
        if (delta < MIN_LUMINANCE_SEPARATION) {
          conflicts.push(`${a.color} vs ${b.color}: Δ=${delta.toFixed(1)}`);
        }
      }
    }

    expect(conflicts).toEqual([]);
  });

  it('每色都有独立造型关键词 —— 轮廓本身足以区分，不依赖颜色', () => {
    const shapes = ALL_COLORS.map((c) => PIECE_DEFS[c].shape);
    expect(new Set(shapes).size).toBe(shapes.length);

    const fruits = ALL_COLORS.map((c) => PIECE_DEFS[c].fruit);
    expect(new Set(fruits).size).toBe(fruits.length);
  });

  it('高光比主色亮、阴影比主色暗', () => {
    for (const c of ALL_COLORS) {
      const def = PIECE_DEFS[c];
      expect(luminance(def.highlight)).toBeGreaterThan(def.luminance);
      expect(luminance(def.shadow)).toBeLessThan(def.luminance);
    }
  });
});
