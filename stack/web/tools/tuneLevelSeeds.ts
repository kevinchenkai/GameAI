import { LEVEL_CURVE } from '../src/game/config/levelCurve';
import { generateLevel } from '../src/game/core/LevelGenerator';
import { levelToGameState } from '../src/game/core/LevelValidation';
import { simulateLevel } from '../src/game/core/Simulator';

const SCREEN_TRIALS = 200;
const VERIFICATION_TRIALS = 1000;
const MAX_VARIANTS = 5_000;
const TRIAL_SEEDS = [17, 137, 911] as const;

interface Candidate {
  seed: number;
  greedyFailRates: number[];
  cautiousFailRate: number;
  variant: number;
}

let previousFailRates = [0.028, 0.035, 0.024];
for (const entry of LEVEL_CURVE.filter(({ kind }) => kind === 'generated')) {
  const target = entry.targetGreedyFailRate;
  if (target === undefined) throw new Error(`missing difficulty target for level ${entry.id}`);
  let best: Candidate | null = null;
  for (let variant = 0; variant < MAX_VARIANTS; variant += 1) {
    const seed = 73_001 + entry.id * 9_973 + variant * 7_919;
    try {
      const state = levelToGameState(generateLevel(entry, seed));
      const screen = simulateLevel(
        state,
        'greedy',
        SCREEN_TRIALS,
        entry.id * 1000 + TRIAL_SEEDS[0],
      );
      if (Math.abs(screen.failRate - target) > 0.05) {
        continue;
      }
      const greedyFailRates: number[] = [];
      let stable = true;
      for (let seedIndex = 0; seedIndex < TRIAL_SEEDS.length; seedIndex += 1) {
        const trialSeed = TRIAL_SEEDS[seedIndex];
        const previous = previousFailRates[seedIndex];
        if (trialSeed === undefined || previous === undefined) throw new Error('trial seed mismatch');
        const greedy = simulateLevel(
          state,
          'greedy',
          VERIFICATION_TRIALS,
          entry.id * 1000 + trialSeed,
        );
        if (
          Math.abs(greedy.failRate - target) > 0.03 ||
          greedy.failRate < previous ||
          greedy.failRate > 0.35 ||
          greedy.failRate - previous > 0.12
        ) {
          stable = false;
          break;
        }
        greedyFailRates.push(greedy.failRate);
      }
      if (!stable || greedyFailRates.length !== TRIAL_SEEDS.length) continue;
      const cautious = simulateLevel(
        state,
        'cautious',
        VERIFICATION_TRIALS,
        entry.id * 1000 + TRIAL_SEEDS[0],
      );
      best = {
        seed,
        greedyFailRates,
        cautiousFailRate: cautious.failRate,
        variant,
      };
      break;
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
      `greedy=[${best.greedyFailRates.map((rate) => `${(rate * 100).toFixed(1)}%`).join(', ')}] ` +
      `cautious=${(best.cautiousFailRate * 100).toFixed(1)}% variant=${best.variant}`,
  );
  previousFailRates = best.greedyFailRates;
}
