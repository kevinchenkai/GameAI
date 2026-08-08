/**
 * game/ui/uiScale.ts —— 把"设计尺寸"换算成"物理像素"
 *
 * ★★ 为什么需要这一层：
 *   main.ts 把画布缓冲按 DPR 放大了（否则手机上文字全糊），
 *   于是**游戏内 1 单位 = 1 物理像素**，不再等于 1 CSS 像素。
 *
 *   直接写 `fontSize: '30px'` 的话，在 DPR=2 的手机上只有
 *   **视觉上的 15px** —— 字反而更小了。所有字号、间距、圆角
 *   都必须乘上倍率。
 *
 * ★ 用一个函数集中换算，而不是在各处手写 `* scale`：
 *   漏乘一处不会报错，只会让那个元素小一半 —— 很难一眼看出来。
 */

import type Phaser from 'phaser';

/**
 * 画布缓冲相对 CSS 尺寸的倍率。
 *
 * ★ 从 canvas 实测，不重新读 devicePixelRatio ——
 *   main.ts 对倍率做了上限（老机器 3x 会掉帧），
 *   这里必须拿到**实际生效的那个值**，两处不能各算各的。
 */
export function uiScale(scene: Phaser.Scene): number {
  const canvas = scene.game.canvas;
  const cssW = canvas?.clientWidth ?? 0;
  if (!canvas || cssW <= 0) return 1;
  const ratio = canvas.width / cssW;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

/** 设计尺寸（CSS 像素）→ 物理像素 */
export function px(scene: Phaser.Scene, designPx: number): number {
  return designPx * uiScale(scene);
}

/** 生成 Phaser 需要的 `"NNpx"` 字号字符串 */
export function fontPx(scene: Phaser.Scene, designPx: number): string {
  return `${Math.round(px(scene, designPx))}px`;
}
