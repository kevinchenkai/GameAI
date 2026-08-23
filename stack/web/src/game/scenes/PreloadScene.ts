import Phaser from 'phaser';
import { PRELOAD_ASSETS } from '../config/assets';
import { fontPx, px } from '../ui/uiScale';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const graphics = this.add.graphics();
    const label = this.add
      .text(width / 2, height / 2 - px(this, 30), '正在准备花园…', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: fontPx(this, 18),
        fontStyle: 'bold',
        color: '#684e7a',
      })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      graphics.clear();
      graphics.fillStyle(0xffffff, 0.6)
        .fillRoundedRect(width / 2 - px(this, 110), height / 2, px(this, 220), px(this, 12), px(this, 6));
      graphics.fillStyle(0xffc93c, 1)
        .fillRoundedRect(width / 2 - px(this, 108), height / 2 + px(this, 2), px(this, 216) * progress, px(this, 8), px(this, 4));
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
