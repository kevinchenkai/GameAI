/**
 * main.ts —— 入口
 *
 * 这里只做 Phaser 装配。任何游戏规则都不应出现在本文件。
 */

import Phaser from 'phaser';
import { ENV_PALETTE } from './config/pieces';
import { BootScene } from './game/scenes/BootScene';
import { LevelScene } from './game/scenes/LevelScene';
import { GardenScene } from './game/scenes/GardenScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: ENV_PALETTE.skyLight,
  scale: {
    // 竖屏，按容器自适应。实际布局由 computeLayout() 算，
    // 不依赖 Phaser 的缩放模式（见 game/render/layout.ts）
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // TODO(M5)：老机器按 3x DPR 渲染会掉帧，需要限制。
    //   Phaser 3.90 没有 maxPixelRatio 配置项，得在 M5 实测后决定手段
    //   （canvas 尺寸缩放 or FX_QUALITY 联动），不在这里凭猜测写。
  },
  render: {
    antialias: true,
    powerPreference: 'low-power',
  },
  scene: [BootScene, LevelScene, GardenScene],
};

new Phaser.Game(config);
