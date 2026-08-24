import type Phaser from 'phaser';
import { COLORS, GAME_UI } from '../config/layout';
import { fontPx, px } from '../ui/uiScale';

/**
 * ★ 弹窗绘制模块。
 *
 *   与 Board/TrayRenderer 的区别：**只抽纯绘制原语，不抽整个弹窗**。
 *
 *   drawResult / drawRestartConfirmation 深度依赖 model、undoManager、
 *   restart()、performUndo() 等场景状态与行为，硬搬会变成「把 8 个回调
 *   透传进渲染层」——那既违反「渲染层不碰 model」的契约，可读性也更差。
 *   所以这里只抽真正无状态的部分：遮罩、面板底、数据卡片。
 *   弹窗的编排逻辑留在 GameScene，那本就是它的职责。
 */

/** 压暗底层的全屏遮罩。setInteractive 吞掉穿透点击。 */
export function drawDialogOverlay(
  scene: Phaser.Scene,
  depth: number,
): Phaser.GameObjects.Rectangle {
  return scene.add
    .rectangle(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width,
      scene.scale.height,
      GAME_UI.dialogOverlay,
      GAME_UI.resultOverlayAlpha,
    )
    .setInteractive()
    .setDepth(depth);
}

/** 弹窗面板底：阴影 + 圆角暖白面 + 描边。 */
export function drawDialogPanel(
  scene: Phaser.Scene,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
  depth: number,
): void {
  const shadow = scene.add.graphics().setDepth(depth);
  shadow.fillStyle(GAME_UI.softShadow, GAME_UI.dialogPanelShadowAlpha);
  shadow.fillRoundedRect(left, top + px(scene, 4), width, height, radius);

  const panel = scene.add.graphics().setDepth(depth + 1);
  panel.fillStyle(GAME_UI.dialogPanelFill, GAME_UI.dialogPanelFillAlpha);
  panel.fillRoundedRect(left, top, width, height, radius);
  panel.lineStyle(px(scene, GAME_UI.dialogPanelStrokeWidth), COLORS.tileStroke, GAME_UI.dialogPanelStrokeAlpha);
  panel.strokeRoundedRect(left, top, width, height, radius);
}

/** 结果页的一张数据卡片（步数 / 撤回等）。 */
export function drawResultStat(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  label: string,
  value: number,
): Phaser.GameObjects.Container {
  const height = px(scene, GAME_UI.resultStatHeight);
  const radius = px(scene, GAME_UI.resultStatRadius);
  const container = scene.add.container(x, y).setDepth(302);
  const card = scene.add.graphics();
  card.fillStyle(GAME_UI.resultStatFill, GAME_UI.resultStatFillAlpha);
  card.fillRoundedRect(0, 0, width, height, radius);
  card.lineStyle(px(scene, 1), COLORS.tileStroke, GAME_UI.resultStatStrokeAlpha);
  card.strokeRoundedRect(0, 0, width, height, radius);
  container.add(card);
  container.add(scene.add.text(width / 2, px(scene, 13), label, {
    fontFamily: 'PingFang SC, sans-serif',
    fontSize: fontPx(scene, 10),
    color: GAME_UI.resultStatLabelColor,
  }).setOrigin(0.5));
  container.add(scene.add.text(width / 2, px(scene, 31), String(value), {
    fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
    fontSize: fontPx(scene, 16),
    fontStyle: 'bold',
    color: COLORS.title,
  }).setOrigin(0.5));
  return container;
}
