import { UNDO } from '../config/tuning';
import type { GameSnapshot } from '../core/UndoManager';
import { LEVEL_LOADER } from '../levelRegistry';
import type { GameState, GameStatus } from '../types/game';
import type { LevelDefinition } from '../types/level';
import type {
  PlayerSave,
  PlayerSettingKey,
  PlayerSettings,
  SavedRun,
} from '../types/save';
import { TILE_TYPES, type TileData, type TileType } from '../types/tile';

export const SAVE_KEY = 'stackpop-save-v1';
export const SAVE_SCHEMA_VERSION = 1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RestoredRun {
  state: GameState;
  undoStack: GameSnapshot[];
}

const DEFAULT_SETTINGS: PlayerSettings = {
  music: true,
  sound: true,
  vibration: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum;
}

function cloneTiles(tiles: readonly TileData[]): TileData[] {
  return tiles.map((tile) => ({ ...tile }));
}

function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    columns: snapshot.columns.map(cloneTiles),
    tray: cloneTiles(snapshot.tray),
  };
}

function cloneRun(run: SavedRun): SavedRun {
  return {
    ...run,
    columns: run.columns.map(cloneTiles),
    tray: cloneTiles(run.tray),
    undoStack: run.undoStack.map(cloneSnapshot),
  };
}

function cloneSave(save: PlayerSave): PlayerSave {
  return {
    ...save,
    stars: { ...save.stars },
    settings: { ...save.settings },
    currentRun: save.currentRun === null ? null : cloneRun(save.currentRun),
  };
}

function defaultSave(): PlayerSave {
  return {
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    maxUnlockedLevel: 1,
    stars: {},
    settings: { ...DEFAULT_SETTINGS },
    currentRun: null,
  };
}

function parseTile(value: unknown): TileData | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.type !== 'string') return null;
  if (!TILE_TYPES.includes(value.type as TileType)) return null;
  return { id: value.id, type: value.type as TileType };
}

function parseTiles(value: unknown): TileData[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map(parseTile);
  return parsed.some((tile) => tile === null) ? null : parsed as TileData[];
}

function parseColumns(value: unknown, count?: number): TileData[][] | null {
  if (!Array.isArray(value) || (count !== undefined && value.length !== count)) return null;
  const columns = value.map(parseTiles);
  return columns.some((column) => column === null) ? null : columns as TileData[][];
}

function parseSnapshot(value: unknown, columnCount: number): GameSnapshot | null {
  if (!isRecord(value)) return null;
  const columns = parseColumns(value.columns, columnCount);
  const tray = parseTiles(value.tray);
  if (
    columns === null ||
    tray === null ||
    !isInteger(value.moveCount) ||
    !isInteger(value.combo) ||
    !isInteger(value.rngState, 1)
  ) return null;
  return {
    columns,
    tray,
    moveCount: value.moveCount,
    combo: value.combo,
    rngState: value.rngState,
  };
}

function isGameStatus(value: unknown): value is GameStatus {
  return value === 'playing' || value === 'animating' || value === 'won' || value === 'failed';
}

function parseRun(value: unknown, levels: ReadonlyMap<number, LevelDefinition>): SavedRun | null {
  if (!isRecord(value) || !isInteger(value.levelId, 1)) return null;
  const level = levels.get(value.levelId);
  if (level === undefined || value.levelRevision !== level.levelRevision) return null;
  const columns = parseColumns(value.columns, level.columnCount);
  const tray = parseTiles(value.tray);
  if (
    columns === null ||
    tray === null ||
    value.traySize !== level.traySize ||
    tray.length > level.traySize ||
    !isInteger(value.moveCount) ||
    !isInteger(value.combo) ||
    !isInteger(value.undoUsed) ||
    !isInteger(value.shuffleUsed) ||
    !isInteger(value.rngState, 1) ||
    !isGameStatus(value.status) ||
    !Array.isArray(value.undoStack)
  ) return null;
  const undoStack = value.undoStack.map((snapshot) => parseSnapshot(snapshot, level.columnCount));
  if (undoStack.some((snapshot) => snapshot === null)) return null;
  const activeIds = [...columns.flat(), ...tray].map(({ id }) => id);
  if (new Set(activeIds).size !== activeIds.length) return null;
  return {
    levelId: value.levelId,
    levelRevision: level.levelRevision,
    columns,
    tray,
    traySize: level.traySize,
    moveCount: value.moveCount,
    combo: value.combo,
    undoUsed: value.undoUsed,
    shuffleUsed: value.shuffleUsed,
    undoStack: (undoStack as GameSnapshot[]).slice(-UNDO.persistedSnapshots),
    rngState: value.rngState,
    status: value.status,
  };
}

