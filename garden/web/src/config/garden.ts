/**
 * config/garden.ts —— 星星经济与花园节点
 *
 * ★ 双维度奖励（框架 §8.1）：Progress 与 Mastery 互不干扰。
 *
 *   原方案（花园直接消费 1/2/3 星总数）有缺陷：
 *   **高水平玩家的主线花园推进速度是普通玩家的 3 倍**，
 *   更糟的是它破坏了 Stage 0 的验证目的——我们要验证的心理是
 *   「再玩两关，我就能把院门修好了」，但如果玩家第一关就三星、
 *   当场就能建设，这个心理**根本没被测到**。
 */

export interface GardenNode {
  readonly id: string;
  readonly name: string;
  readonly unlockAtLevel: number;
  readonly stages: readonly {
    readonly cost: number;
    /** 指向 ASSETS.garden.* 的索引，不写文件名（冻结契约 6） */
    readonly assetIndex: number;
    readonly petReaction?: string;
  }[];
}

export const GARDEN_ECONOMY = {
  /**
   * ★ 通关固定 +1，**1 星和 3 星一样**。
   *   所有玩家 3 关推进一个阶段，节奏完全一致——
   *   Stage 0 的留存数据才可比。
   */
  progressStarPerClear: 1,
  /** 每个建设阶段消耗 3 Progress Star */
  nodeStageCost: 3,
} as const;

/**
 * ★ Mastery Star 按「历史最高评级增量」发放（框架 §8.2）。
 *
 *   不阻塞 Stage 0（Stage 0 不启用 Mastery），但**必须在 V1 Full 启用前实现**，
 *   否则有刷分漏洞：玩家反复重打第 1 关就能无限刷 Mastery Star。
 *
 *     masteryGain = Math.max(0, newRating - bestRating)
 *
 *   `Math.max(0, ...)` 不能省：打出比历史最好成绩差的评级时增量为负，
 *   必须夹到 0——不能倒扣玩家已经拿到的星星。
 *
 *   ⚠️ **Progress Star 同理只在首次通关发放**（看 bestRating > 0 判断）。
 *      这一点实现时容易漏——重打旧关卡不应推进花园。
 */
export const MASTERY_ENABLED_FROM_STAGE = 'v1-full' as const;

/**
 * Stage 0 唯一节点：院门，3 个建设阶段。
 *
 * ★ 节点拆成可见阶段，**每 3 关就有一次可见变化**，而不是攒 10 关才动一次。
 *   建设进度条**必须在关卡结算界面就显示**——让玩家在"还要不要再玩一关"
 *   的决策点看到"就差一点"。这个心理是留存核心。
 */
export const GARDEN_NODES: readonly GardenNode[] = [
  {
    id: 'gate',
    name: '院门',
    unlockAtLevel: 1,
    stages: [
      { cost: GARDEN_ECONOMY.nodeStageCost, assetIndex: 1, petReaction: 'gardenBuild' }, // 清杂草
      { cost: GARDEN_ECONOMY.nodeStageCost, assetIndex: 2, petReaction: 'gardenBuild' }, // 修门框
      { cost: GARDEN_ECONOMY.nodeStageCost, assetIndex: 3, petReaction: 'gardenBuild' }, // 挂灯笼
    ],
  },
];
