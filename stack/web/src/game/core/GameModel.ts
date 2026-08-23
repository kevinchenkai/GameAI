import type { GameState, PickResult } from '../types/game';
import { cloneState } from './cloneState';
import { RuleEngine } from './RuleEngine';

export class GameModel {
  private readonly initialState: GameState;
  private currentState: GameState;
  private readonly rules: RuleEngine;

  constructor(initialState: GameState, rules = new RuleEngine()) {
    this.initialState = cloneState(initialState);
    this.currentState = cloneState(initialState);
    this.rules = rules;
  }

  get state(): GameState {
    return cloneState(this.currentState);
  }

  canPick(columnIndex: number): boolean {
    return this.rules.canPick(this.currentState, columnIndex);
  }

  pick(columnIndex: number): PickResult {
    const result = this.rules.pick(this.currentState, columnIndex);
    this.currentState = cloneState(result.nextState);
    return result;
  }

  replaceState(state: GameState): GameState {
    this.currentState = cloneState(state);
    return this.state;
  }

  restart(): GameState {
    this.currentState = cloneState(this.initialState);
    return this.state;
  }
}
