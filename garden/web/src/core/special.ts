/**
 * core/special.ts —— 特殊棋子生成与组合（框架 §5.2 / §5.3）
 *
 * Stage 0 只做 rocketH / rocketV / bomb，**不做彩虹球**（冻结范围）。
 * 但组合表提前定死，避免 V1 Full 返工。
 */

import { cellAt, isPlayable } from './board';
import type { BoardState, Pos, SpecialKind } from './types';
import type { MatchGroup } from './matcher';

/**
 * ★ 火箭方向是**刻意反过来**的：横向 4 连产出**纵向**火箭。
 *   理由：玩家横着连了一排，奖励应该能清他**还没清的方向**。
 *
 * ⚠️ 但这条待真机验证（框架 §5.2）。各家三消惯例并不一致，
 *   而玩家真正需要的不是"符合行业惯例"，是**能预测它会清哪里**。
 *   M8 真人测试时专门观察理解率；若频繁误判，**立即翻转，不要坚持理论**。
 *   改动成本就是下面这两行。
 */
const ROCKET_FROM_HORIZONTAL: SpecialKind = 'rocketV';
const ROCKET_FROM_VERTICAL: SpecialKind = 'rocketH';

/** 炸弹的影响半径（3×3） */
export const BOMB_RADIUS = 1;
/** 组合：火箭 + 炸弹的粗十字宽度（3 行 + 3 列） */
export const ROCKET_BOMB_THICKNESS = 1;
/** 组合：炸弹 + 炸弹的大爆炸半径（5×5） */
export const BOMB_BOMB_RADIUS = 2;

/**
 * 由匹配形状决定生成什么特殊棋子（框架 §5.2）。
 *
 * | 匹配形状   | 产出      |
 * | 横向 4 连  | rocketV   |
 * | 纵向 4 连  | rocketH   |
 * | 5 连       | rainbow   |（Stage 0 不启用，见下）
 * | T / L 型   | bomb      |
 */
export function specialFromMatch(group: MatchGroup): SpecialKind {
  switch (group.shape) {
    case 'line3':
      return 'none';
    case 'line4':
      return isHorizontal(group) ? ROCKET_FROM_HORIZONTAL : ROCKET_FROM_VERTICAL;
    case 'line5':
      return 'rainbow';
    case 'tShape':
    case 'lShape':
      return 'bomb';
  }
}

/** 该组是横向还是纵向（4/5 连必然是单方向） */
function isHorizontal(group: MatchGroup): boolean {
  const rows = new Set(group.positions.map((p) => p.row));
  return rows.size === 1;
}

/** 收集一整行（跳过洞） */
function wholeRow(board: BoardState, row: number): Pos[] {
  const out: Pos[] = [];
  for (let col = 0; col < board.cols; col++) {
    const pos = { col, row };
    if (isPlayable(board, pos)) out.push(pos);
  }
  return out;
}

/** 收集一整列（跳过洞） */
function wholeCol(board: BoardState, col: number): Pos[] {
  const out: Pos[] = [];
  for (let row = 0; row < board.rows; row++) {
    const pos = { col, row };
    if (isPlayable(board, pos)) out.push(pos);
  }
  return out;
}

/** 收集以 center 为中心、半径 r 的方形区域（跳过洞） */
function square(board: BoardState, center: Pos, r: number): Pos[] {
  const out: Pos[] = [];
  for (let row = center.row - r; row <= center.row + r; row++) {
    for (let col = center.col - r; col <= center.col + r; col++) {
      const pos = { col, row };
      if (isPlayable(board, pos)) out.push(pos);
    }
  }
  return out;
}

/** 收集全盘与指定颜色相同的格子（彩虹球用） */
function sameColorAs(board: BoardState, pos: Pos): Pos[] {
  const target = cellAt(board, pos)?.piece?.color;
  if (!target) return [];
  const out: Pos[] = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const p = { col, row };
      if (cellAt(board, p)?.piece?.color === target) out.push(p);
    }
  }
  return out;
}

const keyOf = (p: Pos): string => `${p.col},${p.row}`;

function dedupe(positions: readonly Pos[]): Pos[] {
  const seen = new Map<string, Pos>();
  for (const p of positions) seen.set(keyOf(p), p);
  return [...seen.values()];
}

/**
 * 单个特殊棋子的影响范围。
 * ★ 不含递归 —— 被波及的其它特殊棋子由 resolver 逐个再触发（框架 §5.1 步骤 d）。
 *   放在这里会让影响范围与触发顺序纠缠在一起，难以测试。
 */
