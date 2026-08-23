import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { COLORS, LAYOUT } from '../config/layout';
import { LEVEL_LOADER } from '../levelRegistry';
import { getSaveManager } from '../systems/SaveManager';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    this.renderLevels();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.renderLevels, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.renderLevels, this);
    });
  }

  private renderLevels(): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    this.add.image(centerX, height / 2, SCENE_TEXTURES.LevelSelect.background.key).setDisplaySize(width, height);
    this.add.rectangle(centerX, height / 2, Math.min(LAYOUT.maxContentWidth, width), height, 0xffffff, 0.12);

    const contentWidth = Math.min(440, width - LAYOUT.contentPadding * 2);
    const left = centerX - contentWidth / 2;
    this.drawBackButton(left, 26);
    this.add.text(centerX, 42, '选择关卡', {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: COLORS.title,
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const save = getSaveManager().snapshot;
    const levels = LEVEL_LOADER.list();
    const columns = 4;
    const gap = 8;
    const gridTop = 86;
    const rows = Math.ceil(levels.length / columns);
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    const availableHeight = height - gridTop - 36;
    const cardHeight = Math.max(68, Math.min(96, (availableHeight - gap * (rows - 1)) / rows));

    levels.forEach((level, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = left + column * (cardWidth + gap);
      const y = gridTop + row * (cardHeight + gap);
      const unlocked = level.id <= save.maxUnlockedLevel;
      const stars = save.stars[String(level.id)] ?? 0;
      this.drawLevelCard(x, y, cardWidth, cardHeight, level.id, unlocked, stars, level.id === save.maxUnlockedLevel);
    });
  }

  private drawBackButton(x: number, y: number): void {
    const button = this.add.rectangle(x, y, 64, 34, 0xfffbf2, 0.9).setOrigin(0, 0).setStrokeStyle(1.5, COLORS.tileStroke, 0.75).setInteractive({ useHandCursor: true });
    this.add.text(x + 32, y + 17, '‹ 首页', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: '14px', fontStyle: 'bold', color: COLORS.text,
    }).setOrigin(0.5);
    button.on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('Home'));
  }

  private drawLevelCard(
    x: number,
    y: number,
    width: number,
    height: number,
    levelId: number,
    unlocked: boolean,
    stars: number,
    current: boolean,
  ): void {
    const completed = stars > 0;
    const fill = !unlocked ? 0xd7dce0 : current && !completed ? 0xffd76b : 0xfff8e9;
    const alpha = unlocked ? 0.96 : 0.7;
    const card = this.add.rectangle(x, y, width, height, fill, alpha).setOrigin(0, 0).setStrokeStyle(current ? 2.5 : 1.5, current ? 0xe29a2f : COLORS.tileStroke, unlocked ? 0.8 : 0.28);
    this.add.text(x + width / 2, y + height * 0.32, unlocked ? String(levelId) : '🔒', {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
      fontSize: `${Math.max(20, Math.min(28, height * 0.34))}px`,
      fontStyle: 'bold',
      color: unlocked ? COLORS.title : '#8d989f',
    }).setOrigin(0.5);
    const status = completed ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : current ? '当前可玩' : unlocked ? '可重玩' : '未解锁';
    this.add.text(x + width / 2, y + height * 0.72, status, {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: `${Math.max(10, Math.min(13, width * 0.15))}px`,
      fontStyle: completed || current ? 'bold' : 'normal',
      color: completed ? '#d89223' : unlocked ? '#6e8ca0' : '#9ba4aa',
    }).setOrigin(0.5);
    if (!unlocked) return;
    card.setInteractive({ useHandCursor: true });
    card.on(Phaser.Input.Events.POINTER_OVER, () => card.setScale(1.04));
    card.on(Phaser.Input.Events.POINTER_OUT, () => card.setScale(1));
    card.on(Phaser.Input.Events.POINTER_UP, () => {
      const currentRun = getSaveManager().snapshot.currentRun;
      this.scene.start('Game', { levelId, resume: currentRun?.levelId === levelId });
    });
  }
}
