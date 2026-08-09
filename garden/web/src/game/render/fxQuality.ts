/**
 * game/render/fxQuality.ts —— 画质档位的自动降级
 *
 * ★★ 按 config 的 FX_SAMPLING：**后台持续采样，不做启动时测速**。
 *   "启动测 3 秒帧率"会让游戏卡在启动画面 3 秒，那本身就是糟糕的第一印象；
 *   持续采样还能应对**中途发热降频**（老手机的真实场景）。
 *
 * ★★ 只降不升是刻意的 —— 升档需要长得多的稳定观察窗口（upgradeStableMs）。
 *   画质在两档间反复横跳比一直低画质更难受。
 *
 * ⚠️ 本文件不 import Phaser：喂帧时间的是调用方，
 *   这样才能在 Node 里用假时间线单测"到底降不降档"。
 */

import { FX_SAMPLING, type FxLevel } from '../../config/tuning';

const ORDER: readonly FxLevel[] = ['high', 'medium', 'low'];

export class FxQualityMonitor {
  private level: FxLevel;
  private frames = 0;
  private windowStart = 0;
  private started = false;
  /** 连续处于"够快"状态的累计时长，够长才升档 */
  private goodMs = 0;
  /** 刚降过档，下一个窗口先观察不再降 —— 见 evaluate() */
  private coolingDown = false;

  constructor(initial: FxLevel = 'high') {
    this.level = initial;
  }

  current(): FxLevel {
    return this.level;
  }

  /**
   * 每帧调用一次。
   *
   * @param nowMs 当前时间（ms），由调用方提供 —— 便于测试注入假时间
   */
  tick(nowMs: number): void {
    if (!this.started) {
      this.started = true;
      this.windowStart = nowMs;
      this.frames = 0;
      return;
    }
    this.frames++;
    const elapsed = nowMs - this.windowStart;
    if (elapsed < FX_SAMPLING.windowMs) return;

    const fps = (this.frames * 1000) / elapsed;
    this.evaluate(fps, elapsed);
    this.windowStart = nowMs;
    this.frames = 0;
  }

  private evaluate(fps: number, elapsed: number): void {
    if (fps < FX_SAMPLING.downgradeBelowFps) {
      // ★ 降档立即生效，且把"表现良好"的累计清零
      this.goodMs = 0;
      /**
       * ★★ 一次降档后**跳过下一个窗口**再判断。
       *
       *   降档要等粒子真的变少才会反映到帧率上，而那至少是下一个
       *   采样窗口的事。不跳过的话，一段持续 2 个窗口的卡顿会
       *   **连降两级**（high → medium → low），把画质砍到底 ——
       *   实际上降一级可能就够了。
       *   （单测 "持续低帧率会降档" 最初就是在这里挂的：
       *   喂 2.2 个窗口的 25fps，期望 medium，实际直接到了 low。）
       */
      if (this.coolingDown) {
        this.coolingDown = false;
        return;
      }
      const i = ORDER.indexOf(this.level);
      if (i >= 0 && i < ORDER.length - 1) {
        const next = ORDER[i + 1];
        if (next) {
          this.level = next;
          this.coolingDown = true;
        }
      }
      return;
    }
    // 恢复到正常帧率后，冷却状态解除
    this.coolingDown = false;

    if (fps > FX_SAMPLING.upgradeAboveFps) {
      this.goodMs += elapsed;
      if (this.goodMs >= FX_SAMPLING.upgradeStableMs) {
        const i = ORDER.indexOf(this.level);
        if (i > 0) {
          const prev = ORDER[i - 1];
          if (prev) this.level = prev;
        }
        this.goodMs = 0;
      }
      return;
    }

    // 处于两个阈值之间：不动档，但也不累积"良好"时长
    this.goodMs = 0;
  }
}
