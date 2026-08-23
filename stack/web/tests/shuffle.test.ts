import { describe, expect, it } from 'vitest';
import { createDemoState } from '../src/game/config/demoLevel';
import { applyPickToState } from '../src/game/core/rules/applyPick';
import { SeededRandom } from '../src/game/core/SeededRandom';
import {
  findSolvableShuffle,
  generateSafeState,
} from '../src/game/core/Shuffle';
import { canSolve, solverStateFromGame } from '../src/game/core/Solver';
import { UndoManager } from '../src/game/core/UndoManager';
import { shuffleInWorker, type WorkerLike } from '../src/game/systems/SolverWorkerClient';
import type { ShuffleWorkerRequest, ShuffleWorkerResponse } from '../src/game/workers/messages';

function typeCounts(types: readonly string[]): Record<string, number> {
  return types.reduce<Record<string, number>>((counts, type) => {
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
}

describe('Shuffle', () => {
  it('保持总数、类型数量、列高与 tray 不变，并包含当前 tray 校验可解', () => {
    let state = createDemoState();
    state = applyPickToState(state, 0).nextState;
    state = applyPickToState(state, 3).nextState;
    const beforeTiles = state.columns.flat().map((tile) => tile.type);
    const beforeTray = state.tray.map((tile) => tile.type);
    const beforeHeights = state.columns.map((column) => column.length);
    const result = findSolvableShuffle(state, new SeededRandom(601));

    expect(result.nextState.columns.map((column) => column.length)).toEqual(beforeHeights);
    expect(result.nextState.tray.map((tile) => tile.type)).toEqual(beforeTray);
    expect(typeCounts(result.nextState.columns.flat().map((tile) => tile.type))).toEqual(
      typeCounts(beforeTiles),
    );
    expect(canSolve(solverStateFromGame(result.nextState))).toBe(true);
  });

  it('随机尝试为零时走 generateSafeState，并经 Solver 验证', () => {
    const state = createDemoState();
    const result = findSolvableShuffle(state, new SeededRandom(9), 0);
    expect(result.strategy).toBe('safe');
    expect(canSolve(solverStateFromGame(result.nextState))).toBe(true);
  });

  it('safe state 保留所有 tile id 且列高不变', () => {
    const state = createDemoState();
    const safe = generateSafeState(state);
    expect(safe.columns.map((column) => column.length)).toEqual(
      state.columns.map((column) => column.length),
    );
    expect(safe.columns.flat().map((tile) => tile.id).sort()).toEqual(
      state.columns.flat().map((tile) => tile.id).sort(),
    );
  });

  it('打乱前 snapshot 可撤回，且不退还已消耗的 Shuffle 次数', () => {
    const state = createDemoState();
    const undo = new UndoManager();
    undo.push(state);
    const shuffled = findSolvableShuffle(state, new SeededRandom(81)).nextState;
    shuffled.shuffleUsed = 1;
    const restored = undo.undo(shuffled);
    expect(restored?.columns).toEqual(state.columns);
    expect(restored?.tray).toEqual(state.tray);
    expect(restored?.shuffleUsed).toBe(1);
  });

  it('Worker 超时终止并走确定性安全兜底', async () => {
    let terminated = false;
    const worker: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage(_message: ShuffleWorkerRequest): void {},
      terminate(): void {
        terminated = true;
      },
    };
    const result = await shuffleInWorker(createDemoState(), 321, {
      timeoutMs: 1,
      workerFactory: () => worker,
    });
    expect(result.strategy).toBe('timeout-safe');
    expect(terminated).toBe(true);
    expect(canSolve(solverStateFromGame(result.nextState))).toBe(true);
  });

  it('Worker 返回错误时同样走兜底而非卡住', async () => {
    const worker: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage(message: ShuffleWorkerRequest): void {
        const response: ShuffleWorkerResponse = {
          kind: 'shuffle-error',
          requestId: message.requestId,
          message: 'synthetic failure',
        };
        queueMicrotask(() => this.onmessage?.(new MessageEvent('message', { data: response })));
      },
      terminate(): void {},
    };
    const result = await shuffleInWorker(createDemoState(), 777, {
      timeoutMs: 100,
      workerFactory: () => worker,
    });
    expect(result.strategy).toBe('timeout-safe');
  });
});
