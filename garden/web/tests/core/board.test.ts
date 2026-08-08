/**
 * board 单测 + 重力行为
 *
 * ★ 重力里最容易错的是**洞（blocked）阻断下落** ——
 *   棋子不能穿过洞。这条不测的话，非矩形棋盘会出现"棋子从洞里穿过去"。
 */

import { describe, expect, it } from 'vitest';
import {
  cellAt,
  createEmptyBoard,
  idx,
  inBounds,
  isAdjacent,
  isPlayable,
  pieceAt,
  posEquals,
  swapPieces,
  withCell,
  withCells,
} from '../../src/core/board';
import { resolveCascades } from '../../src/core/resolver';
import { makeBoard, makeSession, renderBoard, P } from './helpers';
import type { Cell } from '../../src/core/types';

describe('board —— 基础操作', () => {
  it('idx 行优先', () => {
    expect(idx({ cols: 8 }, P(3, 2))).toBe(19);
    expect(idx({ cols: 8 }, P(0, 0))).toBe(0);
  });

  it('inBounds 边界', () => {
    const b = createEmptyBoard(3, 3);
    expect(inBounds(b, P(0, 0))).toBe(true);
    expect(inBounds(b, P(2, 2))).toBe(true);
    expect(inBounds(b, P(3, 0))).toBe(false);
    expect(inBounds(b, P(-1, 0))).toBe(false);
  });

  it('isAdjacent 只认正交，不认对角', () => {
    expect(isAdjacent(P(1, 1), P(1, 2))).toBe(true);
    expect(isAdjacent(P(1, 1), P(2, 1))).toBe(true);
    expect(isAdjacent(P(1, 1), P(2, 2))).toBe(false); // 对角
    expect(isAdjacent(P(1, 1), P(1, 1))).toBe(false); // 自己
    expect(isAdjacent(P(1, 1), P(1, 3))).toBe(false); // 隔一格
  });

  it('posEquals', () => {
    expect(posEquals(P(1, 2), P(1, 2))).toBe(true);
    expect(posEquals(P(1, 2), P(2, 1))).toBe(false);
  });

  it('cellAt / pieceAt 越界返回 null', () => {
    const b = makeBoard('RG\nBY');
    expect(pieceAt(b, P(0, 0))?.color).toBe('red');
    expect(cellAt(b, P(9, 9))).toBeNull();
    expect(pieceAt(b, P(9, 9))).toBeNull();
  });

  it('isPlayable：洞不可放棋子', () => {
    const b = makeBoard('R#\nBY');
    expect(isPlayable(b, P(0, 0))).toBe(true);
    expect(isPlayable(b, P(1, 0))).toBe(false);
    expect(isPlayable(b, P(9, 9))).toBe(false);
  });
});

describe('board —— 不可变性（事件序列与回放依赖这条）', () => {
  const EMPTY: Cell = { piece: null, obstacle: null, blocked: false };

  it('withCell 不改入参', () => {
    const b = makeBoard('RG\nBY');
    const snapshot = renderBoard(b);
    withCell(b, P(0, 0), EMPTY);
    expect(renderBoard(b)).toBe(snapshot);
  });

  it('withCells 不改入参，且能一次改多格', () => {
    const b = makeBoard('RG\nBY');
    const snapshot = renderBoard(b);
    const next = withCells(b, [
      { pos: P(0, 0), cell: EMPTY },
      { pos: P(1, 1), cell: EMPTY },
    ]);
    expect(renderBoard(b)).toBe(snapshot);
    expect(renderBoard(next)).toBe('.G\nB.');
  });

  it('withCells 空更新返回原对象（省一次复制）', () => {
    const b = makeBoard('RG\nBY');
    expect(withCells(b, [])).toBe(b);
  });

  it('swapPieces 不改入参', () => {
    const b = makeBoard('RG\nBY');
    const snapshot = renderBoard(b);
    const next = swapPieces(b, P(0, 0), P(1, 0));
    expect(renderBoard(b)).toBe(snapshot);
    expect(renderBoard(next)).toBe('GR\nBY');
  });

  it('swapPieces 保留棋子 id（换的是位置，不是身份）', () => {
    const b = makeBoard('RG\nBY');
    const idA = pieceAt(b, P(0, 0))!.id;
    const next = swapPieces(b, P(0, 0), P(1, 0));
    expect(pieceAt(next, P(1, 0))!.id).toBe(idA);
  });

  it('swapPieces 越界报错', () => {
    const b = makeBoard('RG\nBY');
    expect(() => swapPieces(b, P(0, 0), P(9, 9))).toThrow(/越界/);
  });
});

