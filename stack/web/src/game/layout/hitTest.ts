export interface TileHitArea {
  tileId: string;
  columnIndex: number;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function hitTestTopTile(
  areas: readonly TileHitArea[],
  pointX: number,
  pointY: number,
): TileHitArea | null {
  const ordered = [...areas].sort((a, b) => b.depth - a.depth);
  return (
    ordered.find(
      (area) =>
        pointX >= area.x &&
        pointX <= area.x + area.width &&
        pointY >= area.y &&
        pointY <= area.y + area.height,
    ) ?? null
  );
}
