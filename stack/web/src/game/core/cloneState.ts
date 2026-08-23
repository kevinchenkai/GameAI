import type { GameState } from '../types/game';

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    columns: state.columns.map((column) => column.map((tile) => ({ ...tile }))),
    tray: state.tray.map((tile) => ({ ...tile })),
  };
}
