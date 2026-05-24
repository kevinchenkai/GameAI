import { NPCS } from "./npcs";

export type ImageAsset = {
  key: string;
  path: string;
  width: number;
  height: number;
  label: string;
};

export type AudioAsset = {
  key: string;
  path: string;
  label: string;
};

export function withPublicBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return withAssetVersion(`${base}${path}`);
}

function withAssetVersion(path: string): string {
  const version = import.meta.env.VITE_ASSET_VERSION?.trim();
  if (!version) return path;
  return `${path}${path.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

const RAW_CORE_IMAGE_ASSETS: ImageAsset[] = [
  { key: "tavern-hall-v1", path: "/images/background/tavern-hall-v1.jpg", width: 1920, height: 1080, label: "酒馆背景优化版" },
  { key: "table-a", path: "/images/props/table-a.png", width: 360, height: 260, label: "A 桌" },
  { key: "table-b", path: "/images/props/table-b.png", width: 360, height: 260, label: "B 桌" },
  { key: "table-c", path: "/images/props/table-c.png", width: 360, height: 260, label: "C 桌" },
  { key: "table-d", path: "/images/props/table-d.png", width: 360, height: 260, label: "D 桌" },
  { key: "counter", path: "/images/props/counter.png", width: 520, height: 460, label: "前台" },
  { key: "event-food-stack", path: "/images/props/event-food-stack.png", width: 128, height: 96, label: "食物事件道具" },
  { key: "event-love-petals", path: "/images/props/event-love-petals.png", width: 128, height: 96, label: "花瓣事件道具" },
  { key: "event-sword-shadow", path: "/images/props/event-sword-shadow.png", width: 128, height: 96, label: "剑影事件道具" },
  { key: "event-poison-cocktail", path: "/images/props/event-poison-cocktail.png", width: 128, height: 96, label: "五毒酒事件道具" },
  { key: "event-bgm-wave", path: "/images/props/event-bgm-wave.png", width: 128, height: 96, label: "BGM 波纹事件道具" },
  { key: "xiaoxiami-idle-down", path: "/images/player/xiaoxiami-idle-down.png", width: 160, height: 220, label: "小虾米正面待机" },
  { key: "xiaoxiami-idle-up", path: "/images/player/xiaoxiami-idle-up.png", width: 160, height: 220, label: "小虾米背面待机" },
  { key: "xiaoxiami-idle-left", path: "/images/player/xiaoxiami-idle-left.png", width: 160, height: 220, label: "小虾米左侧待机" },
  { key: "xiaoxiami-idle-right", path: "/images/player/xiaoxiami-idle-right.png", width: 160, height: 220, label: "小虾米右侧待机" },
  { key: "xiaoxiami-walk-down", path: "/images/player/xiaoxiami-walk-down.png", width: 640, height: 220, label: "小虾米正面行走" },
  { key: "xiaoxiami-walk-up", path: "/images/player/xiaoxiami-walk-up.png", width: 640, height: 220, label: "小虾米背面行走" },
  { key: "xiaoxiami-walk-left", path: "/images/player/xiaoxiami-walk-left.png", width: 640, height: 220, label: "小虾米左侧行走" },
  { key: "xiaoxiami-walk-right", path: "/images/player/xiaoxiami-walk-right.png", width: 640, height: 220, label: "小虾米右侧行走" },
  { key: "dialog-panel", path: "/images/ui/dialog-panel.png", width: 440, height: 308, label: "对话窗口" },
  { key: "dialog-tail", path: "/images/ui/dialog-tail.png", width: 64, height: 42, label: "对话尾巴" },
  { key: "button-normal", path: "/images/ui/button-normal.png", width: 160, height: 48, label: "按钮普通态" },
  { key: "button-pressed", path: "/images/ui/button-pressed.png", width: 160, height: 48, label: "按钮按下态" },
  { key: "event-badge", path: "/images/ui/event-badge.png", width: 168, height: 54, label: "事件标识" },
  { key: "icon-bgm-on", path: "/images/ui/icon-bgm-on.png", width: 96, height: 96, label: "BGM 开启图标" },
  { key: "icon-bgm-off", path: "/images/ui/icon-bgm-off.png", width: 96, height: 96, label: "BGM 静音图标" },
  { key: "joystick-base", path: "/images/ui/joystick-base.png", width: 160, height: 160, label: "摇杆底座" },
  { key: "joystick-knob", path: "/images/ui/joystick-knob.png", width: 76, height: 76, label: "摇杆摇柄" },
  { key: "nameplate", path: "/images/ui/nameplate.png", width: 136, height: 52, label: "名字牌" }
];

const RAW_NPC_SPRITE_ASSETS: ImageAsset[] = NPCS.map((npc) => ({
  key: npc.spriteKey,
  path: `/images/npcs/${npc.id}/sprite.png`,
  width: 220,
  height: 260,
  label: `${npc.name}坐姿精灵`
}));

const RAW_NPC_AVATAR_ASSETS: ImageAsset[] = NPCS.map((npc) => ({
  key: npc.avatarKey,
  path: `/images/npcs/${npc.id}/avatar.png`,
  width: 128,
  height: 128,
  label: `${npc.name}头像`
}));

const RAW_DEV_REFERENCE_ASSETS: ImageAsset[] = [
  { key: "tavern-hall-v1-png", path: "/images/background/tavern-hall-v1.png", width: 1920, height: 1080, label: "酒馆背景 PNG 源图" },
  { key: "tavern-walkable-mask-v1", path: "/images/background/tavern-walkable-mask-v1.png", width: 1920, height: 1080, label: "可行走遮罩" },
  { key: "tavern-collision-guide-v1", path: "/images/background/tavern-collision-guide-v1.png", width: 1920, height: 1080, label: "碰撞参考图" }
];

function versionAssets(assets: ImageAsset[]): ImageAsset[] {
  return assets.map((asset) => ({
    ...asset,
    path: withPublicBase(asset.path)
  }));
}

export const CORE_IMAGE_ASSETS: ImageAsset[] = versionAssets(RAW_CORE_IMAGE_ASSETS);
export const NPC_SPRITE_ASSETS: ImageAsset[] = versionAssets(RAW_NPC_SPRITE_ASSETS);
export const NPC_AVATAR_ASSETS: ImageAsset[] = versionAssets(RAW_NPC_AVATAR_ASSETS);
export const DEV_REFERENCE_IMAGE_ASSETS: ImageAsset[] = versionAssets(RAW_DEV_REFERENCE_ASSETS);

export const IMAGE_ASSETS: ImageAsset[] = [...CORE_IMAGE_ASSETS, ...NPC_SPRITE_ASSETS, ...NPC_AVATAR_ASSETS, ...DEV_REFERENCE_IMAGE_ASSETS];

export const IMAGE_ASSET_BY_KEY = new Map(IMAGE_ASSETS.map((asset) => [asset.key, asset]));

export function getImageAsset(key: string): ImageAsset | undefined {
  return IMAGE_ASSET_BY_KEY.get(key);
}

export const TAVERN_BGM = {
  key: "tavern-bgm",
  path: withPublicBase("/images/bgm/bgm.mp3"),
  label: "酒馆背景音乐"
} satisfies AudioAsset;

export const AUDIO_ASSETS: AudioAsset[] = [TAVERN_BGM];
