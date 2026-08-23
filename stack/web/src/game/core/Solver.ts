import { GAMEPLAY, SOLVER_TUNING } from '../config/tuning';
import type { GameState } from '../types/game';
import { TILE_TYPES, type TileType } from '../types/tile';
import { applyPickToState } from './rules/applyPick';

export interface SolverState {
  columns: TileType[][];
  tray: TileType[];
}

export interface SolutionStep {
  columnIndex: number;
  expectedTileType: TileType;
}

export interface SolverOptions {
  maxNodes?: number;
  useSymmetryPruning?: boolean;
}

export interface SolverResult {
  solvable: boolean;
  solution: SolutionStep[];
  nodesVisited: number;
}

export const SOLVER_APPLY_PICK = applyPickToState;

export class SolverBudgetExceeded extends Error {
  constructor(readonly nodesVisited: number, readonly maxNodes: number) {
    super(`Solver node budget exceeded: ${nodesVisited} > ${maxNodes}`);
    this.name = 'SolverBudgetExceeded';
  }
}

class NodeBudget {
  private count = 0;

  constructor(private readonly maximum: number) {}

  visit(): void {
    this.count += 1;
    if (this.count > this.maximum) throw new SolverBudgetExceeded(this.count, this.maximum);
  }

  get visited(): number {
    return this.count;
  }
}

export function cloneSolverState(state: SolverState): SolverState {
  return {
    columns: state.columns.map((column) => [...column]),
    tray: [...state.tray],
  };
}

export function solverStateFromGame(state: GameState): SolverState {
  return {
    columns: state.columns.map((column) => column.map((tile) => tile.type)),
    tray: state.tray.map((tile) => tile.type),
  };
}

function gameStateFromSolver(state: SolverState): GameState {
  return {
    levelId: 0,
    levelRevision: 0,
    columns: state.columns.map((column, columnIndex) =>
      column.map((type, depth) => ({ id: `solver-c${columnIndex}-d${depth}`, type })),
    ),
    tray: state.tray.map((type, index) => ({ id: `solver-tray-${index}`, type })),
    traySize: GAMEPLAY.traySize,
    moveCount: 0,
    combo: 0,
    undoUsed: 0,
    shuffleUsed: 0,
    rngState: 1,
    status: 'playing',
  };
}

export function applySolverPick(state: SolverState, columnIndex: number): SolverState {
  const result = SOLVER_APPLY_PICK(gameStateFromSolver(state), columnIndex);
  return solverStateFromGame(result.nextState);
}

export function hashState(state: SolverState): string {
  const columns = state.columns
    .filter((column) => column.length > 0)
    .map((column) => column.join(','))
    .sort();
  const tray = [...state.tray].sort();
  return `${columns.join('|')}#${tray.join(',')}`;
}

export function getDistinctPickColumns(state: SolverState): number[] {
  const seen = new Set<string>();
  const result: number[] = [];
  for (let index = 0; index < state.columns.length; index += 1) {
    const column = state.columns[index];
    if (column === undefined || column.length === 0) continue;
    const signature = column.join(',');
    if (seen.has(signature)) continue;
    seen.add(signature);
    result.push(index);
  }
  return result;
}

export function countFeasible(state: SolverState): boolean {
  const counts = new Map<TileType, number>(TILE_TYPES.map((type) => [type, 0]));
  for (const column of state.columns) {
    for (const type of column) counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  for (const type of state.tray) counts.set(type, (counts.get(type) ?? 0) + 1);
  return [...counts.values()].every((count) => count % GAMEPLAY.matchSize === 0);
}

function isSolved(state: SolverState): boolean {
  return state.columns.every((column) => column.length === 0) && state.tray.length === 0;
}

function allPickColumns(state: SolverState): number[] {
  return state.columns.flatMap((column, index) => (column.length > 0 ? [index] : []));
}

function search(
  state: SolverState,
  deadStates: Set<string>,
  budget: NodeBudget,
  useSymmetryPruning: boolean,
): SolutionStep[] | null {
  if (isSolved(state)) return [];
  if (state.tray.length >= GAMEPLAY.traySize || !countFeasible(state)) return null;

  budget.visit();
  const hash = hashState(state);
  if (deadStates.has(hash)) return null;

  const columns = useSymmetryPruning ? getDistinctPickColumns(state) : allPickColumns(state);
  for (const columnIndex of columns) {
    const column = state.columns[columnIndex];
    const expectedTileType = column?.[column.length - 1];
    if (expectedTileType === undefined) continue;
    const next = applySolverPick(state, columnIndex);
    const tail = search(next, deadStates, budget, useSymmetryPruning);
    if (tail !== null) return [{ columnIndex, expectedTileType }, ...tail];
  }

  deadStates.add(hash);
  return null;
}

export function solve(state: SolverState, options: SolverOptions = {}): SolverResult {
  const budget = new NodeBudget(options.maxNodes ?? SOLVER_TUNING.maxNodes);
  const solution = search(
    cloneSolverState(state),
    new Set<string>(),
    budget,
    options.useSymmetryPruning ?? true,
  );
  return {
    solvable: solution !== null,
    solution: solution ?? [],
    nodesVisited: budget.visited,
  };
}

export function canSolve(state: SolverState, options: SolverOptions = {}): boolean {
  return solve(state, options).solvable;
}
