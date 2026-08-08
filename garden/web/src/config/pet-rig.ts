/**
 * config/pet-rig.ts —— 旺财 Puppet 的锚点与层级
 *
 * ★ 为什么锚点在这里而不在 PNG 里（美术工单复查 §4）：
 *   **PNG 存不了 pivot**。V1.1 初稿要求美术"在图里定义 tail 旋转锚点"，
 *   这是无法交付的。正确的职责划分：
 *
 *     美术定义「哪里应该转」—— tail 根部朝画布一侧、ears 根部朝上，
 *                              并交付 preview-composite.png 供对齐
 *     代码定义「准确从哪个坐标转」—— 本文件，我照着交付图量
 *
 *   → Codex **不需要标注锚点，也不需要提供坐标**。
 *
 * ⚠️ 下列数值是**按规格尺寸估算的占位值**，等第 2 批 Puppet 交付后，
 *    照 preview-composite.png 实测校准。校准只改本文件。
 */

/** 各层相对 body 画布（512×512）左上角的位置与旋转锚点 */
export interface RigPart {
  /** 该层在 body 坐标系中的位置（层的左上角） */
  readonly x: number;
  readonly y: number;
  /** 旋转锚点，取值 0~1（相对该层自身尺寸），Phaser setOrigin 直接用 */
  readonly originX: number;
  readonly originY: number;
  /** 层的原始尺寸，用于校验交付图 */
  readonly width: number;
  readonly height: number;
}

export const WANGCAI_RIG = {
  /** body 是基准层，其余层与之对齐。含头部（Stage 0 不拆 head） */
  body: { x: 0, y: 0, originX: 0.5, originY: 0.5, width: 512, height: 512 },

  /** ★ 绕**根部**旋转，所以 origin 落在根部而非几何中心 */
  tail: { x: 300, y: 250, originX: 0.15, originY: 0.75, width: 256, height: 256 },

  /** 双耳同层，绕**上方根部**旋转 */
  ears: { x: 128, y: 40, originX: 0.5, originY: 0.1, width: 256, height: 256 },

  /**
   * eyes-open 与 eyes-blink **同尺寸同位置**，切换不位移。
   * glanceAtPlayer 只对这个容器做 x/y 偏移（IDLE_MICRO.glanceEyeOffsetPx）。
   */
  eyes: { x: 128, y: 150, originX: 0.5, originY: 0.5, width: 256, height: 128 },
} as const satisfies Record<string, RigPart>;

/**
 * 绘制顺序，**从后到前**（先画的在底层）。
 *   tail 在最底 —— 尾巴在身体后面摆动，不能盖住身体
 *   ears 在 body 之上 —— 耳朵盖在头上
 *   eyes 最上 —— 眨眼与 glance 都靠它，不能被遮
 */
export const WANGCAI_LAYER_ORDER = ['tail', 'body', 'ears', 'eyes'] as const;

export type WangcaiPart = (typeof WANGCAI_LAYER_ORDER)[number];
