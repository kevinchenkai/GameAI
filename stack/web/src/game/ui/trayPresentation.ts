export type TrayPressureLevel = 'normal' | 'warning' | 'danger' | 'full';

export interface TrayPresentation {
  level: TrayPressureLevel;
  label: string;
}

export interface TrayPairRun {
  type: string;
  start: number;
  length: number;
}

/** 5/7 起用文字表达压力，避免只靠红/橙颜色传递风险。 */
export function resolveTrayPresentation(length: number, size: number): TrayPresentation {
  const safeSize = Math.max(1, Math.floor(size));
  const safeLength = Math.max(0, Math.min(safeSize, Math.floor(length)));
  if (safeLength >= safeSize) return { level: 'full', label: `已满 ${safeLength}/${safeSize}` };
  if (safeLength >= safeSize - 1) return { level: 'danger', label: `危险 ${safeLength}/${safeSize}` };
  if (safeLength >= safeSize - 2) return { level: 'warning', label: `注意 ${safeLength}/${safeSize}` };
  return { level: 'normal', label: `${safeLength}/${safeSize}` };
}

/** 返回相邻同类型的组合；渲染层只给 2 张及以上的组合加一次柔光。 */
export function findTrayPairRuns(tiles: readonly { type: string }[]): TrayPairRun[] {
  const runs: TrayPairRun[] = [];
  let start = 0;
  while (start < tiles.length) {
    let end = start + 1;
    while (end < tiles.length && tiles[end]?.type === tiles[start]?.type) end += 1;
    if (end - start >= 2) {
      runs.push({ type: tiles[start]!.type, start, length: end - start });
    }
    start = end;
  }
  return runs;
}
