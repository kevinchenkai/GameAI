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
// 手势识别（框架 §10.2）
// ————————————————————————————————————————————————

/**
 * ★ 两种输入方式**都要支持**，这不是冗余：
 *   - **滑动**：年轻玩家的默认习惯
 *   - **点选**（点 A 再点 B）：50+ 用户与手抖用户的救命通道 ——
 *     "按住拖动"对他们的失败率远高于"点两下"
 *
 * ★ 滑动阈值用**格子边长的比例**表达，不用固定像素：
 *   固定像素会让同一份手感在大屏上过灵敏、在小屏上滑不动。
 */
export const INPUT = {
  /** 触发滑动所需位移 = 本值 × 格子边长 */
  swipeThresholdRatio: 0.28,
  /** 比例的基准格子边长（pt）。实际按当前 pieceSizePt 缩放 */
  referenceCellPt: 44,
  /**
   * ★ 点击容差刻意放宽（默认 ~10pt 对手抖用户太严）。
   *   宁可把一次轻微拖动认成点击，也不要让老年用户点了没反应。
   */
  tapMaxMovePt: 16,
  /** 超过这个时长的按压不算点击（是长按或犹豫） */
  tapMaxDurationMs: 800,
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
 * 消除特效（A1「爽感核心」）。
 *
 * ★★ 为什么消除必须有粒子：
 *   在此之前，消除只有"缩小淡出" —— 棋子安静地消失，没有任何
 *   "我做成了一件事"的回馈。三消游戏的爽感几乎全部来自这一刻。
 *
 * ★ 粒子颜色取**被消除棋子自己的颜色**（PIECE_DEFS.hex），
 *   不用统一的白色或金色 —— 玩家的注意力本来就在那个颜色上，
 *   同色迸发才读得出"是它炸了"。
 *
 * ★ 数量随连锁层级递增（countByCascade），但**有上限**：
 *   连锁越深越热闹是爽感的来源，可粒子数是老机器掉帧的头号原因，
 *   所以再深也不超过 FX_QUALITY[level].maxParticles。
 */
export const MATCH_FX = {
  /** 单格基础粒子数（第 1 层连锁） */
  baseCount: 6,
  /** 每深一层连锁额外增加的粒子数 */
  perCascade: 2,
  /** 单格粒子数上限（再深也不超过，防老机器掉帧） */
  maxPerCell: 14,
  /** 粒子飞散速度（相对格子边长的比例，避免大小屏手感不一） */
  speedRatio: { min: 0.5, max: 1.6 },
  /** 存活时长（ms），随节奏缩放 */
  lifespanMs: 420,
  /**
   * 粒子初始直径相对格子边长。
   *
   * ★ 0.16 实测太小（84px 格子上只有 9.5px），在手机上是"几粒白灰"
   *   而不是"果肉迸溅"。0.28 下直径约 24px，与水果的体量才成比例。
   */
  sizeRatio: 0.28,
  /** 重力：让碎片略微下坠，而不是纯向外飘 */
  gravityY: 320,
  /** 生成的圆点纹理边长（px，物理像素） */
  textureSize: 32,
} as const;

/**
 * 连锁反馈：第 N 层连锁的整体表现强度。
 *
 * ★★ 这是 A1 的另一半 —— 在此之前 **5 连锁和 3 消看起来完全一样**，
 *   玩家做出了很厉害的一步却毫无察觉。
 *
 * ★ 阶梯从**第 2 层**才开始（index 0 对应 level 2）：
 *   第 1 层是每一步都会发生的普通消除，给它加特效等于没有强调。
 *
 * ★ 缩放上限刻意保守（1.35）：这是"低压力"游戏，
 *   屏幕剧烈晃动会让 50+ 用户不适 —— 强调要有，但不能变成惊吓。
 */
export const CASCADE_FX = {
  /** 第 2 层起每层的粒子/音高强度系数，超出数组则取最后一档 */
  intensity: [1.0, 1.25, 1.5, 1.8] as const,
  /** 达到该层数才触发屏幕轻微一震 */
  shakeFromLevel: 3,
  /** 震动时长（ms）与强度（相对视口，Phaser shake 的单位） */
  shakeMs: 160,
  shakeIntensity: 0.004,
  /** 连锁提示文字（"连击 x3"）出现的最低层级 */
  labelFromLevel: 3,
  labelRiseRatio: 0.5,
  labelMs: 640,
} as const;

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

/**
 * 棋盘格子的视觉常量（**设计像素**，用时经 px() 换算）。
 *
 * ★ 红线：数值不写死进逻辑代码。这几个原本散在 BoardView 里当裸数字，
 *   既没走 px()（DPR=2 手机上只有一半），也没法统一调。
 */
export const CELL = {
  /** 底板相对格子的内缩量 —— 格子之间留缝，棋子不挤在一起 */
  insetPt: 2,
  /** 底板与选中框的圆角 */
  radiusPt: 8,
  /** 选中框描边宽度 */
  selectionWidthPt: 4,
  /** 底板阴影不透明度（配 ENV_HEX.cellShadow） */
  backdropAlpha: 0.06,
} as const;

/**
 * UI 的"立体感"参数（**设计像素**，用时经 px() 换算）。
 *
 * ★ 全项目原本零渐变零阴影 —— 卡片和背景在同一个平面上，
 *   按钮点下去也没有任何反馈。这几个值就是把层级拉开的最小成本方案。
 *
 * ★ 阴影用**同色系深色 + 低不透明度**，不用纯黑：
 *   纯黑阴影在暖色背景上会发灰发脏。
 */
export const ELEVATION = {
  /** 卡片投影：向下偏移量与模糊近似（用多层矩形模拟，Graphics 没有真模糊） */
  cardShadowOffsetPt: 6,
  cardShadowAlpha: 0.13,
  /** 投影用几层递减的圆角矩形叠出柔边 —— 层数越多越柔，也越费 */
  cardShadowLayers: 3,

  /** 按钮投影（比卡片浅，否则按钮会比卡片还"高"） */
  btnShadowOffsetPt: 3,
  btnShadowAlpha: 0.18,

  /** 按下时下沉的距离与时长 —— 短促才像"点到了" */
  pressSinkPt: 2,
  pressMs: 90,
  /** 松开回弹 */
  releaseMs: 120,
} as const;

/**
 * 背景层次（见 game/render/Backdrop.ts）。
 *
 * ★★ 所有强度值都**刻意极低**。目的是"画面不平"，不是"背景好看" ——
 *   背景一旦引人注意，就在和棋子抢注意力，而核心判据是
 *   "棋子够不够清楚"（50+ 用户）。宁可弱到几乎察觉不到。
 */
export const BACKDROP = {
  /** 背景层深度。★ 必须低于所有内容（棋盘 0 / 旺财 5 / HUD 10 / 弹窗 100+） */
  depth: -10,
  /** 暗角：层数越多越柔 */
  vignetteLayers: 4,
  /** 每层描边宽度占屏幕长边的比例 */
  vignetteBandRatio: 0.06,
  /** 暗角最大不透明度 —— 超过 0.05 就会被看出来 */
  vignetteAlpha: 0.035,
} as const;

/** 触发 excited 重反应的连锁层数阈值 */
export const COMBO_EXCITED_THRESHOLD = 3;
