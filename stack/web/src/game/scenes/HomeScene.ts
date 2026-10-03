import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { COLORS, GAME_UI, LAYOUT, PROTOTYPE_UI } from '../config/layout';
import { createRoundedButton } from '../ui/RoundedButton';
import { drawDialogPanel } from '../render/DialogRenderer';
import type { ToolButtonVariant } from '../ui/toolButtonStyle';
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
    drawDialogPanel(this, centerX - panelWidth / 2, centerY - px(this, 239), panelWidth, px(this, 430), px(this, GAME_UI.helpPanelRadius), 0);
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
    this.drawHomeButton(centerX, centerY - px(this, 58), buttonWidth, primaryLabel, 'primary', () => {
      this.scene.start('Game', { levelId: targetLevel, resume: currentRun !== null });
    });
    this.drawHomeButton(centerX, centerY + px(this, 16), buttonWidth, '选择关卡', 'secondary', () => this.scene.start('LevelSelect'));

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

  private drawHomeButton(centerX: number, y: number, width: number, label: string, variant: ToolButtonVariant, onTap: () => void): void {
    createRoundedButton(this, { x: centerX - width / 2, y: y - px(this, 29), width, height: px(this, 58), label, enabled: true, variant, labelSize: 19, onTap });
  }

  private drawIconButton(centerX: number, y: number, width: number, label: string, textureKey: string, onTap: () => void): void {
    createRoundedButton(this, { x: centerX - width / 2, y: y - px(this, 26), width, height: px(this, 52), label, enabled: true, textureKey, labelSize: 15, fontWidthRatio: 0.13, onTap });
  }

  private openSettings(): void {
    this.scene.pause();
    this.scene.launch('Settings', { sourceScene: 'Home' });
  }
}
