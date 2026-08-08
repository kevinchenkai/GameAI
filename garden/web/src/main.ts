/**
 * main.ts —— 入口
 *
 * 这里只做 Phaser 装配。任何游戏规则都不应出现在本文件。
 */

import Phaser from 'phaser';
import { ENV_PALETTE } from './config/pieces';
import { setBootError } from './game/bootOverlay';
import { BootScene } from './game/scenes/BootScene';
import { LevelScene } from './game/scenes/LevelScene';
import { GardenScene } from './game/scenes/GardenScene';

/** 超过这个时间引擎还没起来，就认定为失败（慢网也够用了） */
const BOOT_TIMEOUT_MS = 15000;

/**
 * ★ 开发期可用 `?renderer=canvas` 强制 Canvas 渲染。
 *
 *   动机：某些无头 / 虚拟显卡环境下 WebGL 会抛
 *   `Framebuffer status: Incomplete Attachment`，Phaser 启动中断、
 *   一个场景都跑不起来 —— 表现是「白屏，且没有任何报错」。
 *   有这个开关才能把「我的代码错了」与「这台机器的 GL 不行」区分开。
 *
 *   生产构建里 import.meta.env.DEV 为 false，整段会被消除。
 */
function resolveRenderer(): number {
  if (!import.meta.env.DEV) return Phaser.AUTO;
  const forced = new URLSearchParams(location.search).get('renderer');
  return forced === 'canvas' ? Phaser.CANVAS : Phaser.AUTO;
}

const config: Phaser.Types.Core.GameConfig = {
  type: resolveRenderer(),
  parent: 'game',
  backgroundColor: ENV_PALETTE.skyLight,
  scale: {
    // 竖屏，按容器自适应。实际布局由 computeLayout() 算，
    // 不依赖 Phaser 的缩放模式（见 game/render/layout.ts）
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // TODO(M5)：老机器按 3x DPR 渲染会掉帧，需要限制。
    //   Phaser 3.90 没有 maxPixelRatio 配置项，得在 M5 实测后决定手段
    //   （canvas 尺寸缩放 or FX_QUALITY 联动），不在这里凭猜测写。
  },
  render: {
    antialias: true,
    powerPreference: 'low-power',
  },
  scene: [BootScene, LevelScene, GardenScene],
};

const game = new Phaser.Game(config);

/**
 * ★ 兜底：引擎起不来时也要把话说清楚。
 *
 *   实测过的场景：某些环境下 WebGL 抛
 *   `Framebuffer status: Incomplete Attachment`，Phaser 构造中断，
 *   BootScene 根本不会执行 —— 进度条会**永远停在 15%**，
 *   用户对着一个不动的进度条干等，而控制台的报错他看不到。
 *
 *   宁可显示"加载失败"，也不要让人无限等待。
 */
setTimeout(() => {
  if (game.isBooted) return;
  setBootError('加载失败了，请刷新页面重试');
}, BOOT_TIMEOUT_MS);

// ★ 仅开发期暴露给调试用（Vite 会在生产构建里把这段整体消除）
if (import.meta.env.DEV) {
  (globalThis as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
}
