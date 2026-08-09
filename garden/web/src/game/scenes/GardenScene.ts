/**
 * game/scenes/GardenScene.ts —— 花园场景（M7）
 *
 * Stage 0 只有院门 1 个节点、3 个阶段。
 *
 * ★★ 院门 4 张合计 3064KB，**在本场景里按需加载**，不进 BootScene。
 *   玩家要先通关 3 次才会看到花园 —— 为一张几分钟后才用到的图
 *   让所有人多等几秒白屏是纯亏（docs/TODO-性能优化.md）。
 *
 * ★ 建设进度条**也在关卡结算界面显示**（见 ui/gardenBar.ts），
 *   让玩家在"还要不要再玩一关"的决策点看到"就差一点"。
 *   这个心理是留存核心，不能只在本页显示。
 */

import Phaser from 'phaser';
import { ASSETS } from '../../config/assets';
import { ENV_PALETTE, ENV_HEX } from '../../config/pieces';
import { PET_LINES } from '../../config/pet';
import { buildNodeStage, nodeProgress, type NodeProgress } from '../../meta/gardenProgress';
import { loadSave, saveSave, type SaveData } from '../../meta/save';
import { GARDEN_NODES } from '../../config/garden';
import { TEX } from '../textureKeys';
import { MIN_TAP_PT, Panel } from '../ui/Panel';
import { fontPx, px } from '../ui/uiScale';
import { readSafeAreaInsets } from '../safeArea';

const FONT = '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif';

export class GardenScene extends Phaser.Scene {
  private save!: SaveData;
  private gate: Phaser.GameObjects.Image | null = null;
  private nodes: Phaser.GameObjects.GameObject[] = [];
  /** ★ Panel 不是 GameObject，有自己的 destroy()，单独存 —— 不要硬转 */
  private buttons: Panel | null = null;
  /** 建设中不接受第二次点击 —— 否则连点会连建两级 */
  private busy = false;

  constructor() {
    super('Garden');
  }

  /**
   * ★ 按需加载院门贴图。
   *   Phaser 对已存在的 key 会跳过，重复进入花园不会重复下载。
   */
  preload(): void {
    ASSETS.garden.gate.forEach((path, stage) => {
      const key = TEX.gate(stage);
      if (!this.textures.exists(key)) this.load.image(key, path);
    });
  }

  create(): void {
    this.save = loadSave();
    this.busy = false;
    this.nodes = [];
    this.gate = null;

    this.cameras.main.setBackgroundColor(ENV_PALETTE.skyLight);
    this.render();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
  }

  private onResize(): void {
    this.render();
  }

  /** 整页重绘。★ 页面很简单，重绘比做局部更新可靠 */
  private render(): void {
    for (const n of this.nodes) n.destroy();
    this.nodes = [];
    this.gate?.destroy();
    this.gate = null;
    // ★ 按钮也要销毁，否则重绘后旧按钮的命中区还在，点了会重复触发
    this.buttons?.destroy();
    this.buttons = null;

    const node = GARDEN_NODES[0];
    if (!node) return;
    const p = nodeProgress(this.save, node);

    const { width, height } = this.scale;
    const insets = this.insets();
    const topY = insets.top;
    const bottomY = height - insets.bottom;

    /**
     * ★★ 自下而上排版：按钮数量是**可变的**（可建设时多一个「建设」），
     *   所以进度文字的位置必须由按钮块的实际高度反推，不能写死偏移。
     *
     *   ⚠️ 第一版用固定偏移（bottomY - 132 / -46），可建设时按钮块变高，
     *   直接把"可以建设了！"和阶段格子盖住了 —— 实跑截图才看出来。
     */
    const btnH = px(this, MIN_TAP_PT);
    const btnGap = px(this, 12);
    const btnCount = p.canBuild && !p.complete ? 2 : 1;
    const btnBlockH = btnCount * btnH + (btnCount - 1) * btnGap;

    // 按钮块底部贴着安全区
    const btnBottom = bottomY;
    const btnTop = btnBottom - btnBlockH;

    // 进度区（文字 + 格子）在按钮块之上，自己占约 52pt
    const progressH = px(this, 52);
    const progressY = btnTop - px(this, 20) - progressH;

    this.drawTitle(width / 2, topY + px(this, 20), node.name);
    // 院门占据标题与进度区之间的剩余空间
    const gateTop = topY + px(this, 52);
    this.drawGate(width / 2, (gateTop + progressY) / 2, p, progressY - gateTop);
    this.drawProgress(width / 2, progressY, p);
    this.drawButtons(width / 2, btnTop, btnH, btnGap, p);
  }

  private insets(): { top: number; bottom: number } {
    const scale = this.renderScale();
    const css = readSafeAreaInsets();
    return { top: css.top * scale + px(this, 16), bottom: css.bottom * scale + px(this, 16) };
  }

  private renderScale(): number {
    const canvas = this.game.canvas;
    const cssW = canvas?.clientWidth ?? 0;
    if (!canvas || cssW <= 0) return 1;
    const ratio = canvas.width / cssW;
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  }

  private drawTitle(x: number, y: number, name: string): void {
    const t = this.add
      .text(x, y, `我们的${name}`, {
        fontFamily: FONT,
        fontSize: fontPx(this, 26),
        fontStyle: 'bold',
        color: ENV_PALETTE.textDark,
      })
      .setOrigin(0.5);
    this.nodes.push(t);
  }

