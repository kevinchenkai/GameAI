/**
 * config/tuning.ts —— 全局手感参数
 *
 * ★ 准则：逻辑代码里不写死数值。改手感应当只改本文件。
 */

// ————————————————————————————————————————————————
// 节奏（框架 §9.1）
// ————————————————————————————————————————————————

export type Tempo = 'calm' | 'brisk';

/**
 * ★ 设置项叫**「节奏」**，不叫「难度」或「简单模式」——避免羞辱感。
 *   默认「舒缓」。年轻玩家玩两局就会自己去设置里找"能不能快点"，
 *   50+ 用户永远不会打开这个设置。
 */
export const TEMPO: Readonly<Record<Tempo, number>> = {
  calm: 1.3, // 舒缓 —— 默认
  brisk: 0.8, // 明快
};

export const DEFAULT_TEMPO: Tempo = 'calm';

/** 基准时长（ms）。实际时长 = TIMING.x * TEMPO[current] */
export const TIMING = {
  swap: 180,
  matchPop: 220,
  fallPerRow: 90,
  cascadeGap: 120,
  specialFire: 320,
} as const;

// ————————————————————————————————————————————————
// 输入缓存（框架 §9.2，按 Codex §12 收紧）
// ————————————————————————————————————————————————

/**
 * ★ 只在整段动画最后 ~120ms 开放缓存。
 *
 * 原方案"连锁播放全程可缓存"的风险是**坐标语义漂移**：
 * 玩家在 Cascade 中途看到的棋盘不是结算后的棋盘，他对着一个正在下落的
 * 位置滑动，缓存执行时可能换的是完全不同的两个棋子。
 *
 * 两个关键点（缺一不可）：
 *   1. 缓存的 Move 在 **READY_FOR_INPUT** 才兑现（不是 settled、也不是
 *      turnResolved）——否则会插到宠物反应或结算弹窗前面。冻结契约 7。
 *   2. 兑现前**必须重新验证合法性**，非法则静默丢弃。
 */
export const INPUT_BUFFER = {
  openBeforeEndMs: 120,
} as const;

// ————————————————————————————————————————————————
// 布局（框架 §10）
// ————————————————————————————————————————————————

/**
 * ★ 核心原则：**棋子大小是约束，布局比例是结果。**
 *   策划案第一原则是"棋子够大够清楚"，那它就不能是被动挤压的一方。
 *   硬编码百分比会在小屏上把棋子挤到不可用。
 *
 * 算法（§10.1）：
 *   1. 读 Safe Area → 2. 算水平可用宽度 → 3. 推导最大棋盘边长
 *   4. ★ 校验棋子 ≥ minPieceSizePt，不满足则**降棋盘尺寸**（不是继续缩棋子）
 *   5. 剩余高度按 weights 弹性分配 → 6. Pet 区不足则改「半身」构图
 */
export const LAYOUT = {
  /** 硬底线（pt）。iPhone SE 375pt 宽下 8 列恰好 ≈38pt */
  minPieceSizePt: 38,
  /** 依次尝试的棋盘边长 */
  boardFallback: [8, 7] as const,
  petMinHeightPt: 96,
  boardMarginPt: 16,
  weights: { hud: 1.2, pet: 2.0, controls: 1.0 },
} as const;

// ————————————————————————————————————————————————
// 性能降级（框架 §9.3，按 Codex §14 修正）
// ————————————————————————————————————————————————

export type FxLevel = 'high' | 'medium' | 'low';

export const FX_QUALITY: Readonly<
  Record<FxLevel, { particles: boolean; maxParticles: number; shake: boolean }>
> = {
  high: { particles: true, maxParticles: 40, shake: true },
  medium: { particles: true, maxParticles: 15, shake: true },
  low: { particles: false, maxParticles: 0, shake: false },
};

/**
 * ★ 后台持续采样，不做启动时测速。
 *   原方案"启动测 3 秒帧率"是错的——用户会觉得游戏卡在启动画面 3 秒，
 *   这本身就是糟糕的第一印象。持续采样还能应对**中途发热降频**
 *   （老手机的真实场景）。
 *
 * ★ 只降不升（升级需更长的稳定观察窗口）——画质在两档间反复横跳
 *   比一直低画质更难受。
 */
export const FX_SAMPLING = {
  windowMs: 3000,
  downgradeBelowFps: 45,
  upgradeAboveFps: 58,
  /** 升档需要连续观察多久，远长于降档 */
  upgradeStableMs: 15000,
} as const;

// ————————————————————————————————————————————————
// 宠物动画预算（框架 §6.3）
// ————————————————————————————————————————————————

/**
 * ★ 重反应累计 ≤ 单局时长 8%。运行时统计，超预算**自动降级**
 *   （跳过部分 excited，只播轻反应）。这是防止「陪伴变打断」的自动保险。
 *
 * ★ 旺财性格是"活泼"，直觉做法是"多蹦几次"——这条路走不通，会撞爆预算。
 *   正确做法是把活泼放在 **Idle 层**（config/pet.ts 的 IDLE_MICRO），
 *   那一层零预算成本。
 */
export const PET_ANIM_BUDGET = {
  maxHeavyRatio: 0.08,
  excitedDuration: 800,
  skillDuration: 1000,
  hintDuration: 1200,
} as const;

/** 触发 excited 重反应的连锁层数阈值 */
export const COMBO_EXCITED_THRESHOLD = 3;
