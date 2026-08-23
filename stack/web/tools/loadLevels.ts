import fs from 'node:fs';
import path from 'node:path';
import { LevelLoader } from '../src/game/core/LevelLoader';
import type { LevelDefinition } from '../src/game/types/level';

export interface LoadedLevel {
  filename: string;
  level: LevelDefinition;
}

export function loadLevels(directory = path.resolve(process.cwd(), 'levels')): LoadedLevel[] {
  const loaded = fs
    .readdirSync(directory)
    .filter((filename) => /^level\d{3}\.json$/.test(filename))
    .sort()
    .map((filename) => {
      const text = fs.readFileSync(path.join(directory, filename), 'utf8');
      const raw: unknown = JSON.parse(text);
      return { filename, raw };
    });
  const loader = new LevelLoader(loaded.map(({ raw }) => raw));
  const byId = new Map(loader.list().map((level) => [level.id, level]));
  return loaded.map(({ filename, raw }) => {
    const parsedId = typeof raw === 'object' && raw !== null && 'id' in raw ? raw.id : undefined;
    if (typeof parsedId !== 'number') throw new Error(`${filename}: id is missing`);
    const level = byId.get(parsedId);
    if (level === undefined) throw new Error(`${filename}: failed to load level ${parsedId}`);
    return { filename, level };
  });
}
