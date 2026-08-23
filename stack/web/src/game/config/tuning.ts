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
  tapMs: 80,
  settleMs: 140,
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
  trialsPerStrategy: 200,
  maxMoveMultiplier: 2,
  seedStride: 7_919,
  tutorialMaxGreedyFailRate: 0.05,
  standardMaxGreedyFailRate: 0.35,
  adjacentFailRateWarningDelta: 0.12,
  cautiousDistinctWeight: 100,
  cautiousTrayWeight: 10,
  cautiousNewTypePenalty: 20,
  cautiousMatchReward: 50,
} as const;
