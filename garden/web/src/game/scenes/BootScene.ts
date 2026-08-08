/**
 * game/scenes/BootScene.ts —— 预加载（M0 骨架，实现见 M4）
 *
 * ★ 素材路径一律走 ASSETS.*（冻结契约 6），本文件不得出现任何文件名字面量。
 * ★ REFERENCE_ONLY 里的两张图（Master、Puppet 拼合预览）**不 preload**。
 */

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // M4：按 ASSETS.* 逐项 this.load.image(key, path)
  }

  create(): void {
    // M4：跳转 LevelScene
  }
}
