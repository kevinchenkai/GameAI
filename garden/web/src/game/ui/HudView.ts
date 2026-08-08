/**
 * game/ui/HudView.ts —— HUD 的绘制（Phaser 侧）
 *
 * ★ "显示什么"在 hudModel.ts（纯逻辑、可单测），本文件只管"怎么画"。
 *
 * ★ 字号刻意大：核心用户是 50+ 与 8~15 岁两端。
 *   HUD 上的数字如果要眯眼看，这个 HUD 就是失败的。
 */

import type Phaser from 'phaser';
import { ENV_PALETTE } from '../../config/pieces';
import type { LayoutResult } from '../render/layout';
import { TEX } from '../textureKeys';
import type { HudModel, ObjectiveView } from './hudModel';
import { fontPx, px } from './uiScale';

const FONT = '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif';

/** 步数吃紧时的颜色。★ 只变色，不闪烁 —— 见 hudModel 的说明 */
const MOVES_COLOR = { normal: ENV_PALETTE.textDark, low: '#D2691E' } as const;

export class HudView {
  private readonly layer: Phaser.GameObjects.Container;
  private movesLabel: Phaser.GameObjects.Text | null = null;
  private movesValue: Phaser.GameObjects.Text | null = null;
  private objectiveNodes: {
    icon: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    check: Phaser.GameObjects.Text;
  }[] = [];
  /** 图标底板（只有破障类才有），与图标同生命周期 */
  private plates: Phaser.GameObjects.Graphics[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private layout: LayoutResult,
  ) {
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(10); // HUD 永远在棋盘之上
  }

  /** 首次构建。布局变化时走 rebuild()，不要重复调用本方法 */
  build(model: HudModel): void {
    this.clear();
    const r = this.layout.hudRect;

    // —— 左侧：剩余步数 ——
    this.movesLabel = this.scene.add
      .text(r.x + px(this.scene, 18), r.y + r.h * 0.5 - px(this.scene, 16), '剩余步数', {
        fontFamily: FONT,
        fontSize: fontPx(this.scene, 15),
        color: ENV_PALETTE.textDark,
      })
      .setAlpha(0.75);

    this.movesValue = this.scene.add.text(r.x + px(this.scene, 18), r.y + r.h * 0.5 + px(this.scene, 2), '', {
      fontFamily: FONT,
      fontSize: fontPx(this.scene, 30),
      fontStyle: 'bold',
      color: MOVES_COLOR.normal,
    });

    this.layer.add(this.movesLabel);
    this.layer.add(this.movesValue);

    this.buildObjectives(model);
    this.update(model);
  }

  /**
   * 目标区：一个目标一行「图标 ×N」。
   *
   * ★ 图标用**棋子本身的贴图**，不用文字描述颜色。
   *   "收集 12 个黄色" 要求玩家把"黄色"翻译成"香蕉"；
   *   直接画香蕉，8 岁和 68 岁都不用翻译。
   */
  private buildObjectives(model: HudModel): void {
    const r = this.layout.hudRect;
    const size = Math.min(px(this.scene, 34), r.h * 0.42);
    const gap = size + px(this.scene, 46);
    const centerY = r.y + r.h * 0.5;

    /**
     * ★ 右边距要留够**图标半宽 + ✓ 的外挑量**，否则图标会被切掉。
     *
     *   ⚠️ 这里放的是图标**中心点**，不是右边缘。第一版直接用
     *   `r.x + r.w - 18` 当中心，结果图标有一半在屏幕外 ——
     *   单测全过（数据是对的），只有真机截图才看得出来。
     */
    const edgePad = px(this.scene, 12) + size * 0.5 + size * 0.42;
    const rightX = r.x + r.w - edgePad;
    const startX = rightX - (model.objectives.length - 1) * gap;

    for (const [i, o] of model.objectives.entries()) {
      const x = startX + i * gap;
      const icon = this.makeIcon(o, x, centerY - px(this.scene, 6), size);

      const text = this.scene.add
        .text(x, centerY + size * 0.5 + px(this.scene, 2), '', {
          fontFamily: FONT,
          fontSize: fontPx(this.scene, 15),
          fontStyle: 'bold',
          color: ENV_PALETTE.textDark,
        })
        .setOrigin(0.5, 0);

      // 完成标记 —— ✓ 比"变灰"更明确
      const check = this.scene.add
        .text(x + size * 0.42, centerY - size * 0.5 - px(this.scene, 2), '✓', {
          fontFamily: FONT,
          fontSize: fontPx(this.scene, 19),
          fontStyle: 'bold',
          color: '#3FA34D',
        })
        .setOrigin(0.5)
        .setVisible(false);

      this.layer.add(icon);
      this.layer.add(text);
      this.layer.add(check);
      this.objectiveNodes.push({ icon, text, check });
    }
  }

