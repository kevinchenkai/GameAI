import Phaser from 'phaser';
import { COLORS } from './game/config/layout';
import './game/debug';
import { BootScene } from './game/scenes/BootScene';
import { PreloadScene } from './game/scenes/PreloadScene';
import { HomeScene } from './game/scenes/HomeScene';
import { GameScene } from './game/scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.skyTop,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    powerPreference: 'low-power',
  },
  scene: [BootScene, PreloadScene, HomeScene, GameScene],
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  (window as unknown as { __GAME__?: Phaser.Game }).__GAME__ = game;
}
