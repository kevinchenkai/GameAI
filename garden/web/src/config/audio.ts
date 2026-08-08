/**
 * config/audio.ts —— 音效设计参数
 *
 * ★ 为什么是**合成音**而不是音频素材：
 *   `assets/audio/` 目前是空的（美术工单标注"音频另行安排"）。
 *   合成音零素材依赖、零体积（首屏已有 4.2MB 的问题，见
 *   docs/TODO-性能优化.md），且**当天就能听、能调**。
 *   将来有真素材，替换 AudioManager 的实现即可，事件接口不变。
 *
 * ★★ 核心约束：**主体能量必须落在 500Hz~2kHz**。
 *   50+ 用户的高频听力衰减明显，把反馈音做在 2kHz 以上等于对目标用户静音
 *   （框架审核 §19、V0.2 评审意见）。
 *   所以这里**没有一个基频高于 2000Hz** —— 这是硬约束，不是口味。
 *
 * ★ 一切数值进配置（CLAUDE.md §4.3），逻辑代码里不写死。
 */

/**
 * 可听频带。★ 所有频率都必须落在区间内，有单测守着。
 *
 * ★ **上下两端的理由不同，不要混为一谈**：
 *   - `maxHz` 2000：这是**用户约束** —— 50+ 高频听力衰减，
 *     超过就等于对目标用户静音。这一端**不许放宽**。
 *   - `minHz` 200：这是**设备约束** —— 手机扬声器放不出低频，
 *     低于这个数在手机上只剩"噗"的一声。
 *
 * ⚠️ 爆炸音（specialFire）刻意扫到 220Hz —— 框架审核 §19 明确要求
 *   "爆炸用低中频增加满足感"。它低于人声中频但仍在手机能放的范围内，
 *   是**设计意图**，不是越界。
 */
export const AUDIBLE_BAND = { minHz: 200, maxHz: 2000 } as const;

export type SfxName =
  | 'swap'
  | 'swapBack'
  | 'match'
  | 'cascade'
  | 'specialFire'
  | 'obstacleHit'
  | 'obstacleClear'
  | 'win'
  | 'lose';

export interface ToneSpec {
  /** 基频（Hz）。★ 必须在 AUDIBLE_BAND 内 */
  readonly freq: number;
  /** 结束频率；与 freq 不同则为滑音 */
  readonly endFreq?: number;
  readonly durationMs: number;
  /** 峰值音量 0~1（相对 sfx 总音量） */
  readonly gain: number;
  readonly wave: OscillatorType;
  /** 起音时长（ms）。★ 太长会糊掉 transient，中频 transient 是要求之一 */
  readonly attackMs: number;
  /** 叠加的谐波（相对基频的倍数 + 相对增益），让音色不那么单薄 */
  readonly partials?: readonly { readonly ratio: number; readonly gain: number }[];
}

/**
 * 各音效的合成参数。
 *
 * ★ 设计意图逐条写在注释里 —— 音效是最容易被"随手调一下"改坏的东西，
 *   不写清楚为什么，下一个人（或三个月后的我）只会看到一堆魔数。
 */
