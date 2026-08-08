/**
 * matcher 单测 —— 框架 §11.1 列的必测项：
 * 3/4/5 连、T/L 型、边界情况。
 */

import { describe, expect, it } from 'vitest';
import {
  findAllMatches,
  findAllValidMoves,
  hasAnyValidMove,
  wouldMatch,
} from '../../src/core/matcher';
import { makeBoard, P } from './helpers';

const shapesOf = (b: ReturnType<typeof makeBoard>): string[] =>
  findAllMatches(b)
    .map((g) => g.shape)
    .sort();

describe('matcher —— 直线匹配', () => {
  it('横向 3 连', () => {
    const groups = findAllMatches(
      makeBoard(`
        R R R
        G B G
        B G B
      `),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.shape).toBe('line3');
    expect(groups[0]!.color).toBe('red');
    expect(groups[0]!.positions).toHaveLength(3);
  });

  it('纵向 3 连', () => {
    const groups = findAllMatches(
      makeBoard(`
        R G B
        R B G
        R G B
      `),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.shape).toBe('line3');
  });

  it('横向 4 连', () => {
    expect(
      shapesOf(
        makeBoard(`
          R R R R
          G B G B
          B G B G
          G B G B
        `),
      ),
    ).toEqual(['line4']);
  });

  it('纵向 5 连', () => {
    expect(
      shapesOf(
        makeBoard(`
          R G B
          R B G
          R G B
          R B G
          R G B
        `),
      ),
    ).toEqual(['line5']);
  });

  it('2 连不算匹配', () => {
    expect(
      findAllMatches(
        makeBoard(`
          R R G
          G B G
          B G B
        `),
      ),
    ).toHaveLength(0);
  });

  it('同一盘上的两组独立匹配分别识别', () => {
    expect(
      shapesOf(
        makeBoard(`
          R R R G
          B G B G
          Y B Y G
          G Y G Y
        `),
      ),
    ).toEqual(['line3', 'line3']);
  });
});

describe('matcher —— T / L 型（★ 必须合并成一组，不是两组 3 连）', () => {
  it('T 型：横 3 连的中点接一条竖 3 连', () => {
    const groups = findAllMatches(
      makeBoard(`
        R R R
        G R B
        B R G
      `),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.shape).toBe('tShape');
    // 3 + 3 共享 1 个格子 = 5
    expect(groups[0]!.positions).toHaveLength(5);
  });

  it('L 型：拐点同时是两段的端点', () => {
    const groups = findAllMatches(
      makeBoard(`
        R G B
        R B G
        R R R
      `),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.shape).toBe('lShape');
    expect(groups[0]!.positions).toHaveLength(5);
  });

  it('★ 不合并的话会误判成两组 —— 这里断言就是一组', () => {
    const groups = findAllMatches(
      makeBoard(`
        G R B
        R R R
        B R G
      `),
    );
    expect(groups).toHaveLength(1); // 十字：一横一竖共享中心
    expect(groups[0]!.positions).toHaveLength(5);
  });
});

describe('matcher —— 边界情况', () => {
  it('洞（blocked）打断连线：洞两侧的同色不相连', () => {
    expect(
      findAllMatches(
        makeBoard(`
          R R # R R
          G B G B G
          B G B G B
        `),
      ),
    ).toHaveLength(0);
  });

  it('空格（.）同样打断连线', () => {
    expect(
      findAllMatches(
        makeBoard(`
          R R . R R
          G B G B G
          B G B G B
        `),
      ),
    ).toHaveLength(0);
  });

  it('紧贴边缘的匹配也能识别', () => {
    expect(
      shapesOf(
        makeBoard(`
          G B G
          B G B
          R R R
        `),
      ),
    ).toEqual(['line3']);
  });

  it('整行同色（8 连）识别为 line5 档', () => {
    const groups = findAllMatches(makeBoard('R'.repeat(8)));
    expect(groups).toHaveLength(1);
    expect(groups[0]!.shape).toBe('line5');
    expect(groups[0]!.positions).toHaveLength(8);
  });
});

describe('matcher —— origin 选取（★ 决定"是我造出来的"手感）', () => {
  it('玩家操作位在匹配组内时，origin 就是它', () => {
    const board = makeBoard(`
      R R R
      G B G
      B G B
    `);
    const groups = findAllMatches(board, [P(2, 0)]);
    expect(groups[0]!.origin).toEqual(P(2, 0));
  });

  it('玩家操作位不在组内时回退（连锁掉落形成的匹配）', () => {
    const board = makeBoard(`
      R R R
      G B G
      B G B
    `);
    const groups = findAllMatches(board, [P(0, 2)]);
    // 不是玩家位，回退到直线中点
    expect(groups[0]!.origin).toEqual(P(1, 0));
  });

  it('T 型无玩家位时，origin 落在拐点', () => {
    const groups = findAllMatches(
      makeBoard(`
        R R R
        G R B
        B R G
      `),
    );
    expect(groups[0]!.origin).toEqual(P(1, 0)); // 横竖交叉处
  });
});

describe('wouldMatch / hasAnyValidMove / findAllValidMoves', () => {
  it('能成匹配的交换返回 true', () => {
    const board = makeBoard(`
      R G R
      B R B
      G B G
    `);
    // 交换 (1,0)G 与 (1,1)R → 顶行变 R R R
    expect(wouldMatch(board, P(1, 0), P(1, 1))).toBe(true);
  });

  it('不成匹配的交换返回 false', () => {
    const board = makeBoard(`
      R G B
      B R G
      G B R
    `);
    expect(wouldMatch(board, P(0, 0), P(1, 0))).toBe(false);
  });

  it('同色普通棋子交换直接短路为 false', () => {
    const board = makeBoard(`
      R R B
      B G G
      G B R
    `);
    expect(wouldMatch(board, P(0, 0), P(1, 0))).toBe(false);
  });

  it('涉及洞的交换非法', () => {
    const board = makeBoard(`
      R # R
      B R B
      G B G
    `);
    expect(wouldMatch(board, P(0, 0), P(1, 0))).toBe(false);
  });

  it('死局盘：hasAnyValidMove 为 false', () => {
    // 三色规则排布，任何相邻交换都凑不出 3 连
    const dead = makeBoard(`
      R G B R G B
      B R G B R G
      G B R G B R
      R G B R G B
      B R G B R G
      G B R G B R
    `);
    expect(findAllMatches(dead)).toHaveLength(0);
    expect(hasAnyValidMove(dead)).toBe(false);
    expect(findAllValidMoves(dead)).toHaveLength(0);
  });

  it('有解盘：hasAnyValidMove 与 findAllValidMoves 结论一致', () => {
    const board = makeBoard(`
      R G R
      B R B
      G B G
    `);
    expect(hasAnyValidMove(board)).toBe(true);
    expect(findAllValidMoves(board).length).toBeGreaterThan(0);
  });

  it('findAllValidMoves 不重复列出同一个交换', () => {
    const board = makeBoard(`
      R G R
      B R B
      G B G
    `);
    const keys = findAllValidMoves(board).map((m) => `${m.a.col},${m.a.row}-${m.b.col},${m.b.row}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
