import Phaser from 'phaser';
import { PRELOAD_ASSETS } from '../config/assets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const graphics = this.add.graphics();
    const label = this.add
      .text(width / 2, height / 2 - 30, '正在准备花园…', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#684e7a',
      })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      graphics.clear();
      graphics.fillStyle(0xffffff, 0.6).fillRoundedRect(width / 2 - 110, height / 2, 220, 12, 6);
      graphics.fillStyle(0xffc93c, 1).fillRoundedRect(width / 2 - 108, height / 2 + 2, 216 * progress, 8, 4);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      graphics.destroy();
      label.destroy();
    });
    PRELOAD_ASSETS.forEach(({ key, path }) => this.load.image(key, path));
  }

  create(): void {
    const params = new URLSearchParams(window.location.search);
    const shouldAutoStart = params.get('autostart') === '1' || params.get('layout') === 'depth10';
    this.scene.start(shouldAutoStart ? 'Game' : 'Home');
  }
}
