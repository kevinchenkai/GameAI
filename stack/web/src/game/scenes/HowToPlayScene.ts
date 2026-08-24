import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { HOW_TO_PLAY_PAGES } from '../config/howToPlay';
import { COLORS, GAME_UI, LAYOUT } from '../config/layout';
import type { TileType } from '../types/tile';
import { createRoundedButton } from '../ui/RoundedButton';
import type { ToolButtonVariant } from '../ui/toolButtonStyle';
import { fontPx, px } from '../ui/uiScale';

export class HowToPlayScene extends Phaser.Scene {
  private pageIndex = 0;

  constructor() {
    super('HowToPlay');
  }

  create(): void {
    this.pageIndex = 0;
    this.renderPage();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.renderPage, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.renderPage, this);
    });
  }

  private renderPage(): void {
    this.children.removeAll(true);
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const page = HOW_TO_PLAY_PAGES[this.pageIndex];
    if (page === undefined) return;

    this.add.image(centerX, height / 2, SCENE_TEXTURES.HowToPlay.background.key).setDisplaySize(width, height);
    this.add.rectangle(centerX, height / 2, Math.min(px(this, LAYOUT.maxContentWidth), width), height, 0xffffff, 0.1);

    const panelWidth = Math.min(px(this, 430), width - px(this, LAYOUT.contentPadding) * 2);
    const panelHeight = Math.min(px(this, 680), height - px(this, 24));
    const panelTop = (height - panelHeight) / 2;
    const panelLeft = centerX - panelWidth / 2;
    const radius = px(this, GAME_UI.helpPanelRadius);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x5f7890, GAME_UI.helpPanelShadowAlpha);
    shadow.fillRoundedRect(panelLeft, panelTop + px(this, 4), panelWidth, panelHeight, radius);
    const panel = this.add.graphics();
    panel.fillStyle(0xfff9ec, GAME_UI.helpPanelFillAlpha);
    panel.fillRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, radius);
    panel.lineStyle(px(this, 1.5), 0xffffff, 0.92);
    panel.strokeRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, radius);

    this.drawBackButton(panelLeft + px(this, 12), panelTop + px(this, 12));
    this.add.image(centerX, panelTop + px(this, 35), SCENE_TEXTURES.HowToPlay.hint.key)
      .setDisplaySize(px(this, GAME_UI.helpHeaderIconSize), px(this, GAME_UI.helpHeaderIconSize));
    this.add.text(centerX, panelTop + px(this, 70), page.title, {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
      fontSize: fontPx(this, 23),
      fontStyle: 'bold',
      color: COLORS.title,
    }).setOrigin(0.5);
    this.add.text(centerX, panelTop + px(this, 96), page.subtitle, {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, 13),
      color: '#6e8ca0',
    }).setOrigin(0.5);
    this.drawPageDots(centerX, panelTop + px(this, 116));

    const contentLeft = panelLeft + px(this, 16);
    const contentWidth = panelWidth - px(this, 32);
    const visualTop = panelTop + px(this, 130);
    this.drawPageVisual(contentLeft, visualTop, contentWidth, this.pageIndex);

    const sectionsTop = visualTop + px(this, GAME_UI.helpVisualHeight + 9);
    const footerTop = panelTop + panelHeight - px(this, 61);
    const sectionGap = px(this, 7);
    const sectionsHeight = footerTop - px(this, 8) - sectionsTop;
    const sectionHeight = (sectionsHeight - sectionGap * (page.sections.length - 1)) / page.sections.length;
    page.sections.forEach((section, index) => {
      this.drawSection(
        contentLeft,
        sectionsTop + index * (sectionHeight + sectionGap),
        contentWidth,
        sectionHeight,
        index + 1,
        section.title,
        section.body,
      );
    });

    this.drawFooter(centerX, footerTop, panelWidth);
  }

  private drawBackButton(x: number, y: number): void {
    const hitWidth = px(this, 74);
    const hitHeight = px(this, GAME_UI.helpBackHitHeight);
    const visibleHeight = px(this, 34);
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 0.78);
    graphics.fillRoundedRect(x, y + (hitHeight - visibleHeight) / 2, hitWidth, visibleHeight, px(this, 10));
    graphics.lineStyle(px(this, 1.25), COLORS.tileStroke, 0.42);
    graphics.strokeRoundedRect(x, y + (hitHeight - visibleHeight) / 2, hitWidth, visibleHeight, px(this, 10));
    this.add.text(x + hitWidth / 2, y + hitHeight / 2, '‹ 首页', {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, 13),
      fontStyle: 'bold',
      color: COLORS.text,
    }).setOrigin(0.5);
    this.add.rectangle(x, y, hitWidth, hitHeight, 0xffffff, 0.001)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('Home'));
  }

  private drawPageDots(centerX: number, y: number): void {
    const gap = px(this, 12);
    const startX = centerX - ((HOW_TO_PLAY_PAGES.length - 1) * gap) / 2;
    HOW_TO_PLAY_PAGES.forEach((_, index) => {
      const active = index === this.pageIndex;
      this.add.circle(startX + index * gap, y, px(this, active ? 3.5 : 2.5), active ? 0x8063a7 : 0x9fb2bd, active ? 1 : 0.5);
    });
  }

  private drawPageVisual(x: number, y: number, width: number, pageIndex: number): void {
    const height = px(this, GAME_UI.helpVisualHeight);
    const radius = px(this, 13);
    const background = this.add.graphics();
    background.fillStyle(0xe9f6fb, 0.86);
    background.fillRoundedRect(x, y, width, height, radius);
    background.lineStyle(px(this, 1), 0xffffff, 0.9);
    background.strokeRoundedRect(x, y, width, height, radius);

    if (pageIndex === 0) {
      const tileSize = px(this, 37);
      const tileX = x + px(this, 28);
      const tileY = y + px(this, 8);
      this.drawMiniTile(tileX, tileY, tileSize, 'watering', false);
      this.drawMiniTile(tileX + px(this, 28), tileY + px(this, 14), tileSize, 'bell', false);
      this.drawMiniTile(tileX + px(this, 56), tileY + px(this, 28), tileSize, 'grass', true);
      this.add.text(x + width * 0.73, y + height / 2, '点最下方\n露出的卡牌', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: fontPx(this, 13),
        fontStyle: 'bold',
        color: COLORS.title,
        align: 'center',
      }).setOrigin(0.5);
      return;
    }

    if (pageIndex === 1) {
      const slotSize = Math.min(px(this, 36), (width - px(this, 36)) / 7);
      const gap = px(this, 3);
      const trayWidth = slotSize * 7 + gap * 6;
      const startX = x + (width - trayWidth) / 2;
      const types: readonly TileType[] = ['paw', 'grass', 'bell', 'watering', 'paw', 'grass'];
      for (let index = 0; index < 7; index += 1) {
        this.add.image(startX + index * (slotSize + gap), y + px(this, 10), SCENE_TEXTURES.Game.traySlot.key)
          .setOrigin(0, 0)
          .setDisplaySize(slotSize, slotSize);
        const type = types[index];
        if (type !== undefined) {
          this.add.image(startX + index * (slotSize + gap) + slotSize / 2, y + px(this, 10) + slotSize / 2, SCENE_TEXTURES.Game.tiles[type].key)
            .setDisplaySize(slotSize * 0.66, slotSize * 0.66);
        }
      }
      this.add.text(x + width / 2, y + height - px(this, 13), '危险 6/7 · 给第三张留位置', {
        fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 12), fontStyle: 'bold', color: '#b35d48',
      }).setOrigin(0.5);
      return;
    }

    if (pageIndex === 2) {
      this.drawMiniTool(x + width * 0.27, y + height / 2, SCENE_TEXTURES.Game.undo.key, '撤回', '不限次数');
      this.drawMiniTool(x + width * 0.73, y + height / 2, SCENE_TEXTURES.Game.shuffle.key, '打乱', '每关 3 次');
      return;
    }

    const starSize = px(this, 34);
    const starGap = px(this, 39);
    const starsCenterX = x + width * 0.29;
    [-1, 0, 1].forEach((offset) => {
      this.add.image(starsCenterX + offset * starGap, y + height / 2, SCENE_TEXTURES.Game.star.key)
        .setDisplaySize(starSize, starSize);
    });
    this.add.text(x + width * 0.74, y + height / 2, '不用工具\n拿满 3 星', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 13), fontStyle: 'bold', color: COLORS.title, align: 'center',
    }).setOrigin(0.5);
  }

  private drawMiniTile(x: number, y: number, size: number, type: TileType, active: boolean): void {
    this.add.image(x, y, SCENE_TEXTURES.Game.tileFrame.key).setOrigin(0, 0).setDisplaySize(size, size).setAlpha(active ? 1 : 0.62);
    this.add.image(x + size / 2, y + size / 2, SCENE_TEXTURES.Game.tiles[type].key)
      .setDisplaySize(size * 0.66, size * 0.66)
      .setAlpha(active ? 1 : 0.7);
  }

  private drawMiniTool(centerX: number, centerY: number, texture: string, label: string, detail: string): void {
    this.add.image(centerX - px(this, 40), centerY, texture).setDisplaySize(px(this, 34), px(this, 34));
    this.add.text(centerX - px(this, 14), centerY - px(this, 10), label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 13), fontStyle: 'bold', color: COLORS.title,
    }).setOrigin(0, 0.5);
    this.add.text(centerX - px(this, 14), centerY + px(this, 10), detail, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 11), color: '#6e8ca0',
    }).setOrigin(0, 0.5);
  }

  private drawSection(x: number, y: number, width: number, height: number, index: number, title: string, body: string): void {
    const radius = px(this, GAME_UI.helpSectionRadius);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x8b7356, 0.07);
    shadow.fillRoundedRect(x, y + px(this, 2), width, height, radius);
    const card = this.add.graphics();
    card.fillStyle(0xffffff, 0.77);
    card.fillRoundedRect(x, y, width, height, radius);
    card.lineStyle(px(this, 1), COLORS.tileStroke, 0.2);
    card.strokeRoundedRect(x, y, width, height, radius);
    this.add.circle(x + px(this, 22), y + px(this, 24), px(this, 12), 0xffd76b, 1)
      .setStrokeStyle(px(this, 1), COLORS.tileStroke, 0.45);
    this.add.text(x + px(this, 22), y + px(this, 24), String(index), {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif', fontSize: fontPx(this, 12), fontStyle: 'bold', color: COLORS.title,
    }).setOrigin(0.5);
    this.add.text(x + px(this, 42), y + px(this, 10), title, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 14), fontStyle: 'bold', color: COLORS.title,
    }).setOrigin(0, 0);
    this.add.text(x + px(this, 42), y + px(this, 34), body, {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, 12),
      color: COLORS.text,
      lineSpacing: px(this, 2),
      wordWrap: { width: width - px(this, 54), useAdvancedWrap: true },
    }).setOrigin(0, 0);
  }

  private drawFooter(centerX: number, y: number, panelWidth: number): void {
    const lastPage = this.pageIndex === HOW_TO_PLAY_PAGES.length - 1;
    const buttonWidth = Math.min(px(this, 138), (panelWidth - px(this, 52)) / 2);
    this.drawPageButton(centerX - buttonWidth / 2 - px(this, 6), y, buttonWidth, '上一页', this.pageIndex > 0, 'secondary', () => {
      this.pageIndex -= 1;
      this.renderPage();
    });
    this.drawPageButton(centerX + buttonWidth / 2 + px(this, 6), y, buttonWidth, lastPage ? '我知道了' : '下一页', true, 'primary', () => {
      if (lastPage) this.scene.start('Home');
      else {
        this.pageIndex += 1;
        this.renderPage();
      }
    });
  }

  private drawPageButton(
    centerX: number,
    y: number,
    width: number,
    label: string,
    enabled: boolean,
    variant: ToolButtonVariant,
    onTap: () => void,
  ): void {
    createRoundedButton(this, {
      x: centerX - width / 2,
      y,
      width,
      height: px(this, GAME_UI.helpButtonHeight),
      label,
      enabled,
      variant,
      radius: 12,
      labelSize: 14,
      hoverOffset: 1,
      onTap,
    });
  }
}
