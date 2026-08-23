import { COLORS } from './layout';
import type { TileType } from '../types/tile';

export const TILE_COLORS: Readonly<Record<TileType, number>> = {
  paw: COLORS.paw,
  grass: COLORS.grass,
  watering: COLORS.watering,
  bell: COLORS.bell,
  fish: COLORS.fish,
  yarn: COLORS.yarn,
  bone: COLORS.bone,
  flowerpot: COLORS.flowerpot,
};

export const TILE_LABELS: Readonly<Record<TileType, string>> = {
  paw: '爪',
  grass: '草',
  watering: '壶',
  bell: '铃',
  fish: '鱼',
  yarn: '线',
  bone: '骨',
  flowerpot: '盆',
};
