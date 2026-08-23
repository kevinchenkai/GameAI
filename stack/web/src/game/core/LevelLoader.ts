import type { GameState } from '../types/game';
import type { LevelDefinition } from '../types/level';
import {
  LevelValidationError,
  levelToGameState,
  parseLevelDefinition,
  validateLevelDefinition,
} from './LevelValidation';

export class LevelLoader {
  private readonly levelsById: ReadonlyMap<number, LevelDefinition>;

  constructor(rawLevels: readonly unknown[]) {
    const parsed = rawLevels.map((raw) => parseLevelDefinition(raw));
    const levels = new Map<number, LevelDefinition>();
    for (const level of parsed) {
      const errors = validateLevelDefinition(level);
      if (errors.length > 0) {
        throw new LevelValidationError(`level ${level.id}: ${errors.join('; ')}`);
      }
      if (levels.has(level.id)) {
        throw new LevelValidationError(`duplicate level id: ${level.id}`);
      }
      levels.set(level.id, level);
    }
    this.levelsById = levels;
  }

  get count(): number {
    return this.levelsById.size;
  }

  list(): LevelDefinition[] {
    return [...this.levelsById.values()].sort((first, second) => first.id - second.id);
  }

  get(levelId: number): LevelDefinition {
    const level = this.levelsById.get(levelId);
    if (level === undefined) throw new LevelValidationError(`level ${levelId} was not found`);
    return level;
  }

  createState(levelId: number): GameState {
    return levelToGameState(this.get(levelId));
  }
}
