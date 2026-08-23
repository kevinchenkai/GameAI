import Phaser from 'phaser';
import { ANIMATION, GAMEPLAY } from '../config/tuning';
import { COLORS, LAYOUT, PROTOTYPE_UI } from '../config/layout';
import { createDepthTwelveLayoutState } from '../config/demoLevel';
import { TILE_COLORS, TILE_LABELS } from '../config/prototypeArt';
import { GameModel } from '../core/GameModel';
import { UndoManager } from '../core/UndoManager';
import { LEVEL_LOADER } from '../levelRegistry';
import { calculateGameLayout, type GameLayout } from '../layout/GameLayout';
import { shuffleInWorker } from '../systems/SolverWorkerClient';
import type { GameState } from '../types/game';
import type { TileData } from '../types/tile';

export class GameScene extends Phaser.Scene {
  private model!: GameModel;
  private currentLayout!: GameLayout;
  private busy = false;
  private layoutFixture = false;
  private configuredMaxDepth = 1;
  private overlapRatio: number = LAYOUT.overlapRatio;
  private readonly undoManager = new UndoManager();
  private lastShuffleStrategy = 'none';
  private lastShuffleDurationMs = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    const params = new URLSearchParams(window.location.search);
    this.layoutFixture = params.get('layout') === 'depth12';
    this.overlapRatio = this.parseOverlap(params.get('overlap'));
    const requestedLevel = Number(params.get('level') ?? '1');
    const levelId = Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= LEVEL_LOADER.count
      ? requestedLevel
      : 1;
    const level = LEVEL_LOADER.get(levelId);
    this.configuredMaxDepth = level.maxDepth;
    this.model = new GameModel(
      this.layoutFixture ? createDepthTwelveLayoutState() : LEVEL_LOADER.createState(levelId),
    );
    this.renderGame();
    this.installDebugApi();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.renderGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.renderGame, this);
      delete window.__STACKPOP__;
    });
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
      pick: (columnIndex) => this.performPick(columnIndex),
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

  private renderGame(): void {
    if (!this.model) return;
    this.children.removeAll(true);
    const state = this.model.state;
    const maxDepth = Math.max(1, ...state.columns.map((column) => column.length));
    this.currentLayout = calculateGameLayout(
      this.scale.width,
      this.scale.height,
      state.columns.length,
      this.layoutFixture ? GAMEPLAY.maxColumnDepth : Math.max(maxDepth, this.configuredMaxDepth),
      this.overlapRatio,
    );
    this.drawBackground();
    this.drawHeader(state);
    this.drawBoard(state);
    this.drawTray(state);
    this.drawTools(state);
    if (state.status === 'won' || state.status === 'failed') this.drawResult(state.status);
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    graphics.fillRect(0, 0, this.scale.width, this.scale.height);
    graphics.fillStyle(COLORS.cloud, PROTOTYPE_UI.backgroundAlpha);
    graphics.fillCircle(this.scale.width * 0.12, this.scale.height * 0.22, 34);
    graphics.fillCircle(this.scale.width * 0.2, this.scale.height * 0.2, 46);
    graphics.fillCircle(this.scale.width * 0.28, this.scale.height * 0.22, 30);
    graphics.fillRoundedRect(this.scale.width * 0.08, this.scale.height * 0.22, this.scale.width * 0.24, 34, 16);
  }

  private drawHeader(state: GameState): void {
    const { contentLeft, contentWidth, headerTop } = this.currentLayout;
    this.add
      .text(contentLeft, headerTop + 4, `StackPop · 第${state.levelId}关`, {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.titleFontSize}px`,
        fontStyle: 'bold',
        color: COLORS.title,
      })
      .setOrigin(0, 0);
    const layoutTag = this.layoutFixture
      ? `布局验证 · 深度12 · overlap ${this.overlapRatio.toFixed(2)}`
      : `步数 ${state.moveCount} · 顶牌可点击`;
    this.add
      .text(contentLeft, headerTop + 39, layoutTag, {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.subtitleFontSize}px`,
        color: '#55798f',
      })
      .setOrigin(0, 0);
    this.add.rectangle(contentLeft, headerTop + 65, contentWidth, 1, 0xffffff, 0.5).setOrigin(0, 0);
  }

  private drawBoard(state: GameState): void {
    const { contentLeft, boardTop, tileSize, rowStep } = this.currentLayout;
    for (let columnIndex = 0; columnIndex < state.columns.length; columnIndex += 1) {
      const column = state.columns[columnIndex] ?? [];
      const x = contentLeft + columnIndex * (tileSize + LAYOUT.tileGap);
      column.forEach((tile, depth) => {
        const y = boardTop + depth * rowStep;
        const isTop = depth === column.length - 1;
        this.drawTile(tile, x, y, tileSize, isTop, columnIndex);
      });
    }
  }

  private drawTile(
    tile: TileData,
    x: number,
    y: number,
    size: number,
    isTop: boolean,
    columnIndex: number,
  ): void {
    const container = this.add.container(x, y);
    const shadow = this.add
      .rectangle(PROTOTYPE_UI.shadowOffset, PROTOTYPE_UI.shadowOffset, size, size, COLORS.tileShadow, 0.18)
      .setOrigin(0, 0);
    const frame = this.add
      .rectangle(0, 0, size, size, COLORS.tileBase)
      .setOrigin(0, 0)
      .setStrokeStyle(PROTOTYPE_UI.tileStrokeWidth, COLORS.tileStroke, 0.9);
    frame.setDisplaySize(size, size);
    const icon = this.add.circle(size / 2, size / 2, size * PROTOTYPE_UI.iconRatio * 0.5, TILE_COLORS[tile.type]);
    icon.setStrokeStyle(Math.max(2, size * 0.04), COLORS.tileStroke, 0.75);
    const label = this.add
      .text(size / 2, size / 2, TILE_LABELS[tile.type], {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${Math.max(PROTOTYPE_UI.tileLabelMinSize, size * PROTOTYPE_UI.tileLabelRatio)}px`,
        fontStyle: 'bold',
        color: tile.type === 'bone' ? '#7a684e' : '#ffffff',
        stroke: '#795a40',
        strokeThickness: Math.max(1, size * 0.025),
      })
      .setOrigin(0.5);
    container.add([shadow, frame, icon, label]);
    container.setAlpha(isTop ? 1 : 0.93);
    if (!isTop || this.layoutFixture) return;

    frame.setInteractive(
      new Phaser.Geom.Rectangle(-4, -4, size + 8, size + 8),
      Phaser.Geom.Rectangle.Contains,
      true,
    );
    frame.input!.cursor = 'pointer';
    frame.on(Phaser.Input.Events.POINTER_OVER, () => {
      if (!this.busy) container.setY(y - 4).setScale(1.04);
    });
    frame.on(Phaser.Input.Events.POINTER_OUT, () => container.setY(y).setScale(1));
    frame.on(Phaser.Input.Events.POINTER_DOWN, () => container.setScale(0.94));
    frame.on(Phaser.Input.Events.POINTER_UP, () => {
      container.setY(y).setScale(1);
      this.performPick(columnIndex);
    });
  }

  private drawTray(state: GameState): void {
    const { contentLeft, contentWidth, trayTop, traySlotSize } = this.currentLayout;
    this.add
      .text(
        contentLeft,
        trayTop - LAYOUT.trayLabelOffset,
        `暂存槽  ${state.tray.length}/${state.traySize}`,
        {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.trayLabelMinSize}px`,
        fontStyle: 'bold',
        color: COLORS.text,
        },
      )
      .setOrigin(0, 0);
    for (let slot = 0; slot < GAMEPLAY.traySize; slot += 1) {
      const x = contentLeft + slot * (traySlotSize + LAYOUT.trayGap);
      this.add
        .rectangle(x, trayTop, traySlotSize, traySlotSize, COLORS.tray, 0.78)
        .setOrigin(0, 0)
        .setStrokeStyle(1.5, COLORS.trayStroke, 0.9);
      const tile = state.tray[slot];
      if (tile !== undefined) this.drawTrayTile(tile, x, trayTop, traySlotSize);
    }
    this.add.rectangle(contentLeft, trayTop + traySlotSize + 7, contentWidth, 1, 0xffffff, 0.55).setOrigin(0, 0);
  }

  private drawTrayTile(tile: TileData, x: number, y: number, size: number): void {
    const inset = size * 0.12;
    this.add.circle(x + size / 2, y + size / 2, (size - inset * 2) / 2, TILE_COLORS[tile.type])
      .setStrokeStyle(2, COLORS.tileStroke, 0.72);
    this.add
      .text(x + size / 2, y + size / 2, TILE_LABELS[tile.type], {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${Math.max(PROTOTYPE_UI.trayLabelMinSize, size * 0.38)}px`,
        fontStyle: 'bold',
        color: tile.type === 'bone' ? '#7a684e' : '#ffffff',
      })
      .setOrigin(0.5);
  }

  private drawTools(state: GameState): void {
    const { contentLeft, contentWidth, toolsTop, toolButtonSize } = this.currentLayout;
    const width = (contentWidth - PROTOTYPE_UI.toolButtonGap * 2) / 3;
    const playing = state.status === 'playing' && !this.busy && !this.layoutFixture;
    const remainingShuffles = GAMEPLAY.shuffleLimit - state.shuffleUsed;
    this.drawToolButton(
      contentLeft,
      toolsTop,
      width,
      toolButtonSize,
      this.busy ? '洗牌中…' : `打乱 ${remainingShuffles}`,
      0xffd76b,
      playing && remainingShuffles > 0,
      () => void this.performShuffle(),
    );
    this.drawToolButton(
      contentLeft + width + PROTOTYPE_UI.toolButtonGap,
      toolsTop,
      width,
      toolButtonSize,
      '撤回',
      0xffadc0,
      !this.busy && this.undoManager.canUndo && !this.layoutFixture,
      () => this.performUndo(),
    );
    this.drawToolButton(
      contentLeft + (width + PROTOTYPE_UI.toolButtonGap) * 2,
      toolsTop,
      width,
      toolButtonSize,
      '重来',
      0xb7a6ea,
      !this.busy && !this.layoutFixture,
      () => this.restart(),
    );
  }

  private drawToolButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    enabled: boolean,
    onTap: () => void,
  ): void {
    const button = this.add
      .rectangle(x, y, width, height, color, enabled ? 1 : 0.42)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COLORS.tileStroke, enabled ? 1 : 0.45);
    this.add
      .text(x + width / 2, y + height / 2, label, {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.buttonFontSize}px`,
        fontStyle: 'bold',
        color: COLORS.text,
      })
      .setAlpha(enabled ? 1 : 0.5)
      .setOrigin(0.5);
    if (!enabled) return;
    button.setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.POINTER_UP, onTap);
  }

  private drawResult(status: 'won' | 'failed'): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const panelWidth = Math.min(
      this.currentLayout.contentWidth * PROTOTYPE_UI.resultPanelWidthRatio,
      this.scale.width - LAYOUT.contentPadding * 2,
    );
    const overlay = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x34516b, 0.32);
    overlay.setInteractive();
    this.add
      .rectangle(centerX, centerY, panelWidth, PROTOTYPE_UI.resultPanelHeight, 0xfff6e3)
      .setStrokeStyle(3, COLORS.tileStroke)
      .setOrigin(0.5);
    this.add
      .text(centerX, centerY - 67, status === 'won' ? '清空啦！' : '这一步卡住啦！', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.resultTitleSize}px`,
        fontStyle: 'bold',
        color: status === 'won' ? '#d88b21' : COLORS.title,
      })
      .setOrigin(0.5);
    this.add
      .text(centerX, centerY - 22, status === 'won' ? '所有卡片都已消除' : '暂存槽已经放满 7 格', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.resultBodySize}px`,
        color: COLORS.text,
      })
      .setOrigin(0.5);
    if (status === 'failed') {
      const buttonWidth =
        (panelWidth - PROTOTYPE_UI.resultPanelPadding * 2 - PROTOTYPE_UI.resultButtonGap * 2) / 3;
      const left = centerX - panelWidth / 2 + PROTOTYPE_UI.resultPanelPadding;
      const top = centerY + 33;
      this.drawToolButton(
        left,
        top,
        buttonWidth,
        PROTOTYPE_UI.resultButtonHeight,
        '撤回',
        0xffadc0,
        this.undoManager.canUndo,
        () => this.performUndo(),
      );
      this.drawToolButton(
        left + buttonWidth + PROTOTYPE_UI.resultButtonGap,
        top,
        buttonWidth,
        PROTOTYPE_UI.resultButtonHeight,
        '打乱',
        0xffd76b,
        false,
        () => void this.performShuffle(),
      );
      this.drawToolButton(
        left + (buttonWidth + PROTOTYPE_UI.resultButtonGap) * 2,
        top,
        buttonWidth,
        PROTOTYPE_UI.resultButtonHeight,
        '重来',
        0xb7a6ea,
        true,
        () => this.restart(),
      );
    } else {
      this.drawToolButton(
        centerX - PROTOTYPE_UI.resultButtonWidth / 2,
        centerY + 33,
        PROTOTYPE_UI.resultButtonWidth,
        PROTOTYPE_UI.resultButtonHeight,
        '重新开始',
        0xffc93c,
        true,
        () => this.restart(),
      );
    }
  }

  private performPick(columnIndex: number): boolean {
    if (this.busy || this.layoutFixture || !this.model.canPick(columnIndex)) return false;
    this.busy = true;
    this.undoManager.push(this.model.state);
    this.model.pick(columnIndex);
    this.time.delayedCall(ANIMATION.settleMs, () => {
      this.busy = false;
      this.renderGame();
    });
    return true;
  }

  private performUndo(): boolean {
    if (this.busy || this.layoutFixture) return false;
    const restored = this.undoManager.undo(this.model.state);
    if (restored === null) return false;
    this.model.replaceState(restored);
    this.renderGame();
    return true;
  }

  private async performShuffle(): Promise<boolean> {
    const state = this.model.state;
    if (
      this.busy ||
      this.layoutFixture ||
      state.status !== 'playing' ||
      state.shuffleUsed >= GAMEPLAY.shuffleLimit
    ) {
      return false;
    }
    this.busy = true;
    this.renderGame();
    const startedAt = performance.now();
    try {
      const result = await shuffleInWorker(state, state.rngState);
      this.undoManager.push(state);
      const nextState = {
        ...result.nextState,
        undoUsed: state.undoUsed,
        shuffleUsed: state.shuffleUsed + 1,
        status: 'playing' as const,
      };
      this.model.replaceState(nextState);
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
    this.busy = false;
    this.undoManager.clear();
    this.lastShuffleStrategy = 'none';
    this.lastShuffleDurationMs = 0;
    this.model.restart();
    this.renderGame();
  }
}
