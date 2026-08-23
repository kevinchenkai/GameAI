import type { GameState } from '../../types/game';

export function canPick(state: GameState, columnIndex: number): boolean {
  if (state.status !== 'playing') return false;
  if (state.tray.length >= state.traySize) return false;
  const column = state.columns[columnIndex];
  return column !== undefined && column.length > 0;
}

export function canPickTile(state: GameState, columnIndex: number, tileId: string): boolean {
  if (!canPick(state, columnIndex)) return false;
  const column = state.columns[columnIndex];
  return column?.[column.length - 1]?.id === tileId;
}
