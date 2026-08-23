import { findSolvableShuffle } from '../core/Shuffle';
import { SeededRandom } from '../core/SeededRandom';
import type { ShuffleWorkerRequest, ShuffleWorkerResponse } from './messages';

interface WorkerScope {
  onmessage: ((event: MessageEvent<ShuffleWorkerRequest>) => void) | null;
  postMessage(message: ShuffleWorkerResponse): void;
}

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = (event): void => {
  const request = event.data;
  if (request.kind !== 'shuffle') return;
  try {
    const result = findSolvableShuffle(request.state, new SeededRandom(request.seed));
    workerScope.postMessage({
      kind: 'shuffle-result',
      requestId: request.requestId,
      result,
    });
  } catch (error: unknown) {
    workerScope.postMessage({
      kind: 'shuffle-error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
