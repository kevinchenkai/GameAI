import type Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { ANIMATION, GAMEPLAY } from '../config/tuning';
import { COLORS, GAME_UI, LAYOUT, PROTOTYPE_UI } from '../config/layout';
import type { GameLayout } from '../layout/GameLayout';
import { fontPx, px } from '../ui/uiScale';
import { findTrayPairRuns, resolveTrayPresentation } from '../ui/trayPresentation';
import type { GameState } from '../types/game';
import type { TileData } from '../types/tile';

/**
 * ★ 暂存槽绘制模块。契约同 BoardRenderer：只吃 layout + state，只产出 GameObject。
 *
 *   两处状态需要跨帧比较，由调用方持有并传入 / 收回，模块自身无状态：
 *   - `previousPairKeys`：判断哪对是**新出现**的，只给新的放闪光动画
 *   - `warningTween`：危险档的呼吸动画句柄，供场景在下次重绘前停掉
 */
export interface TrayRenderInput {
  /** 上一帧的成对高亮 key，用于识别新增对 */
  previousPairKeys: ReadonlySet<string>;
  /** 忙碌中（有动画在跑）时不启动危险呼吸，避免与取牌动画打架 */
  busy: boolean;
}

export interface TrayRenderResult {
  root: Phaser.GameObjects.Container;
  /** 本帧的成对高亮 key，调用方需存下来喂给下一帧 */
  pairKeys: Set<string>;
  /** 危险档呼吸动画，未启动时为 undefined */
  warningTween: Phaser.Tweens.Tween | undefined;
}

