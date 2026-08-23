import { describe, expect, it } from 'vitest';
import { createDemoState } from '../src/game/config/demoLevel';
import { applyPickToState } from '../src/game/core/rules/applyPick';
import { SeededRandom } from '../src/game/core/SeededRandom';
import { UndoManager } from '../src/game/core/UndoManager';

describe('UndoManager', () => {
  it('恢复 columns/tray/moveCount/combo/rngState', () => {
    const initial = createDemoState();
    const rng = new SeededRandom(99);
    initial.rngState = rng.getState();
    const manager = new UndoManager();
    manager.push(initial);
    const picked = applyPickToState(initial, 0).nextState;
    picked.rngState = rng.nextInt(1000) + 1;

    const restored = manager.undo(picked);
    expect(restored?.columns).toEqual(initial.columns);
    expect(restored?.tray).toEqual(initial.tray);
    expect(restored?.moveCount).toBe(initial.moveCount);
    expect(restored?.combo).toBe(initial.combo);
    expect(restored?.rngState).toBe(initial.rngState);
    expect(restored?.undoUsed).toBe(1);
  });

  it('消除后撤回会还原消除前状态', () => {
    let state = createDemoState();
    state = applyPickToState(state, 0).nextState;
    state = applyPickToState(state, 1).nextState;
    const manager = new UndoManager();
    manager.push(state);
    const matched = applyPickToState(state, 2).nextState;
    expect(matched.tray).toEqual([]);
    expect(manager.undo(matched)?.tray.map((tile) => tile.type)).toEqual(['paw', 'paw']);
  });

  it('空栈不可撤回，clear 后按钮应置灰', () => {
    const manager = new UndoManager();
    expect(manager.canUndo).toBe(false);
    manager.push(createDemoState());
    expect(manager.canUndo).toBe(true);
    manager.clear();
    expect(manager.canUndo).toBe(false);
    expect(manager.undo(createDemoState())).toBeNull();
  });

  it('导出最近五步供未来存档恢复', () => {
    const manager = new UndoManager();
    const state = createDemoState();
    for (let index = 0; index < 8; index += 1) {
      state.moveCount = index;
      manager.push(state);
    }
    expect(manager.exportRecent().map((snapshot) => snapshot.moveCount)).toEqual([3, 4, 5, 6, 7]);
  });
});
