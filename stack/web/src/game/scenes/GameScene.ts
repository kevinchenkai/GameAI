import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { ANIMATION, GAMEPLAY } from '../config/tuning';
import { COLORS, GAME_UI, LAYOUT, PROTOTYPE_UI } from '../config/layout';
import { createDepthTwelveLayoutState } from '../config/demoLevel';
import { GameModel } from '../core/GameModel';
import { calculateStarRating, type StarRating } from '../core/StarRating';
import { UndoManager } from '../core/UndoManager';
import { LEVEL_LOADER } from '../levelRegistry';
import {
  calculateBottomAlignedBoardPlacements,
  calculateGameLayout,
  scaleLayout,
  type GameLayout,
} from '../layout/GameLayout';
import { AudioSystem } from '../systems/AudioSystem';
import { fontPx, px, uiScale } from '../ui/uiScale';
import { InputQueue } from '../systems/InputQueue';
import { getSaveManager, type SaveManager } from '../systems/SaveManager';
import { shuffleInWorker } from '../systems/SolverWorkerClient';
import type { GameState, PickResult } from '../types/game';
import { createRoundedButton } from '../ui/RoundedButton';
import type { ToolButtonVariant } from '../ui/toolButtonStyle';
import { drawTray } from '../render/TrayRenderer';
import { drawBoard, createTileVisual } from '../render/BoardRenderer';
import { syncBackgroundMusic } from './BackgroundMusicScene';

interface GameSceneData {
  levelId?: number;
  resume?: boolean;
}

interface ToolButtonOptions {
  textureKey?: string;
  variant?: ToolButtonVariant;
  badge?: number;
}

