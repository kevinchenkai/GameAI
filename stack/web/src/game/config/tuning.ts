export const GAMEPLAY = {
  traySize: 7,
  matchSize: 3,
  columnCount: 6,
  maxColumnDepth: 12,
  maxLevelCapacityRatio: 0.88,
  undoLimit: -1,
  shuffleLimit: 3,
} as const;

export const ANIMATION = {
  tapDownMs: 80,
  tapUpMs: 90,
  jumpMs: 270,
  trayShiftMs: 120,
  matchMs: 220,
  shuffleMs: 500,
  trayWarningCycleMs: 1200,
  trayShakeMs: 80,
  resultDelayMs: 300,
} as const;

export const UNDO = {
  maxSnapshots: 120,
  persistedSnapshots: 5,
} as const;

export const SOLVER_TUNING = {
  maxNodes: 2_000_000,
  runtimeMaxNodes: 200_000,
} as const;

export const SHUFFLE_TUNING = {
  maxAttempts: 50,
  workerTimeoutMs: 400,
} as const;

export const SIMULATION = {
  trialsPerStrategy: 1000,
  maxMoveMultiplier: 2,
  seedStride: 7_919,
  tutorialMaxGreedyFailRate: 0.05,
  standardMaxGreedyFailRate: 0.35,
  adjacentFailRateWarningDelta: 0.12,
  monotonicTolerance: 0.05,
  cautiousDistinctWeight: 100,
  cautiousTrayWeight: 10,
  cautiousNewTypePenalty: 20,
  cautiousMatchReward: 50,
} as const;