describe('createEmptyBoard', () => {
  it('全部格子为空且可放', () => {
    const b = createEmptyBoard(3, 2);
    expect(b.cells).toHaveLength(6);
    expect(renderBoard(b)).toBe('...\n...');
  });

  it('blocked 标记正确', () => {
    const b = createEmptyBoard(3, 2, [P(1, 0)]);
    expect(renderBoard(b)).toBe('.#.\n...');
  });

  it('非法尺寸报错', () => {
    expect(() => createEmptyBoard(0, 3)).toThrow(/非法尺寸/);
    expect(() => createEmptyBoard(3, -1)).toThrow(/非法尺寸/);
  });

  it('★ blocked 越界报错，不静默忽略', () => {
    expect(() => createEmptyBoard(3, 3, [P(5, 0)])).toThrow(/越界/);
    expect(() => createEmptyBoard(3, 3, [P(0, -1)])).toThrow(/越界/);
  });
});

/**
 * 重力通过 resolveCascades 间接测试（applyGravity 是 resolver 内部函数）。
 * 这样测的是**对外可观察的行为**，而不是实现细节。
 */
describe('重力 —— 通过结算观察', () => {
  it('消除后上方棋子下落填补', () => {
    // 底行 R R R 会被消除，上方棋子落下来
    const s = makeSession(`
      G B G
      B G B
      G B G
      R R R
    `);
    const r = resolveCascades(s);
    const fall = r.events.find((e) => e.t === 'fall');
    expect(fall?.t === 'fall' && fall.moves.length).toBeGreaterThan(0);
    // 结算后所有非洞格都有棋子
    for (const cell of r.session.board.cells) {
      if (!cell.blocked) expect(cell.piece).not.toBeNull();
    }
  });

  it('★ 洞阻断下落：洞上方的棋子不会穿过洞', () => {
    // 第 1 列有个洞在 row=1；底部 R R R 被消除
    const s = makeSession(`
      G B G
      B # B
      G B G
      R R R
    `);
    const r = resolveCascades(s);
    // 洞仍是洞，里面没有棋子
    const hole = cellAt(r.session.board, P(1, 1));
    expect(hole?.blocked).toBe(true);
    expect(hole?.piece).toBeNull();
    // 其余格都填满了
    for (const cell of r.session.board.cells) {
      if (!cell.blocked) expect(cell.piece).not.toBeNull();
    }
  });

  it('fall 事件里的 id 都能在结算后的棋盘上找到', () => {
    const s = makeSession(`
      G B G
      B G B
      G B G
      R R R
    `);
    const r = resolveCascades(s);
    const boardIds = new Set(
      r.session.board.cells.map((c) => c.piece?.id).filter((x): x is number => x !== undefined),
    );
    for (const e of r.events) {
      if (e.t === 'fall') {
        for (const m of e.moves) expect(boardIds.has(m.id)).toBe(true);
      }
    }
  });

  it('★ 下落不丢棋子：消除数 + 补充数 = 变化总量守恒', () => {
    const s = makeSession(`
      G B G
      B G B
      G B G
      R R R
    `);
    const r = resolveCascades(s);

    let cleared = 0;
    let spawned = 0;
    const clearedSet = new Set<string>();
    for (const e of r.events) {
      if (e.t === 'match') for (const p of e.positions) clearedSet.add(`${p.col},${p.row}|${e.cascadeLevel}`);
      if (e.t === 'spawn') spawned += e.items.length;
    }
    cleared = clearedSet.size;

    // 棋盘格数不变，消掉多少就该补多少
    expect(spawned).toBe(cleared);
  });
});
