/**
 * generator 单测 —— 开局棋盘的两条硬保证（框架 §11.2）：
 *   1. 开局不自动 Match —— 否则一进关就自己消除
 *   2. 开局存在合法 Move —— 否则一进关就 shuffle
 */

import { describe, expect, it } from 'vitest';
import {
  createIdSource,
  generateInitialBoard,
  generateRefill,
  generateRefillAvoidingDeadlock,
  shuffleBoard,
} from '../../src/core/generator';
import { findAllMatches, hasAnyValidMove } from '../../src/core/matcher';
import { createRng } from '../../src/core/rng';
import { cellAt, createEmptyBoard, withCells } from '../../src/core/board';
import type { Cell, PieceColor, Pos } from '../../src/core/types';
import type { Rng } from '../../src/core/rng';
import { makeBoard, makeLevel, P } from './helpers';

describe('generateInitialBoard —— 两条硬保证', () => {
  it('★ 30 个不同种子，全部满足「无自动匹配 + 有合法 Move」', () => {
    const level = makeLevel();
    for (let seed = 1; seed <= 30; seed++) {
      const board = generateInitialBoard(level, createRng(seed));
      expect(findAllMatches(board), `seed=${seed} 开局自带匹配`).toHaveLength(0);
      expect(hasAnyValidMove(board), `seed=${seed} 开局无合法 Move`).toBe(true);
    }
  });

  it('4 色（新手关）同样满足两条保证', () => {
    const level = makeLevel({ colors: ['red', 'green', 'blue', 'yellow'] });
    for (let seed = 1; seed <= 20; seed++) {
      const board = generateInitialBoard(level, createRng(seed));
      expect(findAllMatches(board)).toHaveLength(0);
      expect(hasAnyValidMove(board)).toBe(true);
    }
  });

  it('3 色（最少）也能生成', () => {
    const level = makeLevel({ colors: ['red', 'green', 'blue'] });
    const board = generateInitialBoard(level, createRng(7));
    expect(findAllMatches(board)).toHaveLength(0);
    expect(hasAnyValidMove(board)).toBe(true);
  });

  it('少于 3 色直接报错，不静默降级', () => {
    const level = makeLevel({ colors: ['red', 'green'] });
    expect(() => generateInitialBoard(level, createRng(1))).toThrow(/至少需要 3 种颜色/);
  });

  it('带洞的非矩形棋盘：洞里没有棋子，其余格都有', () => {
    const level = makeLevel({
      board: { cols: 8, rows: 8, blocked: [P(0, 0), P(7, 0), P(0, 7), P(7, 7)] },
    });
    const board = generateInitialBoard(level, createRng(3));
    expect(cellAt(board, P(0, 0))?.blocked).toBe(true);
    expect(cellAt(board, P(0, 0))?.piece).toBeNull();
    for (const cell of board.cells) {
      if (!cell.blocked) expect(cell.piece).not.toBeNull();
    }
  });

  it('7×7 降级棋盘同样可用（小屏 fallback）', () => {
    const level = makeLevel({ board: { cols: 7, rows: 7 } });
    const board = generateInitialBoard(level, createRng(11));
    expect(board.cols).toBe(7);
    expect(findAllMatches(board)).toHaveLength(0);
    expect(hasAnyValidMove(board)).toBe(true);
  });

  it('★ 同种子产出完全相同的棋盘（复现的前提）', () => {
    const level = makeLevel();
    const a = generateInitialBoard(level, createRng(999), undefined, createIdSource(1));
    const b = generateInitialBoard(level, createRng(999), undefined, createIdSource(1));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('棋子 id 在盘内唯一', () => {
    const board = generateInitialBoard(makeLevel(), createRng(5));
    const ids = board.cells.map((c) => c.piece?.id).filter((x): x is number => x !== undefined);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('generateInitialBoard —— 动态辅助（只在生成阶段）', () => {
  it('目标色权重加成后，目标色占比明显上升', () => {
    const level = makeLevel();
    const plain = generateInitialBoard(level, createRng(42), { colors: level.colors });
    const boosted = generateInitialBoard(level, createRng(42), {
      colors: level.colors,
      targetColors: ['red'],
      targetPieceWeightBonus: 1.5, // 大幅加成，让统计差异明确
    });
    const countRed = (b: typeof plain): number =>
      b.cells.filter((c) => c.piece?.color === 'red').length;
    expect(countRed(boosted)).toBeGreaterThan(countRed(plain));
  });

  it('加成为 0 时行为与不传辅助一致', () => {
    const level = makeLevel();
    const a = generateInitialBoard(level, createRng(8), { colors: level.colors }, createIdSource(1));
    const b = generateInitialBoard(
      level,
      createRng(8),
      { colors: level.colors, targetColors: ['red'], targetPieceWeightBonus: 0 },
      createIdSource(1),
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('generateRefill', () => {
  it('为每个空格生成一个棋子，位置对应', () => {
    const positions = [P(0, 0), P(1, 0), P(2, 3)];
    const items = generateRefill(positions, createRng(1), { colors: ['red', 'green', 'blue'] }, createIdSource(100));
    expect(items).toHaveLength(3);
    items.forEach((item, i) => expect(item.at).toEqual(positions[i]));
  });

  it('id 连续且不重复', () => {
    const items = generateRefill(
      [P(0, 0), P(1, 0), P(2, 0)],
      createRng(1),
      { colors: ['red', 'green', 'blue'] },
      createIdSource(50),
    );
    expect(items.map((i) => i.piece.id)).toEqual([50, 51, 52]);
  });

  it('新棋子都是普通棋子（特殊棋子由匹配生成，不从天上掉）', () => {
    const items = generateRefill(
      [P(0, 0), P(1, 0)],
      createRng(1),
      { colors: ['red', 'green', 'blue'] },
      createIdSource(1),
    );
    for (const item of items) expect(item.piece.special).toBe('none');
  });
});

describe('shuffleBoard —— 死局重排', () => {
  it('重排后无自动匹配且有合法 Move', () => {
    const dead = makeBoard(`
      R G B R G B
      B R G B R G
      G B R G B R
      R G B R G B
      B R G B R G
      G B R G B R
    `);
    expect(hasAnyValidMove(dead)).toBe(false);

    const shuffled = shuffleBoard(dead, createRng(1));
    expect(findAllMatches(shuffled)).toHaveLength(0);
    expect(hasAnyValidMove(shuffled)).toBe(true);
  });

  it('★ 不新增也不丢失棋子（保持难度不变）', () => {
    const dead = makeBoard(`
      R G B R G B
      B R G B R G
      G B R G B R
      R G B R G B
      B R G B R G
      G B R G B R
    `);
    const shuffled = shuffleBoard(dead, createRng(2));

    const tally = (b: typeof dead): Record<string, number> => {
      const t: Record<string, number> = {};
      for (const c of b.cells) if (c.piece) t[c.piece.color] = (t[c.piece.color] ?? 0) + 1;
      return t;
    };
    expect(tally(shuffled)).toEqual(tally(dead));

    const ids = (b: typeof dead): number[] =>
      b.cells.map((c) => c.piece?.id).filter((x): x is number => x !== undefined).sort((a, b2) => a - b2);
    expect(ids(shuffled)).toEqual(ids(dead));
  });

  it('洞的位置在重排后不变', () => {
    const board = makeBoard(`
      R G B R G B
      B # G B R G
      G B R G B R
      R G B R G B
      B R G B # G
      G B R G B R
    `);
    const shuffled = shuffleBoard(board, createRng(3));
    expect(cellAt(shuffled, P(1, 1))?.blocked).toBe(true);
    expect(cellAt(shuffled, P(4, 4))?.blocked).toBe(true);
    expect(cellAt(shuffled, P(1, 1))?.piece).toBeNull();
  });

  it('无解组合时返回原盘兜底，不抛错让整局崩掉', () => {
    // 只有 3 个棋子，怎么排都不可能有合法 move
    const tiny = makeBoard(`
      R G .
      . . .
      . . .
    `);
    expect(() => shuffleBoard(tiny, createRng(1))).not.toThrow();
  });
});

/**
 * ★★ generateRefillAvoidingDeadlock —— **预防**死局，而不是事后 shuffle
 *
 *   `generateRefill` 是盲填的：随机挑颜色，填完可能整盘无合法 Move，
 *   于是回合末触发 shuffle。玩家看到"棋盘自己动了一下"——
 *   不扣步、不算 bug，但**看得见**。
 *   6 色 7×7 下实测每 12 步就会遇到一次（L6 死局率 8.5%）。
 *
 *   本函数填完检查一次，无合法 Move 就重掷。实测把 L6~L8 的
 *   死局率从 6.5~8.5% 压到 0.5%，**且保留 6 色、难度曲线不变**。
 */
describe('★★ generateRefillAvoidingDeadlock —— 预防死局', () => {
  const COLORS: PieceColor[] = ['red', 'yellow', 'green', 'blue', 'orange', 'purple'];

  /** 造一个只剩少量空格的棋盘，其余格子已填 */
  function boardWithHoles(cols: number, rows: number, holes: readonly Pos[], rng: Rng) {
    const lv = {
      id: 99,
      board: { cols, rows },
      moves: 20,
      colors: COLORS,
      objectives: [{ kind: 'collect' as const, piece: 'red' as const, count: 5 }],
      stars: { two: 3, three: 6 },
    };
    let b = generateInitialBoard(lv, rng, { colors: COLORS }, createIdSource(1));
    // 挖空指定格
    b = withCells(
      b,
      holes.map((pos) => ({ pos, cell: { ...(cellAt(b, pos) as Cell), piece: null } })),
    );
    return b;
  }

  it('填满所有空格，一个不漏', () => {
    const rng = createRng(1234);
    const holes: Pos[] = [
      { col: 0, row: 0 },
      { col: 3, row: 2 },
      { col: 6, row: 6 },
    ];
    const board = boardWithHoles(7, 7, holes, rng);
    const items = generateRefillAvoidingDeadlock(board, holes, rng, { colors: COLORS }, createIdSource(500));
    expect(items).toHaveLength(holes.length);
    for (const h of holes) {
      expect(items.some((i) => i.at.col === h.col && i.at.row === h.row)).toBe(true);
    }
  });

  /**
   * ★ 每次重掷都必须**新建棋子 id**。
   *   id 是渲染层的精灵索引 —— 复用会让两个不同棋子拿到同一个 id，
   *   表现是"一格里两个棋子重叠"（这个 bug 真实发生过，见 EventPlayer）。
   */
  it('★★ 产出的棋子 id 互不重复', () => {
    const rng = createRng(777);
    const holes: Pos[] = Array.from({ length: 7 }, (_, i) => ({ col: i, row: 0 }));
    const board = boardWithHoles(7, 7, holes, rng);
    const items = generateRefillAvoidingDeadlock(board, holes, rng, { colors: COLORS }, createIdSource(1000));
    const ids = items.map((i) => i.piece.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * ★★ 这是**有区分度**的那一条：用一个盲填就会 6.6% 概率死局的构造，
   *   跑 300 个种子，要求**一次都不能**填出死局。
   *
   *   ⚠️ 第一版我用 7×7 6 色随机盘测，**把检查删掉测试照样全绿** ——
   *   随机大盘本来就极少死局（1.8%），300 次里碰不上几次。
   *   测试必须构造在**问题真的会发生**的条件下，否则它只是在陪跑。
   *
   *   构造：3×3，底下两行铺成对角花纹（彼此交换都不成 3 连），
   *   于是整盘死活全看补充的那一行。
   */
  it('★★ 在易死局构造上，300 个种子一次都不许填出死局', () => {
    const few: PieceColor[] = ['red', 'yellow', 'green'];
    const PATTERN: PieceColor[][] = [
      ['red', 'yellow', 'green'],
      ['yellow', 'green', 'red'],
    ];
    const holes: Pos[] = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];

    let deadlocks = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed);
      const ids = createIdSource(1);
      let b = createEmptyBoard(3, 3, []);
      const ups: { pos: Pos; cell: Cell }[] = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          ups.push({
            pos: { col: c, row: r + 1 },
            cell: {
              piece: { id: ids.next(), color: PATTERN[r]![c]!, special: 'none' },
              obstacle: null,
              blocked: false,
            },
          });
        }
      }
      b = withCells(b, ups);

      const items = generateRefillAvoidingDeadlock(b, holes, rng, { colors: few }, ids);
      const filled = withCells(
        b,
        items.map(({ piece, at }) => ({ pos: at, cell: { ...(cellAt(b, at) as Cell), piece } })),
      );
      if (findAllMatches(filled).length === 0 && !hasAnyValidMove(filled)) deadlocks++;
    }
    expect(deadlocks, '仍然填出了死局 —— 避让逻辑没生效').toBe(0);
  });

  it('空格列表为空时返回空数组，不报错', () => {
    const rng = createRng(9);
    const board = boardWithHoles(7, 7, [], rng);
    expect(generateRefillAvoidingDeadlock(board, [], rng, { colors: COLORS }, createIdSource())).toEqual([]);
  });

  /**
   * ★★ 重试有上限（12 次），达到上限**返回最后一次结果**而不是抛错或死循环。
   *   极端棋盘可能怎么填都是死局 —— 那时交给回合末的 shuffle 兜底，
   *   那条路本来就存在，是正确的降级。
   *
   *   这里用 3 色 + 极小棋盘逼出高频死局，确认函数仍会返回而不是卡住。
   */
  it('★★ 极端棋盘不死循环，仍按时返回', () => {
    const rng = createRng(4242);
    const few: PieceColor[] = ['red', 'yellow', 'green'];
    const lv = {
      id: 98,
      board: { cols: 3, rows: 3 },
      moves: 5,
      colors: few,
      objectives: [{ kind: 'collect' as const, piece: 'red' as const, count: 3 }],
      stars: { two: 1, three: 2 },
    };
    const b = generateInitialBoard(lv, rng, { colors: few }, createIdSource(1));
    const holes: Pos[] = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    const board = withCells(
      b,
      holes.map((pos) => ({ pos, cell: { ...(cellAt(b, pos) as Cell), piece: null } })),
    );
    const t0 = Date.now();
    const items = generateRefillAvoidingDeadlock(board, holes, rng, { colors: few }, createIdSource(3000));
    expect(items).toHaveLength(3);
    expect(Date.now() - t0).toBeLessThan(2000); // 没有卡住
  });
});
