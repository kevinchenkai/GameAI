import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    const params = new URLSearchParams(window.location.search);
    const shouldAutoStart = params.get('autostart') === '1' || params.get('layout') === 'depth10';
    this.scene.start(shouldAutoStart ? 'Game' : 'Home');
  }
}
