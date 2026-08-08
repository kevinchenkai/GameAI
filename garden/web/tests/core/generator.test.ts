/**
 * generator 单测 —— 开局棋盘的两条硬保证（框架 §11.2）：
 *   1. 开局不自动 Match —— 否则一进关就自己消除
 *   2. 开局存在合法 Move —— 否则一进关就 shuffle
 */

import { describe, expect, it } from 'vitest';
import { createIdSource, generateInitialBoard, generateRefill, shuffleBoard } from '../../src/core/generator';
import { findAllMatches, hasAnyValidMove } from '../../src/core/matcher';
import { createRng } from '../../src/core/rng';
import { cellAt } from '../../src/core/board';
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
