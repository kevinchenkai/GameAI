/**
 * config/assistance.ts —— 动态辅助
 *
 * ★ 只做**生成阶段**的两种，不做运行时干预（框架 §7）。
 *
 *   为什么不做运行时干预：玩家会隐约感觉"棋盘在配合我"，破坏
 *   "挑战来自思考"的核心承诺；而且这类逻辑极难 debug——
 *   出问题时无法区分是 bug 还是辅助生效。
 */

export const ASSISTANCE = {
  /** 同关连续失败次数触发阈值 */
  trigger: { level1: 2, level2: 4 },
  resetOnWin: true,

  /**
   * ★ 一级**完全静默，宠物不说话**。
   *   连续听宠物说"我来帮你"会变成"系统在提醒我很菜"。
   *   最好的动态辅助是玩家察觉不到的。
   */
  level1: {
    targetPieceWeightBonus: 0.15,
    guaranteedFourInLineOpenings: 1,
    petLine: null,
  },

  /** 二级才让宠物出面——这是安全网，不是常规表现 */
  level2: {
    targetPieceWeightBonus: 0.3,
    guaranteedFourInLineOpenings: 2,
    petLine: 'assistOffer',
  },

  /** 封顶，不做三级 */
  maxLevel: 2,
} as const;
