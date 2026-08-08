/**
 * tests/core/helpers.ts —— 用 ASCII 图构造棋盘
 *
 * 连锁与匹配的用例，用字符画写出来一眼能看懂棋型；
 * 用 `{col,row}` 坐标堆出来则完全读不懂。测试的可读性直接决定它能不能被维护。
 *
 *   R 红  O 橙  Y 黄  G 绿  P 紫  B 蓝  #=洞  .=空格
 */

import { createEmptyBoard, idx, withCells } from '../../src/core/board';
import { createSession, type SessionState } from '../../src/core/session';
import type {
  BoardState,
  Cell,
  LevelConfig,
  ObstacleKind,
  PieceColor,
  Pos,
  SpecialKind,
} from '../../src/core/types';

const CHAR_TO_COLOR: Readonly<Record<string, PieceColor>> = {
  R: 'red',
  O: 'orange',
  Y: 'yellow',
  G: 'green',
  P: 'purple',
  B: 'blue',
};

const COLOR_TO_CHAR: Readonly<Record<PieceColor, string>> = {
  red: 'R',
  orange: 'O',
  yellow: 'Y',
  green: 'G',
  purple: 'P',
  blue: 'B',
};

/**
 * 从字符画构造棋盘。行内可用空格分隔以便对齐，会被忽略。
 *
 *   makeBoard(`
 *     R R G
 *     Y B Y
 *     G G R
 *   `)
 */
export function makeBoard(art: string): BoardState {
  const lines = art
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/\s+/g, ''));

  if (lines.length === 0) throw new Error('makeBoard: 空图');
  const cols = (lines[0] as string).length;
  const rows = lines.length;
  for (const [i, line] of lines.entries()) {
    if (line.length !== cols) {
      throw new Error(`makeBoard: 第 ${i} 行宽度 ${line.length}，应为 ${cols}`);
    }
  }

  let id = 1;
  const cells: Cell[] = [];
  for (const line of lines) {
    for (const ch of line) {
      if (ch === '#') {
        cells.push({ piece: null, obstacle: null, blocked: true });
      } else if (ch === '.') {
        cells.push({ piece: null, obstacle: null, blocked: false });
      } else {
        const color = CHAR_TO_COLOR[ch];
        if (!color) throw new Error(`makeBoard: 未知字符 '${ch}'`);
        cells.push({ piece: { id: id++, color, special: 'none' }, obstacle: null, blocked: false });
      }
    }
  }
  return { cols, rows, cells };
}

/** 反向渲染，断言失败时能直接看到棋盘长什么样 */
export function renderBoard(board: BoardState): string {
  const out: string[] = [];
  for (let row = 0; row < board.rows; row++) {
    let line = '';
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[idx(board, { col, row })];
      if (!cell) line += '?';
      else if (cell.blocked) line += '#';
      else if (!cell.piece) line += '.';
      else line += COLOR_TO_CHAR[cell.piece.color];
    }
    out.push(line);
  }
  return out.join('\n');
}

export const P = (col: number, row: number): Pos => ({ col, row });

/** 最小可用关卡配置，测试里按需覆盖字段 */
export function makeLevel(over: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 1,
    board: { cols: 8, rows: 8 },
    moves: 20,
    colors: ['red', 'orange', 'yellow', 'green', 'purple', 'blue'],
    objectives: [{ kind: 'collect', piece: 'red', count: 10 }],
    stars: { two: 5, three: 10 },
    ...over,
  };
}

/**
 * 造一个 session，并把棋盘替换成指定的字符画。
 * ★ 绕过 generateInitialBoard 的"无自动匹配"约束，
 *   这样测试才能构造出"一交换就连锁"的棋型。
 */
export function makeSession(art: string, over: Partial<SessionState> = {}): SessionState {
  const board = makeBoard(art);
  const level = makeLevel({ board: { cols: board.cols, rows: board.rows } });
  // createSession 会生成一个随机盘，我们只借它的 rng 初始化，然后换掉棋盘
  const base = createSession(
    makeLevel({ board: { cols: 3, rows: 3 }, colors: ['red', 'green', 'blue'] }),
    12345,
  );

  // ★ nextPieceId 必须跨过图里已用掉的最大 id。
  //   否则补充的新棋子会重发已在盘上的 id —— 渲染层靠 id 追踪精灵，
  //   撞 id 会让两个精灵抢同一个逻辑棋子。
  //   （真实的 createSession 不会出这个问题，是本 helper 换棋盘造成的。）
  const maxId = board.cells.reduce((m, c) => Math.max(m, c.piece?.id ?? 0), 0);

  return {
    ...base,
    level,
    board,
    movesLeft: level.moves,
    nextPieceId: maxId + 1,
    ...over,
  };
}

/** 空盘，用于单独测重力 */
export function emptyBoard(cols: number, rows: number, blocked: readonly Pos[] = []): BoardState {
  return createEmptyBoard(cols, rows, blocked);
}

/**
 * 在字符画基础上叠加特殊棋子与障碍。
 *
 *   makeBoard(art, { specials: [[P(0,0),'bomb']], obstacles: [[P(1,1),'ice',2]] })
 */
export function decorate(
  board: BoardState,
  opts: {
    specials?: readonly (readonly [Pos, SpecialKind])[];
    obstacles?: readonly (readonly [Pos, ObstacleKind, number])[];
  },
): BoardState {
  let out = board;
  for (const [pos, kind] of opts.specials ?? []) {
    const cell = out.cells[idx(out, pos)] as Cell;
    if (!cell.piece) throw new Error(`decorate: (${pos.col},${pos.row}) 没有棋子`);
    out = withCells(out, [{ pos, cell: { ...cell, piece: { ...cell.piece, special: kind } } }]);
  }
  for (const [pos, kind, hp] of opts.obstacles ?? []) {
    const cell = out.cells[idx(out, pos)] as Cell;
    out = withCells(out, [{ pos, cell: { ...cell, obstacle: { kind, hp, maxHp: hp } } }]);
  }
  return out;
}
