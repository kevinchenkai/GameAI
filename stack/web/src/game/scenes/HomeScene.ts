import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
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
    this.add
      .image(centerX, centerY, SCENE_TEXTURES.Home.background.key)
      .setDisplaySize(width, height);

    const panelWidth = Math.min(356, width - LAYOUT.contentPadding * 2);
    this.add
      .rectangle(centerX, centerY - 38, panelWidth, 330, 0xfff9ec, 0.82)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 146, 'StackPop', {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: '46px',
        fontStyle: 'bold',
        color: COLORS.title,
        stroke: '#ffffff',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(centerX, centerY - 86, '萌宠叠叠消', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: '17px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const buttonWidth = Math.min(280, width - LAYOUT.contentPadding * 4);
    const button = this.add.container(centerX, centerY + 42);
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
    buttonBackground.on(Phaser.Input.Events.POINTER_OVER, () => button.setY(centerY + 38).setScale(1.04));
    buttonBackground.on(Phaser.Input.Events.POINTER_OUT, () => button.setY(centerY + 42).setScale(1));
    buttonBackground.on(Phaser.Input.Events.POINTER_DOWN, () => button.setScale(0.96));
    buttonBackground.on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('Game'));

    this.add
      .text(centerX, height - 34, '软萌花园 · 轻松三消', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.subtitleFontSize}px`,
        color: '#7591a6',
      })
      .setOrigin(0.5);
  }

}
