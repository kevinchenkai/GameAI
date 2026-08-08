/**
 * core/rng.ts —— 可种子化随机
 *
 * ★ 全项目唯一的随机来源。禁止散用 `Math.random()`（eslint 强制）。
 *   理由：复现 bug 依赖它。玩家报「第 12 关卡死了」，我们要能用同一个种子
 *   跑出同一局棋盘。关卡可解性模拟器（tools/simulate.ts）同样依赖此点。
 *
 * 算法：mulberry32。32 位状态，周期 2^32，分布质量对本项目足够，
 * 且实现只有几行——不引依赖，可在 Node 与浏览器里给出**完全一致**的序列。
 */

export interface Rng {
  /** [0, 1) */
  next(): number;
  /** [0, max) 的整数 */
  int(maxExclusive: number): number;
  /** [min, max] 的整数 */
  range(min: number, max: number): number;
  /** 从数组中等概率取一个 */
  pick<T>(items: readonly T[]): T;
  /** 按权重取一个 index，weights 必须与 items 等长且和 > 0 */
  weighted(weights: readonly number[]): number;
  /** 原地 Fisher-Yates 洗牌（返回新数组，不改入参） */
  shuffle<T>(items: readonly T[]): T[];
  /** 当前内部状态，用于存档 / 复现 */
  getState(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number): number => {
    if (maxExclusive <= 0) throw new Error(`rng.int: maxExclusive 必须 > 0，收到 ${maxExclusive}`);
    return Math.floor(next() * maxExclusive);
  };

  return {
    next,
    int,
    range: (min, max) => {
      if (max < min) throw new Error(`rng.range: max(${max}) < min(${min})`);
      return min + int(max - min + 1);
    },
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('rng.pick: 空数组');
      // noUncheckedIndexedAccess 下需要断言：index 由 int() 保证在范围内
      return items[int(items.length)] as T;
    },
    weighted: (weights) => {
      let total = 0;
      for (const w of weights) {
        if (w < 0) throw new Error('rng.weighted: 权重不得为负');
        total += w;
      }
      if (total <= 0) throw new Error('rng.weighted: 权重总和必须 > 0');
      let roll = next() * total;
      for (let i = 0; i < weights.length; i++) {
        roll -= weights[i] as number;
        if (roll < 0) return i;
      }
      return weights.length - 1; // 浮点兜底
    },
    shuffle: <T,>(items: readonly T[]): T[] => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [out[i], out[j]] = [out[j] as T, out[i] as T];
      }
      return out;
    },
    getState: () => state,
  };
}

/**
 * 从已有状态恢复——用于存档中途续局，或从崩溃报告里复现。
 * 与 createRng 的区别仅在语义（seed 是初值，state 是运行中的值）。
 */
export function restoreRng(state: number): Rng {
  return createRng(state);
}

/**
 * 生成一个新的随机种子。这是**唯一**允许非确定性的地方：
 * 新开一局时需要一个真随机起点，之后整局都由它确定。
 * 用时间戳而非 Math.random()，保持 core/ 无外部随机依赖。
 */
export function createRandomSeed(): number {
  return (Date.now() ^ (Date.now() << 13)) >>> 0;
}
