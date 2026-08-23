import type { TileType } from '../types/tile';

export interface AssetDefinition {
  readonly key: string;
  readonly path: string;
}

export interface AudioAssetDefinition {
  readonly key: string;
  readonly paths: readonly string[];
}

function asset(key: string, path: string): AssetDefinition {
  return { key, path };
}

function audioAsset(key: string, paths: readonly string[]): AudioAssetDefinition {
  return { key, paths };
}

export const ASSETS = {
  tiles: {
    paw: asset('tile-paw', 'assets/tiles/paw.webp'),
    grass: asset('tile-grass', 'assets/tiles/grass.webp'),
    watering: asset('tile-watering', 'assets/tiles/watering.webp'),
    bell: asset('tile-bell', 'assets/tiles/bell.webp'),
    fish: asset('tile-fish', 'assets/tiles/fish.webp'),
    yarn: asset('tile-yarn', 'assets/tiles/yarn.webp'),
    bone: asset('tile-bone', 'assets/tiles/bone.webp'),
    flowerpot: asset('tile-flowerpot', 'assets/tiles/flowerpot.webp'),
  } satisfies Readonly<Record<TileType, AssetDefinition>>,
  ui: {
    tileFrame: asset('ui-tile-frame', 'assets/ui/tile_frame.webp'),
    traySlot: asset('ui-tray-slot', 'assets/ui/tray_slot.webp'),
    traySlotWarn: asset('ui-tray-slot-warn', 'assets/ui/tray_slot_warn.webp'),
    shuffle: asset('ui-btn-shuffle', 'assets/ui/btn_shuffle.webp'),
    undo: asset('ui-btn-undo', 'assets/ui/btn_undo.webp'),
    settings: asset('ui-btn-settings', 'assets/ui/btn_settings.webp'),
    hint: asset('ui-btn-hint', 'assets/ui/btn_hint.webp'),
    winPanel: asset('ui-panel-win', 'assets/ui/panel_win.webp'),
    failPanel: asset('ui-panel-fail', 'assets/ui/panel_fail.webp'),
  },
  bg: {
    game: asset('bg-game', 'assets/bg/game_bg.webp'),
    home: asset('bg-home', 'assets/bg/home_bg.webp'),
  },
  fx: {
    sparkle01: asset('fx-sparkle-01', 'assets/fx/sparkle_01.webp'),
    sparkle02: asset('fx-sparkle-02', 'assets/fx/sparkle_02.webp'),
    star: asset('fx-star', 'assets/fx/star.webp'),
  },
  audio: {
    // M4A 优先以减少约 24% 传输量；不支持时由 Phaser 回退到 MP3。
    backgroundMusic: audioAsset('bgm-windy-v1', [
      'assets/audio/windy_loop_v1.m4a',
      'assets/audio/windy_loop_v1.mp3',
    ]),
  },
} as const;

const TILE_ASSETS = Object.values(ASSETS.tiles);

/**
 * Scene-owned texture declarations are the single source for both preloading and rendering.
 */
export const SCENE_TEXTURES = {
  Home: {
    background: ASSETS.bg.home,
    settings: ASSETS.ui.settings,
  },
  LevelSelect: {
    background: ASSETS.bg.home,
    star: ASSETS.fx.star,
  },
  Settings: {
    settings: ASSETS.ui.settings,
  },
  HowToPlay: {
    background: ASSETS.bg.home,
    hint: ASSETS.ui.hint,
  },
  Game: {
    background: ASSETS.bg.game,
    tiles: ASSETS.tiles,
    tileFrame: ASSETS.ui.tileFrame,
    traySlot: ASSETS.ui.traySlot,
    traySlotWarn: ASSETS.ui.traySlotWarn,
    shuffle: ASSETS.ui.shuffle,
    undo: ASSETS.ui.undo,
    settings: ASSETS.ui.settings,
    winPanel: ASSETS.ui.winPanel,
    failPanel: ASSETS.ui.failPanel,
    sparkle01: ASSETS.fx.sparkle01,
    sparkle02: ASSETS.fx.sparkle02,
    star: ASSETS.fx.star,
  },
} as const;

export const PRELOAD_ASSETS: readonly AssetDefinition[] = [
  SCENE_TEXTURES.Home.background,
  SCENE_TEXTURES.Game.background,
  ...TILE_ASSETS,
  SCENE_TEXTURES.Game.tileFrame,
  SCENE_TEXTURES.Game.traySlot,
  SCENE_TEXTURES.Game.traySlotWarn,
  SCENE_TEXTURES.Game.shuffle,
  SCENE_TEXTURES.Game.undo,
  SCENE_TEXTURES.Game.settings,
  SCENE_TEXTURES.HowToPlay.hint,
  SCENE_TEXTURES.Game.winPanel,
  SCENE_TEXTURES.Game.failPanel,
  SCENE_TEXTURES.Game.sparkle01,
  SCENE_TEXTURES.Game.sparkle02,
  SCENE_TEXTURES.Game.star,
];

/** 首屏完成后再加载，不得加入 PRELOAD_ASSETS。 */
export const DEFERRED_AUDIO_ASSETS: readonly AudioAssetDefinition[] = [
  ASSETS.audio.backgroundMusic,
];

export const RENDERED_TEXTURE_KEYS: readonly string[] = [
  SCENE_TEXTURES.Home.background.key,
  SCENE_TEXTURES.Game.background.key,
  ...Object.values(SCENE_TEXTURES.Game.tiles).map(({ key }) => key),
  SCENE_TEXTURES.Game.tileFrame.key,
  SCENE_TEXTURES.Game.traySlot.key,
  SCENE_TEXTURES.Game.traySlotWarn.key,
  SCENE_TEXTURES.Game.shuffle.key,
  SCENE_TEXTURES.Game.undo.key,
  SCENE_TEXTURES.Game.settings.key,
  SCENE_TEXTURES.HowToPlay.hint.key,
  SCENE_TEXTURES.Game.winPanel.key,
  SCENE_TEXTURES.Game.failPanel.key,
  SCENE_TEXTURES.Game.sparkle01.key,
  SCENE_TEXTURES.Game.sparkle02.key,
  SCENE_TEXTURES.Game.star.key,
];
