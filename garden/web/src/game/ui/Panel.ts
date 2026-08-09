/**
 * game/ui/Panel.ts —— 模态面板的公共部件
 *
 * ★ 设置面板与结算弹窗共用：都是"压暗背景 + 居中卡片 + 若干大按钮"。
 *
 * ★ 按钮尺寸有硬下限（MIN_TAP_PT）：核心用户是 50+ 与 8~15 岁，
 *   手抖与小手都打不准小按钮。这不是审美问题 ——
 *   点不中的按钮等于没有这个功能。
 */

import Phaser from 'phaser';
import { ENV_PALETTE, ENV_HEX } from '../../config/pieces';
import { fontPx, px } from './uiScale';
import { ELEVATION } from '../../config/tuning';

const FONT = '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif';

/**
 * ★ 触摸目标最小边长（**设计像素**）。Apple HIG 是 44，这里对 50+ 用户再放宽。
 * ⚠️ 用到实际坐标时要经 px() 换算成物理像素（见 uiScale.ts）。
 */
export const MIN_TAP_PT = 52;

export interface ButtonSpec {
  readonly label: string;
  readonly onClick: () => void;
  /** 主按钮用实心，次按钮用描边 —— 视觉上要能一眼分出主次 */
  readonly primary?: boolean;
}

