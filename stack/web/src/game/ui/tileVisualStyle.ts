import { GAME_UI } from '../config/layout';

export interface TileVisualStyle {
  frameAlpha: number;
  iconAlpha: number;
  overlayAlpha: number;
  shadowAlpha: number;
  outlineAlpha: number;
}

/** frame / icon / overlay 分层，covered 图案保持饱和，active 牌靠阴影与暖沿浮起。 */
export function resolveTileVisualStyle(isTop: boolean): TileVisualStyle {
  if (isTop) {
    return {
      frameAlpha: 1,
      iconAlpha: 1,
      overlayAlpha: 0,
      shadowAlpha: GAME_UI.tileActiveShadowAlpha,
      outlineAlpha: GAME_UI.tileActiveOutlineAlpha,
    };
  }
  return {
    frameAlpha: GAME_UI.tileCoveredFrameAlpha,
    iconAlpha: GAME_UI.tileCoveredIconAlpha,
    overlayAlpha: GAME_UI.tileCoveredOverlayAlpha,
    shadowAlpha: 0,
    outlineAlpha: 0,
  };
}
