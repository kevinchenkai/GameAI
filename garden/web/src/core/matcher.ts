/**
 * core/matcher.ts —— 匹配检测
 *
 * 单测重点（框架 §11.1）：3/4/5 连、T/L 型、边界情况。
 *
 * 算法分三步：
 *   1. 分别扫出所有横向、纵向的 ≥3 连"线段"
 *   2. 把**共享格子**的线段合并成一组（T / L 型就是这么来的）
 *   3. 由每组的线段构成判定形状 → 决定生成什么特殊棋子
 *
 * 为什么要合并：T 型是一条横 3 连和一条竖 3 连共享一个拐点。
 * 如果不合并，会当成两组独立的 3 连，生成两个特殊棋子——那是错的。
 */

import { cellAt, isSwappable, posEquals, swapPieces } from './board';
import { locksPieceBeneath } from './types';
import type { BoardState, PieceColor, Pos } from './types';

export interface MatchGroup {
  readonly positions: readonly Pos[];
  readonly color: PieceColor;
  /** 该组的形状，决定生成什么特殊棋子（§5.2） */
  readonly shape: 'line3' | 'line4' | 'line5' | 'tShape' | 'lShape';
  /**
   * 生成特殊棋子的位置。
   * ★ 必须是**玩家操作的那个棋子**，不是匹配的中点（框架 §5.2）——
   *   这让玩家感觉"是我造出来的"，而不是"系统随机给的"。
   *   由 resolver 通过 preferredOrigin 传入；无法确定时回退到组内合理位置。
   */
  readonly origin: Pos;
}

interface Segment {
  readonly positions: readonly Pos[];
  readonly color: PieceColor;
  readonly orientation: 'h' | 'v';
}

const MIN_MATCH = 3;

/** 扫描一条线（行或列）上的连续同色段 */
function scanLine(
  board: BoardState,
  length: number,
  orientation: 'h' | 'v',
  fixed: number,
  out: Segment[],
): void {
  let runColor: PieceColor | null = null;
  let runStart = 0;

  const posAt = (i: number): Pos =>
    orientation === 'h' ? { col: i, row: fixed } : { col: fixed, row: i };

  const flush = (endExclusive: number): void => {
    if (runColor === null) return;
    const len = endExclusive - runStart;
    if (len >= MIN_MATCH) {
      const positions: Pos[] = [];
      for (let i = runStart; i < endExclusive; i++) positions.push(posAt(i));
      out.push({ positions, color: runColor, orientation });
    }
  };

  for (let i = 0; i < length; i++) {
    // 打断连线的三种情况：洞、空格、被冰覆盖的棋子。
    // ★ 冰覆盖时下面的棋子不参与匹配 —— 玩家必须先破冰。
    //   这条是 ice 与其它三种障碍的关键差别（见 obstacles.blocksPieceMatching）。
    const cell = cellAt(board, posAt(i));
    const usable =
      cell && !cell.blocked && !(cell.obstacle && locksPieceBeneath(cell.obstacle.kind));
    const color = usable ? (cell.piece?.color ?? null) : null;
    if (color !== runColor) {
      flush(i);
      runColor = color;
      runStart = i;
    }
  }
  flush(length);
}

function findSegments(board: BoardState): Segment[] {
  const out: Segment[] = [];
  for (let row = 0; row < board.rows; row++) scanLine(board, board.cols, 'h', row, out);
  for (let col = 0; col < board.cols; col++) scanLine(board, board.rows, 'v', col, out);
  return out;
}

const keyOf = (p: Pos): string => `${p.col},${p.row}`;

/**
 * 由线段构成判定形状（框架 §5.2）：
 *   横 4 连 → rocketV（纵向火箭）  ★ 方向是刻意的，见 special.ts
 *   纵 4 连 → rocketH
 *   5 连    → rainbow（Stage 0 不启用）
 *   T / L   → bomb
 */
function classify(segs: readonly Segment[]): MatchGroup['shape'] {
  const hasH = segs.some((s) => s.orientation === 'h');
  const hasV = segs.some((s) => s.orientation === 'v');
  const maxLen = Math.max(...segs.map((s) => s.positions.length));

  if (hasH && hasV) {
    // 横竖交叉：拐点在端点 = L，在中间 = T。
    // 两者都产出 bomb，区分仅用于事件与测试可读性。
    return isLShape(segs) ? 'lShape' : 'tShape';
  }
  if (maxLen >= 5) return 'line5';
  if (maxLen === 4) return 'line4';
  return 'line3';
}

/** L 型：交点同时是横段与竖段的**端点** */
function isLShape(segs: readonly Segment[]): boolean {
  const h = segs.filter((s) => s.orientation === 'h');
  const v = segs.filter((s) => s.orientation === 'v');
  for (const hs of h) {
    for (const vs of v) {
      const cross = hs.positions.find((p) => vs.positions.some((q) => posEquals(p, q)));
      if (!cross) continue;
      const isEndOf = (seg: Segment): boolean => {
        const first = seg.positions[0];
        const last = seg.positions[seg.positions.length - 1];
        return (!!first && posEquals(cross, first)) || (!!last && posEquals(cross, last));
      };
      if (isEndOf(hs) && isEndOf(vs)) return true;
    }
  }
  return false;
}

