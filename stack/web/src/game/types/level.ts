import type { SolutionStep } from '../core/Solver';
import type { TileType } from './tile';

export interface LevelTools {
  undo: number;
  shuffle: number;
  hint: number;
}

export interface LevelStars {
  three: number;
  two: number;
}

export interface LevelDefinition {
  id: number;
  name: string;
  schemaVersion: number;
  levelRevision: number;
  columnCount: number;
  maxDepth: number;
  traySize: number;
  tileTypes: TileType[];
  columns: TileType[][];
  tools: LevelTools;
  stars: LevelStars;
  solution: SolutionStep[];
  meta: Record<string, unknown>;
}
