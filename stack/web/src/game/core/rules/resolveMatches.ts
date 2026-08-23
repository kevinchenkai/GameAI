import { GAMEPLAY } from '../../config/tuning';
import type { MatchResult } from '../../types/game';
import type { TileData, TileType } from '../../types/tile';

export interface ResolveMatchesResult {
  tray: TileData[];
  matches: MatchResult[];
}

function firstMatchType(tray: readonly TileData[]): TileType | null {
  const counts = new Map<TileType, number>();
  for (const tile of tray) {
    const next = (counts.get(tile.type) ?? 0) + 1;
    if (next >= GAMEPLAY.matchSize) return tile.type;
    counts.set(tile.type, next);
  }
  return null;
}

export function resolveMatches(input: readonly TileData[]): ResolveMatchesResult {
  let tray = input.map((tile) => ({ ...tile }));
  const matches: MatchResult[] = [];

  for (let type = firstMatchType(tray); type !== null; type = firstMatchType(tray)) {
    const matched = tray.filter((tile) => tile.type === type).slice(0, GAMEPLAY.matchSize);
    const matchedIds = new Set(matched.map((tile) => tile.id));
    tray = tray.filter((tile) => !matchedIds.has(tile.id));
    matches.push({
      type,
      tiles: matched.map((tile) => ({ ...tile })),
      remaining: tray.map((tile) => ({ ...tile })),
    });
  }

  return { tray, matches };
}
