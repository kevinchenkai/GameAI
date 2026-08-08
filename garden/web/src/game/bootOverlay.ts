/**
 * game/bootOverlay.ts —— 首屏加载态（HTML 层，不是 Phaser 层）
 *
 * ★ 为什么不用 Phaser 画进度条：
 *   BootScene 要等约 350KB 的 JS 下载 + 解析完才存在，而**那段等待
 *   恰恰是最长的一段**。用 Phaser 画，等于"白屏结束之后才开始显示进度"。
 *   进度条必须由 index.html 自带的 DOM 承担 —— 它随首个网络往返到达。
 *
 * ★ 本文件**不 import Phaser**，也不该 import。它要能在引擎就绪前工作。
 *
 * ⚠️ 找不到 DOM 节点时**静默降级**，绝不抛错：
 *   加载指示器自己把游戏搞崩，是最不可接受的失败方式。
 */

/** 进度条只占加载的一部分：JS 到达时素材还没开始下 */
const JS_ARRIVED_RATIO = 0.15;

/**
 * ★ 只依赖真正用到的那几个 DOM 能力，而不是整个 `Document`。
 *
 *   这样单测可以用十几行的假对象覆盖，不必为一个小模块引入 jsdom
 *   （那是 ~50 个包，而本仓库的测试环境刻意保持 `node` ——
 *   `core/` 零引擎依赖的收益之一就是不需要 DOM）。
 */
export interface MinimalElement {
  style: { width: string };
  textContent: string | null;
  classList: { add(token: string): void };
  addEventListener(type: string, cb: () => void, opts?: { once?: boolean }): void;
  remove(): void;
}

export interface MinimalDocument {
  getElementById(id: string): MinimalElement | null;
}

/** 测试可注入替身；生产运行时始终是真 document */
let docRef: MinimalDocument | null = null;

export function __setDocumentForTests(doc: MinimalDocument | null): void {
  docRef = doc;
}

function doc(): MinimalDocument | null {
  if (docRef) return docRef;
  if (typeof document === 'undefined') return null;
  return document as unknown as MinimalDocument;
}

interface BootOverlayEls {
  root: MinimalElement;
  fill: MinimalElement;
  hint: MinimalElement;
}

function query(): BootOverlayEls | null {
  const d = doc();
  if (!d) return null;
  const root = d.getElementById('boot');
  const fill = d.getElementById('boot-fill');
  const hint = d.getElementById('boot-hint');
  if (!root || !fill || !hint) return null;
  return { root, fill, hint };
}

/**
 * 素材加载进度。`ratio` ∈ [0, 1]，指 Phaser Loader 的完成度。
 *
 * ★ 映射到 15%~100%：JS 刚到达时就显示 0% 会让人觉得"什么都没发生"，
 *   而实际上最慢的一段（下载 + 解析 JS）已经过去了。
 */
export function setBootProgress(ratio: number): void {
  const els = query();
  if (!els) return;
  // ★ NaN 要挡住：`width: NaN%` 是非法 CSS，浏览器会整条规则丢弃，
  //   表现是进度条**卡在上一个宽度**不动 —— 看起来就像加载卡死了
  const safe = Number.isFinite(ratio) ? ratio : 0;
  const clamped = Math.max(0, Math.min(1, safe));
  const shown = JS_ARRIVED_RATIO + clamped * (1 - JS_ARRIVED_RATIO);
  els.fill.style.width = `${(shown * 100).toFixed(1)}%`;
}

/** 加载失败时把原因说清楚 —— 停在 60% 的进度条什么也没交代 */
export function setBootError(message: string): void {
  const els = query();
  if (!els) return;
  els.hint.textContent = message;
}

/**
 * 收起加载态。
 *
 * ★ 先淡出再移除，避免"进度条瞬间消失"的突兀感；
 *   但 DOM 必须真的移除 —— 它是 `position: fixed; inset: 0`，
 *   留着会永久吃掉所有触摸事件，棋盘点不动。
 */
export function hideBootOverlay(): void {
  const els = query();
  if (!els) return;
  setBootProgress(1);
  els.root.classList.add('done');
  const remove = (): void => els.root.remove();
  // transitionend 不保证触发（元素被隐藏、动画被禁用等），所以加兜底定时器
  els.root.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, 600);
}
