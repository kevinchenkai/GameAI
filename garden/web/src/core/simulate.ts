/**
 * core/simulate.ts —— 关卡可解性模拟器（框架 §11.3）
 *
 * ★ **这个工具应该在写关卡之前先做。**
 *   手工试关一关 5 分钟，30 关调 3 轮 = 7.5 小时；模拟器 30 秒跑完。
 *   这是 30 关调优的刚需工具，也是 `core/` 零 Phaser 依赖的最大回报 ——
 *   没有那条契约，这个文件根本跑不起来。
 *
 * ★ 放在 core/ 而不是 tools/：这样它能被单测覆盖。
 *   tools/simulate.ts 只做命令行参数解析与输出格式化。
 */

import { applyMove } from './resolver';
import { createSession, type SessionState } from './session';
import { findAllValidMoves } from './matcher';
import { createRng, type Rng } from './rng';
import { objectiveKey } from './objective';
import type { LevelConfig, Move } from './types';

export type AiKind = 'random' | 'greedy';

export interface SimOptions {
  readonly runs: number;
  readonly ai: AiKind;
  readonly seed: number;
}

export interface SimReport {
  readonly levelId: number;
  readonly runs: number;
  /** 通过率 0~1 */
  readonly winRate: number;
  /** 通关局的平均剩余步数 */
  readonly avgMovesLeft: number;
  /** 出现死局 shuffle 的局数占比 */
  readonly deadlockRate: number;
  /** 各星级占比（仅统计通关局） */
  readonly ratingDist: Readonly<Record<1 | 2 | 3, number>>;
  /** 失败局里各目标平均还差多少 —— 直接指出难在哪 */
  readonly avgRemaining: Readonly<Record<string, number>>;
  /** 调优建议 */
  readonly suggestions: readonly string[];
}

/**
 * 贪心 AI：优先选**消除最多**的一步。
 *
 * ★ 为什么不用纯随机（框架 §11.3 说"随机 AI 或简单贪心"）：
 *   纯随机 AI 的通过率会**显著低于真人**，据此调出来的关卡对真人过于简单。
 *   贪心更接近真人的直觉（人也倾向于挑看起来消得多的），
 *   数据更有参考价值。
 *
 * ⚠️ 但贪心仍然**不等于真人**：它不会为了目标色而放弃更大的消除。
 *   所以模拟器给的是**相对**参考（哪关明显更难），不是绝对通过率。
 */