  /**
   * 目标图标。
   *
   * ★ collect 类用**棋子本身的贴图**；破障类用**障碍自己的贴图**。
   *   都不用文字 —— "收集 12 个黄色"要求玩家把"黄色"翻译成"香蕉"，
   *   直接画出来，8 岁和 68 岁都不用翻译。
   *
   * ⚠️ 按 `obstacle` **逐种映射**，不要写成"凡是破障就画冰"：
   *   Stage 0 只有冰，但 ObstacleKind 是开放类型，
   *   写死会在加木箱时静默画出一块冰 —— 类型检查抓不到这种错。
   *   认不出的种类走占位方块，宁可难看也不要画错。
   */
  private makeIcon(
    o: ObjectiveView,
    x: number,
    y: number,
    size: number,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Graphics {
    const key = this.iconTextureKey(o);
    if (key !== null && this.scene.textures.exists(key)) {
      /**
       * ★ 冰是**半透明覆盖层**（设计如此：要能看见下面的棋子）。
       *   单独拿来当图标会显得很淡，所以先垫一块底板。
       *   ⚠️ 不要为此调高冰贴图的不透明度 —— 那会破坏它在棋盘上的本职
       *   （LEGIBILITY-SPEC §5.1：48% 已把六色最小灰度差压到 12.3）。
       */
      if (o.obstacle !== null) {
        const plate = this.scene.add.graphics();
        plate.fillStyle(0xe8f4f8, 1);
        plate.fillRoundedRect(x - size / 2, y - size / 2, size, size, px(this.scene, 6));
        this.layer.add(plate);
        this.plates.push(plate);
      }
      const img = this.scene.add.image(x, y, key);
      img.setDisplaySize(size, size);
      return img;
    }
    // 占位：认不出的目标种类（或贴图没加载成功）
    const g = this.scene.add.graphics();
    g.fillStyle(0xcfc5b4, 1);
    const rr = px(this.scene, 6);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, rr);
    g.lineStyle(px(this.scene, 2), 0x8a6a4a, 1);
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, rr);
    return g;
  }

  private iconTextureKey(o: ObjectiveView): string | null {
    if (o.color) return TEX.piece(o.color);
    if (o.obstacle === 'ice') return TEX.iceOverlay(1);
    return null;
  }

  /** 每回合刷新。★ 只改文本与颜色，不重建节点 */
  update(model: HudModel): void {
    this.movesValue?.setText(String(model.movesLeft));
    this.movesValue?.setColor(model.movesLow ? MOVES_COLOR.low : MOVES_COLOR.normal);

    for (const [i, o] of model.objectives.entries()) {
      const node = this.objectiveNodes[i];
      if (!node) continue;
      // ★ 显示 done/need 而不是 progress 原值：progress 会超额累计
      node.text.setText(`${o.done}/${o.need}`);
      node.check.setVisible(o.complete);
      node.icon.setAlpha(o.complete ? 0.45 : 1);
    }
  }

  setLayout(layout: LayoutResult): void {
    this.layout = layout;
  }

  /** 布局变化（旋转 / 窗口缩放）后整体重建 */
  rebuild(model: HudModel): void {
    this.build(model);
  }

  clear(): void {
    this.movesLabel?.destroy();
    this.movesValue?.destroy();
    this.movesLabel = null;
    this.movesValue = null;
    for (const n of this.objectiveNodes) {
      n.icon.destroy();
      n.text.destroy();
      n.check.destroy();
    }
    this.objectiveNodes = [];
    for (const p of this.plates) p.destroy();
    this.plates = [];
    this.layer.removeAll(true);
  }
}
