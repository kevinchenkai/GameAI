/**
 * core/board.ts —— 棋盘状态与基础操作（M0 骨架，实现见 M1）
 *
 * 设计约定：BoardState 视为**不可变**。所有变更返回新对象，
 * 这样事件序列可以安全地引用中间状态，回放与快照也不需要深拷贝。
 */

import { locksPieceBeneath } from './types';
import type { BoardState, Cell, Piece, Pos } from './types';

export const EMPTY_CELL: Cell = { piece: null, obstacle: null, blocked: false };

export function idx(board: Pick<BoardState, 'cols'>, pos: Pos): number {
  return pos.row * board.cols + pos.col;
}

export function inBounds(board: BoardState, pos: Pos): boolean {
  return pos.col >= 0 && pos.col < board.cols && pos.row >= 0 && pos.row < board.rows;
}

export function cellAt(board: BoardState, pos: Pos): Cell | null {
  if (!inBounds(board, pos)) return null;
  return board.cells[idx(board, pos)] ?? null;
}

export function pieceAt(board: BoardState, pos: Pos): Piece | null {
  return cellAt(board, pos)?.piece ?? null;
}

/** 是否可放棋子：在界内、不是洞 */
export function isPlayable(board: BoardState, pos: Pos): boolean {
  const cell = cellAt(board, pos);
  return cell !== null && !cell.blocked;
}

/**
 * 玩家能否交换这一格。
 * ★ 比 isPlayable 更严：**被冰覆盖的棋子不能被交换** ——
 *   玩家必须先破冰。冰是"锁"，不是"装饰"。
 *   （判据放在 board 层，是因为 matcher 与 resolver 都要用。）
 */
export function isSwappable(board: BoardState, pos: Pos): boolean {
  const cell = cellAt(board, pos);
  if (!cell || cell.blocked || !cell.piece) return false;
  return !(cell.obstacle && locksPieceBeneath(cell.obstacle.kind));
}

/** 两格是否正交相邻（对角不算——三消只允许正交交换） */
export function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
}

export function posEquals(a: Pos, b: Pos): boolean {
  return a.col === b.col && a.row === b.row;
}

/** 返回替换了指定格子的新棋盘（不改入参） */
export function withCell(board: BoardState, pos: Pos, cell: Cell): BoardState {
  const cells = board.cells.slice();
  cells[idx(board, pos)] = cell;
  return { ...board, cells };
}

/** 返回替换了多个格子的新棋盘（只复制一次数组，比连续 withCell 快） */
export function withCells(
  board: BoardState,
  updates: readonly { readonly pos: Pos; readonly cell: Cell }[],
): BoardState {
  if (updates.length === 0) return board;
  const cells = board.cells.slice();
  for (const u of updates) {
    cells[idx(board, u.pos)] = u.cell;
  }
  return { ...board, cells };
}

/** 遍历所有格子（行优先），供 matcher / generator 用 */
export function forEachPos(board: BoardState, fn: (pos: Pos) => void): void {
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      fn({ col, row });
    }
  }
}

/** 创建空棋盘（含挖洞）。blocked 越界坐标直接报错，不静默忽略 */
export function createEmptyBoard(
  cols: number,
  rows: number,
  blocked: readonly Pos[] = [],
): BoardState {
  if (cols <= 0 || rows <= 0) {
    throw new Error(`createEmptyBoard: 非法尺寸 ${cols}×${rows}`);
  }
  const cells: Cell[] = new Array<Cell>(cols * rows).fill(EMPTY_CELL);
  const base = { cols, rows };
  for (const pos of blocked) {
    if (pos.col < 0 || pos.col >= cols || pos.row < 0 || pos.row >= rows) {
      throw new Error(`createEmptyBoard: blocked 坐标越界 (${pos.col},${pos.row})`);
    }
    cells[idx(base, pos)] = { piece: null, obstacle: null, blocked: true };
  }
  return { cols, rows, cells };
}

/**
 * 交换两格棋子。
 * ★ 不做合法性判断（是否相邻、是否成匹配）—— 那是 resolver 的职责。
 *   这里只做机械交换，好处是 matcher 可以用它做"假设交换"试算。
 */
export function swapPieces(board: BoardState, a: Pos, b: Pos): BoardState {
  const ca = cellAt(board, a);
  const cb = cellAt(board, b);
  if (!ca || !cb) throw new Error('swapPieces: 坐标越界');
  return withCells(board, [
    { pos: a, cell: { ...ca, piece: cb.piece } },
    { pos: b, cell: { ...cb, piece: ca.piece } },
  ]);
}
