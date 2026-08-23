import type { TileData, TileType } from './tile';

export type GameStatus = 'playing' | 'animating' | 'won' | 'failed';

export interface GameState {
  levelId: number;
  levelRevision: number;
  columns: TileData[][];
  tray: TileData[];
  traySize: number;
  moveCount: number;
  combo: number;
  undoUsed: number;
  shuffleUsed: number;
  rngState: number;
  status: GameStatus;
}

export interface MatchResult {
  type: TileType;
  tiles: TileData[];
  remaining: TileData[];
}

export interface PickResult {
  nextState: GameState;
  pickedTile: TileData;
  sourceColumnIndex: number;
  insertedTrayIndex: number;
  shiftedTileIds: string[];
  matches: MatchResult[];
}

export type TerminalStatus = 'playing' | 'won' | 'failed';
