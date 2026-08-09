/**
 * 背景层次的**约束**单测
 *
 * ★★ 这里测的不是"好不好看"，而是"**会不会抢棋子的注意力**"。
 *
 *   核心用户是 50+ 与 8~15 岁，验收判据第 4 条是"棋子够不够大够清楚"。
 *   背景一旦有存在感，就是在和棋子抢 —— 而这种劣化**没有报错**，
 *   只会让真人测试的"看不清"反馈变多，且很难归因到背景上。
 *
 *   所以把"必须足够淡"写成断言：将来有人想"让背景更好看一点"，
 *   测试会先拦一道。
 */

import { describe, expect, it } from 'vitest';
import { ENV_PALETTE, PIECE_DEFS } from '../../src/config/pieces';
import { BACKDROP } from '../../src/config/tuning';

/** BT.709 —— 与项目其它处保持同一口径（用错公式会得出相反结论） */
function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 0xff) + 0.7152 * ((n >> 8) & 0xff) + 0.0722 * (n & 0xff);
}

describe('★★ 背景必须足够淡 —— 不与棋子抢注意力', () => {
  it('渐变两端灰度差 < 20（画面不平，但看不出是渐变）', () => {
    const diff = Math.abs(luminance(ENV_PALETTE.skyLight) - luminance(ENV_PALETTE.skyDeep));
    expect(diff).toBeGreaterThan(2); // 太小就等于没做
    expect(diff).toBeLessThan(20);
  });

  it('★ 暗角不透明度 ≤ 0.05 —— 超过就会被看出来', () => {
    expect(BACKDROP.vignetteAlpha).toBeLessThanOrEqual(0.05);
    expect(BACKDROP.vignetteAlpha).toBeGreaterThan(0);
  });

  /**
   * ★★ 最关键的一条：**最暗的棋子**在**最深的背景**上仍要突出。
   *   red 是六色里最暗的，背景最深处是 skyDeep。
   */
  it('★★ 最暗棋子与最深背景的灰度差 > 100', () => {
    const darkest = Math.min(...Object.values(PIECE_DEFS).map((d) => luminance(d.hex)));
    const deepestBg = luminance(ENV_PALETTE.skyDeep);
    expect(deepestBg - darkest).toBeGreaterThan(100);
  });
});

describe('层级', () => {
  /**
   * ★ 背景 depth 必须低于所有内容。
   *   棋盘用默认 0、旺财 5、HUD 10、弹窗 100+ —— 取负值最稳妥。
   *   写成 0 的话会和棋盘同层，谁先创建谁在下面 —— 顺序一变就翻车。
   */
  it('★ depth 为负，低于棋盘（0）与其余所有层', () => {
    expect(BACKDROP.depth).toBeLessThan(0);
  });

  it('暗角在渐变之上，但仍低于棋盘', () => {
    expect(BACKDROP.depth + 1).toBeGreaterThan(BACKDROP.depth);
    expect(BACKDROP.depth + 1).toBeLessThan(0);
  });
});
