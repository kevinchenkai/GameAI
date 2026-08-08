/**
 * core/generator.ts —— 棋盘 / 掉落生成
 *
 * ★ 动态辅助挂在这里，且**只在生成阶段**（框架 §7）。
 *   不做运行时干预——玩家会隐约感觉"棋盘在配合我"，破坏
 *   "挑战来自思考"的核心承诺，且出问题时无法区分是 bug 还是辅助生效。
 */

import { cellAt, createEmptyBoard, forEachPos, isPlayable, withCells } from './board';
import { findAllMatches, hasAnyValidMove } from './matcher';
import type { BoardState, Cell, LevelConfig, Piece, PieceColor, Pos } from './types';
import type { Rng } from './rng';

export interface GeneratorOptions {
  readonly colors: readonly PieceColor[];
  /** 目标棋子掉落权重加成（config/assistance.ts 的 level1/level2） */
  readonly targetPieceWeightBonus?: number;
  readonly targetColors?: readonly PieceColor[];
}

/**
 * 棋子 id 分配器。
 * ★ id 必须全局唯一且**可复现**：渲染层靠它追踪精灵，回放靠它对齐。
 *   所以不能用随机数，用单调递增计数器，并随 session 一起存档。
 */
export interface PieceIdSource {
  next(): number;
}

export function createIdSource(start = 1): PieceIdSource {
  let n = start;
  return { next: () => n++ };
}

/** 按动态辅助的权重挑一个颜色 */
function pickColor(rng: Rng, options: GeneratorOptions): PieceColor {
  const { colors, targetColors, targetPieceWeightBonus = 0 } = options;
  if (colors.length === 0) throw new Error('generator: colors 不能为空');
  if (targetPieceWeightBonus <= 0 || !targetColors || targetColors.length === 0) {
    return rng.pick(colors);
  }
  const weights = colors.map((c) => (targetColors.includes(c) ? 1 + targetPieceWeightBonus : 1));
  return colors[rng.weighted(weights)] as PieceColor;
}

function makePiece(color: PieceColor, ids: PieceIdSource): Piece {
  return { id: ids.next(), color, special: 'none' };
}

/**
 * 该位置放这个颜色会不会立刻形成 3 连？
 * 只需往左看 2 格、往上看 2 格——右边和下边还没生成。
 */
function wouldFormMatchAt(board: BoardState, pos: Pos, color: PieceColor): boolean {
  const sameAt = (col: number, row: number): boolean => {
    const c = cellAt(board, { col, row });
    return !!c && !c.blocked && c.piece?.color === color;
  };
  if (sameAt(pos.col - 1, pos.row) && sameAt(pos.col - 2, pos.row)) return true;
  if (sameAt(pos.col, pos.row - 1) && sameAt(pos.col, pos.row - 2)) return true;
  return false;
}

/**
 * 生成开局棋盘。
 * ★ 必须满足两条（关卡 Schema 校验会查，§11.2）：
 *   1. 开局不自动 Match —— 否则一进关就自己消除
 *   2. 开局存在合法 Move —— 否则一进关就 shuffle
 */
export function generateInitialBoard(
  level: LevelConfig,
  rng: Rng,
  options?: GeneratorOptions,
  ids: PieceIdSource = createIdSource(),
): BoardState {
  const opts: GeneratorOptions = options ?? { colors: level.colors };
  if (opts.colors.length < 3) {
    throw new Error(`generateInitialBoard: 至少需要 3 种颜色，收到 ${opts.colors.length}`);
  }

  // 整盘重试：逐格避让能保证「无自动匹配」，但保证不了「存在合法 Move」，
  // 后者是全局性质，只能生成完再验。
  const MAX_ATTEMPTS = 50;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let board = createEmptyBoard(level.board.cols, level.board.rows, level.board.blocked ?? []);
    const updates: { pos: Pos; cell: Cell }[] = [];

    forEachPos(board, (pos) => {
      if (!isPlayable(board, pos)) return;
      // 逐格避让：挑一个不会立刻成 3 连的颜色
      const candidates = opts.colors.filter((c) => !wouldFormMatchAt(board, pos, c));
      const pool = candidates.length > 0 ? candidates : opts.colors;
      const color = pickColor(rng, { ...opts, colors: pool });
      const cell: Cell = { piece: makePiece(color, ids), obstacle: null, blocked: false };
      updates.push({ pos, cell });
      // 立即写回，后续格子的避让判断才看得到它
      board = withCells(board, [{ pos, cell }]);
    });

    if (findAllMatches(board).length === 0 && hasAnyValidMove(board)) return board;
  }

  throw new Error(
    `generateInitialBoard: ${MAX_ATTEMPTS} 次尝试仍无法生成合法开局（关卡 ${level.id}）。` +
      `通常是颜色数太少或洞挖得太碎，请检查关卡配置。`,
  );
}

/**
 * 为空格生成新棋子（连锁掉落用）。
 *
 * ★ 这里**不做避让** —— 连锁中新棋子凑成匹配是正常且期待的（那就是 cascade）。
 *   也因此不需要看棋盘，只需要空格列表。
 */
export function generateRefill(
  emptyPositions: readonly Pos[],
  rng: Rng,
  options: GeneratorOptions,
  ids: PieceIdSource,
): readonly { readonly piece: Piece; readonly at: Pos }[] {
  return emptyPositions.map((at) => ({ piece: makePiece(pickColor(rng, options), ids), at }));
}

/**
 * 死局时重排现有棋子（不新增棋子，保持难度不变）。
 * 重排后必须「无自动匹配 + 有合法 Move」，否则重试。
 */
export function shuffleBoard(board: BoardState, rng: Rng): BoardState {
  const positions: Pos[] = [];
  const pieces: Piece[] = [];
  forEachPos(board, (pos) => {
    const cell = cellAt(board, pos);
    if (cell && !cell.blocked && cell.piece) {
      positions.push(pos);
      pieces.push(cell.piece);
    }
  });

  const MAX_ATTEMPTS = 100;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shuffled = rng.shuffle(pieces);
    const next = withCells(
      board,
      positions.map((pos, i) => {
        const cell = cellAt(board, pos) as Cell;
        return { pos, cell: { ...cell, piece: shuffled[i] as Piece } };
      }),
    );
    if (findAllMatches(next).length === 0 && hasAnyValidMove(next)) return next;
  }

  // 兜底：棋子组合本身可能无解（例如只剩两种颜色各一个）。
  // 返回原盘由上层处理，好过抛错让整局崩掉。
  return board;
}
