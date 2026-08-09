/**
 * game/render/MatchFx.ts —— 消除粒子与连锁反馈（A1「爽感核心」）
 *
 * ★★ 在此之前，消除只有"缩小淡出"，5 连锁和 3 消**看起来完全一样**。
 *   玩家做出很厉害的一步却毫无察觉 —— 三消的爽感几乎全来自这一刻。
 *
 * ★ 粒子纹理**代码生成**，不出美术图（同 Backdrop 的思路）：
 *   一张白色柔边圆点 + `tint` 就能出全部六色。
 *   若改用 PNG，要么出 6 张图（首屏多 6 个请求），
 *   要么用一张彩图导致 tint 后颜色发脏。
 *
 * ★ 所有数值来自 config/tuning.ts 的 MATCH_FX / CASCADE_FX，
 *   判断逻辑来自 fxPlan.ts（纯函数、可单测）。本文件只做"画"。
 *
 * ⚠️ 粒子发射器用完即毁：Phaser 的 emitter 不会自己消失，
 *   每回合累积几十个不可见的发射器，几局之后就明显掉帧。
 */

import type Phaser from 'phaser';
import { MATCH_FX, CASCADE_FX, type FxLevel, type Tempo, TEMPO } from '../../config/tuning';
import { PIECE_DEFS, ENV_PALETTE, ENV_HEX } from '../../config/pieces';
import type { PieceColor } from '../../core/types';
import { budgetedCount, shakeIntensity, shouldLabel, shouldShake } from './fxPlan';
import { fontPx } from '../ui/uiScale';

const TEX_KEY = 'fx-dot';

