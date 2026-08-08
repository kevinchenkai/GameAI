/**
 * meta/gardenProgress.ts —— 花园建设的**纯逻辑**（可单测，不碰 Phaser）
 *
 * ★ 为什么单独一层：这里是「再玩一关就能修好院门」这个**留存心理**的
 *   数值实现。它要同时被两处消费 ——
 *     - GardenScene（花园页，真正点击建设）
 *     - ResultPanel（关卡结算页，显示"就差一点"）
 *   若把算法写在任一个场景里，另一处必然复制一份，两份迟早算不一致。
 *
 * ★ 框架 §8.1 明确：建设进度条**必须在关卡结算界面就显示**，
 *   让玩家在"还要不要再玩一关"的决策点看到差距。
 */

import { GARDEN_NODES, type GardenNode } from '../config/garden';
import { availableProgressStars, type SaveData } from './save';

export interface NodeProgress {
  readonly node: GardenNode;
  /** 已完成阶段数（0 = 还没开始建） */
  readonly stage: number;
  /** 总阶段数 */
  readonly totalStages: number;
  /** 是否已全部建完 */
  readonly complete: boolean;
  /** 下一阶段所需星星；已建完为 null */
  readonly nextCost: number | null;
  /** 还差几颗星才能建下一阶段；已建完或已够为 0 */
  readonly starsShort: number;
  /** 现在就能建下一阶段吗 */
  readonly canBuild: boolean;
}

/** 节点是否已解锁（按已通关关卡数） */
export function isNodeUnlocked(node: GardenNode, highestCleared: number): boolean {
  return highestCleared >= node.unlockAtLevel - 1;
}

/**
 * 计算某节点的建设进度。
 *
 * ★ `stage` 从存档读，**夹在 [0, totalStages]** ——
 *   存档可能被改坏（写了个 99），直接拿去索引 stages[] 会得到 undefined，
 *   然后渲染层拿着 undefined 去取 assetIndex 就崩了。
 */
export function nodeProgress(save: SaveData, node: GardenNode): NodeProgress {
  const total = node.stages.length;
  const raw = save.garden[node.id] ?? 0;
  const stage = Math.max(0, Math.min(total, raw));
  const complete = stage >= total;

  const next = complete ? null : node.stages[stage];
  const nextCost = next?.cost ?? null;
  const available = availableProgressStars(save);

  return {
    node,
    stage,
    totalStages: total,
    complete,
    nextCost,
    starsShort: nextCost === null ? 0 : Math.max(0, nextCost - available),
    canBuild: nextCost !== null && available >= nextCost,
  };
}

/** Stage 0 只有院门一个节点，但按数组写，V1 Full 加节点不用改结构 */
export function allNodeProgress(save: SaveData): readonly NodeProgress[] {
  return GARDEN_NODES.map((n) => nodeProgress(save, n));
}

/**
 * 执行一次建设。
 *
 * ★ **不够星星就原样返回**，不做"扣到负数"或抛异常 ——
 *   UI 已经用 canBuild 挡过一道，这里是第二道防线。
 *   返回 `built: false` 让调用方知道什么都没发生。
 *
 * ★ 星星记在 `spent` 而不是从 `earned` 里减 ——
 *   earned 是累计产出，是历史；spent 是消耗。
 *   两者分开才能回答"这个玩家一共赚了多少星"。
 */
export function buildNodeStage(
  save: SaveData,
  nodeId: string,
): { save: SaveData; built: boolean; newStage: number } {
  const node = GARDEN_NODES.find((n) => n.id === nodeId);
  if (!node) return { save, built: false, newStage: 0 };

  const p = nodeProgress(save, node);
  if (!p.canBuild || p.nextCost === null) {
    return { save, built: false, newStage: p.stage };
  }

  const newStage = p.stage + 1;
  return {
    save: {
      ...save,
      garden: { ...save.garden, [node.id]: newStage },
      stars: {
        ...save.stars,
        progress: {
          earned: save.stars.progress.earned,
          spent: save.stars.progress.spent + p.nextCost,
        },
      },
    },
    built: true,
    newStage,
  };
}

/**
 * 结算页要显示的那一条进度。
 *
 * ★ 只取**第一个未完成**的节点 —— 结算页空间很小，
 *   列出全部节点会把"就差一点"这个信息稀释掉。
 *   全部建完则返回 null（不显示进度条）。
 */
export function focusedProgress(save: SaveData): NodeProgress | null {
  return allNodeProgress(save).find((p) => !p.complete) ?? null;
}
