import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { COLORS, LAYOUT, PROTOTYPE_UI } from '../config/layout';
import { getSaveManager } from '../systems/SaveManager';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create(): void {
    this.renderHome();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.renderHome, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.renderHome, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.renderHome, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.renderHome, this);
    });
  }

  private renderHome(): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const save = getSaveManager().snapshot;
    this.add.image(centerX, centerY, SCENE_TEXTURES.Home.background.key).setDisplaySize(width, height);
    const panelWidth = Math.min(356, width - LAYOUT.contentPadding * 2);
    this.add.rectangle(centerX, centerY - 24, panelWidth, 430, 0xfff9ec, 0.84).setStrokeStyle(2, 0xffffff, 0.88).setOrigin(0.5);
    this.add.text(centerX, centerY - 190, 'StackPop', {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif', fontSize: '46px', fontStyle: 'bold', color: COLORS.title, stroke: '#ffffff', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(centerX, centerY - 134, '萌宠叠叠消', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: '17px', color: COLORS.text,
    }).setOrigin(0.5);

    const buttonWidth = Math.min(280, width - LAYOUT.contentPadding * 4);
    const currentRun = save.currentRun;
    const targetLevel = currentRun?.levelId ?? save.maxUnlockedLevel;
    const primaryLabel = currentRun === null ? `开始第 ${targetLevel} 关` : `继续第 ${targetLevel} 关`;
    this.drawHomeButton(centerX, centerY - 58, buttonWidth, primaryLabel, 0xffc93c, () => {
      this.scene.start('Game', { levelId: targetLevel, resume: currentRun !== null });
    });
    this.drawHomeButton(centerX, centerY + 16, buttonWidth, '选择关卡', 0xfff6e3, () => this.scene.start('LevelSelect'));

    const settingsButton = this.add.container(centerX, centerY + 100);
    const settingsHit = this.add.rectangle(0, 0, buttonWidth, 52, 0xe9f3fb, 0.94).setStrokeStyle(1.5, COLORS.tileStroke, 0.55).setInteractive({ useHandCursor: true });
    const settingsIcon = this.add.image(-buttonWidth / 2 + 34, 0, SCENE_TEXTURES.Home.settings.key).setDisplaySize(38, 38);
    const settingsLabel = this.add.text(8, 0, `设置  ·  音效${save.settings.sound ? '开' : '关'}`, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: '16px', fontStyle: 'bold', color: COLORS.text,
    }).setOrigin(0.5);
    settingsButton.add([settingsHit, settingsIcon, settingsLabel]);
    settingsHit.on(Phaser.Input.Events.POINTER_UP, () => this.openSettings());

    const completedCount = Object.keys(save.stars).length;
    const totalStars = Object.values(save.stars).reduce((sum, stars) => sum + stars, 0);
    this.add.text(centerX, centerY + 154, `已通关 ${completedCount}/20  ·  星星 ${totalStars}/60`, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: '13px', color: '#6e8ca0',
    }).setOrigin(0.5);
    this.add.text(centerX, height - 34, '软萌花园 · 轻松三消', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: `${PROTOTYPE_UI.subtitleFontSize}px`, color: '#7591a6',
    }).setOrigin(0.5);
  }

  private drawHomeButton(centerX: number, y: number, width: number, label: string, fill: number, onTap: () => void): void {
    const container = this.add.container(centerX, y);
    const background = this.add.rectangle(0, 0, width, 58, fill).setStrokeStyle(2, COLORS.tileStroke).setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#62452f',
    }).setOrigin(0.5);
    container.add([background, text]);
    background.on(Phaser.Input.Events.POINTER_OVER, () => container.setY(y - 4).setScale(1.03));
    background.on(Phaser.Input.Events.POINTER_OUT, () => container.setY(y).setScale(1));
    background.on(Phaser.Input.Events.POINTER_DOWN, () => container.setScale(0.96));
    background.on(Phaser.Input.Events.POINTER_UP, () => {
      container.setY(y).setScale(1);
      onTap();
    });
  }

  private openSettings(): void {
    this.scene.pause();
    this.scene.launch('Settings', { sourceScene: 'Home' });
  }
}
