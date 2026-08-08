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

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
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

  create(): void {
    this.scene.start('Level');
  }
}
