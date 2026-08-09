/**
 * 结算页「花园进度」那一行的**排版数学**
 *
 * ★★ 用户实测截图报的 bug：`+1★` 徽章压在主文案上。
 *
 *   原因：主文案固定左移 16pt 给徽章"腾地方"，但 16 是**猜的**，
 *   与徽章实际宽度无关 —— 徽章比这宽时就叠在一起。
 *   而且文案长度本身会变（"还差 2 颗星" / "可以建设啦！"），
 *   固定偏移在哪种组合下都不对。
 *
 *   这里把"两段作为一个整体居中"的算法单独拎出来测：
 *   只要**任何一段变宽**都不许重叠，且整体保持居中。
 */

import { describe, expect, it } from 'vitest';

/** 复刻 buildGardenBar 里的定位算法（origin 0,0.5 → x 为左边缘） */
function layout(cx: number, textW: number, badgeW: number | null, gap: number) {
  const total = textW + (badgeW !== null ? gap + badgeW : 0);
  const textX = cx - total / 2;
  const badgeX = badgeW !== null ? textX + textW + gap : null;
  return { textX, textRight: textX + textW, badgeX, badgeRight: badgeX !== null ? badgeX + badgeW! : null };
}

const CX = 375;
const GAP = 10;

describe('★★ 两段文字不重叠', () => {
  /** 覆盖真实会出现的组合：文案长短 × 徽章有无/宽窄 */
  const CASES: [string, number, number][] = [
    ['短文案 + 窄徽章', 120, 30],
    ['短文案 + 宽徽章', 120, 60],
    ['长文案 + 宽徽章', 210, 60],
    ['★ 徽章比原固定偏移(16)宽得多', 180, 90],
    ['极端：徽章比文案还宽', 60, 200],
  ];

  it.each(CASES)('%s', (_n, textW, badgeW) => {
    const r = layout(CX, textW, badgeW, GAP);
    // 徽章必须完全在文案右侧，中间还留着 gap
    expect(r.badgeX! - r.textRight).toBeCloseTo(GAP, 5);
    expect(r.badgeX!).toBeGreaterThan(r.textRight);
  });

  it('★ 整组居中：左右留白相等', () => {
    for (const [, textW, badgeW] of CASES) {
      const r = layout(CX, textW, badgeW, GAP);
      const leftGap = r.textX - (CX - (textW + GAP + badgeW) / 2);
      const rightGap = CX + (textW + GAP + badgeW) / 2 - r.badgeRight!;
      expect(leftGap).toBeCloseTo(0, 5);
      expect(rightGap).toBeCloseTo(0, 5);
    }
  });

  it('没有徽章时，文案自己居中', () => {
    const r = layout(CX, 160, null, GAP);
    expect(r.textX + 160 / 2).toBeCloseTo(CX, 5);
    expect(r.badgeX).toBeNull();
  });

  /**
   * ★ 这条是对**旧实现**的反证：固定偏移在徽章够宽时必然重叠。
   *   留着它是为了说明"为什么不能用固定偏移"。
   */
  it('★★ 反证：固定左移 16 在宽徽章下会重叠', () => {
    const textW = 180;
    const badgeW = 90;
    // 旧算法：文案中心左移 16，徽章贴在文案右缘 + gap
    const oldTextCenter = CX - 16;
    const oldTextRight = oldTextCenter + textW / 2;
    const oldBadgeCenter = oldTextRight + GAP;
    const oldBadgeLeft = oldBadgeCenter - badgeW / 2;
    expect(oldBadgeLeft).toBeLessThan(oldTextRight); // ← 重叠
  });
});
