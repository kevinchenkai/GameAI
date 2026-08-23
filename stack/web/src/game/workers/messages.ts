import type { GameState } from '../types/game';
import type { ShuffleResult } from '../core/Shuffle';

export interface ShuffleWorkerRequest {
  kind: 'shuffle';
  requestId: string;
  state: GameState;
  seed: number;
}

export interface ShuffleWorkerSuccess {
  kind: 'shuffle-result';
  requestId: string;
  result: ShuffleResult;
}

export interface ShuffleWorkerFailure {
  kind: 'shuffle-error';
  requestId: string;
  message: string;
}

export type ShuffleWorkerResponse = ShuffleWorkerSuccess | ShuffleWorkerFailure;