export function drawTray(
  scene: Phaser.Scene,
  layout: GameLayout,
  state: GameState,
  input: TrayRenderInput,
): TrayRenderResult {
  const { contentLeft, contentWidth, trayTop, traySlotSize } = layout;
  const presentation = resolveTrayPresentation(state.tray.length, state.traySize);
  const pressure = presentation.level !== 'normal';
  const danger = presentation.level === 'danger' || presentation.level === 'full';
  const root = scene.add.container(contentLeft, trayTop);

  const panel = scene.add.graphics();
  const panelLeft = -px(scene, 10);
  const panelTop = -px(scene, 34);
  const panelWidth = contentWidth + px(scene, 20);
  const panelHeight = traySlotSize + px(scene, 42);
  panel.fillStyle(
    danger ? GAME_UI.trayPanelDangerFill : pressure ? GAME_UI.trayPanelPressureFill : GAME_UI.surfaceCream,
    GAME_UI.trayPanelAlpha,
  );
  panel.fillRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, px(scene, GAME_UI.surfaceRadius));
  panel.lineStyle(
    px(scene, GAME_UI.trayPanelStrokeWidth),
    danger ? GAME_UI.trayPanelDangerStroke : pressure ? GAME_UI.trayPanelPressureStroke : GAME_UI.trayPanelStroke,
    GAME_UI.trayPanelStrokeAlpha,
  );
  panel.strokeRoundedRect(panelLeft, panelTop, panelWidth, panelHeight, px(scene, GAME_UI.surfaceRadius));
  root.add(panel);

  root.add(
    scene.add
      .text(0, -px(scene, 27), '暂存槽', {
        fontFamily: 'PingFang SC, sans-serif',
        fontSize: fontPx(scene, PROTOTYPE_UI.trayLabelMinSize + 2),
        fontStyle: 'bold',
        color: COLORS.text,
      })
      .setOrigin(0, 0),
  );

  if (presentation.level === 'normal') {
    const suffix = scene.add.text(contentWidth, -px(scene, 18), `/${state.traySize}`, {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
      fontSize: fontPx(scene, PROTOTYPE_UI.trayLabelMinSize),
      color: GAME_UI.textSecondary,
    }).setOrigin(1, 0.5);
    const count = scene.add.text(
      contentWidth - suffix.width - px(scene, 1),
      -px(scene, 18),
      String(state.tray.length),
      {
        fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
        fontSize: fontPx(scene, PROTOTYPE_UI.trayLabelMinSize + 4),
        fontStyle: 'bold',
        color: COLORS.title,
      },
    ).setOrigin(1, 0.5);
    root.add([suffix, count]);
  } else {
    root.add(scene.add.text(contentWidth, -px(scene, 27), presentation.label, {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
      fontSize: fontPx(scene, PROTOTYPE_UI.trayLabelMinSize + 2),
      fontStyle: 'bold',
      color: danger ? GAME_UI.trayLabelDangerColor : pressure ? GAME_UI.trayLabelPressureColor : COLORS.title,
    }).setOrigin(1, 0));
  }

  for (let slot = 0; slot < GAMEPLAY.traySize; slot += 1) {
    const x = slot * (traySlotSize + px(scene, LAYOUT.trayGap));
    const slotTexture = danger ? SCENE_TEXTURES.Game.traySlotWarn.key : SCENE_TEXTURES.Game.traySlot.key;
    const tile = state.tray[slot];
    root.add(
      scene.add
        .image(x, 0, slotTexture)
        .setOrigin(0, 0)
        .setDisplaySize(traySlotSize, traySlotSize)
        .setAlpha(tile === undefined ? GAME_UI.trayEmptySlotAlpha : GAME_UI.trayOccupiedSlotAlpha),
    );
    if (tile !== undefined) {
      const highlight = scene.add.graphics();
      highlight.fillStyle(GAME_UI.trayOccupiedHighlight, GAME_UI.trayOccupiedHighlightAlpha);
      highlight.fillRoundedRect(
        x + px(scene, 2),
        px(scene, 2),
        traySlotSize - px(scene, 4),
        traySlotSize - px(scene, 4),
        traySlotSize * 0.18,
      );
      root.add(highlight);
      root.add(createTrayTile(scene, tile, x, 0, traySlotSize));
    }
  }

  const pairKeys = new Set<string>();
  for (const run of findTrayPairRuns(state.tray)) {
    const key = `${run.type}:${run.start}:${run.length}`;
    pairKeys.add(key);
    const startX = run.start * (traySlotSize + px(scene, LAYOUT.trayGap));
    const endX = (run.start + run.length - 1) * (traySlotSize + px(scene, LAYOUT.trayGap));
    const glow = scene.add.graphics();
    glow.lineStyle(
      px(scene, GAME_UI.trayPairGlowWidth),
      GAME_UI.trayPairGlow,
      GAME_UI.trayPairGlowAlpha,
    );
    glow.lineBetween(
      startX + px(scene, 4),
      traySlotSize - px(scene, 3),
      endX + traySlotSize - px(scene, 4),
      traySlotSize - px(scene, 3),
    );
    root.add(glow);
    if (!input.previousPairKeys.has(key)) {
      glow.setAlpha(GAME_UI.trayPairGlowEnterAlpha);
      scene.tweens.add({
        targets: glow,
        alpha: 1,
        duration: GAME_UI.trayPairGlowDuration / 2,
        yoyo: true,
        repeat: 0,
        ease: 'Sine.easeInOut',
      });
    }
  }

  let warningTween: Phaser.Tweens.Tween | undefined;
  if (presentation.level === 'danger' && !input.busy) {
    warningTween = scene.tweens.add({
      targets: root,
      scale: 1.025,
      alpha: GAME_UI.trayWarningPulseAlpha,
      duration: ANIMATION.trayWarningCycleMs / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  return { root, pairKeys, warningTween };
}

export function createTrayTile(
  scene: Phaser.Scene,
  tile: TileData,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x + size / 2, y + size / 2, SCENE_TEXTURES.Game.tiles[tile.type].key)
    .setDisplaySize(size * GAME_UI.trayIconCanvasRatio, size * GAME_UI.trayIconCanvasRatio);
}
