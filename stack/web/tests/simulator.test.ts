import { describe, expect, it } from 'vitest';
import { createDemoState } from '../src/game/config/demoLevel';
import { SIMULATION } from '../src/game/config/tuning';
import { applyPickToState } from '../src/game/core/rules/applyPick';
import { canPick } from '../src/game/core/rules/canPick';
import { SeededRandom } from '../src/game/core/SeededRandom';
import {
  SIMULATOR_APPLY_PICK,
  SIMULATOR_CAN_PICK,
  chooseBotMove,
  exceedsGreedyBuildThreshold,
  simulateLevel,
  simulateRun,
} from '../src/game/core/Simulator';

describe('Simulator', () => {
  it('V0.3.3 每种策略固定使用 1000 次样本', () => {
    expect(SIMULATION.trialsPerStrategy).toBe(1000);
  });

  it('Simulator 与 Game/RuleEngine 使用同一套规则函数引用', () => {
    expect(SIMULATOR_APPLY_PICK).toBe(applyPickToState);
    expect(SIMULATOR_CAN_PICK).toBe(canPick);
  });

  it('Random / Greedy / Cautious 都会返回合法动作', () => {
    const state = createDemoState();
    for (const strategy of ['random', 'greedy', 'cautious'] as const) {
      const selected = chooseBotMove(state, strategy, new SeededRandom(17));
      expect(selected).not.toBeNull();
      expect(selected === null ? false : canPick(state, selected)).toBe(true);
    }
  });

  it('Greedy 在 Demo 教学关可稳定通关', () => {
    const result = simulateRun(createDemoState(), 'greedy', new SeededRandom(23));
    expect(result.won).toBe(true);
    expect(result.failed).toBe(false);
  });

  it('输出三种 Bot 所需的难度统计字段', () => {
    for (const strategy of ['random', 'greedy', 'cautious'] as const) {
      const stats = simulateLevel(createDemoState(), strategy, 40, 91);
      expect(stats.trials).toBe(40);
      expect(stats.failRate).toBeGreaterThanOrEqual(0);
      expect(stats.failRate).toBeLessThanOrEqual(1);
      expect(stats.avgMaxTray).toBeGreaterThan(0);
      expect(stats.p95MaxTray).toBeGreaterThanOrEqual(stats.avgMaxTray);
      expect(stats.avgDistinctTrayTypes).toBeGreaterThan(0);
      expect(stats.avgMoves).toBeGreaterThan(0);
    }
  });

  it('V0.3.2 阈值边界：L1~5 可等于 5%，L6~20 可等于 35%', () => {
    expect(exceedsGreedyBuildThreshold(5, 0.05)).toBe(false);
    expect(exceedsGreedyBuildThreshold(5, 0.051)).toBe(true);
    expect(exceedsGreedyBuildThreshold(6, 0.35)).toBe(false);
    expect(exceedsGreedyBuildThreshold(6, 0.351)).toBe(true);
  });
});