function pickMove(session: SessionState, moves: readonly Move[], ai: AiKind, rng: Rng): Move {
  if (ai === 'random' || moves.length === 1) return rng.pick(moves);

  let best = moves[0] as Move;
  let bestScore = -1;
  for (const m of moves) {
    // 试算这一步能消多少 —— applyMove 是纯函数，试算零成本
    const r = applyMove(session, m);
    let score = 0;
    for (const e of r.events) {
      if (e.t === 'match') score += e.positions.length;
      if (e.t === 'specialFire') score += e.affected.length;
      // 生成特殊棋子有额外价值（真人也会刻意去凑）
      if (e.t === 'specialSpawn') score += 5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/** 跑一局，返回结局 */
function playOnce(
  level: LevelConfig,
  seed: number,
  ai: AiKind,
): {
  result: SessionState['result'];
  movesLeft: number;
  rating: 1 | 2 | 3 | null;
  hadDeadlock: boolean;
  remaining: Readonly<Record<string, number>>;
} {
  let s = createSession(level, seed);
  const rng = createRng(seed ^ 0x9e3779b9);
  let hadDeadlock = false;
  let rating: 1 | 2 | 3 | null = null;
  let remaining: Record<string, number> = {};

  // 上限设为步数的 2 倍：正常一步一回合，留足余量防死循环
  for (let turn = 0; turn < level.moves * 2 + 10; turn++) {
    if (s.result !== 'continue') break;
    const moves = findAllValidMoves(s.board);
    if (moves.length === 0) break;

    const r = applyMove(s, pickMove(s, moves, ai, rng));
    for (const e of r.events) {
      if (e.t === 'shuffle') hadDeadlock = true;
      if (e.t === 'levelWin') rating = e.rating;
      if (e.t === 'levelLose') remaining = { ...e.remaining };
    }
    s = r.session;
  }

  return { result: s.result, movesLeft: s.movesLeft, rating, hadDeadlock, remaining };
}

export function simulateLevel(level: LevelConfig, options: SimOptions): SimReport {
  const { runs, ai, seed } = options;
  let wins = 0;
  let movesLeftSum = 0;
  let deadlocks = 0;
  const ratings: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  const remainingSum: Record<string, number> = {};
  let losses = 0;

  for (let i = 0; i < runs; i++) {
    const r = playOnce(level, seed + i, ai);
    if (r.hadDeadlock) deadlocks++;
    if (r.result === 'win') {
      wins++;
      movesLeftSum += r.movesLeft;
      if (r.rating) ratings[r.rating]++;
    } else {
      losses++;
      for (const [k, v] of Object.entries(r.remaining)) {
        remainingSum[k] = (remainingSum[k] ?? 0) + v;
      }
    }
  }

  const winRate = runs === 0 ? 0 : wins / runs;
  const avgRemaining: Record<string, number> = {};
  for (const o of level.objectives) {
    const k = objectiveKey(o);
    avgRemaining[k] = losses === 0 ? 0 : (remainingSum[k] ?? 0) / losses;
  }

  return {
    levelId: level.id,
    runs,
    winRate,
    avgMovesLeft: wins === 0 ? 0 : movesLeftSum / wins,
    deadlockRate: runs === 0 ? 0 : deadlocks / runs,
    ratingDist: {
      1: wins === 0 ? 0 : ratings[1] / wins,
      2: wins === 0 ? 0 : ratings[2] / wins,
      3: wins === 0 ? 0 : ratings[3] / wins,
    },
    avgRemaining,
    suggestions: buildSuggestions(level, {
      winRate,
      avgMovesLeft: wins === 0 ? 0 : movesLeftSum / wins,
      deadlockRate: runs === 0 ? 0 : deadlocks / runs,
      avgRemaining,
      threeStarRate: wins === 0 ? 0 : ratings[3] / wins,
    }),
  };
}

/**
 * 目标通过率区间。
 * ★ 低压力定位（策划案）：宁可偏简单，也不要让 50+ 用户卡关。
 *   但也不能全是 90%+，那样 8~15 岁玩家会觉得没挑战。
 */
const TARGET_WIN_RATE = { min: 0.55, max: 0.85 } as const;

/**
 * ★ 新手关（前 N 关）**刻意做成接近 100%**，不按上面的区间报警。
 *
 * 理由：50+ 用户在前几关就失败会直接流失，而那时他们还没建立起
 * 「这游戏我玩得来」的信心。策划案的低压力定位要求这里零挫败。
 * 把它写成常量而不是让每次都手动忽略警告 —— 否则真正的问题会淹没在噪音里。
 */
const TUTORIAL_LEVEL_MAX_ID = 5;

function buildSuggestions(
  level: LevelConfig,
  stats: {
    winRate: number;
    avgMovesLeft: number;
    deadlockRate: number;
    avgRemaining: Readonly<Record<string, number>>;
    threeStarRate: number;
  },
): string[] {
  const out: string[] = [];
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  const isTutorial = level.id <= TUTORIAL_LEVEL_MAX_ID;

  // 新手关只查"是不是太难"和死局，不查"是不是太简单"
  if (isTutorial) {
    if (stats.winRate < 0.9) {
      out.push(
        `新手关通过率 ${pct(stats.winRate)} 偏低 → 前 ${TUTORIAL_LEVEL_MAX_ID} 关应接近 100%，` +
          '50+ 用户在这里失败会直接流失',
      );
    }
    if (stats.deadlockRate > 0.05) {
      out.push(`死局率 ${pct(stats.deadlockRate)} 偏高 → 新手关不该出现棋盘自动重排`);
    }
    if (out.length === 0) out.push(`新手关（通过率 ${pct(stats.winRate)}），符合预期`);
    return out;
  }

  if (stats.winRate < TARGET_WIN_RATE.min) {
    // 指出到底难在哪个目标
    const worst = Object.entries(stats.avgRemaining).sort((a, b) => b[1] - a[1])[0];
    const hint = worst && worst[1] > 0 ? `（失败局平均还差 ${worst[0]} ${worst[1].toFixed(1)} 个）` : '';
    out.push(
      `通过率 ${pct(stats.winRate)} 偏低${hint} → 建议 +2 步，或减 1 色，或降低目标数量`,
    );
  } else if (stats.winRate > TARGET_WIN_RATE.max) {
    out.push(`通过率 ${pct(stats.winRate)} 偏高 → 建议 −2 步，或加 1 色，或提高目标数量`);
  }

  if (stats.deadlockRate > 0.05) {
    out.push(
      `死局率 ${pct(stats.deadlockRate)} 偏高 → 颜色可能太少或洞太碎，玩家会频繁看到棋盘自动重排`,
    );
  }

  if (stats.winRate >= TARGET_WIN_RATE.min && stats.threeStarRate > 0.8) {
    out.push(
      `三星率 ${pct(stats.threeStarRate)} 过高 → stars.three(${level.stars.three}) 建议调高，否则评级失去区分度`,
    );
  }
  if (stats.winRate >= TARGET_WIN_RATE.min && stats.threeStarRate < 0.05) {
    out.push(
      `三星率 ${pct(stats.threeStarRate)} 过低 → stars.three(${level.stars.three}) 建议调低，否则 8~15 岁玩家追不到`,
    );
  }

  if (out.length === 0) out.push('各项指标正常，无需调整');
  return out;
}

/** 格式化成人类可读的报告 */
export function formatReport(r: SimReport): string {
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  const lines = [
    `关卡 ${r.levelId}（${r.runs} 局）`,
    `  通过率     ${pct(r.winRate)}`,
    `  平均剩余步 ${r.avgMovesLeft.toFixed(1)}`,
    `  死局率     ${pct(r.deadlockRate)}`,
    `  星级分布   1★ ${pct(r.ratingDist[1])}  2★ ${pct(r.ratingDist[2])}  3★ ${pct(r.ratingDist[3])}`,
  ];
  const rem = Object.entries(r.avgRemaining).filter(([, v]) => v > 0);
  if (rem.length > 0) {
    lines.push(`  失败局平均还差 ${rem.map(([k, v]) => `${k}=${v.toFixed(1)}`).join('  ')}`);
  }
  for (const s of r.suggestions) lines.push(`  → ${s}`);
  return lines.join('\n');
}
