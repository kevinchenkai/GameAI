import Phaser from 'phaser';
import { SCENE_TEXTURES } from '../config/assets';
import { GAME_UI, LAYOUT, PROTOTYPE_UI } from '../config/layout';
import { calculateBottomAlignedBoardPlacements, type BoardTilePlacement } from '../layout/GameLayout';
import type { GameLayout } from '../layout/GameLayout';
import { px } from '../ui/uiScale';
import { resolveTileVisualStyle } from '../ui/tileVisualStyle';
import type { GameState } from '../types/game';
import type { TileData } from '../types/tile';

/**
 * ★ 棋盘绘制模块。
 *
 *   契约（见 CodeReview §1）：**只吃 layout + state，只产出 GameObject**。
 *   不碰 model、不碰存档、不触发状态变更——这是「渲染层可替换」的落地。
 *   与场景的唯一耦合是 `onPick` 回调，由调用方注入。
 */
export interface BoardRenderResult {
  /** 各列顶牌容器，供场景做取牌动画 */
  topTileContainers: Map<number, Phaser.GameObjects.Container>;
}

export interface BoardRenderOptions {
  /** 布局夹具模式下不接受输入（仅用于布局调参页） */
  interactive: boolean;
  onPick: (columnIndex: number) => void;
}

export function drawBoard(
  scene: Phaser.Scene,
  layout: GameLayout,
  state: GameState,
  options: BoardRenderOptions,
): BoardRenderResult {
  const { tileSize } = layout;
  const topTileContainers = new Map<number, Phaser.GameObjects.Container>();
  const placements = calculateBottomAlignedBoardPlacements(
    layout,
    state.columns.map((column) => column.length),
    px(scene, LAYOUT.tileGap),
    px(scene, LAYOUT.trayLabelOffset + LAYOUT.sectionGap),
    px(scene, 6),
  );
  for (const placement of placements) {
    const tile = state.columns[placement.columnIndex]?.[placement.depth];
    if (tile === undefined) continue;
    const container = createTileVisual(
      scene,
      tile,
      placement.x,
      placement.y,
      tileSize,
      placement.isTop,
    );
    container.setDepth(placement.depth + 2);
    if (placement.isTop && options.interactive) {
      topTileContainers.set(placement.columnIndex, container);
      makeTileInteractive(scene, container, placement, options.onPick);
    }
  }
  return { topTileContainers };
}

export function createTileVisual(
  scene: Phaser.Scene,
  tile: TileData,
  x: number,
  y: number,
  size: number,
  isTop: boolean,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const style = resolveTileVisualStyle(isTop);
  const radius = size * PROTOTYPE_UI.cornerRatio;
  if (style.shadowAlpha > 0) {
    const shadow = scene.add.graphics();
    shadow.fillStyle(GAME_UI.softShadow, style.shadowAlpha);
    shadow.fillRoundedRect(
      0,
      px(scene, GAME_UI.tileActiveShadowOffset),
      size,
      size,
      radius,
    );
    container.add(shadow);
  }
  const frame = scene.add
    .image(0, 0, SCENE_TEXTURES.Game.tileFrame.key)
    .setOrigin(0, 0)
    .setDisplaySize(size, size)
    .setAlpha(style.frameAlpha)
    .setName('hit-frame');
  container.add(frame);
  if (style.overlayAlpha > 0) {
    container.add(
      scene.add.rectangle(size / 2, size / 2, size * 0.9, size * 0.9, GAME_UI.tileCoveredOverlay, style.overlayAlpha),
    );
  }
  const icon = scene.add
    .image(size / 2, size / 2, SCENE_TEXTURES.Game.tiles[tile.type].key)
    .setDisplaySize(size * GAME_UI.boardIconCanvasRatio, size * GAME_UI.boardIconCanvasRatio)
    .setAlpha(style.iconAlpha);
  container.add(icon);
  if (style.outlineAlpha > 0) {
    const outline = scene.add.graphics();
    outline.lineStyle(
      px(scene, GAME_UI.tileActiveOutlineWidth),
      GAME_UI.tileActiveOutline,
      style.outlineAlpha,
    );
    outline.strokeRoundedRect(0, 0, size, size, radius);
    container.add(outline);
  }
  return container;
}

function makeTileInteractive(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  placement: BoardTilePlacement,
  onPick: (columnIndex: number) => void,
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
      container.setY(placement.y - px(scene, 4)).setScale(1.04);
    }
  });
  frame.on(Phaser.Input.Events.POINTER_OUT, () => {
    container.setPosition(placement.x, placement.y).setScale(1);
  });
  frame.on(Phaser.Input.Events.POINTER_UP, () => {
    container.setPosition(placement.x, placement.y).setScale(1);
    onPick(placement.columnIndex);
  });
}
