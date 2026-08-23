import { LevelLoader } from './core/LevelLoader';

const levelModules = import.meta.glob('../../levels/level*.json', {
  eager: true,
  import: 'default',
});

export const LEVEL_LOADER = new LevelLoader(Object.values(levelModules));
