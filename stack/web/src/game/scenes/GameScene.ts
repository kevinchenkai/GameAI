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
  type BoardTilePlacement,
  type GameLayout,
} from '../layout/GameLayout';
import { AudioSystem } from '../systems/AudioSystem';
import { fontPx, px, uiScale } from '../ui/uiScale';
import { InputQueue } from '../systems/InputQueue';
import { getSaveManager, type SaveManager } from '../systems/SaveManager';
import { shuffleInWorker } from '../systems/SolverWorkerClient';
import type { GameState, PickResult } from '../types/game';
import type { TileData } from '../types/tile';
import { resolveToolButtonStyle, type ToolButtonVariant } from '../ui/toolButtonStyle';
import { findTrayPairRuns, resolveTrayPresentation } from '../ui/trayPresentation';
import { resolveTileVisualStyle } from '../ui/tileVisualStyle';
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
      this.tweens.killAll();
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
      settings.setAlpha(0.5);
    }
  }

  private drawBoard(state: GameState): void {
    const { tileSize } = this.currentLayout;
    const placements = calculateBottomAlignedBoardPlacements(
      this.currentLayout,
      state.columns.map((column) => column.length),
      px(this, LAYOUT.tileGap),
      px(this, LAYOUT.trayLabelOffset + LAYOUT.sectionGap),
      px(this, 6),
    );
    for (const placement of placements) {
      const tile = state.columns[placement.columnIndex]?.[placement.depth];
      if (tile === undefined) continue;
      const container = this.createTileVisual(
        tile,
        placement.x,
        placement.y,
        tileSize,
        placement.isTop,
      );
      container.setDepth(placement.depth + 2);
      if (placement.isTop && !this.layoutFixture) {
        this.topTileContainers.set(placement.columnIndex, container);
        this.makeTileInteractive(container, placement);
      }
    }
  }

  private createTileVisual(tile: TileData, x: number, y: number, size: number, isTop: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const style = resolveTileVisualStyle(isTop);
    const radius = size * PROTOTYPE_UI.cornerRatio;
    if (style.shadowAlpha > 0) {
      const shadow = this.add.graphics();
      shadow.fillStyle(GAME_UI.softShadow, style.shadowAlpha);
      shadow.fillRoundedRect(
        0,
        px(this, GAME_UI.tileActiveShadowOffset),
        size,
        size,
        radius,
      );
      container.add(shadow);
    }
    const frame = this.add
      .image(0, 0, SCENE_TEXTURES.Game.tileFrame.key)
      .setOrigin(0, 0)
      .setDisplaySize(size, size)
      .setAlpha(style.frameAlpha)
      .setName('hit-frame');
    container.add(frame);
    if (style.overlayAlpha > 0) {
      container.add(
        this.add.rectangle(size / 2, size / 2, size * 0.9, size * 0.9, 0x253746, style.overlayAlpha),
      );
    }
    const icon = this.add
      .image(size / 2, size / 2, SCENE_TEXTURES.Game.tiles[tile.type].key)
      .setDisplaySize(size * GAME_UI.boardIconCanvasRatio, size * GAME_UI.boardIconCanvasRatio)
      .setAlpha(style.iconAlpha);
    container.add(icon);
    if (style.outlineAlpha > 0) {
      const outline = this.add.graphics();
      outline.lineStyle(
        px(this, GAME_UI.tileActiveOutlineWidth),
        GAME_UI.tileActiveOutline,
        style.outlineAlpha,
      );
      outline.strokeRoundedRect(0, 0, size, size, radius);
      container.add(outline);
    }
    return container;
  }

  private makeTileInteractive(
    container: Phaser.GameObjects.Container,
    placement: BoardTilePlacement,
  ): void {
    const frame = container.getByName('hit-frame') as Phaser.GameObjects.Image;
    const extension = (placement.x - placement.hitArea.x) / frame.scaleX;
    frame.setInteractive(
      new Phaser.Geom.Rectangle(
        -extension,
        -extension,
        frame.width + extension * 2,
        frame.height + extension * 2,
      ),
      Phaser.Geom.Rectangle.Contains,
      true,
    );
    frame.input!.cursor = 'pointer';
    frame.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (window.matchMedia('(pointer: fine)').matches) {
        container.setY(placement.y - px(this, 4)).setScale(1.04);
      }
    });
    frame.on(Phaser.Input.Events.POINTER_OUT, () => {
      container.setPosition(placement.x, placement.y).setScale(1);
    });
    frame.on(Phaser.Input.Events.POINTER_UP, () => {
      container.setPosition(placement.x, placement.y).setScale(1);
      this.enqueuePick(placement.columnIndex);
    });
  }

  private drawTray(state: GameState): void {
    const { contentLeft, contentWidth, trayTop, traySlotSize } = this.currentLayout;
    const presentation = resolveTrayPresentation(state.tray.length, state.traySize);
    const pressure = presentation.level !== 'normal';
    const danger = presentation.level === 'danger' || presentation.level === 'full';
    const root = this.add.container(contentLeft, trayTop);
    this.trayRoot = root;
    const panel = this.add.graphics();
    const panelLeft = -px(this, 10);
    const panelTop = -px(this, 34);
    const panelWidth = contentWidth + px(this, 20);
    const panelHeight = traySlotSize + px(this, 42);
    panel.fillStyle(
      danger ? 0xffeee8 : pressure ? 0xfff3df : GAME_UI.surfaceCream,
      GAME_UI.trayPanelAlpha,
    );
    panel.fillRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, px(this, GAME_UI.surfaceRadius));
    panel.lineStyle(px(this, 1.5), danger ? 0xd66b4d : pressure ? 0xd99a3c : 0xffffff, 0.8);
    panel.strokeRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, px(this, GAME_UI.surfaceRadius));
    root.add(panel);
    root.add(
      this.add
        .text(0, -px(this, 27), '暂存槽', {
          fontFamily: 'PingFang SC, sans-serif',
          fontSize: fontPx(this, PROTOTYPE_UI.trayLabelMinSize + 2),
          fontStyle: 'bold',
          color: COLORS.text,
        })
        .setOrigin(0, 0),
    );
    if (presentation.level === 'normal') {
      const suffix = this.add.text(contentWidth, -px(this, 18), `/${state.traySize}`, {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: fontPx(this, PROTOTYPE_UI.trayLabelMinSize),
        color: GAME_UI.textSecondary,
      }).setOrigin(1, 0.5);
      const count = this.add.text(
        contentWidth - suffix.width - px(this, 1),
        -px(this, 18),
        String(state.tray.length),
        {
          fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
          fontSize: fontPx(this, PROTOTYPE_UI.trayLabelMinSize + 4),
          fontStyle: 'bold',
          color: COLORS.title,
        },
      ).setOrigin(1, 0.5);
      root.add([suffix, count]);
    } else {
      root.add(this.add.text(contentWidth, -px(this, 27), presentation.label, {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: fontPx(this, PROTOTYPE_UI.trayLabelMinSize + 2),
        fontStyle: 'bold',
        color: danger ? '#c95e46' : pressure ? '#a9681f' : COLORS.title,
      }).setOrigin(1, 0));
    }
    for (let slot = 0; slot < GAMEPLAY.traySize; slot += 1) {
      const x = slot * (traySlotSize + px(this, LAYOUT.trayGap));
      const slotTexture = danger ? SCENE_TEXTURES.Game.traySlotWarn.key : SCENE_TEXTURES.Game.traySlot.key;
      const tile = state.tray[slot];
      root.add(
        this.add
          .image(x, 0, slotTexture)
          .setOrigin(0, 0)
          .setDisplaySize(traySlotSize, traySlotSize)
          .setAlpha(tile === undefined ? GAME_UI.trayEmptySlotAlpha : GAME_UI.trayOccupiedSlotAlpha),
      );
      if (tile !== undefined) {
        const highlight = this.add.graphics();
        highlight.fillStyle(GAME_UI.trayOccupiedHighlight, GAME_UI.trayOccupiedHighlightAlpha);
        highlight.fillRoundedRect(
          x + px(this, 2),
          px(this, 2),
          traySlotSize - px(this, 4),
          traySlotSize - px(this, 4),
          traySlotSize * 0.18,
        );
        root.add(highlight);
        root.add(this.createTrayTile(tile, x, 0, traySlotSize));
      }
    }
    const currentPairKeys = new Set<string>();
    for (const run of findTrayPairRuns(state.tray)) {
      const key = `${run.type}:${run.start}:${run.length}`;
      currentPairKeys.add(key);
      const startX = run.start * (traySlotSize + px(this, LAYOUT.trayGap));
      const endX = (run.start + run.length - 1) * (traySlotSize + px(this, LAYOUT.trayGap));
      const glow = this.add.graphics();
      glow.lineStyle(
        px(this, GAME_UI.trayPairGlowWidth),
        GAME_UI.trayPairGlow,
        GAME_UI.trayPairGlowAlpha,
      );
      glow.lineBetween(
        startX + px(this, 4),
        traySlotSize - px(this, 3),
        endX + traySlotSize - px(this, 4),
        traySlotSize - px(this, 3),
      );
      root.add(glow);
      if (!this.previousTrayPairKeys.has(key)) {
        glow.setAlpha(0.25);
        this.tweens.add({
          targets: glow,
          alpha: 1,
          duration: GAME_UI.trayPairGlowDuration / 2,
          yoyo: true,
          repeat: 0,
          ease: 'Sine.easeInOut',
        });
      }
    }
    this.previousTrayPairKeys = currentPairKeys;
    if (presentation.level === 'danger' && !this.busy) {
      this.trayWarningTween = this.tweens.add({
        targets: root,
        scale: 1.025,
        alpha: 0.82,
        duration: ANIMATION.trayWarningCycleMs / 2,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createTrayTile(tile: TileData, x: number, y: number, size: number): Phaser.GameObjects.Image {
    return this.add
      .image(x + size / 2, y + size / 2, SCENE_TEXTURES.Game.tiles[tile.type].key)
      .setDisplaySize(size * GAME_UI.trayIconCanvasRatio, size * GAME_UI.trayIconCanvasRatio);
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
    const variant = options.variant ?? 'secondary';
    const style = resolveToolButtonStyle(variant, enabled);
    const container = this.add.container(x, y);
    const radius = px(this, GAME_UI.buttonRadius);
    let shadow: Phaser.GameObjects.Graphics | null = null;
    if (style.shadowAlpha > 0) {
      shadow = this.add.graphics();
      shadow.fillStyle(GAME_UI.softShadow, style.shadowAlpha);
      shadow.fillRoundedRect(0, px(this, style.shadowOffset), width, height, radius);
      container.add(shadow);
    }
    const background = this.add.graphics();
    background.fillStyle(style.fill, style.fillAlpha);
    background.fillRoundedRect(0, 0, width, height, radius);
    background.lineStyle(px(this, style.strokeWidth), style.stroke, style.strokeAlpha);
    background.strokeRoundedRect(0, 0, width, height, radius);
    container.add(background);
    const labelText = this.add.text(0, height / 2, label, {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: `${Math.round(Math.min(px(this, PROTOTYPE_UI.buttonFontSize), width * 0.16))}px`,
      fontStyle: 'bold',
      color: style.labelColor,
    });
    if (options.textureKey !== undefined) {
      const iconSize = Math.min(height - px(this, 10), px(this, GAME_UI.toolIconSize));
      const iconGap = px(this, GAME_UI.toolIconGap);
      const groupWidth = iconSize + iconGap + labelText.width;
      const groupLeft = Math.max(px(this, 8), (width - groupWidth) / 2);
      container.add(
        this.add
          .image(groupLeft, (height - iconSize) / 2, options.textureKey)
          .setOrigin(0, 0)
          .setDisplaySize(iconSize, iconSize)
          .setAlpha(enabled ? 1 : 0.42),
      );
      labelText.setPosition(groupLeft + iconSize + iconGap, height / 2).setOrigin(0, 0.5);
    } else {
      labelText.setPosition(width / 2, height / 2).setOrigin(0.5);
    }
    container.add(labelText);
    if (options.badge !== undefined) {
      const badgeRadius = px(this, GAME_UI.toolBadgeRadius);
      const badgeX = width - badgeRadius - px(this, GAME_UI.toolBadgeEdgeInset);
      const badgeY = badgeRadius + px(this, GAME_UI.toolBadgeEdgeInset);
      container.add(this.add.circle(badgeX, badgeY, badgeRadius, 0xe9a83a, enabled ? 1 : 0.45));
      container.add(this.add.text(badgeX, badgeY, String(Math.max(0, options.badge)), {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: fontPx(this, 10),
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5));
    }
    if (!enabled) return;
    background.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    background.input!.cursor = 'pointer';
    background.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (window.matchMedia('(pointer: fine)').matches) container.setY(y - px(this, 2));
    });
    background.on(Phaser.Input.Events.POINTER_OUT, () => {
      container.setY(y);
      shadow?.setAlpha(1);
    });
    background.on(Phaser.Input.Events.POINTER_DOWN, () => {
      container.setY(y + px(this, style.pressedOffset));
      shadow?.setAlpha(style.pressedShadowScale);
    });
    background.on(Phaser.Input.Events.POINTER_UP, () => {
      container.setY(y);
      shadow?.setAlpha(1);
      this.audioSystem.play('button');
      onTap();
    });
  }

  private drawRestartConfirmation(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const panelWidth = Math.min(px(this, 330), this.currentLayout.contentWidth - px(this, 24));
    const panelHeight = px(this, 210);
    this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x34516b, 0.5)
      .setInteractive()
      .setDepth(300);
    this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0xfff8e9, 1)
      .setStrokeStyle(px(this, 2), COLORS.tileStroke, 0.75)
      .setDepth(301);
    this.add.text(centerX, centerY - px(this, 58), '重新开始本关？', {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
      fontSize: fontPx(this, 24),
      fontStyle: 'bold',
      color: COLORS.title,
    }).setOrigin(0.5).setDepth(302);
    this.add.text(centerX, centerY - px(this, 18), '当前局面和撤回记录都会清空', {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, 14),
      color: COLORS.text,
    }).setOrigin(0.5).setDepth(302);
    const gap = px(this, 10);
    const buttonWidth = (panelWidth - px(this, 48) - gap) / 2;
    const left = centerX - gap / 2 - buttonWidth;
    const top = centerY + px(this, 35);
    this.drawConfirmationButton(left, top, buttonWidth, '取消', 0xffffff, () => {
      this.restartConfirmVisible = false;
      this.renderGame();
    });
    this.drawConfirmationButton(centerX + gap / 2, top, buttonWidth, '确认重来', 0xffd0c3, () => this.restart());
  }

  private drawConfirmationButton(x: number, y: number, width: number, label: string, fill: number, onTap: () => void): void {
    const button = this.add.rectangle(x, y, width, px(this, 46), fill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(px(this, 1.5), COLORS.tileStroke, 0.65)
      .setInteractive({ useHandCursor: true })
      .setDepth(303);
    this.add.text(x + width / 2, y + px(this, 23), label, {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: fontPx(this, 14),
      fontStyle: 'bold',
      color: COLORS.text,
    }).setOrigin(0.5).setDepth(304);
    button.on(Phaser.Input.Events.POINTER_UP, onTap);
  }

  private drawResult(status: 'won' | 'failed'): void {
    const state = this.model.state;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const panelWidth = Math.min(this.currentLayout.contentWidth * 0.88, this.scale.width - LAYOUT.contentPadding * 2);
    const panelHeight = Math.min(px(this, 360), this.scale.height * 0.48);
    this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x34516b, 0.42).setInteractive().setDepth(300);
    this.add.image(centerX, centerY, status === 'won' ? SCENE_TEXTURES.Game.winPanel.key : SCENE_TEXTURES.Game.failPanel.key).setDisplaySize(panelWidth, panelHeight).setDepth(301);
    if (status === 'won') {
      const earnedStars = this.completionStars ?? calculateStarRating(state.undoUsed, state.shuffleUsed);
      for (let index = 0; index < 3; index += 1) {
        const star = this.add.image(centerX + (index - 1) * px(this, 48), centerY - panelHeight * 0.31, SCENE_TEXTURES.Game.star.key).setDisplaySize(px(this, 42), px(this, 42)).setDepth(302);
        if (index >= earnedStars) star.setTint(0xaebbc5).setAlpha(0.48);
      }
    }
    this.add.text(centerX, centerY - (status === 'won' ? 54 : 68), status === 'won' ? `第${state.levelId}关完成` : '这一步卡住啦！', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, PROTOTYPE_UI.resultTitleSize), fontStyle: 'bold', color: status === 'won' ? '#d88b21' : COLORS.title,
    }).setOrigin(0.5).setDepth(302);
    const resultBody = status === 'won'
      ? `步数 ${state.moveCount}  ·  撤回 ${state.undoUsed}  ·  打乱 ${state.shuffleUsed}`
      : '暂存槽已经放满 7 格';
    this.add.text(centerX, centerY + (status === 'won' ? 4 : -22), resultBody, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: fontPx(this, PROTOTYPE_UI.resultBodySize), color: COLORS.text,
    }).setOrigin(0.5).setDepth(302);
    if (status === 'failed') {
      const buttonWidth = (panelWidth - px(this, 52)) / 3;
      const left = centerX - panelWidth / 2 + px(this, 20);
      const top = centerY + px(this, 46);
      this.drawResultButton(left, top, buttonWidth, '撤回一步', this.undoManager.canUndo, () => this.performUndo());
      this.drawResultButton(left + buttonWidth + 6, top, buttonWidth, '打乱', false, () => void this.performShuffle());
      this.drawResultButton(left + (buttonWidth + 6) * 2, top, buttonWidth, '重新开始', true, () => this.restart());
    } else {
      const buttonWidth = (panelWidth - px(this, 52)) / 3;
      const left = centerX - panelWidth / 2 + px(this, 20);
      const top = centerY + px(this, 62);
      const hasNext = state.levelId < LEVEL_LOADER.count;
      this.drawResultButton(left, top, buttonWidth, '下一关', hasNext, () => this.startLevel(state.levelId + 1));
      this.drawResultButton(left + buttonWidth + 6, top, buttonWidth, '再玩一次', true, () => this.restart());
      this.drawResultButton(left + (buttonWidth + 6) * 2, top, buttonWidth, '选择关卡', true, () => this.scene.start('LevelSelect'));
    }
  }

  private drawResultButton(x: number, y: number, width: number, label: string, enabled: boolean, onTap: () => void): void {
    const button = this.add.rectangle(x, y, width, px(this, 48), enabled ? 0xffd76b : 0xd8d5cf, enabled ? 1 : 0.72).setOrigin(0, 0).setStrokeStyle(px(this, 2), COLORS.tileStroke, enabled ? 0.85 : 0.3).setDepth(303);
    this.add.text(x + width / 2, y + px(this, 24), label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: `${Math.round(Math.max(px(this, 11), Math.min(px(this, 14), width * 0.13)))}px`, fontStyle: 'bold', color: COLORS.text,
    }).setAlpha(enabled ? 1 : 0.48).setOrigin(0.5).setDepth(304);
    if (!enabled) return;
    button.setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.POINTER_UP, onTap);
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
    const flying = this.createTileVisual(result.pickedTile, startX, startY, tileSize, true).setDepth(250);
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
