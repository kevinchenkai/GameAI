import type { GameState, PickResult } from '../types/game';
import { applyPickToState } from './rules/applyPick';
import { canPick } from './rules/canPick';
import { isFail, isWin } from './rules/checkStatus';

export class RuleEngine {
  canPick(state: GameState, columnIndex: number): boolean {
    return canPick(state, columnIndex);
  }

  pick(state: GameState, columnIndex: number): PickResult {
    return applyPickToState(state, columnIndex);
  }

  isWin(state: GameState): boolean {
    return isWin(state);
  }

  isFail(state: GameState): boolean {
    return isFail(state);
  }
}
