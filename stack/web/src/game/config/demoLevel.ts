import { GAMEPLAY } from './tuning';
import type { GameState } from '../types/game';
import type { TileData, TileType } from '../types/tile';

const DEMO_COLUMNS: readonly (readonly TileType[])[] = [
  ['bell', 'paw'],
  ['grass', 'paw'],
  ['watering', 'paw'],
  ['bell', 'grass'],
  ['watering', 'grass'],
  ['bell', 'watering'],
] as const;

const LAYOUT_TYPES: readonly TileType[] = [
  'paw',
  'grass',
  'watering',
  'bell',
  'fish',
  'yarn',
  'bone',
  'flowerpot',
];

function tile(id: string, type: TileType): TileData {
  return { id, type };
}

function baseState(columns: TileData[][]): GameState {
  return {
    levelId: 1,
    levelRevision: 1,
    columns,
    tray: [],
    traySize: GAMEPLAY.traySize,
    moveCount: 0,
    combo: 0,
    undoUsed: 0,
    shuffleUsed: 0,
    rngState: 1,
    status: 'playing',
  };
}

export function createDemoState(): GameState {
  return baseState(
    DEMO_COLUMNS.map((column, columnIndex) =>
      column.map((type, depth) => tile(`demo-${columnIndex}-${depth}`, type)),
    ),
  );
}

export function createDepthTwelveLayoutState(): GameState {
  const columns = Array.from({ length: GAMEPLAY.columnCount }, (_, columnIndex) =>
    Array.from({ length: GAMEPLAY.maxColumnDepth }, (_, depth) => {
      const type = LAYOUT_TYPES[(columnIndex + depth) % LAYOUT_TYPES.length];
      if (type === undefined) throw new Error('Layout fixture type is missing');
      return tile(`layout-${columnIndex}-${depth}`, type);
    }),
  );
  return baseState(columns);
}
