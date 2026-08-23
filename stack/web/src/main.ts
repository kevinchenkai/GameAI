import Phaser from 'phaser';
import { COLORS } from './game/config/layout';
import './game/debug';
import { BootScene } from './game/scenes/BootScene';
import { PreloadScene } from './game/scenes/PreloadScene';
import { HomeScene } from './game/scenes/HomeScene';
import { HowToPlayScene } from './game/scenes/HowToPlayScene';
import { GameScene } from './game/scenes/GameScene';
import { LevelSelectScene } from './game/scenes/LevelSelectScene';
import { SettingsScene } from './game/scenes/SettingsScene';

/**
 * ★★ 渲染倍率上限。
 *
 *   不设倍率时 Phaser 把 canvas 的像素缓冲设成 CSS 尺寸，
 *   在 DPR=2/3 的手机上等于让浏览器把整个画面拉伸 2~3 倍。
 *   卡片是圆润插画，糊一点不易察觉；**文字笔画边缘是高对比的，
 *   一拉伸立刻发虚** —— 用户 iPhone 实测反馈的「字体很模糊」就是这个。
 *
 *   ⚠️ 不直接用 `window.devicePixelRatio`：3x 屏意味着 **9 倍填充率**，
 *   老机器会掉帧。折中到 2 —— 2x 已足够让文字锐利，
 *   再往上肉眼收益很小，代价却是平方增长。
 *
 *   （garden 项目踩过同一个坑，解法一致，见 garden/web/src/main.ts。）
 */
const MAX_RENDER_SCALE = 2;

function renderScale(): number {
  const dpr = typeof window === 'undefined' ? 1 : (window.devicePixelRatio ?? 1);
  return Math.max(1, Math.min(MAX_RENDER_SCALE, dpr));
}

/** 当前视口的 CSS 尺寸 */
function viewportSize(): { width: number; height: number } {
  const element = document.getElementById('game');
  return {
    width: element?.clientWidth || window.innerWidth,
    height: element?.clientHeight || window.innerHeight,
  };
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.skyTop,
  scale: {
    /**
     * ★ 用 NONE + 手动 resize()，不用 RESIZE 自动模式。
     *
     *   需要的是「**缓冲区按 DPR 放大、CSS 尺寸保持不变**」：
     *   Phaser 的 `resize(w,h)` 把 `canvas.width` 设成 w，
     *   把 `style.width` 设成 `w * zoom`。所以传入
     *   `CSS尺寸 × scale` 并令 `zoom = 1/scale`，
     *   就得到高分辨率缓冲 + 正确的显示尺寸。
     *   （RESIZE 模式会自己按容器改尺寸，把这套覆盖掉。）
     *
     *   ⚠️ 游戏内坐标从此是**物理像素**，不是 CSS 像素。
     *   布局与字号一律经 `game/ui/uiScale.ts` 的 px()/fontPx() 换算。
     */
    mode: Phaser.Scale.NONE,
    zoom: 1 / renderScale(),
    width: viewportSize().width * renderScale(),
    height: viewportSize().height * renderScale(),
  },
  render: {
    antialias: true,
    powerPreference: 'low-power',
  },
  scene: [BootScene, PreloadScene, HomeScene, HowToPlayScene, LevelSelectScene, GameScene, SettingsScene],
};

const game = new Phaser.Game(config);

/**
 * 转屏 / 窗口变化后重新同步缓冲尺寸。
 *
 * ⚠️ 必须**同时**更新缓冲尺寸与 zoom：只改尺寸的话，
 * 转屏后 canvas 会按物理像素撑满屏幕（画面大一倍）。
 */
function syncCanvasSize(): void {
  const scale = renderScale();
  const { width, height } = viewportSize();
  game.scale.setZoom(1 / scale);
  game.scale.resize(width * scale, height * scale);
}

window.addEventListener('resize', syncCanvasSize);
// iOS 转屏后视口尺寸要等一帧才准
window.addEventListener('orientationchange', () => setTimeout(syncCanvasSize, 100));

if (import.meta.env.DEV) {
  (window as unknown as { __GAME__?: Phaser.Game }).__GAME__ = game;
}
