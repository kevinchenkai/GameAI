import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../../main";
import { AUDIO_ASSETS, CORE_IMAGE_ASSETS, IMAGE_ASSETS, type ImageAsset } from "../data/assets";
import { createRoundState } from "../systems/roundSystem";

const missing = new Set<string>();

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    const loadingText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "江湖小酒馆加载中 0%", {
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
        fontSize: "34px",
        color: "#fff2cc",
        stroke: "#59341f",
        strokeThickness: 5
      })
      .setOrigin(0.5);
    const initialRound = createRoundState();
    this.registry.set("initialRound", initialRound);
    this.registry.set("initialRoundSeed", initialRound.seed);

    this.load.on("loaderror", (file: { key: string; src: string }) => {
      missing.add(file.key);
      const asset = [...IMAGE_ASSETS, ...AUDIO_ASSETS].find((item) => item.key === file.key);
      console.warn(`[tavern-coder] 素材缺失，使用同 key 占位图：${file.src} (${asset?.label || file.key})。请由 tavern-artist 按任务书补齐。`);
    });
    this.load.on("progress", (value: number) => loadingText.setText(`江湖小酒馆加载中 ${Math.round(value * 100)}%`));

    const initialNpcSprites = initialRound.seatedNpcs.map((item) => IMAGE_ASSETS.find((asset) => asset.key === item.npc.spriteKey)).filter((asset): asset is ImageAsset => Boolean(asset));
    for (const asset of [...CORE_IMAGE_ASSETS, ...initialNpcSprites]) loadImageAsset(this, asset);
  }

  create(): void {
    const initialRound = this.registry.get("initialRound") as ReturnType<typeof createRoundState> | undefined;
    const initialNpcSprites = initialRound?.seatedNpcs.map((item) => IMAGE_ASSETS.find((asset) => asset.key === item.npc.spriteKey)).filter((asset): asset is ImageAsset => Boolean(asset)) || [];
    for (const asset of [...CORE_IMAGE_ASSETS, ...initialNpcSprites]) {
      if (missing.has(asset.key) || !this.textures.exists(asset.key)) createPlaceholderTexture(this, asset);
    }
    this.scene.start("TavernScene");
  }
}

export function loadImageAsset(scene: Phaser.Scene, asset: ImageAsset): void {
  if (asset.key.startsWith("xiaoxiami-walk-")) {
    scene.load.spritesheet(asset.key, asset.path, { frameWidth: 160, frameHeight: 220 });
  } else {
    scene.load.image(asset.key, asset.path);
  }
}

export function createPlaceholderTexture(scene: Phaser.Scene, asset: ImageAsset): void {
  if (scene.textures.exists(asset.key)) scene.textures.remove(asset.key);
  const width = asset.key === "tavern-hall-v1" ? GAME_WIDTH : asset.width;
  const height = asset.key === "tavern-hall-v1" ? GAME_HEIGHT : asset.height;
  const g = scene.add.graphics();
  if (asset.key === "tavern-hall-v1") {
    g.fillStyle(0x7d4b2d, 1).fillRect(0, 0, width, height);
    g.fillStyle(0x3b2116, 1).fillRect(0, 0, width, 170);
    g.fillStyle(0x9c6b3d, 1).fillRect(70, 240, 440, 390);
    g.fillStyle(0xcfa263, 1).fillRect(0, 900, width, 180);
    g.lineStyle(4, 0xe7c06d, 0.5);
    for (let x = 0; x < width; x += 120) g.lineBetween(x, 170, x + 420, height);
  } else if (asset.key.startsWith("table-")) {
    g.fillStyle(0x81512f, 1).fillEllipse(width / 2, height / 2, width * 0.88, height * 0.62);
    g.lineStyle(6, 0xd2a35f, 1).strokeEllipse(width / 2, height / 2, width * 0.88, height * 0.62);
  } else if (asset.key.startsWith("npc-")) {
    g.fillStyle(colorFromKey(asset.key), 1).fillRoundedRect(18, 12, width - 36, height - 24, 24);
    g.fillStyle(0xfff1c9, 1).fillCircle(width / 2, 54, 30);
    g.fillStyle(0x34231d, 1).fillCircle(width / 2 - 10, 50, 3).fillCircle(width / 2 + 10, 50, 3);
  } else if (asset.key.startsWith("xiaoxiami")) {
    const frameWidth = asset.key.startsWith("xiaoxiami-walk-") ? 160 : width;
    const frames = Math.max(1, Math.floor(width / frameWidth));
    for (let i = 0; i < frames; i += 1) {
      const offsetX = i * frameWidth;
      g.fillStyle(0x3b8c75, 1).fillRoundedRect(offsetX + 22, 10, frameWidth - 44, height - 20, 22);
      g.fillStyle(0xf5d39a, 1).fillCircle(offsetX + frameWidth / 2, 50, 28);
      g.fillStyle(0xffffff, 1).fillTriangle(offsetX + frameWidth / 2, 76, offsetX + frameWidth / 2 - 22, 122, offsetX + frameWidth / 2 + 22, 122);
    }
  } else if (asset.key.startsWith("event-")) {
    g.fillStyle(0xffd45c, 0.92).fillRoundedRect(0, 0, width, height, 18);
    g.lineStyle(4, 0x8d3d24, 1).strokeRoundedRect(2, 2, width - 4, height - 4, 18);
  } else if (asset.key.includes("joystick")) {
    g.fillStyle(0xfff2d0, 0.48).fillCircle(width / 2, height / 2, Math.min(width, height) / 2 - 4);
    g.lineStyle(4, 0x7b4a2d, 0.8).strokeCircle(width / 2, height / 2, Math.min(width, height) / 2 - 6);
  } else {
    g.fillStyle(0xf0c77a, 0.9).fillRoundedRect(0, 0, width, height, 8);
    g.lineStyle(3, 0x6f3f24, 1).strokeRoundedRect(1, 1, width - 2, height - 2, 8);
  }
  g.generateTexture(asset.key, width, height);
  g.destroy();
}

function colorFromKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return Phaser.Display.Color.HSVColorWheel()[hash % 360].color;
}
