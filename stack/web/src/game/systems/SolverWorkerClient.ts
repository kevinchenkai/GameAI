import { SHUFFLE_TUNING } from '../config/tuning';
import { generateSafeState, type ShuffleResult } from '../core/Shuffle';
import type { GameState } from '../types/game';
import type { ShuffleWorkerRequest, ShuffleWorkerResponse } from '../workers/messages';

export interface WorkerLike {
  onmessage: ((event: MessageEvent<ShuffleWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: ShuffleWorkerRequest): void;
  terminate(): void;
}

export type WorkerFactory = () => WorkerLike;

export interface WorkerShuffleOptions {
  timeoutMs?: number;
  workerFactory?: WorkerFactory;
  signal?: AbortSignal;
}

function defaultWorkerFactory(): WorkerLike {
  return new Worker(new URL('../workers/SolverWorker.ts', import.meta.url), { type: 'module' });
}

function timeoutFallback(state: GameState, seed: number): ShuffleResult {
  return {
    nextState: { ...generateSafeState(state), rngState: seed >>> 0 },
    attempts: 0,
    strategy: 'timeout-safe',
  };
}

export function shuffleInWorker(
  state: GameState,
  seed: number,
  options: WorkerShuffleOptions = {},
): Promise<ShuffleResult> {
  if (options.signal?.aborted) return Promise.reject(new Error('Shuffle cancelled'));
  let worker: WorkerLike;
  try {
    worker = (options.workerFactory ?? defaultWorkerFactory)();
  } catch {
    return Promise.resolve().then(() => timeoutFallback(state, seed));
  }
  const timeoutMs = options.timeoutMs ?? SHUFFLE_TUNING.workerTimeoutMs;
  const requestId = `shuffle-${state.levelId}-${state.moveCount}-${seed >>> 0}`;

  return new Promise<ShuffleResult>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      callback();
    };
    const cancel = (): void => finish(() => reject(new Error('Shuffle cancelled')));
    const fallback = (): void => {
      try {
        const result = timeoutFallback(state, seed);
        finish(() => resolve(result));
      } catch (error: unknown) {
        finish(() => reject(error));
      }
    };
    const timer = setTimeout(fallback, timeoutMs);
    options.signal?.addEventListener('abort', cancel, { once: true });

    worker.onmessage = (event): void => {
      const response = event.data;
      if (response.requestId !== requestId) return;
      if (response.kind === 'shuffle-result') {
        finish(() => resolve(response.result));
      } else {
        fallback();
      }
    };
    worker.onerror = fallback;
    try {
      worker.postMessage({ kind: 'shuffle', requestId, state, seed });
    } catch {
      fallback();
    }
  });
}
