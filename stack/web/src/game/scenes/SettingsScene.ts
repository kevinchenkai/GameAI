import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { COLORS, LAYOUT } from '../config/layout';
import { getSaveManager } from '../systems/SaveManager';
import type { PlayerSettingKey } from '../types/save';

export interface SettingsSceneData {
  sourceScene: 'Home' | 'Game';
  levelId?: number;
}

export class SettingsScene extends Phaser.Scene {
  private sourceScene: 'Home' | 'Game' = 'Home';
  private levelId = 1;

  constructor() {
    super('Settings');
  }

  create(data: SettingsSceneData): void {
    this.sourceScene = data.sourceScene;
    this.levelId = data.levelId ?? 1;
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
    const panelWidth = Math.min(360, width - LAYOUT.contentPadding * 2);
    const panelHeight = this.sourceScene === 'Game' ? 520 : 410;
    const panelTop = Math.max(24, (height - panelHeight) / 2);
    this.add.rectangle(centerX, height / 2, width, height, 0x34516b, 0.48).setInteractive();
    this.add.rectangle(centerX, panelTop, panelWidth, panelHeight, 0xfff8e9, 0.98).setOrigin(0.5, 0).setStrokeStyle(2, COLORS.tileStroke, 0.8);
    this.add.image(centerX, panelTop + 50, SCENE_TEXTURES.Settings.settings.key).setDisplaySize(58, 58);
    this.add.text(centerX, panelTop + 94, '设置', {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif', fontSize: '26px', fontStyle: 'bold', color: COLORS.title,
    }).setOrigin(0.5);

    const settings = getSaveManager().snapshot.settings;
    const rows: readonly [PlayerSettingKey, string][] = [
      ['music', '音乐'],
      ['sound', '音效'],
      ['vibration', '震动'],
    ];
    rows.forEach(([key, label], index) => {
      this.drawToggle(centerX - panelWidth / 2 + 24, panelTop + 126 + index * 64, panelWidth - 48, label, key, settings[key]);
    });

    let buttonY = panelTop + 330;
    if (this.sourceScene === 'Game') {
      this.drawWideButton(centerX, buttonY, panelWidth - 48, '重新开始当前关', 0xffd76b, () => this.restartCurrentLevel());
      buttonY += 58;
      this.drawWideButton(centerX, buttonY, panelWidth - 48, '返回首页', 0xe8e5f2, () => this.returnHome());
      buttonY += 58;
    }
    this.drawWideButton(centerX, buttonY, panelWidth - 48, '关闭', 0xffffff, () => this.closeSettings());
  }

  private drawToggle(x: number, y: number, width: number, label: string, key: PlayerSettingKey, enabled: boolean): void {
    const hit = this.add.rectangle(x, y, width, 52, 0xffffff, 0.64).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.add.text(x + 16, y + 26, label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: '17px', fontStyle: 'bold', color: COLORS.text,
    }).setOrigin(0, 0.5);
    const toggleX = x + width - 62;
    this.add.rectangle(toggleX, y + 12, 52, 28, enabled ? 0x69c985 : 0xc8cdd1).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.8);
    this.add.circle(toggleX + (enabled ? 38 : 14), y + 26, 10, 0xffffff);
    this.add.text(toggleX - 8, y + 26, enabled ? '开' : '关', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: '12px', color: enabled ? '#3a9561' : '#8f989e',
    }).setOrigin(1, 0.5);
    hit.on(Phaser.Input.Events.POINTER_UP, () => {
      getSaveManager().setSetting(key, !enabled);
      this.renderSettings();
    });
  }

  private drawWideButton(centerX: number, y: number, width: number, label: string, fill: number, onTap: () => void): void {
    const button = this.add.rectangle(centerX, y, width, 48, fill, 1).setOrigin(0.5, 0).setStrokeStyle(1.5, COLORS.tileStroke, 0.65).setInteractive({ useHandCursor: true });
    this.add.text(centerX, y + 24, label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: '16px', fontStyle: 'bold', color: COLORS.text,
    }).setOrigin(0.5);
    button.on(Phaser.Input.Events.POINTER_OVER, () => button.setScale(1.02));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setScale(1));
    button.on(Phaser.Input.Events.POINTER_UP, onTap);
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