export class Panel {
  private readonly nodes: Phaser.GameObjects.GameObject[] = [];
  private readonly layer: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    depth = 100,
  ) {
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(depth);
  }

  /**
   * 压暗背景。
   * ★ 必须**吃掉点击**，否则玩家会隔着弹窗点到棋盘 ——
   *   那会在结算过程中触发新回合，状态机直接乱掉。
   */
  scrim(alpha = 0.45): void {
    const { width, height } = this.scene.scale;
    const g = this.scene.add.graphics();
    g.fillStyle(ENV_HEX.scrim, alpha);
    g.fillRect(0, 0, width, height);
    g.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.add(g);
  }

  /**
   * 居中卡片。
   *
   * ★ 带投影 —— 没有投影的卡片和背景在同一个平面上，"浮不起来"。
   *   Graphics 没有真模糊，用**几层递减不透明度的圆角矩形**近似柔边，
   *   成本极低（3 个 fillRoundedRect）且效果够用。
   */
  card(centerX: number, centerY: number, w: number, h: number): void {
    const radius = px(this.scene, 20);
    this.dropShadow(
      centerX,
      centerY,
      w,
      h,
      radius,
      px(this.scene, ELEVATION.cardShadowOffsetPt),
      ELEVATION.cardShadowAlpha,
    );

    const g = this.scene.add.graphics();
    g.fillStyle(ENV_HEX.panelBg, 1);
    g.fillRoundedRect(centerX - w / 2, centerY - h / 2, w, h, radius);
    g.lineStyle(px(this.scene, 3), ENV_HEX.panelStroke, 1);
    g.strokeRoundedRect(centerX - w / 2, centerY - h / 2, w, h, radius);
    this.add(g);
  }

  /**
   * 投影：几层向下偏移、不透明度递减的圆角矩形。
   *
   * ★ 用 `panelStroke`（暖棕）而非纯黑 —— 纯黑阴影压在暖色背景上会发灰发脏。
   */
  private dropShadow(
    cx: number,
    cy: number,
    w: number,
    h: number,
    radius: number,
    offset: number,
    alpha: number,
  ): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const layers = ELEVATION.cardShadowLayers;
    for (let i = layers; i >= 1; i--) {
      // 越外层越淡、越偏下，叠出柔边
      const t = i / layers;
      g.fillStyle(ENV_HEX.panelStroke, (alpha * (1 - t * 0.55)) / layers + alpha / (layers * 2));
      const grow = offset * t;
      g.fillRoundedRect(
        cx - w / 2 - grow * 0.35,
        cy - h / 2 + offset * 0.55 + grow * 0.35,
        w + grow * 0.7,
        h + grow * 0.7,
        radius + grow * 0.35,
      );
    }
    this.add(g);
    return g;
  }

  title(x: number, y: number, text: string, size = 26): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: fontPx(this.scene, size),
        fontStyle: 'bold',
        color: ENV_PALETTE.textDark,
      })
      .setOrigin(0.5);
    this.add(t);
    return t;
  }

  label(x: number, y: number, text: string, size = 17): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: fontPx(this.scene, size),
        color: ENV_PALETTE.textDark,
      })
      .setOrigin(0.5);
    this.add(t);
    return t;
  }

  /**
   * 大按钮。
   *
   * ★ 命中区域按 MIN_TAP_PT 兜底：视觉可以做小，**可点区域不许小**。
   *   Phaser 的 setInteractive 默认用贴图边界，这里显式给 Rectangle。
   */
  button(x: number, y: number, w: number, spec: ButtonSpec): void {
    // ★ MIN_TAP_PT 是设计像素，命中区要按物理像素算
    const h = px(this.scene, MIN_TAP_PT);
    const width = Math.max(w, h);
    const radius = px(this.scene, 14);

    // 投影（比卡片浅，否则按钮会显得比卡片还"高"）
    const shadow = this.dropShadow(
      x,
      y,
      width,
      h,
      radius,
      px(this.scene, ELEVATION.btnShadowOffsetPt),
      ELEVATION.btnShadowAlpha,
    );

    const g = this.scene.add.graphics();
    if (spec.primary) {
      g.fillStyle(ENV_HEX.btnPrimary, 1);
      g.fillRoundedRect(x - width / 2, y - h / 2, width, h, radius);
    } else {
      g.fillStyle(ENV_HEX.btnSecondary, 1);
      g.fillRoundedRect(x - width / 2, y - h / 2, width, h, radius);
      g.lineStyle(px(this.scene, 2.5), ENV_HEX.panelStroke, 1);
      g.strokeRoundedRect(x - width / 2, y - h / 2, width, h, radius);
    }
    this.add(g);

    const t = this.scene.add
      .text(x, y, spec.label, {
        fontFamily: FONT,
        fontSize: fontPx(this.scene, 19),
        fontStyle: 'bold',
        color: spec.primary ? ENV_PALETTE.btnPrimaryText : ENV_PALETTE.textDark,
      })
      .setOrigin(0.5);
    this.add(t);

    // ★ 命中区用独立的透明矩形，不依赖文字或图形的边界
    const hit = this.scene.add.zone(x, y, width, h);
    hit.setInteractive({ useHandCursor: true });
    this.add(hit);

    /**
     * ★★ 按下态：按钮**整体下沉**一点点，松开回弹。
     *
     *   这是最廉价也最有效的一条 —— 没有它，点下去到动画开始之间
     *   有一段"什么都没发生"的空白，玩家会怀疑是不是没点中
     *   （50+ 用户的典型反应是再点一下，于是触发两次）。
     *
     *   下沉时**投影同步变浅**，符合"离桌面更近"的物理直觉。
     */
    const sink = px(this.scene, ELEVATION.pressSinkPt);
    const parts = [g, t];
    const press = (): void => {
      for (const o of parts) this.scene.tweens.add({ targets: o, y: `+=${sink}`, duration: ELEVATION.pressMs, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: shadow, alpha: 0.4, duration: ELEVATION.pressMs });
    };
    const release = (): void => {
      for (const o of parts) this.scene.tweens.add({ targets: o, y: `-=${sink}`, duration: ELEVATION.releaseMs, ease: 'Back.easeOut' });
      this.scene.tweens.add({ targets: shadow, alpha: 1, duration: ELEVATION.releaseMs });
    };

    let down = false;
    hit.on('pointerdown', () => {
      down = true;
      press();
    });
    hit.on('pointerup', () => {
      if (!down) return;
      down = false;
      release();
      spec.onClick();
    });
    /**
     * ⚠️ 手指滑出按钮再松开**不算点击**，但必须回弹 ——
     *   否则按钮会永远停在下沉状态（看起来像卡住了）。
     */
    hit.on('pointerout', () => {
      if (!down) return;
      down = false;
      release();
    });
  }

  add(obj: Phaser.GameObjects.GameObject): void {
    this.layer.add(obj);
    this.nodes.push(obj);
  }

  destroy(): void {
    for (const n of this.nodes) n.destroy();
    this.nodes.length = 0;
    this.layer.destroy();
  }
}