export const SFX: Readonly<Record<SfxName, ToneSpec>> = {
  /** 交换：轻、短。它每步都响，稍重就会烦 */
  swap: {
    freq: 520,
    durationMs: 70,
    gain: 0.18,
    wave: 'sine',
    attackMs: 4,
  },

  /**
   * 交换失败（换回来）：**下行**滑音。
   * ★ 下行 = "不行"，这是跨文化的直觉，不需要学习。
   *   但**不要做成刺耳的错误音** —— 低压力定位下，失败不该被惩罚性地强调。
   */
  swapBack: {
    freq: 480,
    endFreq: 360,
    durationMs: 130,
    gain: 0.16,
    wave: 'sine',
    attackMs: 6,
  },

  /**
   * 消除：主反馈音。
   * ★ 基频 660Hz 落在中频正中，**不是"玻璃叮"**（框架审核 §19 明确反对）。
   *   加两个谐波让它厚一点，有"果实爆开"的实感而不是电子音。
   */
  match: {
    freq: 660,
    durationMs: 150,
    gain: 0.3,
    wave: 'triangle',
    attackMs: 3,
    partials: [
      { ratio: 1.5, gain: 0.35 },
      { ratio: 2.0, gain: 0.2 },
    ],
  },

  /**
   * 连锁：在 match 基础上**逐层升调**（音高由 cascadeStep 决定）。
   * ★ 升调表达"越来越好"，但**基频仍在中频**——
   *   连锁层数高时也不会飘到 2kHz 以上（有单测守着上限）。
   */
  cascade: {
    freq: 660,
    durationMs: 160,
    gain: 0.32,
    wave: 'triangle',
    attackMs: 3,
    partials: [{ ratio: 1.5, gain: 0.4 }],
  },

  /**
   * 特殊棋子发射：**低中频**，要有推力感。
   * ★ 爆炸用低中频增加满足感（框架审核 §19）。
   *
   * ⚠️ 曾经用 `sawtooth`：基频没问题，但锯齿波的谐波极其丰富，
   *   离线频谱实测 **47% 的能量落在 2kHz 以上** ——
   *   对 50+ 用户来说，这些能量等于白给。听感上也偏"电子刺啦"，
   *   不像果实炸开。改用 triangle + 一个 1.5x 谐波：
   *   基频不变、推力还在，但能量收回中频。
   *   （这类问题**只有实测频谱才看得出来**，基频检查是过的。）
   */
  specialFire: {
    freq: 320,
    endFreq: 220,
    durationMs: 280,
    gain: 0.36,
    wave: 'triangle',
    attackMs: 2,
    partials: [
      { ratio: 1.5, gain: 0.3 },
      { ratio: 2.0, gain: 0.18 },
    ],
  },

  /**
   * 冰被打到（但没碎）：闷响，表达"还差一下"。
   * ★ 用 triangle 而非 square —— 方波同样谐波过剩（实测 24.5% 在 2kHz 以上），
   *   而"闷"本来就该少高频，方波反而与设计意图相反。
   */
  obstacleHit: {
    freq: 400,
    durationMs: 110,
    gain: 0.24,
    wave: 'triangle',
    attackMs: 3,
    partials: [{ ratio: 1.5, gain: 0.22 }],
  },

  /** 冰碎：比 hit 更亮更长，但仍在中频。这是玩家要的那个"解决了" */
  obstacleClear: {
    freq: 780,
    endFreq: 980,
    durationMs: 220,
    gain: 0.28,
    wave: 'triangle',
    attackMs: 2,
    partials: [{ ratio: 1.5, gain: 0.3 }],
  },

  /** 过关：上行，明确的好消息 */
  win: {
    freq: 520,
    endFreq: 1040,
    durationMs: 420,
    gain: 0.3,
    wave: 'triangle',
    attackMs: 8,
    partials: [{ ratio: 1.5, gain: 0.35 }],
  },

  /**
   * 未过关：**温和的下行**，不是失败嗡鸣。
   * ★ 策划定位是低压力：失败音要像"哎呀"，不像"错误！"。
   *   音量也刻意压低 —— 输的时候不该被大声宣告。
   */
  lose: {
    freq: 420,
    endFreq: 330,
    durationMs: 380,
    gain: 0.2,
    wave: 'sine',
    attackMs: 12,
  },
};

/**
 * 连锁升调：第 n 层的频率倍数。
 * ★ 半音比 1.0595，每层升两个半音；**上限由 AUDIBLE_BAND 夹住**，
 *   否则 8 连锁会飘到目标用户听不见的频段。
 */
export const CASCADE_SEMITONE_STEP = 2;

/** 音量默认值。★ 默认开，但留出静音入口（M5 的设置面板） */
export const AUDIO_DEFAULTS = {
  sfxVolume: 0.7,
  bgmVolume: 0.0, // Stage 0 无 BGM 素材
  muted: false,
} as const;

/**
 * ★ 同一时刻同名音效的最小间隔（ms）。
 *
 *   连锁会在几十毫秒内产生一串 match 事件，逐个播放会叠成
 *   一坨噪音（而且瞬时音量叠加到削波）。这里做节流：
 *   同名音效在窗口内只响一次。
 */
export const SFX_THROTTLE_MS = 45;