export class MatchFx {
  /** 存活中的发射器，场景切换时统一清掉 */
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getFxLevel: () => FxLevel,
    private readonly getTempo: () => Tempo,
  ) {}

  /**
   * 生成柔边圆点纹理（只做一次）。
   *
   * ★ 用径向渐变而不是实心圆：实心圆缩小后边缘发硬，
   *   看起来像"方块碎片"而不是"迸溅的汁水"。
   */
  private ensureTexture(): boolean {
    if (this.scene.textures.exists(TEX_KEY)) return true;
    const size = MATCH_FX.textureSize;
    const tex = this.scene.textures.createCanvas(TEX_KEY, size, size);
    const ctx = tex?.getContext();
    if (!ctx || !tex) return false;

    const r = size / 2;
    /**
     * ★ 实心核 + 短过渡带。
     *   原来 0.5 处就衰到 0.85、边缘全透，等于大半个纹理是空的 ——
     *   看起来比设定值小得多。核心保持不透明到 0.62，
     *   剩下的做柔边，既有"实体感"又不会边缘发硬。
     */
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.62, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
    return true;
  }

  /**
   * 在若干格子上迸发粒子。
   *
   * @param points 世界坐标（已由 BoardView.positionOf 换算）
   * @param color  被消除棋子的颜色 —— 粒子取同色，才读得出"是它炸了"
   * @param level  连锁层级（1 = 普通消除）
   * @param cellSize 格子边长（物理像素），粒子速度与大小都按它缩放
   */
  burst(
    points: readonly { x: number; y: number }[],
    color: PieceColor,
    level: number,
    cellSize: number,
  ): void {
    const def = PIECE_DEFS[color];
    this.emit(points, Number.parseInt(def.hex.slice(1), 16), level, cellSize);
  }

  /**
   * 中性色（金）迸发 —— 用于火箭/炸弹爆炸。
   *
   * ★ 不逐格取水果色：渲染层没有"某格是什么颜色"的索引，
   *   为特效再维护一份就成了第二个真相源（违反冻结契约 2）。
   */
  burstNeutral(points: readonly { x: number; y: number }[], level: number, cellSize: number): void {
    this.emit(points, ENV_HEX.btnPrimary, level, cellSize);
  }

  private emit(
    points: readonly { x: number; y: number }[],
    tint: number,
    level: number,
    cellSize: number,
  ): void {
    if (points.length === 0 || cellSize <= 0) return;
    const per = budgetedCount(points.length, level, this.getFxLevel());
    if (per === 0) return;
    if (!this.ensureTexture()) return;

    const scale = TEMPO[this.getTempo()];
    const lifespan = MATCH_FX.lifespanMs * scale;

    for (const p of points) {
      const emitter = this.scene.add.particles(p.x, p.y, TEX_KEY, {
        lifespan,
        speed: {
          min: cellSize * MATCH_FX.speedRatio.min,
          max: cellSize * MATCH_FX.speedRatio.max,
        },
        angle: { min: 0, max: 360 },
        gravityY: MATCH_FX.gravityY,
        scale: {
          start: (cellSize * MATCH_FX.sizeRatio) / MATCH_FX.textureSize,
          end: 0,
        },
        alpha: { start: 1, end: 0 },
        tint,
        /**
         * ★★ **不要用 ADD 混合**。
         *
         *   ADD 是深色背景游戏的默认选择（发光效果），但本作背景是
         *   **浅奶油色**（ENV_PALETTE.skyLight）。加色混合在浅底上会把
         *   所有颜色推向白 —— 实测红/蓝/紫迸出来是**一模一样的白点**，
         *   而"粒子带着水果自己的颜色"正是这个特效的全部意义。
         *   （浏览器实跑截图里发现的：单测查不出颜色对不对。）
         */
        blendMode: 'NORMAL',
        emitting: false,
      });
      emitter.setDepth(50);
      emitter.explode(per);
      this.track(emitter, lifespan);
    }
  }

  /**
   * 连锁反馈：屏幕轻震 + "连击 xN"。
   *
   * ★ 震动强度与阈值都在 config —— 低压力定位下这是"强调"不是"惩罚"，
   *   幅度必须保守，否则 50+ 用户会觉得晃得难受。
   */
  cascade(level: number, at: { x: number; y: number } | null, cellSize: number): void {
    const fx = this.getFxLevel();
    if (shouldShake(level, fx)) {
      this.scene.cameras.main.shake(CASCADE_FX.shakeMs, shakeIntensity(level));
    }
    if (shouldLabel(level) && at) this.showLabel(level, at, cellSize);
  }

  private showLabel(level: number, at: { x: number; y: number }, cellSize: number): void {
    const scale = TEMPO[this.getTempo()];
    const text = this.scene.add
      .text(at.x, at.y, `连击 x${level}`, {
        fontFamily: '"PingFang SC", sans-serif',
        fontSize: fontPx(this.scene, 22),
        fontStyle: 'bold',
        color: ENV_PALETTE.btnPrimary,
        stroke: ENV_PALETTE.textDark,
        strokeThickness: Math.max(2, cellSize * 0.06),
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.labels.push(text);

    this.scene.tweens.add({
      targets: text,
      y: at.y - cellSize * CASCADE_FX.labelRiseRatio,
      alpha: { from: 1, to: 0 },
      scale: { from: 0.7, to: 1.1 },
      duration: CASCADE_FX.labelMs * scale,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy();
        this.labels = this.labels.filter((t) => t !== text);
      },
    });
  }

  /**
   * ★ 到期自动销毁发射器。
   *   Phaser 不会自己回收，留着就是纯泄漏 —— 几局之后帧率明显下降。
   *   多给一点余量（×1.5）确保最后一颗粒子已经消失。
   */
  private track(emitter: Phaser.GameObjects.Particles.ParticleEmitter, lifespan: number): void {
    this.emitters.push(emitter);
    this.scene.time.delayedCall(lifespan * 1.5, () => {
      emitter.destroy();
      this.emitters = this.emitters.filter((e) => e !== emitter);
    });
  }

  /** 场景切换 / 重开时清场 */
  destroy(): void {
    for (const e of this.emitters) e.destroy();
    this.emitters = [];
    for (const t of this.labels) t.destroy();
    this.labels = [];
  }
}
