import type { GameState } from './types/game';

export interface StackPopDebugApi {
  getState(): GameState;
  pick(columnIndex: number): boolean;
  undo(): boolean;
  shuffle(): Promise<boolean>;
  restart(): void;
  getLayout(): Record<string, number>;
  getDiagnostics(): {
    lastShuffleStrategy: string;
    lastShuffleDurationMs: number;
  };
}

declare global {
  interface Window {
    __STACKPOP__?: StackPopDebugApi;
  }
}
