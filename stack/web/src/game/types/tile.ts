export const TILE_TYPES = [
  'paw',
  'grass',
  'watering',
  'bell',
  'fish',
  'yarn',
  'bone',
  'flowerpot',
] as const;

export type TileType = (typeof TILE_TYPES)[number];

export interface TileData {
  id: string;
  type: TileType;
}