export function specialAffectedArea(
  board: BoardState,
  pos: Pos,
  kind: SpecialKind,
): readonly Pos[] {
  switch (kind) {
    case 'none':
      return [];
    case 'rocketH':
      return wholeRow(board, pos.row);
    case 'rocketV':
      return wholeCol(board, pos.col);
    case 'bomb':
      return square(board, pos, BOMB_RADIUS);
    case 'rainbow':
      // 单独触发的彩虹球（非组合）清除与自身同色的全部；
      // 自身无固定色时退化为只清自己
      return sameColorAs(board, pos);
  }
}

/**
 * 两个特殊棋子交换时的组合效果（框架 §5.3，共 7 种）。
 * 返回 null 表示不构成组合，按普通交换处理。
 *
 * | 组合          | 效果                          |
 * | 火箭 + 火箭   | 十字：整行 + 整列             |
 * | 火箭 + 炸弹   | 3 行 + 3 列的粗十字           |
 * | 炸弹 + 炸弹   | 5×5 大爆炸                    |
 * | 彩虹 + 普通   | 清除该颜色全部                |
 * | 彩虹 + 火箭   | 该颜色全部变火箭并触发 ← 最爽 |
 * | 彩虹 + 炸弹   | 该颜色全部变炸弹并触发        |
 * | 彩虹 + 彩虹   | 清空全场                      |
 */
export function comboAffectedArea(
  board: BoardState,
  a: Pos,
  b: Pos,
): {
  readonly kinds: readonly [SpecialKind, SpecialKind];
  readonly affected: readonly Pos[];
} | null {
  const pa = cellAt(board, a)?.piece;
  const pb = cellAt(board, b)?.piece;
  if (!pa || !pb) return null;

  const ka = pa.special;
  const kb = pb.special;
  if (ka === 'none' && kb === 'none') return null;

  const kinds: readonly [SpecialKind, SpecialKind] = [ka, kb];
  const isRocket = (k: SpecialKind): boolean => k === 'rocketH' || k === 'rocketV';

  // ——— 彩虹球参与的四种 ———
  if (ka === 'rainbow' && kb === 'rainbow') {
    return { kinds, affected: allPlayable(board) }; // 清空全场
  }
  if (ka === 'rainbow' || kb === 'rainbow') {
    const otherPos = ka === 'rainbow' ? b : a;
    const otherKind = ka === 'rainbow' ? kb : ka;
    const sameColor = sameColorAs(board, otherPos);

    if (otherKind === 'none') {
      return { kinds, affected: dedupe([...sameColor, ka === 'rainbow' ? a : b]) };
    }
    // 彩虹 + 火箭/炸弹：该颜色全部**变成**该特殊棋子并全部触发
    const blast = sameColor.flatMap((p) => specialAffectedArea(board, p, otherKind));
    return { kinds, affected: dedupe([...sameColor, ...blast, ka === 'rainbow' ? a : b]) };
  }

  // ——— 两个普通特殊棋子的三种 ———
  if (isRocket(ka) && isRocket(kb)) {
    // 十字：以 a 为中心的整行 + 整列（与哪个是横/纵无关）
    return { kinds, affected: dedupe([...wholeRow(board, a.row), ...wholeCol(board, a.col)]) };
  }
  if ((isRocket(ka) && kb === 'bomb') || (ka === 'bomb' && isRocket(kb))) {
    // 粗十字：3 行 + 3 列
    const rows: Pos[] = [];
    const cols: Pos[] = [];
    for (let d = -ROCKET_BOMB_THICKNESS; d <= ROCKET_BOMB_THICKNESS; d++) {
      rows.push(...wholeRow(board, a.row + d));
      cols.push(...wholeCol(board, a.col + d));
    }
    return { kinds, affected: dedupe([...rows, ...cols]) };
  }
  if (ka === 'bomb' && kb === 'bomb') {
    return { kinds, affected: square(board, a, BOMB_BOMB_RADIUS) };
  }

  // 只有一方是特殊棋子且另一方是普通棋子 —— 不构成组合，
  // 按普通交换处理（若能成 3 连就正常消除，特殊棋子被消时自然触发）
  return null;
}

function allPlayable(board: BoardState): Pos[] {
  const out: Pos[] = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const pos = { col, row };
      if (isPlayable(board, pos)) out.push(pos);
    }
  }
  return out;
}
