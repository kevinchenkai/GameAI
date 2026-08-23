import { LEVEL_CURVE } from '../src/game/config/levelCurve';
import { generateLevel } from '../src/game/core/LevelGenerator';
import { levelToGameState } from '../src/game/core/LevelValidation';
import { simulateLevel } from '../src/game/core/Simulator';

const TRIALS = 200;
const MAX_VARIANTS = 1_500;
const TARGET_FAIL_RATES: Readonly<Record<number, number>> = {
  6: 0.08,
  7: 0.1,
  8: 0.12,
  9: 0.14,
  10: 0.18,
  11: 0.2,
  12: 0.22,
  13: 0.24,
  14: 0.25,
  15: 0.26,
  16: 0.28,
  17: 0.3,
  18: 0.32,
  19: 0.33,
  20: 0.34,
};

interface Candidate {
  seed: number;
  greedyFailRate: number;
  cautiousFailRate: number;
  variant: number;
}

let previousFailRate = 0.045;
for (const entry of LEVEL_CURVE.filter(({ kind }) => kind === 'generated')) {
  const target = TARGET_FAIL_RATES[entry.id];
  if (target === undefined) throw new Error(`missing difficulty target for level ${entry.id}`);
  let best: Candidate | null = null;
  for (let variant = 0; variant < MAX_VARIANTS; variant += 1) {
    const seed = 73_001 + entry.id * 9_973 + variant * 7_919;
    try {
      const state = levelToGameState(generateLevel(entry, seed));
      const simulationSeed = entry.id * 1000 + 17;
      const greedy = simulateLevel(state, 'greedy', TRIALS, simulationSeed);
      if (
        greedy.failRate < previousFailRate ||
        greedy.failRate > 0.35 ||
        greedy.failRate - previousFailRate > 0.12
      ) {
        continue;
      }
      if (
        best !== null &&
        Math.abs(best.greedyFailRate - target) <= Math.abs(greedy.failRate - target)
      ) {
        continue;
      }
      const cautious = simulateLevel(state, 'cautious', TRIALS, simulationSeed);
      best = {
        seed,
        greedyFailRate: greedy.failRate,
        cautiousFailRate: cautious.failRate,
        variant,
      };
      if (greedy.failRate === target) break;
    } catch {
      // Some seeds cannot pack the requested depthSpread; continue within the same spread.
    }
  }
  if (best === null) {
    console.error(`L${entry.id}: no monotonic candidate within ${MAX_VARIANTS} variants`);
    process.exitCode = 1;
    continue;
  }
  console.log(
    `L${entry.id}: spread=${entry.targetDepthSpread} seed=${best.seed} ` +
      `greedy=${(best.greedyFailRate * 100).toFixed(1)}% ` +
      `cautious=${(best.cautiousFailRate * 100).toFixed(1)}% variant=${best.variant}`,
  );
  previousFailRate = best.greedyFailRate;
}
