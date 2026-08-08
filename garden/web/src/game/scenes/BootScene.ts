/**
 * game/scenes/BootScene.ts —— 预加载
 *
 * ★ 素材路径一律走 ASSETS.*（冻结契约 6），本文件不得出现任何文件名字面量。
 *   （eslint 强制：src/game/** 里禁止出现 .png/.jpg 字面量）
 * ★ REFERENCE_ONLY 里的两张图（Master、Puppet 拼合预览）**不 preload**。
 */

import Phaser from 'phaser';
import { ASSETS } from '../../config/assets';
import { TEX } from '../textureKeys';
import { hideBootOverlay, setBootError, setBootProgress } from '../bootOverlay';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.bindLoaderProgress();

    // —— 棋子 ——
    for (const [color, path] of Object.entries(ASSETS.pieces)) {
      this.load.image(TEX.piece(color), path);
    }

    // —— UI ——
    this.load.image(TEX.uiPanelBg, ASSETS.ui.panelBg);
    this.load.image(TEX.uiBtnPrimary, ASSETS.ui.btnPrimary);
    this.load.image(TEX.uiBtnPause, ASSETS.ui.btnPause);
    this.load.image(TEX.uiMovesBadge, ASSETS.ui.movesBadge);
    this.load.image(TEX.uiObjectiveSlot, ASSETS.ui.objectiveSlot);

    // —— 背景 ——
    this.load.image(TEX.levelBg, ASSETS.garden.levelBg);

    // —— 障碍：冰（Stage 0 唯一障碍）——
    this.load.image(TEX.iceOverlay(1), ASSETS.obstacles.ice1);
    this.load.image(TEX.iceOverlay(2), ASSETS.obstacles.ice2);

    // —— 特殊棋子叠加层（Stage 0 三种，彩虹球不做）——
    this.load.image(TEX.overlayRocketH, ASSETS.overlays.rocketH);
    this.load.image(TEX.overlayRocketV, ASSETS.overlays.rocketV);
    this.load.image(TEX.overlayBomb, ASSETS.overlays.bomb);

    // —— 花园：院门 4 阶段（M7 的花园场景用）——
    ASSETS.garden.gate.forEach((path, stage) => {
      this.load.image(TEX.gate(stage), path);
    });

    /**
     * ★ Stage 0 所需素材已全部交付。
     *   `special.rainbow` 与 `pet.*` 属 Stage 0.5 / M6，故意不在这里加载 ——
     *   preload 的每一张都会计入首屏，见 docs/TODO-性能优化.md。
     */
  }

  /**
   * 把 Phaser Loader 的进度喂给 HTML 层的进度条。
   *
   * ★ `FILE_LOAD_ERROR` 必须处理：素材 404 时 Phaser **不会中止**，
   *   它照常走完 `complete`，然后场景拿着一堆空纹理去画 ——
   *   表现是"游戏起来了但什么都看不见"，而控制台只有一行 warn。
   *   首次部署踩过一次（全部素材 404），当时排查了很久。
   */
  private bindLoaderProgress(): void {
    const failed: string[] = [];

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      setBootProgress(value);
    });

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      failed.push(file.key);
      console.error(`[Boot] 素材加载失败：${file.key} ← ${String(file.url)}`);
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (failed.length > 0) {
        setBootError(`有 ${failed.length} 项素材没能加载，画面可能不完整`);
      }
    });
  }

  create(): void {
    // ★ 必须在场景真正开始之后才收起遮罩，否则会露出一帧空背景
    hideBootOverlay();
    this.scene.start('Level');
  }
}
