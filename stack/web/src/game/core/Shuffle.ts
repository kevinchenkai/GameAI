import { GAMEPLAY, SHUFFLE_TUNING, SOLVER_TUNING } from '../config/tuning';
import type { GameState } from '../types/game';
import { TILE_TYPES, type TileData, type TileType } from '../types/tile';
import { cloneState } from './cloneState';
import { resolveMatches } from './rules/resolveMatches';
import type { SeededRandom } from './SeededRandom';
import {
  SolverBudgetExceeded,
  canSolve,
  solverStateFromGame,
} from './Solver';

export type ShuffleStrategy = 'random' | 'safe' | 'timeout-safe';

export interface ShuffleResult {
  nextState: GameState;
  attempts: number;
  strategy: ShuffleStrategy;
}

export class SafeStateUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeStateUnavailable';
  }
}

function collectColumnTiles(state: GameState): TileData[] {
  return state.columns.flatMap((column) => column.map((tile) => ({ ...tile })));
}

function refillByHeights(state: GameState, tiles: readonly TileData[]): TileData[][] {
  let cursor = 0;
  return state.columns.map((column) => {
    const rebuilt = tiles.slice(cursor, cursor + column.length).map((tile) => ({ ...tile }));
    cursor += column.length;
    return rebuilt;
  });
}

function shuffledCandidate(state: GameState, rng: SeededRandom): GameState {
  const tiles = rng.shuffle(collectColumnTiles(state));
  return {
    ...cloneState(state),
    columns: refillByHeights(state, tiles),
    rngState: rng.getState(),
    status: 'playing',
  };
}

function tilePools(state: GameState): Map<TileType, TileData[]> {
  const pools = new Map<TileType, TileData[]>(TILE_TYPES.map((type) => [type, []]));
  for (const tile of collectColumnTiles(state)) pools.get(tile.type)?.push(tile);
  return pools;
}

function desiredSafePickTypes(state: GameState, pools: Map<TileType, TileData[]>): TileType[] {
  const trayCounts = new Map<TileType, number>(TILE_TYPES.map((type) => [type, 0]));
  for (const tile of state.tray) trayCounts.set(tile.type, (trayCounts.get(tile.type) ?? 0) + 1);

  const remaining = new Map<TileType, number>(
    TILE_TYPES.map((type) => [type, pools.get(type)?.length ?? 0]),
  );
  const desired: TileType[] = [];
  const existingTypes = [...TILE_TYPES].sort(
    (first, second) => (trayCounts.get(second) ?? 0) - (trayCounts.get(first) ?? 0),
  );

  for (const type of existingTypes) {
    const trayCount = trayCounts.get(type) ?? 0;
    if (trayCount === 0) continue;
    const needed = GAMEPLAY.matchSize - trayCount;
    const available = remaining.get(type) ?? 0;
    if (available < needed) {
      throw new SafeStateUnavailable(`Not enough ${type} tiles to resolve current tray`);
    }
    desired.push(...Array.from({ length: needed }, () => type));
    remaining.set(type, available - needed);
  }

  for (const type of TILE_TYPES) {
    const count = remaining.get(type) ?? 0;
    if (count % GAMEPLAY.matchSize !== 0) {
      throw new SafeStateUnavailable(`Remaining ${type} count is not divisible by three`);
    }
    desired.push(...Array.from({ length: count }, () => type));
  }

  return desired;
}

function verifySafePickSequence(state: GameState, desired: readonly TileType[]): void {
  let tray = state.tray.map((tile) => ({ ...tile }));
  desired.forEach((type, index) => {
    if (tray.length >= state.traySize) {
      throw new SafeStateUnavailable('Current tray cannot be rescued by any next pick');
    }
    tray.push({ id: `safe-sequence-${index}`, type });
    tray = resolveMatches(tray).tray;
  });
  if (tray.length !== 0) throw new SafeStateUnavailable('Safe sequence did not empty the tray');
}

function scheduleTypesByColumn(
  desired: readonly TileType[],
  heights: readonly number[],
): TileType[][] {
  const remainingSlots = [...heights];
  const pickOrderByColumn: TileType[][] = heights.map(() => []);
  let cursor = 0;

  for (const type of desired) {
    let selected = -1;
    for (let offset = 0; offset < heights.length; offset += 1) {
      const candidate = (cursor + offset) % heights.length;
      if ((remainingSlots[candidate] ?? 0) > 0) {
        selected = candidate;
        break;
      }
    }
    if (selected < 0) throw new SafeStateUnavailable('Column schedule ran out of slots');
    pickOrderByColumn[selected]?.push(type);
    remainingSlots[selected] = (remainingSlots[selected] ?? 0) - 1;
    cursor = (selected + 1) % heights.length;
  }

  return pickOrderByColumn.map((pickOrder) => [...pickOrder].reverse());
}

function takeTile(pools: Map<TileType, TileData[]>, type: TileType): TileData {
  const tile = pools.get(type)?.pop();
  if (tile === undefined) throw new SafeStateUnavailable(`Tile pool exhausted for ${type}`);
  return { ...tile };
}

export function generateSafeState(state: GameState): GameState {
  const pools = tilePools(state);
  const desired = desiredSafePickTypes(state, pools);
  verifySafePickSequence(state, desired);
  const scheduled = scheduleTypesByColumn(
    desired,
    state.columns.map((column) => column.length),
  );
  const columns = scheduled.map((column) => column.map((type) => takeTile(pools, type)));
  const nextState = {
    ...cloneState(state),
    columns,
    status: 'playing' as const,
  };
  if ([...pools.values()].some((pool) => pool.length > 0)) {
    throw new SafeStateUnavailable('Safe state did not consume every column tile');
  }
  return nextState;
}

export function findSolvableShuffle(
  state: GameState,
  rng: SeededRandom,
  maxAttempts: number = SHUFFLE_TUNING.maxAttempts,
): ShuffleResult {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidate = shuffledCandidate(state, rng);
    try {
      if (
        canSolve(solverStateFromGame(candidate), {
          maxNodes: SOLVER_TUNING.runtimeMaxNodes,
        })
      ) {
        return { nextState: candidate, attempts: attempt, strategy: 'random' };
      }
    } catch (error: unknown) {
      if (!(error instanceof SolverBudgetExceeded)) throw error;
    }
  }

  const safe = generateSafeState(state);
  if (
    !canSolve(solverStateFromGame(safe), {
      maxNodes: SOLVER_TUNING.runtimeMaxNodes,
    })
  ) {
    throw new SafeStateUnavailable('Constructed safe state failed Solver verification');
  }
  return {
    nextState: { ...safe, rngState: rng.getState() },
    attempts: maxAttempts,
    strategy: 'safe',
  };
}
