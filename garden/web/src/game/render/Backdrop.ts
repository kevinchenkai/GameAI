/**
 * game/render/Backdrop.ts —— 场景背景层次
 *
 * ★★ 为什么不用一张背景图：
 *   背景一旦有细节，就会和棋子**抢注意力** —— 对 50+ 用户尤其危险
 *   （核心判据是"棋子够不够清楚"，见 orders/LEGIBILITY-SPEC.md）。
 *   代码渐变可以做到"有层次但几乎注意不到"，而且零素材、零首屏成本。
 *
 * ★ 实现上用**一次性生成的纹理**，不是每帧画一堆矩形：
 *   渐变用 CanvasTexture 画一条 1px 宽的竖直色带，再横向拉伸铺满。
 *   代价是一张极小的纹理（1 × 高度），GPU 采样几乎免费。
 *
 * ⚠️ 视口变化时要重建（尺寸变了，纹理高度也要变）。
 */

import type Phaser from 'phaser';
import { ENV_PALETTE } from '../../config/pieces';
import { BACKDROP } from '../../config/tuning';

/** 纹理 key。★ 场景重启会复用，故用固定名字 */
const TEX_KEY = 'backdrop-gradient';

export class Backdrop {
  private image: Phaser.GameObjects.Image | null = null;
  private vignette: Phaser.GameObjects.Graphics | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * 建立（或重建）背景。
   *
   * @param width 视口宽（物理像素）
   * @param height 视口高（物理像素）
   */
  build(width: number, height: number): void {
    this.destroy();
    if (width <= 0 || height <= 0) return;

    this.buildGradient(width, height);
    this.buildVignette(width, height);
  }

  /**
   * 竖直渐变：顶部略暖、底部略深。
   *
   * ★ 两端色差**刻意很小**（skyLight → skyDeep，本身就是同色系）。
   *   目的是"画面不平"，不是"背景很好看"。
   */
  private buildGradient(width: number, height: number): void {
    const h = Math.max(2, Math.ceil(height));

    // ★ 已存在就先删 —— 视口变化后高度不同，旧纹理尺寸是错的
    if (this.scene.textures.exists(TEX_KEY)) this.scene.textures.remove(TEX_KEY);

    const tex = this.scene.textures.createCanvas(TEX_KEY, 1, h);
    if (!tex) return;
    const ctx = tex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, ENV_PALETTE.skyLight);
    grad.addColorStop(1, ENV_PALETTE.skyDeep);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, h);
    tex.refresh();

    const img = this.scene.add.image(0, 0, TEX_KEY);
    img.setOrigin(0, 0);
    img.setDisplaySize(width, h);
    /**
     * ★ depth 必须**低于所有内容**。棋盘用的是默认 depth 0，
     *   HUD 是 10、旺财 5、弹窗 100+ —— 背景取负值最稳妥。
     */
    img.setDepth(BACKDROP.depth);
    this.image = img;
  }

  /**
   * 四角压暗（vignette）：极淡的角落阴影，把视线收拢到中间。
   *
   * ★ 同样用几层圆角矩形描边近似，不需要真径向渐变。
   *   强度**必须极低** —— 能感觉到画面"聚焦"，但说不出哪里变暗了。
   */
  private buildVignette(width: number, height: number): void {
    const g = this.scene.add.graphics();
    const layers = BACKDROP.vignetteLayers;
    for (let i = 0; i < layers; i++) {
      const t = i / layers;
      // 越外圈越不透明，叠出由外向内衰减的暗角
      g.lineStyle(
        Math.max(width, height) * BACKDROP.vignetteBandRatio,
        Number.parseInt(ENV_PALETTE.soil.slice(1), 16),
        BACKDROP.vignetteAlpha * (1 - t),
      );
      const inset = -Math.max(width, height) * BACKDROP.vignetteBandRatio * (0.5 + t);
      g.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    }
    g.setDepth(BACKDROP.depth + 1);
    this.vignette = g;
  }

  destroy(): void {
    this.image?.destroy();
    this.image = null;
    this.vignette?.destroy();
    this.vignette = null;
  }
}