  /**
   * 画当前阶段的院门。
   *
   * ★ `stage` 直接当贴图索引：stage=0 是"未建设"的初始图，
   *   建完第 n 阶段就显示第 n 张 —— 与 GARDEN_NODES 的 assetIndex 一致。
   *
   * ★ 贴图没加载成功时画占位框而不是留白 ——
   *   留白让人以为页面坏了，占位框至少表明"这里应该有东西"。
   */
  private drawGate(x: number, y: number, p: NodeProgress, availableH: number): void {
    const key = TEX.gate(p.stage);
    const maxW = this.scale.width * 0.78;
    // ★ 高度上限由**实际可用空间**决定，不用屏幕比例猜 —— 否则会压到进度区
    const maxH = Math.max(0, availableH * 0.92);
    const size = Math.min(maxW, maxH);
    if (size <= 0) return;

    if (this.textures.exists(key)) {
      const img = this.add.image(x, y, key);
      const tex = this.textures.get(key).getSourceImage();
      const ratio = tex.width > 0 ? tex.height / tex.width : 1;
      /**
       * ★ 宽高**两个方向都要夹**：只按宽度算的话，
       *   高比宽大的图会在竖直方向溢出，压到下面的进度区。
       */
      let w = Math.min(maxW, size);
      let h = w * ratio;
      if (h > maxH) {
        h = maxH;
        w = ratio > 0 ? h / ratio : w;
      }
      img.setDisplaySize(w, h);
      this.gate = img;
      return;
    }

    const g = this.add.graphics();
    g.fillStyle(ENV_HEX.stone, 1);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, px(this, 12));
    this.nodes.push(g);
  }

  /**
   * 进度显示。
   *
   * ★ 用**一格一个方块**而不是连续进度条：
   *   "3 颗星建一阶段"是离散的，画成连续条会让玩家以为差一点点就能建，
   *   实际还差一整颗。离散格子和规则同构。
   */
  private drawProgress(x: number, y: number, p: NodeProgress): void {
    const line = p.complete
      ? '院门已经修好啦！'
      : p.canBuild
        ? '可以建设了！'
        : `还差 ${p.starsShort} 颗星`;

    const t = this.add
      .text(x, y, line, {
        fontFamily: FONT,
        fontSize: fontPx(this, 19),
        fontStyle: 'bold',
        color: ENV_PALETTE.textDark,
      })
      .setOrigin(0.5);
    this.nodes.push(t);

    // 阶段格子：已完成实心，未完成描边
    const box = px(this, 18);
    const gap = px(this, 10);
    const total = p.totalStages;
    const startX = x - ((total - 1) * (box + gap)) / 2;
    const boxY = y + px(this, 30);
    const g = this.add.graphics();
    for (let i = 0; i < total; i++) {
      const bx = startX + i * (box + gap) - box / 2;
      if (i < p.stage) {
        g.fillStyle(ENV_HEX.btnPrimary, 1);
        g.fillRoundedRect(bx, boxY, box, box, px(this, 4));
      } else {
        g.lineStyle(px(this, 2), ENV_HEX.panelStroke, 0.6);
        g.strokeRoundedRect(bx, boxY, box, box, px(this, 4));
      }
    }
    this.nodes.push(g);
  }

  /** @param top 按钮块顶端；按钮自上而下依次排下去 */
  private drawButtons(
    x: number,
    top: number,
    btnH: number,
    gap: number,
    p: NodeProgress,
  ): void {
    const panel = new Panel(this, 20);
    const w = Math.min(px(this, 280), this.scale.width - px(this, 48));
    let y = top + btnH / 2;

    if (p.canBuild && !p.complete) {
      panel.button(x, y, w, {
        label: '建设',
        primary: true,
        onClick: () => this.build(),
      });
      y += btnH + gap;
    }

    panel.button(x, y, w, {
      label: '继续玩',
      primary: !p.canBuild,
      onClick: () => this.scene.start('Level'),
    });

    this.buttons = panel;
  }

  /**
   * 执行建设。
   *
   * ★ `busy` 挡连点：50+ 用户常见的操作是"没反应就再点一下"，
   *   不挡的话会连建两级，星星凭空少一份。
   */
  private build(): void {
    if (this.busy) return;
    this.busy = true;

    const r = buildNodeStage(this.save, 'gate');
    if (!r.built) {
      this.busy = false;
      return;
    }

    this.save = r.save;
    saveSave(this.save);
    this.render();
    this.showPetLine(PET_LINES.gardenBuild[0] ?? '');
    this.busy = false;
  }

  /** 旺财的一句话。★ 不做弹窗 —— 建设的主角是院门，不是提示框 */
  private showPetLine(text: string): void {
    if (!text) return;
    const t = this.add
      .text(this.scale.width / 2, this.scale.height * 0.22, text, {
        fontFamily: FONT,
        fontSize: fontPx(this, 20),
        fontStyle: 'bold',
        color: ENV_PALETTE.textDark,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.nodes.push(t);
    this.tweens.add({ targets: t, alpha: 1, duration: 220, yoyo: true, hold: 1400 });
  }
}