export class GameScene extends Phaser.Scene {
  private model!: GameModel;
  private currentLayout!: GameLayout;
  private inputQueue!: InputQueue;
  private saveManager!: SaveManager;
  private busy = false;
  private layoutFixture = false;
  private configuredMaxDepth = 1;
  private overlapRatio: number = LAYOUT.overlapRatio;
  private readonly undoManager = new UndoManager();
  private readonly audioSystem = new AudioSystem();
  private readonly topTileContainers = new Map<number, Phaser.GameObjects.Container>();
  private trayRoot: Phaser.GameObjects.Container | null = null;
  private trayWarningTween: Phaser.Tweens.Tween | null = null;
  private lastShuffleStrategy = 'none';
  private lastShuffleDurationMs = 0;
  private completionStars: StarRating | null = null;
  private restartConfirmVisible = false;
  private previousTrayPairKeys = new Set<string>();
  private pendingWinCelebration = false;
  private resultAnimationTimers: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super('Game');
  }

  create(data: GameSceneData = {}): void {
    const params = new URLSearchParams(window.location.search);
    this.saveManager = getSaveManager();
    this.layoutFixture = params.get('layout') === 'depth12';
    this.overlapRatio = this.parseOverlap(params.get('overlap'));
    const urlHasLevel = params.has('level');
    const savedRunLevel = this.saveManager.snapshot.currentRun?.levelId;
    const requestedLevel = data.levelId ?? (urlHasLevel ? Number(params.get('level')) : savedRunLevel ?? 1);
    const levelId = Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= LEVEL_LOADER.count
      ? requestedLevel
      : 1;
    const level = LEVEL_LOADER.get(levelId);
    this.configuredMaxDepth = level.maxDepth;
    this.undoManager.clear();
    this.completionStars = null;
    this.restartConfirmVisible = false;
    this.pendingWinCelebration = false;
    this.previousTrayPairKeys.clear();
    const shouldResume = !this.layoutFixture && (data.resume ?? !urlHasLevel);
    const restored = shouldResume ? this.saveManager.restoreCurrentRun(levelId) : null;
    if (restored !== null) this.undoManager.import(restored.undoStack);
    const freshState = this.layoutFixture ? createDepthTwelveLayoutState() : LEVEL_LOADER.createState(levelId);
    this.model = new GameModel(freshState);
    if (restored !== null) this.model.replaceState(restored.state);
    this.inputQueue = new InputQueue((columnIndex) => this.handleQueuedPick(columnIndex));
    if (this.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      this.audioSystem.adoptContext(this.sound.context);
    }
    this.applyPreferences();
    if (!this.layoutFixture && restored === null) this.persistCurrentRun();
    this.renderGame();
    this.installDebugApi();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearInputQueue('shutdown');
      this.trayWarningTween?.stop();
      this.clearRenderAnimations();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
      delete window.__STACKPOP__;
    });
  }

  private handleResume(): void {
    this.applyPreferences();
    if (!this.busy) this.renderGame();
  }

  private handleResize(): void {
    if (!this.busy) this.renderGame();
  }

  private parseOverlap(value: string | null): number {
    if (value === null) return LAYOUT.overlapRatio;
    const parsed = Number(value);
    return LAYOUT.overlapCandidates.includes(parsed as 0.8 | 0.83 | 0.85)
      ? parsed
      : LAYOUT.overlapRatio;
  }

  private installDebugApi(): void {
    window.__STACKPOP__ = {
      getState: () => this.model.state,
      pick: (columnIndex) => this.enqueuePick(columnIndex),
      undo: () => this.performUndo(),
      shuffle: () => this.performShuffle(),
      restart: () => this.restart(),
      getLayout: () => ({ ...this.currentLayout }),
      getDiagnostics: () => ({
        lastShuffleStrategy: this.lastShuffleStrategy,
        lastShuffleDurationMs: this.lastShuffleDurationMs,
      }),
    };
  }

  private renderGame(showResult = true): void {
    if (!this.model) return;
    this.trayWarningTween?.stop();
    this.trayWarningTween = null;
    // Tween 和延迟粒子都必须先停，再销毁它们指向的 GameObject。
    this.clearRenderAnimations();
    this.children.removeAll(true);
    this.topTileContainers.clear();
    this.trayRoot = null;
    const state = this.model.state;
    const maxDepth = Math.max(1, ...state.columns.map((column) => column.length));
    /**
     * ★ 布局按 **CSS 像素** 计算，再整体乘倍率放大到物理像素。
     *
     *   画布缓冲已按 DPR 放大（见 main.ts），`this.scale.width` 是物理像素。
     *   若直接把物理像素喂给 calculateGameLayout，它会以为屏幕变宽了一倍，
     *   于是排出「更大的棋盘」而不是「更清晰的棋盘」——
     *   tileSize 会撞上 tileSizeMax 上限，布局与设计稿脱节。
     *
     *   所以：换算回 CSS 像素求解，再把结果放大。布局算法与其单测均不受影响。
     */
    const scale = uiScale(this);
    this.currentLayout = scaleLayout(
      calculateGameLayout(
        this.scale.width / scale,
        this.scale.height / scale,
        state.columns.length,
        this.layoutFixture ? GAMEPLAY.maxColumnDepth : Math.max(maxDepth, this.configuredMaxDepth),
        this.overlapRatio,
      ),
      scale,
    );
    this.drawBackground();
    this.drawHeader(state);
    this.drawBoard(state);
    this.drawTray(state);
    this.drawTools(state);
    if (this.restartConfirmVisible) this.drawRestartConfirmation();
    if (showResult && (state.status === 'won' || state.status === 'failed')) {
      this.drawResult(state.status);
    }
  }

  private drawBackground(): void {
    this.add
      .image(this.scale.width / 2, this.scale.height / 2, SCENE_TEXTURES.Game.background.key)
      .setDisplaySize(this.scale.width, this.scale.height);
    const wash = this.add.graphics();
    wash.fillGradientStyle(
      0xffffff,
      0xffffff,
      COLORS.skyBottom,
      COLORS.skyBottom,
      GAME_UI.backgroundWashTopAlpha,
      GAME_UI.backgroundWashTopAlpha,
      GAME_UI.backgroundWashBottomAlpha,
      GAME_UI.backgroundWashBottomAlpha,
    );
    wash.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  private drawHeader(state: GameState): void {
    const { contentLeft, contentWidth, headerTop } = this.currentLayout;
    const remainingTiles = state.columns.reduce((total, column) => total + column.length, 0);
    const panelHeight = px(this, 64);
    const radius = px(this, GAME_UI.surfaceRadius);
    const shadow = this.add.graphics();
    shadow.fillStyle(GAME_UI.softShadow, GAME_UI.surfaceShadowAlpha);
    shadow.fillRoundedRect(
      contentLeft,
      headerTop + px(this, GAME_UI.surfaceShadowOffset),
      contentWidth,
      panelHeight,
      radius,
    );
    const panel = this.add.graphics();
    panel.fillStyle(GAME_UI.surfaceCream, GAME_UI.surfaceFillAlpha);
    panel.fillRoundedRect(contentLeft, headerTop, contentWidth, panelHeight, radius);
    panel.lineStyle(px(this, 1.5), GAME_UI.surfaceStroke, GAME_UI.surfaceStrokeAlpha);
    panel.strokeRoundedRect(contentLeft, headerTop, contentWidth, panelHeight, radius);
    const highlight = this.add.graphics();
    highlight.lineStyle(px(this, 1), GAME_UI.surfaceStroke, GAME_UI.surfaceHighlightAlpha);
    highlight.lineBetween(
      contentLeft + radius,
      headerTop + px(this, 1),
      contentLeft + contentWidth - radius,
      headerTop + px(this, 1),
    );
    this.add
      .text(contentLeft + px(this, 14), headerTop + px(this, 8), `第${state.levelId}关`, {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: fontPx(this, GAME_UI.headerTitleSize),
        fontStyle: 'bold',
        color: COLORS.title,
      })
      .setOrigin(0, 0);
    const layoutTag = this.layoutFixture
      ? `布局验证 · 深度12 · overlap ${this.overlapRatio.toFixed(2)}`
      : state.levelId === 1 && state.moveCount < 3
        ? `步数 ${state.moveCount}  ·  点击每列最下方露出的卡牌`
        : `步数 ${state.moveCount}`;
    this.add
      .text(contentLeft + px(this, 14), headerTop + px(this, 39), layoutTag, {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: fontPx(this, PROTOTYPE_UI.subtitleFontSize),
        color: GAME_UI.textSecondary,
      })
      .setOrigin(0, 0);
    const remainingRight = contentLeft + contentWidth - px(this, 62);
    const remainingUnit = this.add
      .text(remainingRight, headerTop + px(this, 22), '张', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: fontPx(this, GAME_UI.headerMetaSize),
        color: GAME_UI.textSecondary,
      })
      .setOrigin(1, 0);
    const remainingCount = this.add
      .text(remainingRight - remainingUnit.width - px(this, 2), headerTop + px(this, 17), String(remainingTiles), {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: fontPx(this, GAME_UI.headerCountSize),
        fontStyle: 'bold',
        color: GAME_UI.textSecondary,
      })
      .setOrigin(1, 0);
    this.add
      .text(remainingCount.x - remainingCount.width - px(this, 3), headerTop + px(this, 22), '剩余', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: fontPx(this, GAME_UI.headerMetaSize),
        color: GAME_UI.textSecondary,
      })
      .setOrigin(1, 0);
    const settingsX = contentLeft + contentWidth - px(this, 28);
    const settingsY = headerTop + px(this, 32);
    const settings = this.add
      .image(settingsX, settingsY, SCENE_TEXTURES.Game.settings.key)
      .setDisplaySize(px(this, GAME_UI.settingsVisualSize), px(this, GAME_UI.settingsVisualSize))
      .setAlpha(GAME_UI.settingsRestAlpha);
    const settingsHit = this.add
      .rectangle(
        settingsX,
        settingsY,
        px(this, GAME_UI.settingsHitSize),
        px(this, GAME_UI.settingsHitSize),
        0xffffff,
        0.001,
      );
    if (!this.busy && !this.layoutFixture) {
      settingsHit.setInteractive({ useHandCursor: true });
      settingsHit.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (!window.matchMedia('(pointer: fine)').matches) return;
        settings
          .setDisplaySize(px(this, GAME_UI.settingsVisualSize + 1), px(this, GAME_UI.settingsVisualSize + 1))
          .setAlpha(1);
      });
      settingsHit.on(Phaser.Input.Events.POINTER_OUT, () => {
        settings
          .setDisplaySize(px(this, GAME_UI.settingsVisualSize), px(this, GAME_UI.settingsVisualSize))
          .setAlpha(GAME_UI.settingsRestAlpha);
      });
      settingsHit.on(Phaser.Input.Events.POINTER_DOWN, () => {
        settings.setDisplaySize(
          px(this, GAME_UI.settingsVisualSize - 1),
          px(this, GAME_UI.settingsVisualSize - 1),
        );
      });
      settingsHit.on(Phaser.Input.Events.POINTER_UP, () => {
        settings
          .setDisplaySize(px(this, GAME_UI.settingsVisualSize), px(this, GAME_UI.settingsVisualSize))
          .setAlpha(GAME_UI.settingsRestAlpha);
        this.openSettings();
      });
    } else {
      settings.setAlpha(GAME_UI.settingsDisabledAlpha);
    }
  }

  private drawBoard(state: GameState): void {
    const { topTileContainers } = drawBoard(this, this.currentLayout, state, {
      interactive: !this.layoutFixture,
      onPick: (columnIndex) => this.enqueuePick(columnIndex),
    });
    this.topTileContainers.clear();
    for (const [columnIndex, container] of topTileContainers) {
      this.topTileContainers.set(columnIndex, container);
    }
  }

  private drawTray(state: GameState): void {
    const { root, pairKeys, warningTween } = drawTray(this, this.currentLayout, state, {
      previousPairKeys: this.previousTrayPairKeys,
      busy: this.busy,
    });
    this.trayRoot = root;
    this.previousTrayPairKeys = pairKeys;
    this.trayWarningTween = warningTween ?? null;
  }

  private drawTools(state: GameState): void {
    const { contentLeft, contentWidth, toolsTop, toolButtonSize } = this.currentLayout;
    const gap = px(this, PROTOTYPE_UI.toolButtonGap);
    const usableWidth = contentWidth - gap * 2;
    const shuffleWidth = usableWidth * 0.31;
    const undoWidth = usableWidth * 0.42;
    const restartWidth = usableWidth - shuffleWidth - undoWidth;
    const playing = state.status === 'playing' && !this.busy && !this.layoutFixture;
    const remainingShuffles = GAMEPLAY.shuffleLimit - state.shuffleUsed;
    this.drawToolButton(contentLeft, toolsTop, shuffleWidth, toolButtonSize, this.busy ? '处理中…' : '打乱', playing && remainingShuffles > 0, () => void this.performShuffle(), {
      textureKey: SCENE_TEXTURES.Game.shuffle.key,
      badge: remainingShuffles,
    });
    this.drawToolButton(contentLeft + shuffleWidth + gap, toolsTop, undoWidth, toolButtonSize, '撤回', !this.busy && this.undoManager.canUndo && !this.layoutFixture, () => this.performUndo(), {
      textureKey: SCENE_TEXTURES.Game.undo.key,
      variant: 'primary',
    });
    this.drawToolButton(contentLeft + shuffleWidth + undoWidth + gap * 2, toolsTop, restartWidth, toolButtonSize, '重来', !this.busy && !this.layoutFixture, () => this.requestRestart(), {
      variant: 'danger',
    });
  }

  private drawToolButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    enabled: boolean,
    onTap: () => void,
    options: ToolButtonOptions = {},
  ): void {
    createRoundedButton(this, {
      x,
      y,
      width,
      height,
      label,
      enabled,
      variant: options.variant ?? 'secondary',
      ...(options.textureKey === undefined ? {} : { textureKey: options.textureKey }),
      ...(options.badge === undefined ? {} : { badge: options.badge }),
      labelSize: PROTOTYPE_UI.buttonFontSize,
      onTap: () => {
        this.audioSystem.play('button');
        onTap();
      },
    });
  }

  private drawRestartConfirmation(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const panelWidth = Math.min(px(this, GAME_UI.confirmationPanelMaxWidth), this.currentLayout.contentWidth - px(this, 24));
    const panelHeight = px(this, GAME_UI.confirmationPanelHeight);
    const panelLeft = centerX - panelWidth / 2;
    const panelTop = centerY - panelHeight / 2;
    const radius = px(this, GAME_UI.confirmationPanelRadius);
    this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x34516b, GAME_UI.resultOverlayAlpha)
      .setInteractive()
      .setDepth(300);
    const shadow = this.add.graphics().setDepth(301);
    shadow.fillStyle(GAME_UI.softShadow, 0.14);
    shadow.fillRoundedRect(panelLeft, panelTop + px(this, 4), panelWidth, panelHeight, radius);
    const panel = this.add.graphics().setDepth(302);
    panel.fillStyle(0xfff8e9, 0.98);
    panel.fillRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, radius);
    panel.lineStyle(px(this, 1.5), COLORS.tileStroke, 0.58);
    panel.strokeRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, radius);
    this.add.text(centerX, centerY - px(this, 51), '重新开始本关？', {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
      fontSize: fontPx(this, 23),
      fontStyle: 'bold',
      color: COLORS.title,
    }).setOrigin(0.5).setDepth(303);
    this.add.text(centerX, centerY - px(this, 14), '当前局面和撤回记录都会清空', {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, 13),
      color: COLORS.text,
    }).setOrigin(0.5).setDepth(303);
    const gap = px(this, 10);
    const panelPadding = px(this, GAME_UI.resultPanelPadding);
    const buttonWidth = (panelWidth - panelPadding * 2 - gap) / 2;
    const left = panelLeft + panelPadding;
    const top = centerY + px(this, 31);
    this.drawResultButton(left, top, buttonWidth, '取消', true, 'secondary', () => {
      this.restartConfirmVisible = false;
      this.renderGame();
    });
    this.drawResultButton(left + buttonWidth + gap, top, buttonWidth, '确认重来', true, 'danger', () => this.restart());
  }

  private drawResult(status: 'won' | 'failed'): void {
    const state = this.model.state;
    const centerX = this.scale.width / 2;
    const panelCenterY = this.scale.height / 2 - px(this, 8);
    const panelWidth = Math.min(
      px(this, GAME_UI.resultPanelMaxWidth),
      this.currentLayout.contentWidth * GAME_UI.resultPanelWidthRatio,
    );
    const configuredPanelHeight = status === 'won'
      ? GAME_UI.resultPanelHeight
      : GAME_UI.resultFailPanelHeight;
    const panelHeight = Math.min(px(this, configuredPanelHeight), this.scale.height * 0.44);
    const panelTop = panelCenterY - panelHeight / 2;
    const panelLeft = centerX - panelWidth / 2;
    const panelPadding = px(this, GAME_UI.resultPanelPadding);
    const earnedStars = status === 'won'
      ? this.completionStars ?? calculateStarRating(state.undoUsed, state.shuffleUsed)
      : null;
    const animateWin = status === 'won'
      && this.pendingWinCelebration
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pendingWinCelebration = false;
    const starImages: Phaser.GameObjects.Image[] = [];
    const contentTargets: Array<Phaser.GameObjects.Text | Phaser.GameObjects.Container> = [];
    const overlay = this.add.rectangle(centerX, this.scale.height / 2, this.scale.width, this.scale.height, 0x34516b, GAME_UI.resultOverlayAlpha)
      .setInteractive()
      .setDepth(300);
    const panel = this.add.image(centerX, panelCenterY, status === 'won' ? SCENE_TEXTURES.Game.winPanel.key : SCENE_TEXTURES.Game.failPanel.key)
      .setDisplaySize(panelWidth, panelHeight)
      .setDepth(301);
    if (status === 'won') {
      for (let index = 0; index < 3; index += 1) {
        const star = this.add.image(
          centerX + (index - 1) * px(this, GAME_UI.resultStarGap),
          panelTop + px(this, 43),
          SCENE_TEXTURES.Game.star.key,
        ).setDisplaySize(px(this, GAME_UI.resultStarSize), px(this, GAME_UI.resultStarSize)).setDepth(302);
        if (earnedStars !== null && index >= earnedStars) star.setTint(COLORS.resultStarUnearnedTint).setAlpha(GAME_UI.resultStarUnearnedAlpha);
        starImages.push(star);
      }
    }
    const title = this.add.text(centerX, panelTop + px(this, status === 'won' ? 88 : 72), status === 'won' ? `第${state.levelId}关完成` : '这一步卡住啦！', {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, GAME_UI.resultTitleSize),
      fontStyle: 'bold',
      color: status === 'won' ? '#d88b21' : COLORS.title,
    }).setOrigin(0.5).setDepth(302);
    contentTargets.push(title);

    const gap = px(this, GAME_UI.resultButtonGap);
    const buttonWidth = (panelWidth - panelPadding * 2 - gap * 2) / 3;
    const buttonTop = panelTop + panelHeight - panelPadding - px(this, GAME_UI.resultButtonHeight);
    const left = panelLeft + panelPadding;
    if (status === 'won') {
      const statTop = panelTop + px(this, 119);
      contentTargets.push(
        this.drawResultStat(left, statTop, buttonWidth, '步数', state.moveCount),
        this.drawResultStat(left + buttonWidth + gap, statTop, buttonWidth, '撤回', state.undoUsed),
        this.drawResultStat(left + (buttonWidth + gap) * 2, statTop, buttonWidth, '打乱', state.shuffleUsed),
      );
      const achievement = earnedStars === 3 ? '完美通关 · 没有使用工具' : earnedStars === 2 ? '漂亮！再试试三星挑战' : '顺利过关 · 最好成绩已保存';
      const achievementText = this.add.text(centerX, statTop + px(this, GAME_UI.resultStatHeight + 22), achievement, {
        fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 12), color: '#7d7569',
      }).setOrigin(0.5).setDepth(302);
      contentTargets.push(achievementText);
      const hasNext = state.levelId < LEVEL_LOADER.count;
      contentTargets.push(
        this.drawResultButton(left, buttonTop, buttonWidth, '下一关', hasNext, 'primary', () => this.startLevel(state.levelId + 1)),
        this.drawResultButton(left + buttonWidth + gap, buttonTop, buttonWidth, '再玩一次', true, 'secondary', () => this.restart()),
        this.drawResultButton(left + (buttonWidth + gap) * 2, buttonTop, buttonWidth, '选择关卡', true, 'danger', () => this.scene.start('LevelSelect')),
      );
      if (animateWin) this.animateWinResult(panel, starImages, contentTargets, overlay);
      return;
    }

    const failedBody = this.add.text(centerX, panelTop + px(this, 116), '暂存槽已经放满 7 格', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, GAME_UI.resultBodySize), color: COLORS.text,
    }).setOrigin(0.5).setDepth(302);
    const failedHint = this.add.text(centerX, panelTop + px(this, 145), this.undoManager.canUndo ? '撤回一步，回到槽位未满时' : '重新开始本关再试一次', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 12), color: '#7d7569',
    }).setOrigin(0.5).setDepth(302);
    contentTargets.push(failedBody, failedHint);
    if (this.undoManager.canUndo) {
      const recoveryButtonWidth = (panelWidth - panelPadding * 2 - gap) / 2;
      this.drawResultButton(left, buttonTop, recoveryButtonWidth, '撤回一步', true, 'primary', () => this.performUndo());
      this.drawResultButton(left + recoveryButtonWidth + gap, buttonTop, recoveryButtonWidth, '重新开始', true, 'danger', () => this.restart());
    } else {
      this.drawResultButton(left, buttonTop, panelWidth - panelPadding * 2, '重新开始', true, 'primary', () => this.restart());
    }
  }

  private drawResultStat(x: number, y: number, width: number, label: string, value: number): Phaser.GameObjects.Container {
    const height = px(this, GAME_UI.resultStatHeight);
    const radius = px(this, GAME_UI.resultStatRadius);
    const container = this.add.container(x, y).setDepth(302);
    const card = this.add.graphics();
    card.fillStyle(0xffffff, 0.64);
    card.fillRoundedRect(0, 0, width, height, radius);
    card.lineStyle(px(this, 1), COLORS.tileStroke, 0.18);
    card.strokeRoundedRect(0, 0, width, height, radius);
    container.add(card);
    container.add(this.add.text(width / 2, px(this, 13), label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, 10), color: '#877b6d',
    }).setOrigin(0.5));
    container.add(this.add.text(width / 2, px(this, 31), String(value), {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif', fontSize: fontPx(this, 16), fontStyle: 'bold', color: COLORS.title,
    }).setOrigin(0.5));
    return container;
  }

  private drawResultButton(
    x: number,
    y: number,
    width: number,
    label: string,
    enabled: boolean,
    variant: ToolButtonVariant,
    onTap: () => void,
  ): Phaser.GameObjects.Container {
    return createRoundedButton(this, {
      x,
      y,
      width,
      height: px(this, GAME_UI.resultButtonHeight),
      label,
      enabled,
      variant,
      depth: 303,
      radius: 11,
      labelSize: 12,
      hoverOffset: 1,
      onTap: () => {
        this.audioSystem.play('button');
        onTap();
      },
    });
  }

  private animateWinResult(
    panel: Phaser.GameObjects.Image,
    stars: readonly Phaser.GameObjects.Image[],
    contentTargets: readonly (Phaser.GameObjects.Text | Phaser.GameObjects.Container)[],
    overlay: Phaser.GameObjects.Rectangle,
  ): void {
    const finalStarAlphas = stars.map((star) => star.alpha);
    panel.setScale(GAME_UI.resultPanelEnterScale).setAlpha(GAME_UI.resultPanelEnterAlpha);
    contentTargets.forEach((target) => target.setAlpha(0));
    stars.forEach((star) => star.setScale(0.35).setAlpha(0));

    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: GAME_UI.resultPanelEnterMs,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: contentTargets,
      alpha: 1,
      delay: GAME_UI.resultContentDelayMs,
      duration: GAME_UI.resultContentFadeMs,
      ease: 'Quad.easeOut',
    });

    stars.forEach((star, index) => {
      const delay = GAME_UI.resultStarInitialDelayMs + index * GAME_UI.resultStarStaggerMs;
      this.tweens.add({
        targets: star,
        scale: 1,
        alpha: finalStarAlphas[index] ?? 1,
        delay,
        duration: GAME_UI.resultStarEnterMs,
        ease: 'Back.easeOut',
      });
      if ((finalStarAlphas[index] ?? 0) >= 0.9) {
        this.resultAnimationTimers.push(
          this.time.delayedCall(
            delay + GAME_UI.resultParticleDelayMs,
            () => this.playVictoryParticles(star.x, star.y),
          ),
        );
      }
    });

    const skipLayer = this.add.rectangle(overlay.x, overlay.y, overlay.width, overlay.height, 0xffffff, 0.001)
      .setInteractive()
      .setDepth(399);
    const finish = (): void => {
      this.tweens.killTweensOf([panel, ...stars, ...contentTargets]);
      this.clearResultAnimationTimers();
      panel.setScale(1).setAlpha(1);
      stars.forEach((star, index) => star.setScale(1).setAlpha(finalStarAlphas[index] ?? 1));
      contentTargets.forEach((target) => target.setAlpha(1));
      skipLayer.destroy();
    };
    skipLayer.once(Phaser.Input.Events.POINTER_UP, finish);
    this.resultAnimationTimers.push(
      this.time.delayedCall(
        GAME_UI.resultStarInitialDelayMs + stars.length * GAME_UI.resultStarStaggerMs + GAME_UI.resultStarEnterMs,
        () => {
          skipLayer.destroy();
          this.resultAnimationTimers = [];
        },
      ),
    );
  }

  private clearRenderAnimations(): void {
    this.tweens.killAll();
    this.clearResultAnimationTimers();
  }

  private clearResultAnimationTimers(): void {
    this.resultAnimationTimers.forEach((timer) => timer.remove(false));
    this.resultAnimationTimers = [];
  }

  private playVictoryParticles(x: number, y: number): void {
    for (let index = 0; index < 6; index += 1) {
      const angle = Math.PI * (1.08 + (index / 5) * 0.84);
      const distance = px(this, 24 + (index % 2) * 12);
      const sparkle = this.add.image(
        x,
        y,
        index % 2 === 0 ? SCENE_TEXTURES.Game.sparkle01.key : SCENE_TEXTURES.Game.sparkle02.key,
      ).setDisplaySize(px(this, 16), px(this, 16)).setScale(0.45).setDepth(306);
      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 0.9,
        alpha: 0,
        duration: GAME_UI.resultParticleMs,
        ease: 'Quad.easeOut',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  private enqueuePick(columnIndex: number): boolean {
    if (this.layoutFixture) return false;
    const state = this.model.state;
    if (!this.busy && state.status !== 'playing') return false;
    return this.inputQueue.enqueue(columnIndex);
  }

  private async handleQueuedPick(columnIndex: number): Promise<void> {
    if (this.layoutFixture || !this.model.canPick(columnIndex)) return;
    this.busy = true;
    this.audioSystem.play('tap');
    const tapped = this.topTileContainers.get(columnIndex);
    if (tapped !== undefined) await this.playTapAnimation(tapped);
    if (!this.model.canPick(columnIndex)) {
      this.busy = false;
      this.renderGame();
      return;
    }
    const before = this.model.state;
    this.undoManager.push(before);
    const result = this.model.pick(columnIndex);
    this.persistAfterStateChange();
    this.renderGame(false);
    await this.playPickAnimation(before, result);
    const status = this.model.state.status;
    if (status === 'won' || status === 'failed') {
      if (status === 'failed') {
        this.clearInputQueue('fail');
        await this.shakeTray();
        this.audioSystem.play('tray_full');
        this.vibrate([20]);
      } else {
        this.clearInputQueue('win');
        this.audioSystem.play('win');
        this.vibrate([30, 40, 30]);
      }
      await this.wait(ANIMATION.resultDelayMs);
    }
    this.pendingWinCelebration = status === 'won';
    this.busy = false;
    this.renderGame();
  }

  private async playTapAnimation(container: Phaser.GameObjects.Container): Promise<void> {
    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: container, scale: 0.94, duration: ANIMATION.tapDownMs, ease: 'Quad.easeOut', onComplete: () => resolve() });
    });
    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: container, scale: 1.05, duration: ANIMATION.tapUpMs, ease: 'Back.easeOut', onComplete: () => resolve() });
    });
  }

  private async playPickAnimation(before: GameState, result: PickResult): Promise<void> {
    const { contentLeft, tileSize, trayTop, traySlotSize } = this.currentLayout;
    const placements = calculateBottomAlignedBoardPlacements(
      this.currentLayout,
      before.columns.map((column) => column.length),
      px(this, LAYOUT.tileGap),
      px(this, LAYOUT.trayLabelOffset + LAYOUT.sectionGap),
      px(this, 6),
    );
    const sourceColumn = before.columns[result.sourceColumnIndex] ?? [];
    const sourcePlacement = placements.find(
      ({ columnIndex, depth }) =>
        columnIndex === result.sourceColumnIndex && depth === sourceColumn.length - 1,
    );
    const startX = sourcePlacement?.x ?? contentLeft;
    const startY = sourcePlacement?.y ?? this.currentLayout.boardTop;
    const targetSlot = Math.min(GAMEPLAY.traySize - 1, result.insertedTrayIndex);
    const targetX = contentLeft + targetSlot * (traySlotSize + px(this, LAYOUT.trayGap)) + traySlotSize * 0.08;
    const targetY = trayTop + traySlotSize * 0.08;
    const flying = createTileVisual(this, result.pickedTile, startX, startY, tileSize, true).setDepth(250);
    const progress = { value: 0 };
    const controlY = Math.min(startY, targetY) - Math.min(px(this, 60), tileSize * 0.9);
    this.audioSystem.play('jump');
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: progress, value: 1, duration: ANIMATION.jumpMs, ease: 'Sine.easeInOut',
        onUpdate: () => {
          const t = progress.value;
          const inverse = 1 - t;
          flying.x = inverse * inverse * startX + 2 * inverse * t * ((startX + targetX) / 2) + t * t * targetX;
          flying.y = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * targetY;
          const targetScale = (traySlotSize / tileSize) * 0.84;
          flying.setScale(1 + (targetScale - 1) * t).setRotation(Math.sin(t * Math.PI) * 0.045);
        },
        onComplete: () => resolve(),
      });
    });
    flying.destroy();
    if (this.trayRoot !== null) {
      this.trayRoot.x += px(this, 8);
      this.tweens.add({ targets: this.trayRoot, x: this.currentLayout.contentLeft, alpha: 1, duration: ANIMATION.trayShiftMs, ease: 'Quad.easeOut' });
    }
    if (result.matches.length > 0) {
      this.audioSystem.play('match');
      this.vibrate([15, 20, 15]);
      this.playMatchParticles(targetX + traySlotSize / 2, targetY + traySlotSize / 2);
      await this.wait(ANIMATION.matchMs);
    } else {
      this.vibrate([10]);
    }
  }

  private playMatchParticles(x: number, y: number): void {
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const distance = px(this, 30 + (index % 2) * 14);
      const sparkle = this.add.image(x, y, index % 2 === 0 ? SCENE_TEXTURES.Game.sparkle01.key : SCENE_TEXTURES.Game.sparkle02.key).setDisplaySize(px(this, 22), px(this, 22)).setDepth(260).setScale(0.4);
      this.tweens.add({
        targets: sparkle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, scale: 1, alpha: 0,
        duration: ANIMATION.matchMs, ease: 'Quad.easeOut', onComplete: () => sparkle.destroy(),
      });
    }
  }

  private async shakeTray(): Promise<void> {
    if (this.trayRoot === null) return;
    const originX = this.trayRoot.x;
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: this.trayRoot, x: originX + px(this, 4), duration: ANIMATION.trayShakeMs, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
        onComplete: () => { this.trayRoot?.setX(originX); resolve(); },
      });
    });
  }

  private performUndo(): boolean {
    this.clearInputQueue('undo');
    if (this.busy || this.layoutFixture) return false;
    const restored = this.undoManager.undo(this.model.state);
    if (restored === null) return false;
    this.model.replaceState(restored);
    this.persistCurrentRun();
    this.audioSystem.play('undo');
    this.renderGame();
    return true;
  }

  private async performShuffle(): Promise<boolean> {
    this.clearInputQueue('shuffle');
    const state = this.model.state;
    if (this.busy || this.layoutFixture || state.status !== 'playing' || state.shuffleUsed >= GAMEPLAY.shuffleLimit) return false;
    this.busy = true;
    this.audioSystem.play('shuffle');
    this.renderGame(false);
    const startedAt = performance.now();
    try {
      const [result] = await Promise.all([shuffleInWorker(state, state.rngState), this.wait(ANIMATION.shuffleMs)]);
      this.undoManager.push(state);
      this.model.replaceState({ ...result.nextState, undoUsed: state.undoUsed, shuffleUsed: state.shuffleUsed + 1, status: 'playing' });
      this.persistCurrentRun();
      this.lastShuffleStrategy = result.strategy;
      this.lastShuffleDurationMs = performance.now() - startedAt;
      this.busy = false;
      this.renderGame();
      return true;
    } catch (error: unknown) {
      console.error('[Shuffle] unable to construct a safe state', error);
      this.lastShuffleStrategy = 'error';
      this.lastShuffleDurationMs = performance.now() - startedAt;
      this.busy = false;
      this.renderGame();
      return false;
    }
  }

  private restart(): void {
    this.clearInputQueue('restart');
    this.busy = false;
    this.restartConfirmVisible = false;
    this.pendingWinCelebration = false;
    this.undoManager.clear();
    this.lastShuffleStrategy = 'none';
    this.lastShuffleDurationMs = 0;
    this.model.restart();
    this.completionStars = null;
    this.persistCurrentRun();
    this.renderGame();
  }

  private requestRestart(): void {
    if (this.busy || this.layoutFixture || this.model.state.status !== 'playing') return;
    this.restartConfirmVisible = true;
    this.renderGame(false);
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.saveManager.snapshot.settings.vibration) return;
    if (window.matchMedia('(pointer: fine)').matches) return;
    if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  }

  private applyPreferences(): void {
    const preferences = this.saveManager.snapshot.settings;
    this.audioSystem.setEnabled(preferences.sound);
    if (!this.layoutFixture) syncBackgroundMusic(this, preferences.music);
  }

  private persistAfterStateChange(): void {
    if (this.layoutFixture) return;
    const state = this.model.state;
    if (state.status === 'won') {
      this.completionStars = calculateStarRating(state.undoUsed, state.shuffleUsed);
      this.saveManager.completeLevel(state.levelId, this.completionStars);
    } else {
      this.persistCurrentRun();
    }
  }

  private persistCurrentRun(): void {
    if (this.layoutFixture || !this.model) return;
    this.saveManager.saveCurrentRun(this.model.state, this.undoManager.exportRecent());
  }

  private startLevel(levelId: number): void {
    if (levelId < 1 || levelId > LEVEL_LOADER.count) return;
    this.scene.start('Game', { levelId, resume: false });
  }

  private openSettings(): void {
    if (this.busy || this.layoutFixture) return;
    this.scene.pause();
    this.scene.launch('Settings', { sourceScene: 'Game', levelId: this.model.state.levelId });
  }

  private clearInputQueue(
    _reason: 'win' | 'fail' | 'restart' | 'undo' | 'shuffle' | 'shutdown',
  ): void {
    this.inputQueue.clear();
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(duration, resolve));
  }
}
