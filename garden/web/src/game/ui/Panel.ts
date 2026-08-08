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
import { ENV_PALETTE } from '../../config/pieces';

const FONT = '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif';

/** ★ 触摸目标最小边长（pt）。Apple HIG 是 44，这里对 50+ 用户再放宽 */
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
    g.fillStyle(0x2a1e12, alpha);
    g.fillRect(0, 0, width, height);
    g.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.add(g);
  }

  card(centerX: number, centerY: number, w: number, h: number): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0xfffbf2, 1);
    g.fillRoundedRect(centerX - w / 2, centerY - h / 2, w, h, 20);
    g.lineStyle(3, 0x8a6a4a, 1);
    g.strokeRoundedRect(centerX - w / 2, centerY - h / 2, w, h, 20);
    this.add(g);
  }

  title(x: number, y: number, text: string, size = 26): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color: ENV_PALETTE.textDark,
      })
      .setOrigin(0.5);
    this.add(t);
    return t;
  }

  label(x: number, y: number, text: string, size = 17): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color: ENV_PALETTE.textDark })
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
    const h = Math.max(MIN_TAP_PT, 52);
    const width = Math.max(w, MIN_TAP_PT);

    const g = this.scene.add.graphics();
    if (spec.primary) {
      g.fillStyle(0xffb03a, 1);
      g.fillRoundedRect(x - width / 2, y - h / 2, width, h, 14);
    } else {
      g.fillStyle(0xfff6e5, 1);
      g.fillRoundedRect(x - width / 2, y - h / 2, width, h, 14);
      g.lineStyle(2.5, 0x8a6a4a, 1);
      g.strokeRoundedRect(x - width / 2, y - h / 2, width, h, 14);
    }
    this.add(g);

    const t = this.scene.add
      .text(x, y, spec.label, {
        fontFamily: FONT,
        fontSize: '19px',
        fontStyle: 'bold',
        color: spec.primary ? '#4A3520' : ENV_PALETTE.textDark,
      })
      .setOrigin(0.5);
    this.add(t);

    // ★ 命中区用独立的透明矩形，不依赖文字或图形的边界
    const hit = this.scene.add.zone(x, y, width, h);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerup', spec.onClick);
    this.add(hit);
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
