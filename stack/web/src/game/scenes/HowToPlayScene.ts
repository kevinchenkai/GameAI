import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { HOW_TO_PLAY_PAGES } from '../config/howToPlay';
import { COLORS, LAYOUT } from '../config/layout';
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
    this.add.rectangle(centerX, height / 2, Math.min(px(this, LAYOUT.maxContentWidth), width), height, 0xffffff, 0.12);

    const panelWidth = Math.min(px(this, 430), width - px(this, LAYOUT.contentPadding) * 2);
    const panelHeight = Math.min(px(this, 660), height - px(this, 28));
    const panelTop = (height - panelHeight) / 2;
    const panelLeft = centerX - panelWidth / 2;
    this.add.rectangle(centerX, panelTop, panelWidth, panelHeight, 0xfff9ec, 0.94)
      .setOrigin(0.5, 0)
      .setStrokeStyle(px(this, 2), 0xffffff, 0.9);

    this.drawBackButton(panelLeft + px(this, 14), panelTop + px(this, 14));
    this.add.image(centerX, panelTop + px(this, 43), SCENE_TEXTURES.HowToPlay.hint.key).setDisplaySize(px(this, 52), px(this, 52));
    this.add.text(centerX, panelTop + px(this, 82), page.title, {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
      fontSize: fontPx(this, 25),
      fontStyle: 'bold',
      color: COLORS.title,
    }).setOrigin(0.5);
    this.add.text(centerX, panelTop + px(this, 111), page.subtitle, {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, 14),
      color: '#6e8ca0',
    }).setOrigin(0.5);

    const sectionLeft = panelLeft + px(this, 18);
    const sectionWidth = panelWidth - px(this, 36);
    const sectionsTop = panelTop + px(this, 136);
    const footerHeight = px(this, 92);
    const sectionGap = px(this, 10);
    const sectionsHeight = panelHeight - (sectionsTop - panelTop) - footerHeight;
    const sectionHeight = (sectionsHeight - sectionGap * (page.sections.length - 1)) / page.sections.length;
    page.sections.forEach((section, index) => {
      this.drawSection(sectionLeft, sectionsTop + index * (sectionHeight + sectionGap), sectionWidth, sectionHeight, section.title, section.body);
    });

    this.drawFooter(centerX, panelTop + panelHeight - px(this, 70), panelWidth);
  }

  private drawBackButton(x: number, y: number): void {
    const button = this.add.rectangle(x, y, px(this, 64), px(this, 32), 0xffffff, 0.84)
      .setOrigin(0, 0)
      .setStrokeStyle(px(this, 1.5), COLORS.tileStroke, 0.55)
      .setInteractive({ useHandCursor: true });
    this.add.text(x + px(this, 32), y + px(this, 16), '‹ 首页', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 13), fontStyle: 'bold', color: COLORS.text,
    }).setOrigin(0.5);
    button.on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('Home'));
  }

  private drawSection(x: number, y: number, width: number, height: number, title: string, body: string): void {
    this.add.rectangle(x, y, width, height, 0xffffff, 0.7)
      .setOrigin(0, 0)
      .setStrokeStyle(px(this, 1), COLORS.tileStroke, 0.25);
    this.add.text(x + px(this, 14), y + px(this, 11), title, {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, 16),
      fontStyle: 'bold',
      color: COLORS.title,
    }).setOrigin(0, 0);
    this.add.text(x + px(this, 14), y + px(this, 38), body, {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, 13),
      color: COLORS.text,
      lineSpacing: px(this, 4),
      wordWrap: { width: width - px(this, 28), useAdvancedWrap: true },
    }).setOrigin(0, 0);
  }

  private drawFooter(centerX: number, y: number, panelWidth: number): void {
    const lastPage = this.pageIndex === HOW_TO_PLAY_PAGES.length - 1;
    const buttonWidth = Math.min(px(this, 132), (panelWidth - px(this, 66)) / 2);
    this.drawPageButton(centerX - buttonWidth / 2 - px(this, 8), y, buttonWidth, '上一页', this.pageIndex > 0, () => {
      this.pageIndex -= 1;
      this.renderPage();
    });
    this.drawPageButton(centerX + buttonWidth / 2 + px(this, 8), y, buttonWidth, lastPage ? '返回首页' : '下一页', true, () => {
      if (lastPage) {
        this.scene.start('Home');
      } else {
        this.pageIndex += 1;
        this.renderPage();
      }
    });
    this.add.text(centerX, y + px(this, 50), `${this.pageIndex + 1} / ${HOW_TO_PLAY_PAGES.length}`, {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif', fontSize: fontPx(this, 12), color: '#7e94a3',
    }).setOrigin(0.5);
  }

  private drawPageButton(centerX: number, y: number, width: number, label: string, enabled: boolean, onTap: () => void): void {
    const button = this.add.rectangle(centerX, y, width, px(this, 42), enabled ? 0xffd76b : 0xd8d5cf, enabled ? 1 : 0.58)
      .setOrigin(0.5, 0)
      .setStrokeStyle(px(this, 1.5), COLORS.tileStroke, enabled ? 0.7 : 0.25);
    this.add.text(centerX, y + px(this, 21), label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 14), fontStyle: 'bold', color: COLORS.text,
    }).setAlpha(enabled ? 1 : 0.45).setOrigin(0.5);
    if (!enabled) return;
    button.setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.POINTER_OVER, () => button.setScale(1.03));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setScale(1));
    button.on(Phaser.Input.Events.POINTER_UP, onTap);
  }
}
