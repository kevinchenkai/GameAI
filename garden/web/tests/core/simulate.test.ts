/**
 * simulate 单测 —— 模拟器本身也要被测
 *
 * ★ 模拟器是调优的**唯一依据**。它自己算错了，30 关的数值就全建在沙子上。
 */

import { describe, expect, it } from 'vitest';
import { formatReport, simulateLevel } from '../../src/core/simulate';
import { LEVELS, getLevel } from '../../src/config/levels/index';
import { makeLevel } from './helpers';

/**
 * ★ runs 刻意取小：单测要验证的是**模拟器逻辑正确**，
 *   不是得到统计上精确的通过率（那是 npm run simulate 的事）。
 *   runs 开大只会让 npm test 变慢，不会让结论更可靠。
 */
const OPTS = { runs: 12, ai: 'greedy' as const, seed: 4242 };

describe('simulateLevel —— 基本性质', () => {
  it('★ 同种子跑两次结果完全一致（可复现）', () => {
    const level = getLevel(1) as NonNullable<ReturnType<typeof getLevel>>;
    const a = simulateLevel(level, OPTS);
    const b = simulateLevel(level, OPTS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('不同种子结果可以不同（不是写死的常数）', () => {
    const level = getLevel(8) as NonNullable<ReturnType<typeof getLevel>>;
    const a = simulateLevel(level, { ...OPTS, runs: 16, seed: 1 });
    const b = simulateLevel(level, { ...OPTS, runs: 16, seed: 99999 });
    // 通过率或平均剩余步至少有一项不同
    expect(a.winRate !== b.winRate || a.avgMovesLeft !== b.avgMovesLeft).toBe(true);
  });

  it('winRate / deadlockRate 落在 [0,1]', () => {
    for (const level of LEVELS) {
      const r = simulateLevel(level, { ...OPTS, runs: 6 });
      expect(r.winRate).toBeGreaterThanOrEqual(0);
      expect(r.winRate).toBeLessThanOrEqual(1);
      expect(r.deadlockRate).toBeGreaterThanOrEqual(0);
      expect(r.deadlockRate).toBeLessThanOrEqual(1);
    }
  });

  it('星级分布之和为 1（有通关局时）', () => {
    const level = getLevel(1) as NonNullable<ReturnType<typeof getLevel>>;
    const r = simulateLevel(level, OPTS);
    if (r.winRate > 0) {
      const sum = r.ratingDist[1] + r.ratingDist[2] + r.ratingDist[3];
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it('runs=0 不崩，各项为 0', () => {
    const r = simulateLevel(makeLevel(), { ...OPTS, runs: 0 });
    expect(r.winRate).toBe(0);
    expect(r.avgMovesLeft).toBe(0);
  });
});

describe('★ 必输 / 必赢关卡的行为', () => {
  it('目标高到不可能完成 → 通过率 0，且报告指出还差多少', () => {
    const impossible = makeLevel({
      moves: 5,
      objectives: [{ kind: 'collect', piece: 'red', count: 9999 }],
      stars: { two: 1, three: 3 },
    });
    const r = simulateLevel(impossible, OPTS);
    expect(r.winRate).toBe(0);
    expect(r.avgRemaining['collect:red']).toBeGreaterThan(0);
    expect(r.suggestions.join(' ')).toMatch(/偏低/);
  });

  it('目标低到一步就完成 → 通过率 100%', () => {
    const trivial = makeLevel({
      moves: 20,
      objectives: [{ kind: 'collect', piece: 'red', count: 1 }],
      stars: { two: 5, three: 10 },
    });
    expect(simulateLevel(trivial, OPTS).winRate).toBe(1);
  });
});

describe('AI 策略', () => {
  it('★ 贪心 AI 的通过率不低于随机 AI —— 否则"贪心"的定义就错了', () => {
    const level = getLevel(8) as NonNullable<ReturnType<typeof getLevel>>;
    const greedy = simulateLevel(level, { runs: 24, ai: 'greedy', seed: 7 });
    const random = simulateLevel(level, { runs: 24, ai: 'random', seed: 7 });
    expect(greedy.winRate).toBeGreaterThanOrEqual(random.winRate);
  });
});

describe('调优建议', () => {
  it('新手关（id ≤ 5）不因"太简单"报警', () => {
    const r = simulateLevel(getLevel(1) as NonNullable<ReturnType<typeof getLevel>>, OPTS);
    expect(r.suggestions.join(' ')).not.toMatch(/偏高/);
  });

  it('非新手关通过率过高会报警', () => {
    const tooEasy = makeLevel({
      id: 20,
      moves: 30,
      objectives: [{ kind: 'collect', piece: 'red', count: 1 }],
      stars: { two: 5, three: 10 },
    });
    expect(simulateLevel(tooEasy, OPTS).suggestions.join(' ')).toMatch(/偏高/);
  });

  it('建议永远非空（不会静默什么都不说）', () => {
    for (const level of LEVELS) {
      expect(simulateLevel(level, { ...OPTS, runs: 6 }).suggestions.length).toBeGreaterThan(0);
    }
  });
});

describe('formatReport', () => {
  it('含关键指标，可读', () => {
    const text = formatReport(
      simulateLevel(getLevel(1) as NonNullable<ReturnType<typeof getLevel>>, OPTS),
    );
    expect(text).toMatch(/通过率/);
    expect(text).toMatch(/死局率/);
    expect(text).toMatch(/星级分布/);
  });
});

/**
 * ★ 回归测试：这三条锁住的是模拟器**真的跑通了玩法**，
 *   而不是"跑完 0 局也返回 0%"这种假通过。
 */
describe('★ 回归：曾经的两个真实 bug', () => {
  it('带障碍的关卡，障碍确实被放到了盘上（否则破障目标永远 0%）', () => {
    const iceLevel = getLevel(4) as NonNullable<ReturnType<typeof getLevel>>;
    expect((iceLevel.obstacles ?? []).length).toBeGreaterThan(0);
    // 通过率显著大于 0 就证明冰确实存在且能被打掉
    expect(simulateLevel(iceLevel, { ...OPTS, runs: 20 }).winRate).toBeGreaterThan(0.5);
  });

  it('★ 冰能被打掉（初版"冰封锁棋子"时这里恒为 0%）', () => {
    const iceLevel = getLevel(8) as NonNullable<ReturnType<typeof getLevel>>;
    const r = simulateLevel(iceLevel, { ...OPTS, runs: 20 });
    expect(r.winRate).toBeGreaterThan(0.3);
  });
});
