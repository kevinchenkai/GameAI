/**
 * tests/game/fxPlan.test.ts —— 消除/连锁特效的判断逻辑
 *
 * ★★ 为什么这些必须单测：A1 要解决的问题就是"5 连锁和 3 消看起来一样"。
 *   而"第 5 层到底比第 3 层强没强"**恰恰是肉眼看不出来的** ——
 *   在浏览器里连出 5 连锁本身就很难，更别说和 3 连锁并排比较。
 *   靠看验收，等于没验收。
 */

import { describe, expect, it } from 'vitest';
import {
  budgetedCount,
  cascadeIntensity,
  particleCount,
  shakeIntensity,
  shouldLabel,
  shouldShake,
} from '../../src/game/render/fxPlan';
import { CASCADE_FX, FX_QUALITY, MATCH_FX } from '../../src/config/tuning';

describe('cascadeIntensity', () => {
  it('第 1 层是普通消除，不做强调', () => {
    expect(cascadeIntensity(1)).toBe(1);
    expect(cascadeIntensity(0)).toBe(1);
  });

  it('★ 层级越深越强 —— 这正是 A1 的核心诉求', () => {
    const seq = [2, 3, 4, 5].map(cascadeIntensity);
    for (let i = 1; i < seq.length; i++) {
      const prev = seq[i - 1];
      const cur = seq[i];
      expect(prev).toBeDefined();
      expect(cur).toBeDefined();
      // 单调不减，且至少在前几档是严格递增的
      expect(cur as number).toBeGreaterThanOrEqual(prev as number);
    }
    expect(cascadeIntensity(3)).toBeGreaterThan(cascadeIntensity(2));
  });

  it('超出配置表的深连锁取最后一档，不会越界为 undefined', () => {
    const last = CASCADE_FX.intensity[CASCADE_FX.intensity.length - 1];
    expect(cascadeIntensity(99)).toBe(last);
    expect(Number.isFinite(cascadeIntensity(99))).toBe(true);
  });
});

describe('particleCount', () => {
  it('low 档完全关闭粒子（老机器保帧率）', () => {
    expect(particleCount(1, 'low')).toBe(0);
    expect(particleCount(9, 'low')).toBe(0);
  });

  it('连锁越深粒子越多', () => {
    expect(particleCount(3, 'high')).toBeGreaterThan(particleCount(1, 'high'));
  });

  it('★ 不超过单格上限 —— 连锁很深时也不能爆量', () => {
    expect(particleCount(99, 'high')).toBeLessThanOrEqual(MATCH_FX.maxPerCell);
  });

  it('★ 不超过画质档上限；medium 比 high 少', () => {
    expect(particleCount(99, 'medium')).toBeLessThanOrEqual(FX_QUALITY.medium.maxParticles);
    expect(particleCount(99, 'medium')).toBeLessThanOrEqual(particleCount(99, 'high'));
  });
});

describe('budgetedCount', () => {
  it('没有格子就没有粒子', () => {
    expect(budgetedCount(0, 3, 'high')).toBe(0);
  });

  it('low 档恒为 0', () => {
    expect(budgetedCount(8, 3, 'low')).toBe(0);
  });

  /**
   * ★★ 这条是 budgetedCount 存在的理由。
   *   单格上限挡不住**格子数**：一发火箭清掉整行 8 格，
   *   每格 14 粒就是 112 粒，low 端机器肉眼可见掉帧。
   */
  it('大范围消除时，每格粒子数被压低（总量受控）', () => {
    const few = budgetedCount(3, 3, 'medium');
    const many = budgetedCount(40, 3, 'medium');
    expect(many).toBeLessThanOrEqual(few);
  });

  it('★ 但再大范围也至少给 1 粒 —— 否则整行消除反而毫无反馈', () => {
    expect(budgetedCount(64, 1, 'medium')).toBeGreaterThanOrEqual(1);
    expect(budgetedCount(64, 1, 'high')).toBeGreaterThanOrEqual(1);
  });

  it('返回值恒为整数（粒子数不能是小数）', () => {
    for (const cells of [1, 3, 7, 8, 16, 49]) {
      for (const lv of [1, 2, 5]) {
        const n = budgetedCount(cells, lv, 'high');
        expect(Number.isInteger(n)).toBe(true);
      }
    }
  });
});

describe('连锁反馈的触发阈值', () => {
  it('★ 普通消除（第 1 层）不震屏 —— 每步都震会变成惊吓', () => {
    expect(shouldShake(1, 'high')).toBe(false);
    expect(shouldShake(2, 'high')).toBe(false);
  });

  it('达到阈值层级才震', () => {
    expect(shouldShake(CASCADE_FX.shakeFromLevel, 'high')).toBe(true);
    expect(shouldShake(CASCADE_FX.shakeFromLevel + 3, 'high')).toBe(true);
  });

  it('low 档即使深连锁也不震（shake 属于可降级项）', () => {
    expect(shouldShake(9, 'low')).toBe(false);
  });

  it('"连击 xN" 只在够深时出现', () => {
    expect(shouldLabel(1)).toBe(false);
    expect(shouldLabel(CASCADE_FX.labelFromLevel)).toBe(true);
  });
});

describe('shakeIntensity', () => {
  it('随层级增强', () => {
    expect(shakeIntensity(4)).toBeGreaterThan(shakeIntensity(2));
  });

  /**
   * ★★ 低压力定位的硬约束：震屏是"强调"不是"惩罚"。
   *   核心用户是 50+ 与 8~15 岁，屏幕剧烈晃动会让人不适。
   */
  it('★ 有上限 —— 再深的连锁也不会晃得难受', () => {
    const cap = CASCADE_FX.shakeIntensity * 2;
    for (const lv of [3, 5, 10, 99]) {
      expect(shakeIntensity(lv)).toBeLessThanOrEqual(cap);
    }
  });
});
