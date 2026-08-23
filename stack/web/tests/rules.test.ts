import { describe, expect, it } from 'vitest';
import { createDemoState } from '../src/game/config/demoLevel';
import { GAMEPLAY } from '../src/game/config/tuning';
import { applyPickToState } from '../src/game/core/rules/applyPick';
import { canPick, canPickTile } from '../src/game/core/rules/canPick';
import { checkStatus, isFail, isWin } from '../src/game/core/rules/checkStatus';
import type { GameState } from '../src/game/types/game';
import type { TileData, TileType } from '../src/game/types/tile';

function makeTile(id: string, type: TileType): TileData {
  return { id, type };
}

function play(state: GameState, moves: readonly number[]): GameState {
  return moves.reduce((current, columnIndex) => applyPickToState(current, columnIndex).nextState, state);
}

describe('StackPop rules', () => {
  it('只允许选择非空列的顶部 tile', () => {
    const state = createDemoState();
    expect(canPick(state, 0)).toBe(true);
    expect(canPickTile(state, 0, 'demo-0-1')).toBe(true);
    expect(canPickTile(state, 0, 'demo-0-0')).toBe(false);
    state.columns[0] = [];
    expect(canPick(state, 0)).toBe(false);
  });

  it('取牌后列长度减一且不修改入参', () => {
    const state = createDemoState();
    const before = JSON.stringify(state);
    const result = applyPickToState(state, 0);
    expect(result.nextState.columns[0]).toHaveLength(1);
    expect(result.pickedTile.type).toBe('paw');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('不同类型可以共存，并按类型分组插入', () => {
    const state = play(createDemoState(), [0, 3, 1]);
    expect(state.tray.map((tile) => tile.type)).toEqual(['paw', 'paw', 'grass']);
    expect(state.status).toBe('playing');
  });

  it('任意 type 达三枚后立即消除并紧凑剩余 tile（Path B）', () => {
    const state = play(createDemoState(), [0, 1, 2, 3, 4, 5, 1]);
    expect(state.tray.map((tile) => tile.type)).toEqual(['watering']);
    expect(state.moveCount).toBe(7);
    expect(state.status).toBe('playing');
  });

  it('Path A 的 12 步序列清空并胜利', () => {
    const state = play(createDemoState(), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(state.columns.every((column) => column.length === 0)).toBe(true);
    expect(state.tray).toEqual([]);
    expect(isWin(state)).toBe(true);
    expect(state.status).toBe('won');
  });

  it('tray 满时锁住所有列并判失败', () => {
    const trayTypes: readonly TileType[] = ['grass', 'watering', 'bell', 'fish', 'yarn', 'bone'];
    const state = createDemoState();
    state.tray = trayTypes.map((type, index) => makeTile(`tray-${index}`, type));
    state.columns = [
      [makeTile('buried-paw', 'paw'), makeTile('last-paw', 'paw')],
      [],
      [],
      [],
      [],
      [],
    ];
    const failed = applyPickToState(state, 0).nextState;
    expect(failed.tray).toHaveLength(GAMEPLAY.traySize);
    expect(isFail(failed)).toBe(true);
    expect(failed.status).toBe('failed');
    expect(canPick(failed, 1)).toBe(false);
  });

  it('空棋盘但 tray 非空属于数据错误', () => {
    const state = createDemoState();
    state.columns = [[], [], [], [], [], []];
    state.tray = [makeTile('orphan', 'paw')];
    expect(() => checkStatus(state)).toThrow('columns are empty');
  });
});
