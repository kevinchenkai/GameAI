/**
 * game/scenes/GardenScene.ts —— 花园场景（M0 骨架，实现见 M7）
 *
 * Stage 0 只有院门 1 个节点、3 个阶段。
 *
 * ★ 建设进度条**必须在关卡结算界面就显示**（不只在花园里），
 *   让玩家在"还要不要再玩一关"的决策点看到"就差一点"。
 *   这个心理是留存核心。
 */

import Phaser from 'phaser';

export class GardenScene extends Phaser.Scene {
  constructor() {
    super('Garden');
  }

  create(): void {
    // M7：按 GARDEN_NODES + 存档进度渲染院门阶段图
  }
}