/**
 * 选择特殊棋子的生成位置。
 * ★ 优先用玩家操作的格子（preferredOrigin），这是"是我造出来的"的来源。
 *   玩家格不在本组时（例如连锁掉落自然形成的匹配），回退：
 *   交叉型用拐点，直线型用中点。
 */
function pickOrigin(
  segs: readonly Segment[],
  positions: readonly Pos[],
  preferred: readonly Pos[],
): Pos {
  for (const p of preferred) {
    if (positions.some((q) => posEquals(p, q))) return p;
  }

  const h = segs.filter((s) => s.orientation === 'h');
  const v = segs.filter((s) => s.orientation === 'v');
  for (const hs of h) {
    for (const vs of v) {
      const cross = hs.positions.find((p) => vs.positions.some((q) => posEquals(p, q)));
      if (cross) return cross; // 拐点
    }
  }
  return positions[Math.floor(positions.length / 2)] as Pos;
}

/**
 * 找出棋盘上所有匹配组。
 *
 * @param preferredOrigin 玩家本回合操作的格子（通常是交换的两格）。
 *        只影响 `origin` 的选取，不影响是否匹配。
 */
export function findAllMatches(
  board: BoardState,
  preferredOrigin: readonly Pos[] = [],
): readonly MatchGroup[] {
  const segments = findSegments(board);
  if (segments.length === 0) return [];

  // 并查集：把共享格子的线段合并成一组
  const parent = segments.map((_, i) => i);
  const find = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r] as number;
    while (parent[i] !== r) {
      const next = parent[i] as number;
      parent[i] = r;
      i = next;
    }
    return r;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const owner = new Map<string, number>();
  segments.forEach((seg, i) => {
    for (const p of seg.positions) {
      const k = keyOf(p);
      const prev = owner.get(k);
      if (prev === undefined) owner.set(k, i);
      else union(prev, i);
    }
  });

  const grouped = new Map<number, Segment[]>();
  segments.forEach((seg, i) => {
    const root = find(i);
    const list = grouped.get(root);
    if (list) list.push(seg);
    else grouped.set(root, [seg]);
  });

  const out: MatchGroup[] = [];
  for (const segs of grouped.values()) {
    const seen = new Set<string>();
    const positions: Pos[] = [];
    for (const seg of segs) {
      for (const p of seg.positions) {
        const k = keyOf(p);
        if (!seen.has(k)) {
          seen.add(k);
          positions.push(p);
        }
      }
    }
    const color = segs[0]?.color;
    if (!color) continue;
    out.push({
      positions,
      color,
      shape: classify(segs),
      origin: pickOrigin(segs, positions, preferredOrigin),
    });
  }
  return out;
}

/** 该交换是否会产生匹配——用于输入合法性判断与死局检测 */
export function wouldMatch(board: BoardState, a: Pos, b: Pos): boolean {
  // ★ 用 isSwappable 而非 isPlayable —— 被冰锁住的棋子不能交换
  if (!isSwappable(board, a) || !isSwappable(board, b)) return false;
  const pa = cellAt(board, a)?.piece;
  const pb = cellAt(board, b)?.piece;
  if (!pa || !pb) return false;
  // 同色交换等于没换，不可能凭空产生新匹配
  if (pa.color === pb.color && pa.special === 'none' && pb.special === 'none') return false;
  return findAllMatches(swapPieces(board, a, b)).length > 0;
}

/**
 * 列出全部合法 Move。
 * 只向右、向下试探——向左/向上是同一个交换的重复。
 */
export function findAllValidMoves(board: BoardState): readonly { a: Pos; b: Pos }[] {
  const out: { a: Pos; b: Pos }[] = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const a = { col, row };
      const right = { col: col + 1, row };
      const down = { col, row: row + 1 };
      if (col + 1 < board.cols && wouldMatch(board, a, right)) out.push({ a, b: right });
      if (row + 1 < board.rows && wouldMatch(board, a, down)) out.push({ a, b: down });
    }
  }
  return out;
}

/**
 * 是否存在任一合法 Move。
 * 用于：死局检测（§5.4）、关卡 Schema 校验的「开局存在合法 Move」（§11.2）。
 * 找到一个就返回，不枚举全部。
 */
export function hasAnyValidMove(board: BoardState): boolean {
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const a = { col, row };
      if (col + 1 < board.cols && wouldMatch(board, a, { col: col + 1, row })) return true;
      if (row + 1 < board.rows && wouldMatch(board, a, { col, row: row + 1 })) return true;
    }
  }
  return false;
}
