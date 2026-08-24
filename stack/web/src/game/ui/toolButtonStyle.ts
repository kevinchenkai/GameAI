import { GAME_UI } from '../config/layout';

export type ToolButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ToolButtonStyle {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeAlpha: number;
  strokeWidth: number;
  shadowAlpha: number;
  shadowOffset: number;
  pressedOffset: number;
  pressedShadowScale: number;
  labelColor: string;
}

/** disabled 是独立的中性状态，不能继承 primary 的黄色填充。 */
export function resolveToolButtonStyle(
  variant: ToolButtonVariant,
  enabled: boolean,
): ToolButtonStyle {
  if (!enabled) {
    return {
      fill: GAME_UI.disabledFill,
      fillAlpha: 0.9,
      stroke: GAME_UI.disabledStroke,
      strokeAlpha: 0.55,
      strokeWidth: GAME_UI.buttonStrokeWidth,
      shadowAlpha: 0,
      shadowOffset: GAME_UI.buttonShadowOffset,
      pressedOffset: 0,
      pressedShadowScale: 0,
      labelColor: GAME_UI.textDisabled,
    };
  }

  const strokeAlpha = variant === 'primary'
    ? GAME_UI.buttonPrimaryStrokeAlpha
    : variant === 'danger'
      ? GAME_UI.buttonDangerStrokeAlpha
      : GAME_UI.buttonSecondaryStrokeAlpha;
  const shadowAlpha = variant === 'primary'
    ? GAME_UI.buttonPrimaryShadowAlpha
    : variant === 'danger'
      ? GAME_UI.buttonDangerShadowAlpha
      : GAME_UI.buttonSecondaryShadowAlpha;

  return {
    fill: variant === 'primary'
      ? GAME_UI.primaryFill
      : variant === 'danger'
        ? GAME_UI.dangerFill
        : GAME_UI.secondaryFill,
    fillAlpha: variant === 'primary' ? 0.98 : 0.94,
    stroke: variant === 'danger' ? GAME_UI.disabledStroke : GAME_UI.controlStroke,
    strokeAlpha,
    strokeWidth: GAME_UI.buttonStrokeWidth,
    shadowAlpha,
    shadowOffset: GAME_UI.buttonShadowOffset,
    pressedOffset: GAME_UI.buttonPressedOffset,
    pressedShadowScale: GAME_UI.buttonPressedShadowScale,
    labelColor: variant === 'danger' ? GAME_UI.textMuted : '#6e573e',
  };
}
