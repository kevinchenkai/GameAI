import type { GameSnapshot } from '../core/UndoManager';
import type { GameStatus } from './game';
import type { TileData } from './tile';

export interface PlayerSettings {
  music: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface SavedRun {
  levelId: number;
  levelRevision: number;
  columns: TileData[][];
  tray: TileData[];
  traySize: number;
  moveCount: number;
  combo: number;
  undoUsed: number;
  shuffleUsed: number;
  undoStack: GameSnapshot[];
  rngState: number;
  status: GameStatus;
}

export interface PlayerSave {
  saveSchemaVersion: number;
  maxUnlockedLevel: number;
  stars: Record<string, number>;
  settings: PlayerSettings;
  currentRun: SavedRun | null;
}

export type PlayerSettingKey = keyof PlayerSettings;
