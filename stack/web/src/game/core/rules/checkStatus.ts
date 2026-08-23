import type { GameState, TerminalStatus } from '../../types/game';

export function isBoardEmpty(state: GameState): boolean {
  return state.columns.every((column) => column.length === 0);
}

export function isWin(state: GameState): boolean {
  return isBoardEmpty(state) && state.tray.length === 0;
}

export function isFail(state: GameState): boolean {
  if (state.tray.length !== state.traySize) return false;
  const counts = new Map<string, number>();
  for (const tile of state.tray) counts.set(tile.type, (counts.get(tile.type) ?? 0) + 1);
  return [...counts.values()].every((count) => count < 3);
}

export function checkStatus(state: GameState): TerminalStatus {
  if (isWin(state)) return 'won';
  if (isBoardEmpty(state) && state.tray.length > 0) {
    throw new Error('Invalid state: columns are empty while tray still contains tiles');
  }
  if (isFail(state)) return 'failed';
  return 'playing';
}
