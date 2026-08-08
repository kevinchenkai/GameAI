/**
 * game/safeArea.ts —— 读取 Safe Area（刘海、Home Indicator、浏览器地址栏）
 *
 * ★ 移动端 H5 特有的坑：竖屏 iPhone 的顶部刘海与底部 Home Indicator
 *   会盖住内容。CSS 的 env(safe-area-inset-*) 是唯一可靠来源 ——
 *   靠 UA 判断机型是死路（机型太多，且新机型永远在后面）。
 *
 * ⚠️ 需要 index.html 里有 `viewport-fit=cover`，否则 env() 恒为 0。
 */

import type { SafeAreaInsets } from './render/layout';

const ZERO: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * 读取一个 CSS 环境变量的像素值。
 * ★ 用一个临时元素实测，而不是解析字符串 —— env() 的计算结果
 *   只有浏览器知道。
 */
function readInset(name: string): number {
  if (typeof document === 'undefined') return 0;
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.height = `env(${name}, 0px)`;
  document.body.appendChild(probe);
  const value = probe.getBoundingClientRect().height;
  probe.remove();
  return Number.isFinite(value) ? value : 0;
}

export function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === 'undefined') return ZERO;
  try {
    return {
      top: readInset('safe-area-inset-top'),
      right: readInset('safe-area-inset-right'),
      bottom: readInset('safe-area-inset-bottom'),
      left: readInset('safe-area-inset-left'),
    };
  } catch {
    // ★ 读不到就当没有 —— 布局算法本来就要能在 inset 全 0 时正常工作
    return ZERO;
  }
}
