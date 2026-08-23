import { SIMULATION } from '../config/tuning';
import type { GameState } from '../types/game';
import type { TileType } from '../types/tile';
import { cloneState } from './cloneState';
import { applyPickToState } from './rules/applyPick';
import { canPick } from './rules/canPick';
import { SeededRandom } from './SeededRandom';

export type BotStrategy = 'random' | 'greedy' | 'cautious';

export interface SimulationRun {
  won: boolean;
  failed: boolean;
  moves: number;
  maxTray: number;
  maxDistinctTrayTypes: number;
}

export interface SimulationStats {
  strategy: BotStrategy;
  trials: number;
  failRate: number;
  avgMaxTray: number;
  p95MaxTray: number;
  avgDistinctTrayTypes: number;
  avgMoves: number;
}

export const SIMULATOR_APPLY_PICK = applyPickToState;
export const SIMULATOR_CAN_PICK = canPick;

function trayCounts(state: GameState): Map<TileType, number> {
  const counts = new Map<TileType, number>();
  for (const tile of state.tray) counts.set(tile.type, (counts.get(tile.type) ?? 0) + 1);
  return counts;
}

function distinctTrayTypes(state: GameState): number {
  return new Set(state.tray.map((tile) => tile.type)).size;
}

function legalColumns(state: GameState): number[] {
  return state.columns.flatMap((_column, index) => (SIMULATOR_CAN_PICK(state, index) ? [index] : []));
}

function topType(state: GameState, columnIndex: number): TileType | null {
  const column = state.columns[columnIndex];
  return column?.[column.length - 1]?.type ?? null;
}

function randomChoice(candidates: readonly number[], rng: SeededRandom): number | null {
  if (candidates.length === 0) return null;
  return candidates[rng.nextInt(candidates.length)] ?? null;
}

function matchingColumns(
  state: GameState,
  legal: readonly number[],
  predicate: (type: TileType) => boolean,
): number[] {
  return legal.filter((columnIndex) => {
    const type = topType(state, columnIndex);
    return type !== null && predicate(type);
  });
}

function greedyCandidates(state: GameState, legal: readonly number[]): number[] {
  const counts = trayCounts(state);
  const completesTriple = matchingColumns(state, legal, (type) => (counts.get(type) ?? 0) === 2);
  if (completesTriple.length > 0) return completesTriple;

  const extendsGroup = matchingColumns(state, legal, (type) => (counts.get(type) ?? 0) === 1);
  if (extendsGroup.length > 0) return extendsGroup;

  const topCounts = new Map<TileType, number>();
  for (const columnIndex of legal) {
    const type = topType(state, columnIndex);
    if (type !== null) topCounts.set(type, (topCounts.get(type) ?? 0) + 1);
  }
  const visibleTriple = matchingColumns(state, legal, (type) => (topCounts.get(type) ?? 0) >= 3);
  return visibleTriple.length > 0 ? visibleTriple : [...legal];
}

function chooseGreedy(state: GameState, legal: readonly number[], rng: SeededRandom): number | null {
  return randomChoice(greedyCandidates(state, legal), rng);
}

function chooseCautious(state: GameState, legal: readonly number[], rng: SeededRandom): number | null {
  const currentTypes = new Set(state.tray.map((tile) => tile.type));
  const scored = greedyCandidates(state, legal).map((columnIndex) => {
    const type = topType(state, columnIndex);
    const result = SIMULATOR_APPLY_PICK(state, columnIndex);
    const next = result.nextState;
    const nextCounts = trayCounts(next);
    const exposedType = topType(next, columnIndex);
    const exposedTrayCount = exposedType === null ? 0 : (nextCounts.get(exposedType) ?? 0);
    const exposedSupport = exposedType === null
      ? 0
      : next.columns.filter((_column, index) => topType(next, index) === exposedType).length;
    const score =
      distinctTrayTypes(next) * SIMULATION.cautiousDistinctWeight +
      next.tray.length * SIMULATION.cautiousTrayWeight +
      (type !== null && !currentTypes.has(type) ? SIMULATION.cautiousNewTypePenalty : 0) -
      result.matches.length * SIMULATION.cautiousMatchReward -
      exposedTrayCount * 12 -
      exposedSupport * 4;
    return { columnIndex, score };
  });
  const bestScore = Math.min(...scored.map((candidate) => candidate.score));
  return randomChoice(
    scored.filter((candidate) => candidate.score === bestScore).map((candidate) => candidate.columnIndex),
    rng,
  );
}

export function chooseBotMove(
  state: GameState,
  strategy: BotStrategy,
  rng: SeededRandom,
): number | null {
  const legal = legalColumns(state);
  if (strategy === 'random') return randomChoice(legal, rng);
  if (strategy === 'greedy') return chooseGreedy(state, legal, rng);
  return chooseCautious(state, legal, rng);
}

export function simulateRun(
  initialState: GameState,
  strategy: BotStrategy,
  rng: SeededRandom,
): SimulationRun {
  let state = cloneState(initialState);
  let maxTray = state.tray.length;
  let maxDistinctTrayTypes = distinctTrayTypes(state);
  const totalTiles = state.columns.reduce((sum, column) => sum + column.length, 0);
  const maxMoves = totalTiles * SIMULATION.maxMoveMultiplier;

  while (state.status === 'playing' && state.moveCount < maxMoves) {
    const columnIndex = chooseBotMove(state, strategy, rng);
    if (columnIndex === null) break;
    state = SIMULATOR_APPLY_PICK(state, columnIndex).nextState;
    maxTray = Math.max(maxTray, state.tray.length);
    maxDistinctTrayTypes = Math.max(maxDistinctTrayTypes, distinctTrayTypes(state));
  }

  return {
    won: state.status === 'won',
    failed: state.status !== 'won',
    moves: state.moveCount,
    maxTray,
    maxDistinctTrayTypes,
  };
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index] ?? 0;
}

export function simulateLevel(
  initialState: GameState,
  strategy: BotStrategy,
  trials: number = SIMULATION.trialsPerStrategy,
  seed: number = initialState.levelId * 1000 + 1,
): SimulationStats {
  const runs = Array.from({ length: trials }, (_, trial) =>
    simulateRun(initialState, strategy, new SeededRandom(seed + trial * SIMULATION.seedStride)),
  );
  return {
    strategy,
    trials,
    failRate: runs.filter((run) => run.failed).length / trials,
    avgMaxTray: average(runs.map((run) => run.maxTray)),
    p95MaxTray: percentile95(runs.map((run) => run.maxTray)),
    avgDistinctTrayTypes: average(runs.map((run) => run.maxDistinctTrayTypes)),
    avgMoves: average(runs.map((run) => run.moves)),
  };
}

export function exceedsGreedyBuildThreshold(levelId: number, failRate: number): boolean {
  return levelId <= 5
    ? failRate > SIMULATION.tutorialMaxGreedyFailRate
    : failRate > SIMULATION.standardMaxGreedyFailRate;
}
