export type StarRating = 1 | 2 | 3;

export function calculateStarRating(undoUsed: number, shuffleUsed: number): StarRating {
  const toolUses = Math.max(0, undoUsed) + Math.max(0, shuffleUsed);
  if (toolUses === 0) return 3;
  if (toolUses <= 2) return 2;
  return 1;
}
