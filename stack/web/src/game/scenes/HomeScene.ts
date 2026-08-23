import Phaser from 'phaser';
import { COLORS, LAYOUT, PROTOTYPE_UI } from '../config/layout';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create(): void {
    this.renderHome();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.renderHome, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.renderHome, this);
    });
  }

  private renderHome(): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    graphics.fillRect(0, 0, width, height);
    this.drawCloud(graphics, width * 0.22, height * 0.19, Math.min(width, height) * 0.07);
    this.drawCloud(graphics, width * 0.78, height * 0.29, Math.min(width, height) * 0.05);

    this.add
      .text(centerX, centerY - 128, 'StackPop', {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: '46px',
        fontStyle: 'bold',
        color: COLORS.title,
        stroke: '#ffffff',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(centerX, centerY - 72, '萌宠叠叠消 · 规则原型', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: '17px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const buttonWidth = Math.min(280, width - LAYOUT.contentPadding * 4);
    const button = this.add.container(centerX, centerY + 34);
    const buttonBackground = this.add
      .rectangle(0, 0, buttonWidth, 58, 0xffc93c)
      .setStrokeStyle(2, 0xb08355)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, '开始游戏', {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#62452f',
    }).setOrigin(0.5);
    button.add([buttonBackground, label]);
    buttonBackground.on(Phaser.Input.Events.POINTER_OVER, () => button.setScale(1.03));
    buttonBackground.on(Phaser.Input.Events.POINTER_OUT, () => button.setScale(1));
    buttonBackground.on(Phaser.Input.Events.POINTER_DOWN, () => button.setScale(0.96));
    buttonBackground.on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('Game'));

    this.add
      .text(centerX, height - 34, 'M0 + M1 · 色块与字母占位', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.subtitleFontSize}px`,
        color: '#7591a6',
      })
      .setOrigin(0.5);
  }

  private drawCloud(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
    graphics.fillStyle(COLORS.cloud, 0.62);
    graphics.fillCircle(x - radius * 0.7, y, radius * 0.62);
    graphics.fillCircle(x, y - radius * 0.18, radius);
    graphics.fillCircle(x + radius * 0.86, y, radius * 0.7);
    graphics.fillRoundedRect(x - radius * 1.35, y, radius * 2.75, radius, radius * 0.45);
  }
}
