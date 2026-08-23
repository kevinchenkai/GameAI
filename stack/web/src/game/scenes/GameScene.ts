import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { ANIMATION, GAMEPLAY } from '../config/tuning';
import { COLORS, LAYOUT, PROTOTYPE_UI } from '../config/layout';
import { createDepthTwelveLayoutState } from '../config/demoLevel';
import { GameModel } from '../core/GameModel';
import { calculateStarRating, type StarRating } from '../core/StarRating';
import { UndoManager } from '../core/UndoManager';
import { LEVEL_LOADER } from '../levelRegistry';
import { calculateGameLayout, type GameLayout } from '../layout/GameLayout';
import { AudioSystem } from '../systems/AudioSystem';
import { InputQueue } from '../systems/InputQueue';
import { getSaveManager, type SaveManager } from '../systems/SaveManager';
import { shuffleInWorker } from '../systems/SolverWorkerClient';
import type { GameState, PickResult } from '../types/game';
import type { TileData } from '../types/tile';

interface GameSceneData {
  levelId?: number;
  resume?: boolean;
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
    if (showResult && (state.status === 'won' || state.status === 'failed')) {
      this.drawResult(state.status);
    }
  }

  private drawBackground(): void {
    this.add
      .image(this.scale.width / 2, this.scale.height / 2, SCENE_TEXTURES.Game.background.key)
      .setDisplaySize(this.scale.width, this.scale.height);
    const wash = this.add.graphics();
    wash.fillGradientStyle(0xffffff, 0xffffff, COLORS.skyBottom, COLORS.skyBottom, 0.08, 0.08, 0.28, 0.28);
    wash.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  private drawHeader(state: GameState): void {
    const { contentLeft, contentWidth, headerTop } = this.currentLayout;
    this.add
      .rectangle(contentLeft, headerTop, contentWidth, 64, 0xfffbf2, 0.78)
      .setStrokeStyle(1.5, 0xffffff, 0.88)
      .setOrigin(0, 0);
    this.add
      .text(contentLeft + 14, headerTop + 9, `第 ${state.levelId} 关`, {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.titleFontSize}px`,
        fontStyle: 'bold',
        color: COLORS.title,
      })
      .setOrigin(0, 0);
    const layoutTag = this.layoutFixture
      ? `布局验证 · 深度12 · overlap ${this.overlapRatio.toFixed(2)}`
      : `步数 ${state.moveCount}  ·  找到三枚同类卡片`;
    this.add
      .text(contentLeft + 14, headerTop + 39, layoutTag, {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: `${PROTOTYPE_UI.subtitleFontSize}px`,
        color: '#55798f',
      })
      .setOrigin(0, 0);
    this.add
      .text(contentLeft + contentWidth - 56, headerTop + 16, `${state.tray.length}/${state.traySize}`, {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: state.tray.length >= 6 ? '#d66b4d' : '#6e8ca0',
      })
      .setOrigin(1, 0);
    const settings = this.add
      .image(contentLeft + contentWidth - 28, headerTop + 32, SCENE_TEXTURES.Game.settings.key)
      .setDisplaySize(34, 34);
    if (!this.busy && !this.layoutFixture) {
      settings.setInteractive({ useHandCursor: true });
      settings.on(Phaser.Input.Events.POINTER_OVER, () => settings.setScale(1.08));
      settings.on(Phaser.Input.Events.POINTER_OUT, () => settings.setScale(1));
      settings.on(Phaser.Input.Events.POINTER_UP, () => this.openSettings());
    } else {
      settings.setAlpha(0.5);
    }
  }

  private drawBoard(state: GameState): void {
    const { contentLeft, boardTop, tileSize, rowStep } = this.currentLayout;
    for (let columnIndex = 0; columnIndex < state.columns.length; columnIndex += 1) {
      const column = state.columns[columnIndex] ?? [];
      const x = contentLeft + columnIndex * (tileSize + LAYOUT.tileGap);
      column.forEach((tile, depth) => {
        const y = boardTop + depth * rowStep;
        const isTop = depth === column.length - 1;
        const container = this.createTileVisual(tile, x, y, tileSize, isTop);
        container.setDepth(depth + 2);
        if (isTop && !this.layoutFixture) {
          this.topTileContainers.set(columnIndex, container);
          this.makeTileInteractive(container, columnIndex, x, y);
        }
      });
    }
  }

  private createTileVisual(tile: TileData, x: number, y: number, size: number, isTop: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const frame = this.add
      .image(0, 0, SCENE_TEXTURES.Game.tileFrame.key)
      .setOrigin(0, 0)
      .setDisplaySize(size, size)
      .setName('hit-frame');
    const icon = this.add
      .image(size / 2, size / 2, SCENE_TEXTURES.Game.tiles[tile.type].key)
      .setDisplaySize(size * 0.7, size * 0.7);
    container.add([frame, icon]);
    container.setAlpha(isTop ? 1 : 0.9);
    return container;
  }

  private makeTileInteractive(container: Phaser.GameObjects.Container, columnIndex: number, x: number, y: number): void {
    const frame = container.getByName('hit-frame') as Phaser.GameObjects.Image;
    const extension = 6 / frame.scaleX;
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
      if (window.matchMedia('(pointer: fine)').matches) container.setY(y - 4).setScale(1.04);
    });
    frame.on(Phaser.Input.Events.POINTER_OUT, () => container.setPosition(x, y).setScale(1));
    frame.on(Phaser.Input.Events.POINTER_UP, () => {
      container.setPosition(x, y).setScale(1);
      this.enqueuePick(columnIndex);
    });
  }

  private drawTray(state: GameState): void {
    const { contentLeft, contentWidth, trayTop, traySlotSize } = this.currentLayout;
    const warning = state.tray.length >= state.traySize - 1;
    const root = this.add.container(contentLeft, trayTop);
    this.trayRoot = root;
    root.add(
      this.add
        .text(0, -LAYOUT.trayLabelOffset, `暂存槽  ${state.tray.length}/${state.traySize}`, {
          fontFamily: 'PingFang SC, sans-serif',
          fontSize: `${PROTOTYPE_UI.trayLabelMinSize}px`,
          fontStyle: 'bold',
          color: warning ? '#c95e46' : COLORS.text,
        })
        .setOrigin(0, 0),
    );
    for (let slot = 0; slot < GAMEPLAY.traySize; slot += 1) {
      const x = slot * (traySlotSize + LAYOUT.trayGap);
      const slotTexture = warning ? SCENE_TEXTURES.Game.traySlotWarn.key : SCENE_TEXTURES.Game.traySlot.key;
      root.add(this.add.image(x, 0, slotTexture).setOrigin(0, 0).setDisplaySize(traySlotSize, traySlotSize));
      const tile = state.tray[slot];
      if (tile !== undefined) root.add(this.createTrayTile(tile, x, 0, traySlotSize));
    }
    root.add(this.add.rectangle(0, traySlotSize + 7, contentWidth, 1, 0xffffff, 0.55).setOrigin(0, 0));
    if (state.tray.length === state.traySize - 1 && !this.busy) {
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

  private createTrayTile(tile: TileData, x: number, y: number, size: number): Phaser.GameObjects.Container {
    const inset = size * 0.09;
    const container = this.add.container(x + inset, y + inset);
    container.add([
      this.add.image(0, 0, SCENE_TEXTURES.Game.tileFrame.key).setOrigin(0, 0).setDisplaySize(size - inset * 2, size - inset * 2),
      this.add.image((size - inset * 2) / 2, (size - inset * 2) / 2, SCENE_TEXTURES.Game.tiles[tile.type].key)
        .setDisplaySize((size - inset * 2) * 0.72, (size - inset * 2) * 0.72),
    ]);
    return container;
  }

  private drawTools(state: GameState): void {
    const { contentLeft, contentWidth, toolsTop, toolButtonSize } = this.currentLayout;
    const width = (contentWidth - PROTOTYPE_UI.toolButtonGap * 2) / 3;
    const playing = state.status === 'playing' && !this.busy && !this.layoutFixture;
    const remainingShuffles = GAMEPLAY.shuffleLimit - state.shuffleUsed;
    this.drawToolButton(contentLeft, toolsTop, width, toolButtonSize, this.busy ? '处理中…' : `打乱 ${remainingShuffles}`, playing && remainingShuffles > 0, () => void this.performShuffle(), SCENE_TEXTURES.Game.shuffle.key);
    this.drawToolButton(contentLeft + width + PROTOTYPE_UI.toolButtonGap, toolsTop, width, toolButtonSize, '撤回', !this.busy && this.undoManager.canUndo && !this.layoutFixture, () => this.performUndo(), SCENE_TEXTURES.Game.undo.key);
    this.drawToolButton(contentLeft + (width + PROTOTYPE_UI.toolButtonGap) * 2, toolsTop, width, toolButtonSize, '重来', !this.busy && !this.layoutFixture, () => this.restart());
  }

  private drawToolButton(x: number, y: number, width: number, height: number, label: string, enabled: boolean, onTap: () => void, textureKey?: string): void {
    const container = this.add.container(x, y);
    const background = this.add.rectangle(0, 0, width, height, 0xfffbf2, enabled ? 0.94 : 0.55).setOrigin(0, 0).setStrokeStyle(1.5, COLORS.tileStroke, enabled ? 0.74 : 0.3);
    container.add(background);
    let labelCenter = width / 2;
    if (textureKey !== undefined) {
      const iconSize = Math.min(height - 10, 34);
      container.add(this.add.image(8, (height - iconSize) / 2, textureKey).setOrigin(0, 0).setDisplaySize(iconSize, iconSize));
      labelCenter = 8 + iconSize + (width - 8 - iconSize) / 2;
    }
    container.add(this.add.text(labelCenter, height / 2, label, {
      fontFamily: 'PingFang SC, sans-serif',
      fontSize: `${Math.min(PROTOTYPE_UI.buttonFontSize, width * 0.16)}px`,
      fontStyle: 'bold',
      color: COLORS.text,
    }).setAlpha(enabled ? 1 : 0.5).setOrigin(0.5));
    if (!enabled) return;
    background.setInteractive({ useHandCursor: true });
    background.on(Phaser.Input.Events.POINTER_OVER, () => container.setY(y - 3).setScale(1.02));
    background.on(Phaser.Input.Events.POINTER_OUT, () => container.setY(y).setScale(1));
    background.on(Phaser.Input.Events.POINTER_DOWN, () => container.setScale(0.96));
    background.on(Phaser.Input.Events.POINTER_UP, () => {
      container.setY(y).setScale(1);
      this.audioSystem.play('button');
      onTap();
    });
  }

  private drawResult(status: 'won' | 'failed'): void {
    const state = this.model.state;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    const panelWidth = Math.min(this.currentLayout.contentWidth * 0.88, this.scale.width - LAYOUT.contentPadding * 2);
    const panelHeight = Math.min(360, this.scale.height * 0.48);
    this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x34516b, 0.42).setInteractive().setDepth(300);
    this.add.image(centerX, centerY, status === 'won' ? SCENE_TEXTURES.Game.winPanel.key : SCENE_TEXTURES.Game.failPanel.key).setDisplaySize(panelWidth, panelHeight).setDepth(301);
    if (status === 'won') {
      const earnedStars = this.completionStars ?? calculateStarRating(state.undoUsed, state.shuffleUsed);
      for (let index = 0; index < 3; index += 1) {
        const star = this.add.image(centerX + (index - 1) * 48, centerY - panelHeight * 0.31, SCENE_TEXTURES.Game.star.key).setDisplaySize(42, 42).setDepth(302);
        if (index >= earnedStars) star.setTint(0xaebbc5).setAlpha(0.48);
      }
    }
    this.add.text(centerX, centerY - (status === 'won' ? 54 : 68), status === 'won' ? `第 ${state.levelId} 关完成` : '这一步卡住啦！', {
      fontFamily: 'PingFang SC, sans-serif', fontSize: `${PROTOTYPE_UI.resultTitleSize}px`, fontStyle: 'bold', color: status === 'won' ? '#d88b21' : COLORS.title,
    }).setOrigin(0.5).setDepth(302);
    const resultBody = status === 'won'
      ? `步数 ${state.moveCount}  ·  撤回 ${state.undoUsed}  ·  打乱 ${state.shuffleUsed}`
      : '暂存槽已经放满 7 格';
    this.add.text(centerX, centerY + (status === 'won' ? 4 : -22), resultBody, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: `${PROTOTYPE_UI.resultBodySize}px`, color: COLORS.text,
    }).setOrigin(0.5).setDepth(302);
    if (status === 'failed') {
      const buttonWidth = (panelWidth - 52) / 3;
      const left = centerX - panelWidth / 2 + 20;
      const top = centerY + 46;
      this.drawResultButton(left, top, buttonWidth, '撤回一步', this.undoManager.canUndo, () => this.performUndo());
      this.drawResultButton(left + buttonWidth + 6, top, buttonWidth, '打乱', false, () => void this.performShuffle());
      this.drawResultButton(left + (buttonWidth + 6) * 2, top, buttonWidth, '重新开始', true, () => this.restart());
    } else {
      const buttonWidth = (panelWidth - 52) / 3;
      const left = centerX - panelWidth / 2 + 20;
      const top = centerY + 62;
      const hasNext = state.levelId < LEVEL_LOADER.count;
      this.drawResultButton(left, top, buttonWidth, '下一关', hasNext, () => this.startLevel(state.levelId + 1));
      this.drawResultButton(left + buttonWidth + 6, top, buttonWidth, '再玩一次', true, () => this.restart());
      this.drawResultButton(left + (buttonWidth + 6) * 2, top, buttonWidth, '选择关卡', true, () => this.scene.start('LevelSelect'));
    }
  }

  private drawResultButton(x: number, y: number, width: number, label: string, enabled: boolean, onTap: () => void): void {
    const button = this.add.rectangle(x, y, width, 48, enabled ? 0xffd76b : 0xd8d5cf, enabled ? 1 : 0.72).setOrigin(0, 0).setStrokeStyle(2, COLORS.tileStroke, enabled ? 0.85 : 0.3).setDepth(303);
    this.add.text(x + width / 2, y + 24, label, {
      fontFamily: 'PingFang SC, sans-serif', fontSize: `${Math.max(11, Math.min(14, width * 0.13))}px`, fontStyle: 'bold', color: COLORS.text,
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
    const { contentLeft, boardTop, tileSize, rowStep, trayTop, traySlotSize } = this.currentLayout;
    const sourceColumn = before.columns[result.sourceColumnIndex] ?? [];
    const startX = contentLeft + result.sourceColumnIndex * (tileSize + LAYOUT.tileGap);
    const startY = boardTop + Math.max(0, sourceColumn.length - 1) * rowStep;
    const targetSlot = Math.min(GAMEPLAY.traySize - 1, result.insertedTrayIndex);
    const targetX = contentLeft + targetSlot * (traySlotSize + LAYOUT.trayGap) + traySlotSize * 0.08;
    const targetY = trayTop + traySlotSize * 0.08;
    const flying = this.createTileVisual(result.pickedTile, startX, startY, tileSize, true).setDepth(250);
    const progress = { value: 0 };
    const controlY = Math.min(startY, targetY) - Math.min(60, tileSize * 0.9);
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
      this.trayRoot.x += 8;
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
      const distance = 30 + (index % 2) * 14;
      const sparkle = this.add.image(x, y, index % 2 === 0 ? SCENE_TEXTURES.Game.sparkle01.key : SCENE_TEXTURES.Game.sparkle02.key).setDisplaySize(22, 22).setDepth(260).setScale(0.4);
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
        targets: this.trayRoot, x: originX + 4, duration: ANIMATION.trayShakeMs, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
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
    this.undoManager.clear();
    this.lastShuffleStrategy = 'none';
    this.lastShuffleDurationMs = 0;
    this.model.restart();
    this.completionStars = null;
    this.persistCurrentRun();
    this.renderGame();
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.saveManager.snapshot.settings.vibration) return;
    if (window.matchMedia('(pointer: fine)').matches) return;
    if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  }

  private applyPreferences(): void {
    this.audioSystem.setEnabled(this.saveManager.snapshot.settings.sound);
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
