import { UNDO } from '../config/tuning';
import type { GameState } from '../types/game';
import type { TileData } from '../types/tile';

export interface GameSnapshot {
  columns: TileData[][];
  tray: TileData[];
  moveCount: number;
  combo: number;
  rngState: number;
}

function cloneTiles(tiles: readonly TileData[]): TileData[] {
  return tiles.map((tile) => ({ ...tile }));
}

export function createSnapshot(state: GameState): GameSnapshot {
  return {
    columns: state.columns.map(cloneTiles),
    tray: cloneTiles(state.tray),
    moveCount: state.moveCount,
    combo: state.combo,
    rngState: state.rngState,
  };
}

export function restoreSnapshot(current: GameState, snapshot: GameSnapshot): GameState {
  return {
    ...current,
    columns: snapshot.columns.map(cloneTiles),
    tray: cloneTiles(snapshot.tray),
    moveCount: snapshot.moveCount,
    combo: snapshot.combo,
    rngState: snapshot.rngState,
    undoUsed: current.undoUsed + 1,
    status: 'playing',
  };
}

export class UndoManager {
  private history: GameSnapshot[] = [];

  constructor(private readonly maxSnapshots = UNDO.maxSnapshots) {
    if (!Number.isInteger(maxSnapshots) || maxSnapshots <= 0) {
      throw new Error('maxSnapshots must be a positive integer');
    }
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  get size(): number {
    return this.history.length;
  }

  push(state: GameState): void {
    this.history.push(createSnapshot(state));
    if (this.history.length > this.maxSnapshots) this.history.shift();
  }

  undo(current: GameState): GameState | null {
    const snapshot = this.history.pop();
    return snapshot === undefined ? null : restoreSnapshot(current, snapshot);
  }

  clear(): void {
    this.history = [];
  }

  exportRecent(limit = UNDO.persistedSnapshots): GameSnapshot[] {
    return this.history.slice(-limit).map((snapshot) => ({
      ...snapshot,
      columns: snapshot.columns.map(cloneTiles),
      tray: cloneTiles(snapshot.tray),
    }));
  }

  import(snapshots: readonly GameSnapshot[]): void {
    this.history = snapshots.slice(-this.maxSnapshots).map((snapshot) => ({
      ...snapshot,
      columns: snapshot.columns.map(cloneTiles),
      tray: cloneTiles(snapshot.tray),
    }));
  }
}
