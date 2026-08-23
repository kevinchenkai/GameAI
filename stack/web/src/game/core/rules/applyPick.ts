import { cloneState } from '../cloneState';
import type { GameState, PickResult } from '../../types/game';
import type { TileData } from '../../types/tile';
import { canPick } from './canPick';
import { checkStatus } from './checkStatus';
import { resolveMatches } from './resolveMatches';

function groupedInsertIndex(tray: readonly TileData[], picked: TileData): number {
  let lastMatch = -1;
  for (let index = 0; index < tray.length; index += 1) {
    if (tray[index]?.type === picked.type) lastMatch = index;
  }
  return lastMatch >= 0 ? lastMatch + 1 : tray.length;
}

export function applyPickToState(state: Readonly<GameState>, columnIndex: number): PickResult {
  const mutable = cloneState(state);
  if (!canPick(mutable, columnIndex)) throw new Error(`Cannot pick column ${columnIndex}`);

  const source = mutable.columns[columnIndex];
  const pickedTile = source?.pop();
  if (pickedTile === undefined) throw new Error(`Column ${columnIndex} has no top tile`);

  const insertedTrayIndex = groupedInsertIndex(mutable.tray, pickedTile);
  const shiftedTileIds = mutable.tray.slice(insertedTrayIndex).map((tile) => tile.id);
  mutable.tray.splice(insertedTrayIndex, 0, pickedTile);
  const resolved = resolveMatches(mutable.tray);
  mutable.tray = resolved.tray;
  mutable.moveCount += 1;
  mutable.combo = resolved.matches.length > 0 ? mutable.combo + resolved.matches.length : 0;
  mutable.status = checkStatus(mutable);

  return {
    nextState: mutable,
    pickedTile: { ...pickedTile },
    sourceColumnIndex: columnIndex,
    insertedTrayIndex,
    shiftedTileIds,
    matches: resolved.matches,
  };
}
