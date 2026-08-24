export type TrayPressureLevel = 'normal' | 'warning' | 'danger' | 'full';

export interface TrayPresentation {
  level: TrayPressureLevel;
  label: string;
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
