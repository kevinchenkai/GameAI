import { GAMEPLAY } from '../config/tuning';
import type { GameState } from '../types/game';
import type { LevelDefinition } from '../types/level';
import { TILE_TYPES, type TileType } from '../types/tile';
import { applyPickToState } from './rules/applyPick';
import { canSolve, solverStateFromGame } from './Solver';

export const LEVEL_APPLY_PICK = applyPickToState;

export class LevelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LevelValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new LevelValidationError(`${path} must be an object`);
  return value;
}

function requireNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new LevelValidationError(`${path}.${key} must be a number`);
  }
  return value;
}

function requireString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw new LevelValidationError(`${path}.${key} must be a string`);
  return value;
}

function parseTileType(value: unknown, path: string): TileType {
  if (typeof value !== 'string' || !TILE_TYPES.includes(value as TileType)) {
    throw new LevelValidationError(`${path} is not a known TileType`);
  }
  return value as TileType;
}

function parseTileTypeArray(value: unknown, path: string): TileType[] {
  if (!Array.isArray(value)) throw new LevelValidationError(`${path} must be an array`);
  return value.map((entry, index) => parseTileType(entry, `${path}[${index}]`));
}

export function parseLevelDefinition(value: unknown): LevelDefinition {
  const root = requireRecord(value, 'level');
  if (!Array.isArray(root.columns)) throw new LevelValidationError('level.columns must be an array');
  if (!Array.isArray(root.solution)) throw new LevelValidationError('level.solution must be an array');
  const tools = requireRecord(root.tools, 'level.tools');
  const stars = requireRecord(root.stars, 'level.stars');
  const meta = requireRecord(root.meta, 'level.meta');

  return {
    id: requireNumber(root, 'id', 'level'),
    name: requireString(root, 'name', 'level'),
    schemaVersion: requireNumber(root, 'schemaVersion', 'level'),
    levelRevision: requireNumber(root, 'levelRevision', 'level'),
    columnCount: requireNumber(root, 'columnCount', 'level'),
    maxDepth: requireNumber(root, 'maxDepth', 'level'),
    traySize: requireNumber(root, 'traySize', 'level'),
    tileTypes: parseTileTypeArray(root.tileTypes, 'level.tileTypes'),
    columns: root.columns.map((column, index) =>
      parseTileTypeArray(column, `level.columns[${index}]`),
    ),
    tools: {
      undo: requireNumber(tools, 'undo', 'level.tools'),
      shuffle: requireNumber(tools, 'shuffle', 'level.tools'),
      hint: requireNumber(tools, 'hint', 'level.tools'),
    },
    stars: {
      three: requireNumber(stars, 'three', 'level.stars'),
      two: requireNumber(stars, 'two', 'level.stars'),
    },
    solution: root.solution.map((step, index) => {
      const parsed = requireRecord(step, `level.solution[${index}]`);
      return {
        columnIndex: requireNumber(parsed, 'columnIndex', `level.solution[${index}]`),
        expectedTileType: parseTileType(
          parsed.expectedTileType,
          `level.solution[${index}].expectedTileType`,
        ),
      };
    }),
    meta: { ...meta },
  };
}

export function levelToGameState(level: LevelDefinition): GameState {
  return {
    levelId: level.id,
    levelRevision: level.levelRevision,
    columns: level.columns.map((column, columnIndex) =>
      column.map((type, depth) => ({ id: `l${level.id}-c${columnIndex}-d${depth}`, type })),
    ),
    tray: [],
    traySize: level.traySize,
    moveCount: 0,
    combo: 0,
    undoUsed: 0,
    shuffleUsed: 0,
    rngState: level.id * 1000 + 1,
    status: 'playing',
  };
}

export function validateLevelDefinition(level: LevelDefinition): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(level.id) || level.id <= 0) errors.push('id must be a positive integer');
  if (level.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!Number.isInteger(level.levelRevision) || level.levelRevision <= 0) {
    errors.push('levelRevision must be a positive integer');
  }
  if (
    !Number.isInteger(level.columnCount) ||
    level.columnCount <= 0 ||
    level.columnCount > GAMEPLAY.columnCount ||
    level.columns.length !== level.columnCount
  ) {
    errors.push(`columnCount must be 1-${GAMEPLAY.columnCount} and match columns.length`);
  }
  if (level.traySize !== GAMEPLAY.traySize) errors.push(`traySize must equal ${GAMEPLAY.traySize}`);
  if (
    !Number.isInteger(level.maxDepth) ||
    level.maxDepth <= 0 ||
    level.maxDepth > GAMEPLAY.maxColumnDepth
  ) {
    errors.push(`maxDepth must be an integer from 1 to ${GAMEPLAY.maxColumnDepth}`);
  }
  if (level.columns.some((column) => column.length > level.maxDepth)) {
    errors.push('column depth must be <= level.maxDepth');
  }

  const counts = new Map<TileType, number>();
  for (const column of level.columns) {
    for (const type of column) counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (new Set(level.tileTypes).size !== level.tileTypes.length) {
    errors.push('tileTypes must not contain duplicates');
  }
  for (const type of level.tileTypes) {
    if (!counts.has(type)) errors.push(`${type} is declared but unused`);
  }
  const capacity = level.columnCount * level.maxDepth;
  if (capacity > 0 && total > capacity * GAMEPLAY.maxLevelCapacityRatio) {
    errors.push(
      `tile count must be <= ${Math.floor(capacity * GAMEPLAY.maxLevelCapacityRatio)} ` +
        `(${Math.round(GAMEPLAY.maxLevelCapacityRatio * 100)}% of configured capacity)`,
    );
  }
  if (total % GAMEPLAY.matchSize !== 0) errors.push('total tile count must be divisible by 3');
  for (const [type, count] of counts) {
    if (count % GAMEPLAY.matchSize !== 0) errors.push(`${type} count must be divisible by 3`);
    if (!level.tileTypes.includes(type)) errors.push(`${type} is missing from tileTypes`);
  }
  if (level.solution.length !== total) errors.push('solution length must equal total tile count');
  if (
    level.solution.some(
      (step) =>
        !Number.isInteger(step.columnIndex) ||
        step.columnIndex < 0 ||
        step.columnIndex >= level.columnCount,
    )
  ) {
    errors.push('solution columnIndex must reference an existing column');
  }
  return errors;
}

export function verifyLevelSolution(level: LevelDefinition): void {
  let state = levelToGameState(level);
  level.solution.forEach((step, index) => {
    const column = state.columns[step.columnIndex];
    const actual = column?.[column.length - 1]?.type;
    if (actual !== step.expectedTileType) {
      throw new LevelValidationError(
        `solution[${index}] expected ${step.expectedTileType}, actual ${actual ?? 'empty'}`,
      );
    }
    state = LEVEL_APPLY_PICK(state, step.columnIndex).nextState;
  });
  if (state.status !== 'won') {
    throw new LevelValidationError('solution replay did not finish with won status');
  }
}

export function verifyLevelSolvable(level: LevelDefinition): void {
  if (!canSolve(solverStateFromGame(levelToGameState(level)))) {
    throw new LevelValidationError('Solver reported unsolvable');
  }
}
