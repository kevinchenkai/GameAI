import { describe, expect, it } from 'vitest';
import { calculateStarRating } from '../src/game/core/StarRating';
import { createSnapshot } from '../src/game/core/UndoManager';
import { LEVEL_LOADER } from '../src/game/levelRegistry';
import {
  SAVE_KEY,
  SAVE_SCHEMA_VERSION,
  SaveManager,
  type StorageLike,
} from '../src/game/systems/SaveManager';

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createManager(storage = new MemoryStorage()): SaveManager {
  return new SaveManager(storage, LEVEL_LOADER.list());
}

describe('M5 local save', () => {
  it('uses the fixed key and safe defaults', () => {
    const manager = createManager();
    expect(SAVE_KEY).toBe('stackpop-save-v1');
    expect(manager.snapshot).toEqual({
      saveSchemaVersion: SAVE_SCHEMA_VERSION,
      maxUnlockedLevel: 1,
      stars: {},
      settings: { music: true, sound: true, vibration: true },
      currentRun: null,
    });
  });

  it('round-trips the current run and persists only the five newest undo snapshots', () => {
    const storage = new MemoryStorage();
    const manager = createManager(storage);
    const state = LEVEL_LOADER.createState(4);
    const snapshots = Array.from({ length: 8 }, (_, index) => {
      const snapshot = createSnapshot({ ...state, moveCount: index });
      return snapshot;
    });
    manager.saveCurrentRun({ ...state, moveCount: 8 }, snapshots);

    const restored = createManager(storage).restoreCurrentRun(4);
    expect(restored?.state.moveCount).toBe(8);
    expect(restored?.undoStack.map(({ moveCount }) => moveCount)).toEqual([3, 4, 5, 6, 7]);
    expect(restored?.state).toEqual({ ...state, moveCount: 8 });
  });

  it('drops only an incompatible currentRun when the level revision changes', () => {
    const storage = new MemoryStorage();
    const manager = createManager(storage);
    manager.completeLevel(1, 3);
    manager.saveCurrentRun(LEVEL_LOADER.createState(2), []);
    const serialized = storage.getItem(SAVE_KEY);
    expect(serialized).not.toBeNull();
    const raw = JSON.parse(serialized ?? '{}') as { currentRun: { levelRevision: number } };
    raw.currentRun.levelRevision += 1;
    storage.setItem(SAVE_KEY, JSON.stringify(raw));

    const reloaded = createManager(storage).snapshot;
    expect(reloaded.currentRun).toBeNull();
    expect(reloaded.maxUnlockedLevel).toBe(2);
    expect(reloaded.stars).toEqual({ '1': 3 });
  });

  it('safely resets malformed JSON or an unknown schema version', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{broken');
    expect(createManager(storage).snapshot.maxUnlockedLevel).toBe(1);
    storage.setItem(SAVE_KEY, JSON.stringify({ saveSchemaVersion: 99, maxUnlockedLevel: 20 }));
    expect(createManager(storage).snapshot).toMatchObject({ maxUnlockedLevel: 1, currentRun: null });
  });

  it('unlocks the next level and keeps the best star result', () => {
    const manager = createManager();
    manager.completeLevel(1, 2);
    manager.completeLevel(1, 1);
    expect(manager.snapshot.maxUnlockedLevel).toBe(2);
    expect(manager.snapshot.stars['1']).toBe(2);
    manager.completeLevel(1, 3);
    expect(manager.snapshot.stars['1']).toBe(3);
  });

  it('persists all settings independently from current progress', () => {
    const storage = new MemoryStorage();
    const manager = createManager(storage);
    manager.setSetting('music', false);
    manager.setSetting('sound', false);
    manager.setSetting('vibration', false);
    expect(createManager(storage).snapshot.settings).toEqual({
      music: false,
      sound: false,
      vibration: false,
    });
  });
});

describe('M5 star rating', () => {
  it('uses total Undo + Shuffle usage', () => {
    expect(calculateStarRating(0, 0)).toBe(3);
    expect(calculateStarRating(1, 0)).toBe(2);
    expect(calculateStarRating(1, 1)).toBe(2);
    expect(calculateStarRating(3, 0)).toBe(1);
  });
});