function parseSettings(value: unknown): PlayerSettings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };
  return {
    music: typeof value.music === 'boolean' ? value.music : DEFAULT_SETTINGS.music,
    sound: typeof value.sound === 'boolean' ? value.sound : DEFAULT_SETTINGS.sound,
    vibration: typeof value.vibration === 'boolean' ? value.vibration : DEFAULT_SETTINGS.vibration,
  };
}

export class SaveManager {
  private readonly levels: ReadonlyMap<number, LevelDefinition>;
  private data: PlayerSave;

  constructor(
    private readonly storage: StorageLike,
    levelDefinitions: readonly LevelDefinition[],
  ) {
    this.levels = new Map(levelDefinitions.map((level) => [level.id, level]));
    this.data = this.read();
  }

  get snapshot(): PlayerSave {
    return cloneSave(this.data);
  }

  restoreCurrentRun(levelId: number): RestoredRun | null {
    const run = this.data.currentRun;
    if (run === null || run.levelId !== levelId) return null;
    return {
      state: {
        levelId: run.levelId,
        levelRevision: run.levelRevision,
        columns: run.columns.map(cloneTiles),
        tray: cloneTiles(run.tray),
        traySize: run.traySize,
        moveCount: run.moveCount,
        combo: run.combo,
        undoUsed: run.undoUsed,
        shuffleUsed: run.shuffleUsed,
        rngState: run.rngState,
        status: run.status,
      },
      undoStack: run.undoStack.map(cloneSnapshot),
    };
  }

  saveCurrentRun(state: GameState, undoStack: readonly GameSnapshot[]): void {
    if (!this.levels.has(state.levelId) || state.status === 'won') return;
    this.data.currentRun = {
      levelId: state.levelId,
      levelRevision: state.levelRevision,
      columns: state.columns.map(cloneTiles),
      tray: cloneTiles(state.tray),
      traySize: state.traySize,
      moveCount: state.moveCount,
      combo: state.combo,
      undoUsed: state.undoUsed,
      shuffleUsed: state.shuffleUsed,
      undoStack: undoStack.slice(-UNDO.persistedSnapshots).map(cloneSnapshot),
      rngState: state.rngState,
      status: state.status,
    };
    this.commit();
  }

  completeLevel(levelId: number, stars: 1 | 2 | 3): void {
    const currentBest = this.data.stars[String(levelId)] ?? 0;
    this.data.stars[String(levelId)] = Math.max(currentBest, stars);
    this.data.maxUnlockedLevel = Math.min(this.levels.size, Math.max(this.data.maxUnlockedLevel, levelId + 1));
    this.data.currentRun = null;
    this.commit();
  }

  clearCurrentRun(): void {
    if (this.data.currentRun === null) return;
    this.data.currentRun = null;
    this.commit();
  }

  setSetting(key: PlayerSettingKey, value: boolean): void {
    this.data.settings[key] = value;
    this.commit();
  }

  private read(): PlayerSave {
    let raw: unknown;
    try {
      const serialized = this.storage.getItem(SAVE_KEY);
      if (serialized === null) return defaultSave();
      raw = JSON.parse(serialized) as unknown;
    } catch {
      return defaultSave();
    }
    if (!isRecord(raw) || raw.saveSchemaVersion !== SAVE_SCHEMA_VERSION) return defaultSave();
    const maxLevel = this.levels.size;
    const maxUnlockedLevel = isInteger(raw.maxUnlockedLevel, 1)
      ? Math.min(raw.maxUnlockedLevel, maxLevel)
      : 1;
    const stars: Record<string, number> = {};
    if (isRecord(raw.stars)) {
      for (const [key, value] of Object.entries(raw.stars)) {
        const levelId = Number(key);
        if (this.levels.has(levelId) && isInteger(value, 1) && value <= 3) stars[key] = value;
      }
    }
    return {
      saveSchemaVersion: SAVE_SCHEMA_VERSION,
      maxUnlockedLevel,
      stars,
      settings: parseSettings(raw.settings),
      currentRun: parseRun(raw.currentRun, this.levels),
    };
  }

  private commit(): void {
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage can be unavailable in private browsing; gameplay remains usable in memory.
    }
  }
}

let browserSaveManager: SaveManager | null = null;

export function getSaveManager(): SaveManager {
  if (browserSaveManager === null) {
    browserSaveManager = new SaveManager(window.localStorage, LEVEL_LOADER.list());
  }
  return browserSaveManager;
}
