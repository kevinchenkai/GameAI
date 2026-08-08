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
 * ★★ 渲染倍率上限。
 *
 *   不设倍率时 Phaser 把 canvas 的像素缓冲设成 CSS 尺寸，
 *   在 DPR=2/3 的手机上等于让浏览器把整个画面拉伸 2~3 倍。
 *   棋子是圆润插画，糊一点不易察觉；**文字笔画边缘是高对比的，
 *   一拉伸立刻发虚** —— 用户实测反馈的"字体很模糊"就是这个。
 *
 *   ⚠️ 不直接用 `window.devicePixelRatio`：3x 屏意味着 **9 倍填充率**，
 *   老机器会掉帧（M4 留下那条 TODO 的顾虑正是这个）。
 *   折中到 2 —— 2x 已足够让文字锐利，再往上肉眼收益很小，
 *   代价却是平方增长。
 */
const MAX_RENDER_SCALE = 2;

function renderScale(): number {
  const dpr = typeof window === 'undefined' ? 1 : (window.devicePixelRatio ?? 1);
  return Math.max(1, Math.min(MAX_RENDER_SCALE, dpr));
}

/** 当前视口的 CSS 尺寸 */
function viewportSize(): { w: number; h: number } {
  const el = document.getElementById('game');
  return {
    w: el?.clientWidth || window.innerWidth,
    h: el?.clientHeight || window.innerHeight,
  };
}

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
    /**
     * ★ 用 NONE + 手动 resize()，不用 RESIZE 自动模式。
     *
     *   需要的是"**缓冲区按 DPR 放大、CSS 尺寸保持不变**"：
     *   Phaser 的 `resize(w,h)` 把 `canvas.width` 设成 w，
     *   把 `style.width` 设成 `w * zoom`。所以传入
     *   `CSS尺寸 × scale` 并令 `zoom = 1/scale`，
     *   就得到高分辨率缓冲 + 正确的显示尺寸。
     *   （RESIZE 模式会自己按容器改尺寸，把这套覆盖掉。）
     *
     *   ⚠️ 游戏内坐标从此是**物理像素**，不是 CSS 像素。
     *   布局算法拿到的宽高会大一倍，棋子边长也随之变大 ——
     *   这正是我们要的：一切都按真实像素画，浏览器不再拉伸。
     */
    mode: Phaser.Scale.NONE,
    zoom: 1 / renderScale(),
    width: viewportSize().w * renderScale(),
    height: viewportSize().h * renderScale(),
  },
  render: {
    antialias: true,
    powerPreference: 'low-power',
  },
  scene: [BootScene, LevelScene, GardenScene],
};

const game = new Phaser.Game(config);

/**
 * ★ 开发期把 game 实例挂到 window，便于在浏览器里核验运行时状态
 *   （M4 教训：渲染层单测全绿也可能白屏 / 不动，必须能实跑检查）。
 *   生产构建里 `import.meta.env.DEV` 为 false，整段被 tree-shake 掉。
 */
if (import.meta.env.DEV) {
  (window as unknown as { __GAME__?: Phaser.Game }).__GAME__ = game;
}

/**
 * ★ NONE 模式不会自动跟随容器，转屏 / 地址栏收起都要自己处理。
 *
 *   ⚠️ 必须**同时**更新缓冲尺寸与 zoom：只改尺寸的话，
 *   转屏后 canvas 会按物理像素撑满屏幕（画面大一倍）。
 */
function syncCanvasSize(): void {
  const s = renderScale();
  const { w, h } = viewportSize();
  game.scale.setZoom(1 / s);
  game.scale.resize(w * s, h * s);
}

window.addEventListener('resize', syncCanvasSize);
// iOS 转屏后视口尺寸要等一帧才准
window.addEventListener('orientationchange', () => setTimeout(syncCanvasSize, 100));

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
