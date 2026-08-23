import { SIMULATION } from '../src/game/config/tuning';
import { levelToGameState } from '../src/game/core/LevelValidation';
import {
  exceedsGreedyBuildThreshold,
  simulateLevel,
  type BotStrategy,
} from '../src/game/core/Simulator';
import { loadLevels } from './loadLevels';

const STRATEGIES: readonly BotStrategy[] = ['random', 'greedy', 'cautious'];

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function main(): void {
  const levels = loadLevels();
  let failedThreshold = false;
  let differentiatedLevels = 0;
  let previousGreedyFailRate: number | null = null;

  for (const { level } of levels) {
    const state = levelToGameState(level);
    console.log(`Level ${level.id} · ${level.name}`);
    const stats = STRATEGIES.map((strategy) =>
      simulateLevel(state, strategy, SIMULATION.trialsPerStrategy, level.id * 1000 + 17),
    );
    for (const result of stats) {
      console.log(
        `  ${result.strategy.padEnd(8)} fail=${percent(result.failRate)} ` +
          `avgMaxTray=${result.avgMaxTray.toFixed(2)} p95=${result.p95MaxTray} ` +
          `distinct=${result.avgDistinctTrayTypes.toFixed(2)} moves=${result.avgMoves.toFixed(2)}`,
      );
    }
    const greedy = stats.find((result) => result.strategy === 'greedy');
    const cautious = stats.find((result) => result.strategy === 'cautious');
    if (
      level.id >= 6 &&
      greedy !== undefined &&
      cautious !== undefined &&
      Math.abs(greedy.failRate - cautious.failRate) >= 0.02
    ) {
      differentiatedLevels += 1;
    }
    const tutorialLevel = level.id <= 5;
    const threshold = tutorialLevel
      ? SIMULATION.tutorialMaxGreedyFailRate
      : SIMULATION.standardMaxGreedyFailRate;
    if (greedy === undefined || exceedsGreedyBuildThreshold(level.id, greedy.failRate)) {
      failedThreshold = true;
      console.error(
        `  BUILD FAIL: Greedy must be at or below ${percent(threshold)}`,
      );
    }
    if (greedy !== undefined && previousGreedyFailRate !== null) {
      const delta = greedy.failRate - previousGreedyFailRate;
      if (delta < 0) {
        failedThreshold = true;
        console.error(`  BUILD FAIL: Greedy curve decreased by ${percent(-delta)}`);
      } else if (delta > SIMULATION.adjacentFailRateWarningDelta) {
        console.warn(`  WARNING: Greedy curve jumped ${(delta * 100).toFixed(1)}pp`);
      }
    }
    if (greedy !== undefined) previousGreedyFailRate = greedy.failRate;
  }

  console.log(`${differentiatedLevels}/15 generated levels separate Greedy and Cautious by >=2pp`);
  if (differentiatedLevels < 5) {
    failedThreshold = true;
    console.error('  BUILD FAIL: Greedy and Cautious must materially diverge on real levels');
  }
  if (failedThreshold) process.exitCode = 1;
}

main();
