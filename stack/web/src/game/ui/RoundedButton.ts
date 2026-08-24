import Phaser from 'phaser';
import { GAME_UI } from '../config/layout';
import { fontPx, px, uiScale } from './uiScale';
import { resolveToolButtonStyle, type ToolButtonVariant } from './toolButtonStyle';

export interface RoundedButtonOptions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly enabled: boolean;
  readonly variant?: ToolButtonVariant;
  readonly textureKey?: string;
  readonly badge?: number;
  readonly depth?: number;
  readonly radius?: number;
  readonly labelSize?: number;
  readonly fontWidthRatio?: number;
  readonly hoverOffset?: number;
  readonly onTap: () => void;
}

/**
 * 工具栏、玩法页和弹窗共用的按钮渲染真源。
 * 尺寸参数用设计 CSS px 表达；位置和 width/height 已是 Scene 物理坐标。
 */
export function createRoundedButton(
  scene: Phaser.Scene,
  options: RoundedButtonOptions,
): Phaser.GameObjects.Container {
  const {
    x,
    y,
    width,
    height,
    label,
    enabled,
    textureKey,
    badge,
    onTap,
  } = options;
  const variant = options.variant ?? 'secondary';
  const style = resolveToolButtonStyle(variant, enabled);
  const container = scene.add.container(x, y).setDepth(options.depth ?? 0);
  const radius = px(scene, options.radius ?? GAME_UI.buttonRadius);
  let shadow: Phaser.GameObjects.Graphics | null = null;
  if (style.shadowAlpha > 0) {
    shadow = scene.add.graphics();
    shadow.fillStyle(GAME_UI.softShadow, style.shadowAlpha);
    shadow.fillRoundedRect(0, px(scene, style.shadowOffset), width, height, radius);
    container.add(shadow);
  }

  const background = scene.add.graphics();
  background.fillStyle(style.fill, style.fillAlpha);
  background.fillRoundedRect(0, 0, width, height, radius);
  background.lineStyle(px(scene, style.strokeWidth), style.stroke, style.strokeAlpha);
  background.strokeRoundedRect(0, 0, width, height, radius);
  container.add(background);

  const cssWidth = width / uiScale(scene);
  const labelFontSize = Math.min(
    options.labelSize ?? 16,
    cssWidth * (options.fontWidthRatio ?? 0.16),
  );
  const labelText = scene.add.text(0, height / 2, label, {
    fontFamily: 'PingFang SC, sans-serif',
    fontSize: fontPx(scene, labelFontSize),
    fontStyle: 'bold',
    color: style.labelColor,
  }).setAlpha(enabled ? 1 : 0.42);

  if (textureKey !== undefined) {
    const iconSize = Math.min(height - px(scene, 10), px(scene, GAME_UI.toolIconSize));
    const iconGap = px(scene, GAME_UI.toolIconGap);
    const groupWidth = iconSize + iconGap + labelText.width;
    const groupLeft = Math.max(px(scene, 8), (width - groupWidth) / 2);
    container.add(
      scene.add.image(groupLeft, (height - iconSize) / 2, textureKey)
        .setOrigin(0, 0)
        .setDisplaySize(iconSize, iconSize)
        .setAlpha(enabled ? 1 : 0.42),
    );
    labelText.setPosition(groupLeft + iconSize + iconGap, height / 2).setOrigin(0, 0.5);
  } else {
    labelText.setPosition(width / 2, height / 2).setOrigin(0.5);
  }
  container.add(labelText);

  if (badge !== undefined) {
    const badgeRadius = px(scene, GAME_UI.toolBadgeRadius);
    const badgeX = width - badgeRadius - px(scene, GAME_UI.toolBadgeEdgeInset);
    const badgeY = badgeRadius + px(scene, GAME_UI.toolBadgeEdgeInset);
    container.add(scene.add.circle(badgeX, badgeY, badgeRadius, 0xe9a83a, enabled ? 1 : 0.45));
    container.add(scene.add.text(badgeX, badgeY, String(Math.max(0, badge)), {
      fontFamily: 'Arial Rounded MT Bold, PingFang SC, sans-serif',
      fontSize: fontPx(scene, 10),
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5));
  }

  if (!enabled) return container;
  background.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  background.input!.cursor = 'pointer';
  background.on(Phaser.Input.Events.POINTER_OVER, () => {
    if (window.matchMedia('(pointer: fine)').matches) {
      container.setY(y - px(scene, options.hoverOffset ?? 2));
    }
  });
  background.on(Phaser.Input.Events.POINTER_OUT, () => {
    container.setY(y);
    shadow?.setAlpha(1);
  });
  background.on(Phaser.Input.Events.POINTER_DOWN, () => {
    container.setY(y + px(scene, style.pressedOffset));
    shadow?.setAlpha(style.pressedShadowScale);
  });
  background.on(Phaser.Input.Events.POINTER_UP, () => {
    container.setY(y);
    shadow?.setAlpha(1);
    onTap();
  });
  return container;
}
