import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { COLORS, LAYOUT, PROTOTYPE_UI } from '../config/layout';
import { getSaveManager } from '../systems/SaveManager';
import { fontPx, px } from '../ui/uiScale';
import { syncBackgroundMusic } from './BackgroundMusicScene';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create(): void {
    this.renderHome();
    syncBackgroundMusic(this, getSaveManager().snapshot.settings.music);
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
    const panelWidth = Math.min(px(this, 356), width - px(this, LAYOUT.contentPadding) * 2);
    this.add.rectangle(centerX, centerY - px(this, 24), panelWidth, px(this, 430), 0xfff9ec, 0.84).setStrokeStyle(px(this, 2), 0xffffff, 0.88).setOrigin(0.5);
    this.add.text(centerX, centerY - px(this, 190), 'StackPop', {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif', fontSize: fontPx(this, 46), fontStyle: 'bold', color: COLORS.title, stroke: '#ffffff', strokeThickness: px(this, 5),
    }).setOrigin(0.5);
    this.add.text(centerX, centerY - px(this, 134), '萌宠叠叠消', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 17), color: COLORS.text,
    }).setOrigin(0.5);

    const buttonWidth = Math.min(px(this, 280), width - px(this, LAYOUT.contentPadding) * 4);
    const currentRun = save.currentRun;
    const targetLevel = currentRun?.levelId ?? save.maxUnlockedLevel;
    const primaryLabel = currentRun === null ? `开始第 ${targetLevel} 关` : `继续第 ${targetLevel} 关`;
    this.drawHomeButton(centerX, centerY - px(this, 58), buttonWidth, primaryLabel, 0xffc93c, () => {
      this.scene.start('Game', { levelId: targetLevel, resume: currentRun !== null });
    });
    this.drawHomeButton(centerX, centerY + px(this, 16), buttonWidth, '选择关卡', 0xfff6e3, () => this.scene.start('LevelSelect'));

    const compactGap = px(this, 8);
    const compactWidth = (buttonWidth - compactGap) / 2;
    this.drawIconButton(centerX - compactWidth / 2 - compactGap / 2, centerY + px(this, 100), compactWidth, '设置', SCENE_TEXTURES.Home.settings.key, () => this.openSettings());
    this.drawIconButton(centerX + compactWidth / 2 + compactGap / 2, centerY + px(this, 100), compactWidth, '玩法说明', SCENE_TEXTURES.HowToPlay.hint.key, () => this.scene.start('HowToPlay'));

    const completedCount = Object.keys(save.stars).length;
    const totalStars = Object.values(save.stars).reduce((sum, stars) => sum + stars, 0);
    this.add.text(centerX, centerY + px(this, 154), `已通关 ${completedCount}/20  ·  星星 ${totalStars}/60`, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 13), color: '#6e8ca0',
    }).setOrigin(0.5);
    this.add.text(centerX, height - px(this, 34), '软萌花园 · 轻松三消', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, PROTOTYPE_UI.subtitleFontSize), color: '#7591a6',
    }).setOrigin(0.5);
  }

  private drawHomeButton(centerX: number, y: number, width: number, label: string, fill: number, onTap: () => void): void {
    const container = this.add.container(centerX, y);
    const background = this.add.rectangle(0, 0, width, px(this, 58), fill).setStrokeStyle(px(this, 2), COLORS.tileStroke).setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 19), fontStyle: 'bold', color: '#62452f',
    }).setOrigin(0.5);
    container.add([background, text]);
    background.on(Phaser.Input.Events.POINTER_OVER, () => container.setY(y - px(this, 4)).setScale(1.03));
    background.on(Phaser.Input.Events.POINTER_OUT, () => container.setY(y).setScale(1));
    background.on(Phaser.Input.Events.POINTER_DOWN, () => container.setScale(0.96));
    background.on(Phaser.Input.Events.POINTER_UP, () => {
      container.setY(y).setScale(1);
      onTap();
    });
  }

  private drawIconButton(centerX: number, y: number, width: number, label: string, textureKey: string, onTap: () => void): void {
    const container = this.add.container(centerX, y);
    const background = this.add.rectangle(0, 0, width, px(this, 52), 0xe9f3fb, 0.94)
      .setStrokeStyle(px(this, 1.5), COLORS.tileStroke, 0.55)
      .setInteractive({ useHandCursor: true });
    const icon = this.add.image(-width / 2 + px(this, 26), 0, textureKey).setDisplaySize(px(this, 34), px(this, 34));
    const text = this.add.text(px(this, 14), 0, label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: `${Math.round(Math.min(px(this, 15), width * 0.13))}px`, fontStyle: 'bold', color: COLORS.text,
    }).setOrigin(0.5);
    container.add([background, icon, text]);
    background.on(Phaser.Input.Events.POINTER_OVER, () => container.setY(y - px(this, 3)).setScale(1.02));
    background.on(Phaser.Input.Events.POINTER_OUT, () => container.setY(y).setScale(1));
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
