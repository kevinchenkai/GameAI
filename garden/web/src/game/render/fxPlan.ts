/**
 * game/render/fxPlan.ts —— 消除/连锁特效的**纯计算**
 *
 * ★★ 为什么单独一个文件：这里全是"该放多少粒子、要不要震屏"的判断，
 *   与 Phaser 无关。抽出来才能单测 —— 特效逻辑一旦写进 EventPlayer，
 *   就只能靠肉眼在浏览器里看，而"第 5 层连锁到底比第 3 层强没强"
 *   是**看不出来**的（这正是 A1 要解决的问题本身）。
 *
 * ⚠️ 本文件不 import Phaser（与 core/ 同样的纪律，方便 Node 下跑）。
 */

import { CASCADE_FX, FX_QUALITY, MATCH_FX, type FxLevel } from '../../config/tuning';

/**
 * 第 `level` 层连锁的强度系数。
 *
 * ★ level 1（普通消除）恒为 1.0 —— 每步都发生的事不需要强调。
 *   阶梯从 level 2 开始，对应 intensity[0]。
 */
export function cascadeIntensity(level: number): number {
  if (level <= 1) return 1;
  const idx = Math.min(level - 2, CASCADE_FX.intensity.length - 1);
  return CASCADE_FX.intensity[idx] ?? 1;
}

/**
 * 单格消除的粒子数。
 *
 * ★ 三重约束，**顺序不能反**：
 *   1. 随连锁层级递增（爽感）
 *   2. 单格上限 maxPerCell（防连锁很深时单格爆量）
 *   3. 画质档上限 maxParticles（老机器保帧率，low 档直接 0）
 */
export function particleCount(level: number, fx: FxLevel): number {
  const q = FX_QUALITY[fx];
  if (!q.particles) return 0;
  const raw = MATCH_FX.baseCount + Math.max(0, level - 1) * MATCH_FX.perCascade;
  return Math.min(raw, MATCH_FX.maxPerCell, q.maxParticles);
}

/**
 * 一次消除事件的总粒子预算。
 *
 * ★★ 为什么要有"总量"这一层：单格上限挡不住**格子数**。
 *   一发火箭清掉整行 8 格 × 14 粒 = 112 粒，
 *   在 low 档手机上足以肉眼可见地掉帧。
 *   所以总量也要按画质档封顶，超了就均摊降到每格更少。
 */
export function budgetedCount(cells: number, level: number, fx: FxLevel): number {
  if (cells <= 0) return 0;
  const per = particleCount(level, fx);
  if (per === 0) return 0;
  const cap = FX_QUALITY[fx].maxParticles;
  // 总量上限取"画质档上限的格子数倍"，但每格不低于 1（否则大范围消除反而没特效）
  const total = Math.min(per * cells, cap * Math.max(1, Math.ceil(cells / 2)));
  return Math.max(1, Math.floor(total / cells));
}

/** 该层连锁是否触发屏幕轻震 */
export function shouldShake(level: number, fx: FxLevel): boolean {
  return FX_QUALITY[fx].shake && level >= CASCADE_FX.shakeFromLevel;
}

/** 该层连锁是否显示"连击 xN"提示 */
export function shouldLabel(level: number): boolean {
  return level >= CASCADE_FX.labelFromLevel;
}

/**
 * 震动强度：随层级增长但**有上限**。
 *
 * ★ 低压力定位下，震屏是"强调"不是"惩罚"。
 *   上限取 2 倍基准 —— 再大就从"爽"变成"晃得难受"了。
 */
export function shakeIntensity(level: number): number {
  const scaled = CASCADE_FX.shakeIntensity * cascadeIntensity(level);
  return Math.min(scaled, CASCADE_FX.shakeIntensity * 2);
}
