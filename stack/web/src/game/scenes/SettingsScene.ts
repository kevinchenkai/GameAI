import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { COLORS, GAME_UI, LAYOUT } from '../config/layout';
import { createRoundedButton } from '../ui/RoundedButton';
import type { ToolButtonVariant } from '../ui/toolButtonStyle';
import { drawDialogOverlay, drawDialogPanel } from '../render/DialogRenderer';
import { getSaveManager } from '../systems/SaveManager';
import type { PlayerSettingKey } from '../types/save';
import { fontPx, px } from '../ui/uiScale';
import { syncBackgroundMusic } from './BackgroundMusicScene';

export interface SettingsSceneData {
  sourceScene: 'Home' | 'Game';
  levelId?: number;
}

export class SettingsScene extends Phaser.Scene {
  private sourceScene: 'Home' | 'Game' = 'Home';
  private levelId = 1;
  private confirmingRestart = false;

  constructor() {
    super('Settings');
  }

  create(data: SettingsSceneData): void {
    this.sourceScene = data.sourceScene;
    this.levelId = data.levelId ?? 1;
    this.confirmingRestart = false;
    this.renderSettings();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.renderSettings, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.renderSettings, this);
    });
  }

  private renderSettings(): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const panelWidth = Math.min(px(this, 360), width - px(this, LAYOUT.contentPadding) * 2);
    const panelHeight = px(this, this.sourceScene === 'Game' ? 520 : 410);
    const panelTop = Math.max(px(this, 24), (height - panelHeight) / 2);
    this.add.rectangle(centerX, height / 2, width, height, 0x34516b, 0.48).setInteractive();
    drawDialogPanel(this, centerX - panelWidth / 2, panelTop, panelWidth, panelHeight, px(this, GAME_UI.helpPanelRadius), 0);
    this.add.image(centerX, panelTop + px(this, 50), SCENE_TEXTURES.Settings.settings.key).setDisplaySize(px(this, 58), px(this, 58));
    this.add.text(centerX, panelTop + px(this, 94), '设置', {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif', fontSize: fontPx(this, 26), fontStyle: 'bold', color: COLORS.title,
    }).setOrigin(0.5);

    const settings = getSaveManager().snapshot.settings;
    const rows: readonly [PlayerSettingKey, string][] = [
      ['music', '音乐'],
      ['sound', '音效'],
      ['vibration', '震动'],
    ];
    rows.forEach(([key, label], index) => {
      this.drawToggle(centerX - panelWidth / 2 + px(this, 24), panelTop + px(this, 126) + index * px(this, 64), panelWidth - px(this, 48), label, key, settings[key]);
    });

    let buttonY = panelTop + px(this, 330);
    if (this.sourceScene === 'Game') {
      this.drawWideButton(centerX, buttonY, panelWidth - px(this, 48), '重新开始当前关', 'danger', () => {
        this.confirmingRestart = true;
        this.renderSettings();
      });
      buttonY += px(this, 58);
      this.drawWideButton(centerX, buttonY, panelWidth - px(this, 48), '返回首页', 'secondary', () => this.returnHome());
      buttonY += px(this, 58);
    }
    this.drawWideButton(centerX, buttonY, panelWidth - px(this, 48), '关闭', 'primary', () => this.closeSettings());
    if (this.confirmingRestart) this.drawRestartConfirmation();
  }

  private drawRestartConfirmation(): void {
    const width = Math.min(px(this, 320), this.scale.width - px(this, 32));
    const left = (this.scale.width - width) / 2;
    const top = (this.scale.height - px(this, 184)) / 2;
    drawDialogOverlay(this, 30);
    drawDialogPanel(this, left, top, width, px(this, 184), px(this, GAME_UI.helpPanelRadius), 31);
    this.add.text(this.scale.width / 2, top + px(this, 38), '重新开始这一关？', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 21), fontStyle: 'bold', color: COLORS.title,
    }).setOrigin(0.5).setDepth(33);
    this.add.text(this.scale.width / 2, top + px(this, 76), '本局步数和暂存槽将重置', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 13), color: COLORS.text,
    }).setOrigin(0.5).setDepth(33);
    const buttonWidth = (width - px(this, 40)) / 2;
    createRoundedButton(this, { x: left + px(this, 16), y: top + px(this, 116), width: buttonWidth, height: px(this, 48), label: '继续游戏', enabled: true, variant: 'secondary', depth: 33,
      onTap: () => { this.confirmingRestart = false; this.renderSettings(); } });
    createRoundedButton(this, { x: left + width / 2 + px(this, 4), y: top + px(this, 116), width: buttonWidth, height: px(this, 48), label: '确认重来', enabled: true, variant: 'danger', depth: 33,
      onTap: () => this.restartCurrentLevel() });
  }

  private drawToggle(x: number, y: number, width: number, label: string, key: PlayerSettingKey, enabled: boolean): void {
    const hit = this.add.rectangle(x, y, width, px(this, 52), 0xffffff, 0.64).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.add.text(x + px(this, 16), y + px(this, 26), label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 17), fontStyle: 'bold', color: COLORS.text,
    }).setOrigin(0, 0.5);
    const toggleX = x + width - px(this, 62);
    const track = this.add.graphics();
    track.fillStyle(enabled ? 0x69c985 : 0xc8cdd1);
    track.fillRoundedRect(toggleX, y + px(this, 12), px(this, 52), px(this, 28), px(this, 14));
    this.add.circle(toggleX + px(this, enabled ? 38 : 14), y + px(this, 26), px(this, 10), 0xffffff);
    this.add.text(toggleX - px(this, 8), y + px(this, 26), enabled ? '开' : '关', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 12), color: enabled ? '#3a9561' : '#8f989e',
    }).setOrigin(1, 0.5);
    hit.on(Phaser.Input.Events.POINTER_UP, () => {
      const nextValue = !enabled;
      getSaveManager().setSetting(key, nextValue);
      if (key === 'music') syncBackgroundMusic(this, nextValue);
      this.renderSettings();
    });
  }

  private drawWideButton(centerX: number, y: number, width: number, label: string, variant: ToolButtonVariant, onTap: () => void): void {
    createRoundedButton(this, { x: centerX - width / 2, y, width, height: px(this, 48), label, enabled: true, variant, labelSize: 16, onTap });
  }

  private closeSettings(): void {
    const source = this.sourceScene;
    this.scene.stop();
    this.scene.resume(source);
  }

  private restartCurrentLevel(): void {
    this.scene.stop('Game');
    this.scene.start('Game', { levelId: this.levelId, resume: false });
  }

  private returnHome(): void {
    if (this.sourceScene === 'Game') this.scene.stop('Game');
    this.scene.start('Home');
  }
}
