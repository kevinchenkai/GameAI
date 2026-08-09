/**
 * tests/game/fxQuality.test.ts —— 画质自动降级
 *
 * ★ 用注入的假时间线跑，不依赖真实帧率 ——
 *   "掉帧时会不会降档"在真机上极难复现（要先把机器跑热）。
 */

import { describe, expect, it } from 'vitest';
import { FxQualityMonitor } from '../../src/game/render/fxQuality';
import { FX_SAMPLING } from '../../src/config/tuning';

/** 以 `fps` 的速率喂满 `ms` 毫秒 */
function feed(m: FxQualityMonitor, fps: number, ms: number, startAt = 0): number {
  const step = 1000 / fps;
  let t = startAt;
  const end = startAt + ms;
  while (t < end) {
    m.tick(t);
    t += step;
  }
  return t;
}

describe('FxQualityMonitor', () => {
  it('默认 high', () => {
    expect(new FxQualityMonitor().current()).toBe('high');
  });

  it('★ 持续低帧率会降档', () => {
    const m = new FxQualityMonitor();
    feed(m, 30, FX_SAMPLING.windowMs * 2.2);
    expect(m.current()).toBe('medium');
  });

  it('★ 一直很卡会一路降到 low，且不再往下越界', () => {
    const m = new FxQualityMonitor();
    feed(m, 20, FX_SAMPLING.windowMs * 12);
    expect(m.current()).toBe('low');
  });

  /**
   * ★★ 一段持续卡顿**只降一级**，不连降到底。
   *   降档要等粒子真的变少才反映到帧率上，那至少是下个窗口的事；
   *   立刻再判一次等于拿"还没生效"的数据做决定。
   */
  it('★ 一次卡顿不连降两级', () => {
    const m = new FxQualityMonitor();
    feed(m, 25, FX_SAMPLING.windowMs * 3);
    expect(m.current()).toBe('medium');
  });

  it('帧率良好时不降档', () => {
    const m = new FxQualityMonitor();
    feed(m, 60, FX_SAMPLING.windowMs * 3);
    expect(m.current()).toBe('high');
  });

  /**
   * ★★ 只降不升的观察窗口不对称，是刻意设计：
   *   画质在两档间反复横跳比一直低画质更难受。
   */
  it('★ 降档后短暂恢复流畅不会立刻升回去', () => {
    const m = new FxQualityMonitor();
    let t = feed(m, 25, FX_SAMPLING.windowMs * 2.2);
    expect(m.current()).toBe('medium');

    // 只流畅一个采样窗口，远不到 upgradeStableMs
    t = feed(m, 60, FX_SAMPLING.windowMs * 1.2, t);
    expect(m.current()).toBe('medium');
  });

  it('持续足够久的高帧率才会升档', () => {
    const m = new FxQualityMonitor();
    let t = feed(m, 25, FX_SAMPLING.windowMs * 2.2);
    expect(m.current()).toBe('medium');

    t = feed(m, 60, FX_SAMPLING.upgradeStableMs + FX_SAMPLING.windowMs * 2, t);
    expect(m.current()).toBe('high');
  });

  /**
   * ★ 中间地带（45~58fps）既不降也不升，且**不累积**升档时长 ——
   *   否则一台常年跑 50fps 的机器会慢慢升到 high，然后开始掉帧再降回来，
   *   陷入横跳。
   */
  it('★ 卡在中间帧率不会慢慢升档', () => {
    const m = new FxQualityMonitor();
    let t = feed(m, 25, FX_SAMPLING.windowMs * 2.2);
    expect(m.current()).toBe('medium');

    const mid = (FX_SAMPLING.downgradeBelowFps + FX_SAMPLING.upgradeAboveFps) / 2;
    t = feed(m, mid, FX_SAMPLING.upgradeStableMs * 3, t);
    expect(m.current()).toBe('medium');
  });
});
