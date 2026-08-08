/**
 * special 单测 —— 框架 §5.2 生成规则 + §5.3 全部 7 种组合
 */

import { describe, expect, it } from 'vitest';
import { comboAffectedArea, specialAffectedArea, specialFromMatch } from '../../src/core/special';
import { findAllMatches } from '../../src/core/matcher';
import { decorate, makeBoard, P } from './helpers';
import type { MatchGroup } from '../../src/core/matcher';
import type { Pos } from '../../src/core/types';

const has = (list: readonly Pos[], p: Pos): boolean =>
  list.some((q) => q.col === p.col && q.row === p.row);

/** 由字符画取出唯一一个匹配组 */
const soleGroup = (art: string, origin?: Pos): MatchGroup => {
  const groups = findAllMatches(makeBoard(art), origin ? [origin] : []);
  expect(groups).toHaveLength(1);
  return groups[0] as MatchGroup;
};

describe('specialFromMatch —— 生成规则（框架 §5.2）', () => {
  it('3 连不生成特殊棋子', () => {
    expect(specialFromMatch(soleGroup('RRRGB\nGBGBG\nBGBGB'))).toBe('none');
  });

  it('★ 横向 4 连 → 纵向火箭（刻意反向：奖励清他还没清的方向）', () => {
    expect(specialFromMatch(soleGroup('RRRRG\nGBGBG\nBGBGB\nGBGBG'))).toBe('rocketV');
  });

  it('★ 纵向 4 连 → 横向火箭', () => {
    expect(specialFromMatch(soleGroup('RGB\nRBG\nRGB\nRBG\nGBG'))).toBe('rocketH');
  });

  it('5 连 → 彩虹球（Stage 0 不启用，但规则先定死）', () => {
    expect(specialFromMatch(soleGroup('RRRRR\nGBGBG\nBGBGB'))).toBe('rainbow');
  });

  it('T 型 → 炸弹', () => {
    expect(specialFromMatch(soleGroup('RRR\nGRB\nBRG'))).toBe('bomb');
  });

  it('L 型 → 炸弹', () => {
    expect(specialFromMatch(soleGroup('RGB\nRBG\nRRR'))).toBe('bomb');
  });
});

describe('specialAffectedArea —— 单个特殊棋子的影响范围', () => {
  const board = makeBoard(`
    RGBYPR
    GBYPRG
    BYPRGB
    YPRGBY
    PRGBYP
    RGBYPR
  `);

  it('rocketH 清整行', () => {
    const area = specialAffectedArea(board, P(2, 3), 'rocketH');
    expect(area).toHaveLength(6);
    expect(area.every((p) => p.row === 3)).toBe(true);
  });

  it('rocketV 清整列', () => {
    const area = specialAffectedArea(board, P(2, 3), 'rocketV');
    expect(area).toHaveLength(6);
    expect(area.every((p) => p.col === 2)).toBe(true);
  });

  it('bomb 清 3×3', () => {
    expect(specialAffectedArea(board, P(2, 3), 'bomb')).toHaveLength(9);
  });

  it('bomb 在角落时只清界内部分', () => {
    expect(specialAffectedArea(board, P(0, 0), 'bomb')).toHaveLength(4);
  });

  it('none 不影响任何格', () => {
    expect(specialAffectedArea(board, P(2, 3), 'none')).toHaveLength(0);
  });

  it('★ 影响范围跳过洞', () => {
    const holed = makeBoard(`
      RGBYPR
      GBYPRG
      BY#RGB
      YPRGBY
      PRGBYP
      RGBYPR
    `);
    const area = specialAffectedArea(holed, P(0, 2), 'rocketH');
    expect(area).toHaveLength(5); // 6 格减去 1 个洞
    expect(has(area, P(2, 2))).toBe(false);
  });

  it('rainbow 清全盘同色', () => {
    const b = makeBoard(`
      RGB
      GRB
      BGR
    `);
    const area = specialAffectedArea(b, P(0, 0), 'rainbow');
    expect(area).toHaveLength(3); // 三个 R
  });
});

describe('comboAffectedArea —— 全部 7 种组合（框架 §5.3）', () => {
  const base = makeBoard(`
    RGBYPRGB
    GBYPRGBY
    BYPRGBYP
    YPRGBYPR
    PRGBYPRG
    RGBYPRGB
    GBYPRGBY
    BYPRGBYP
  `);

  it('两个普通棋子不构成组合', () => {
    expect(comboAffectedArea(base, P(0, 0), P(1, 0))).toBeNull();
  });

  it('单个特殊 + 普通不构成组合（按普通交换处理）', () => {
    const b = decorate(base, { specials: [[P(0, 0), 'bomb']] });
    expect(comboAffectedArea(b, P(0, 0), P(1, 0))).toBeNull();
  });

  it('① 火箭 + 火箭 → 十字（整行 + 整列）', () => {
    const b = decorate(base, {
      specials: [
        [P(3, 3), 'rocketH'],
        [P(4, 3), 'rocketV'],
      ],
    });
    const combo = comboAffectedArea(b, P(3, 3), P(4, 3));
    expect(combo).not.toBeNull();
    // 8 行 + 8 列 − 1 重叠 = 15
    expect(combo!.affected).toHaveLength(15);
  });

  it('② 火箭 + 炸弹 → 3 行 + 3 列粗十字', () => {
    const b = decorate(base, {
      specials: [
        [P(3, 3), 'rocketH'],
        [P(4, 3), 'bomb'],
      ],
    });
    const combo = comboAffectedArea(b, P(3, 3), P(4, 3));
    // 3 行(24) + 3 列(24) − 9 重叠 = 39
    expect(combo!.affected).toHaveLength(39);
  });

  it('③ 炸弹 + 炸弹 → 5×5 大爆炸', () => {
    const b = decorate(base, {
      specials: [
        [P(3, 3), 'bomb'],
        [P(4, 3), 'bomb'],
      ],
    });
    expect(comboAffectedArea(b, P(3, 3), P(4, 3))!.affected).toHaveLength(25);
  });

  it('④ 彩虹 + 普通 → 清除该颜色全部', () => {
    const b = decorate(base, { specials: [[P(0, 0), 'rainbow']] });
    const combo = comboAffectedArea(b, P(0, 0), P(1, 0));
    expect(combo).not.toBeNull();
    // (1,0) 是 G；盘上所有 G + 彩虹球自身
    const greens = base.cells.filter((c) => c.piece?.color === 'green').length;
    expect(combo!.affected.length).toBe(greens + 1);
  });

  it('⑤ 彩虹 + 火箭 → 该颜色全部变火箭并触发（全场最爽）', () => {
    const b = decorate(base, {
      specials: [
        [P(0, 0), 'rainbow'],
        [P(1, 0), 'rocketH'],
      ],
    });
    const combo = comboAffectedArea(b, P(0, 0), P(1, 0));
    // 每个 G 都变成横向火箭清整行 —— 影响范围远大于单纯的同色数
    const greens = base.cells.filter((c) => c.piece?.color === 'green').length;
    expect(combo!.affected.length).toBeGreaterThan(greens + 1);
  });

  it('⑥ 彩虹 + 炸弹 → 该颜色全部变炸弹并触发', () => {
    const b = decorate(base, {
      specials: [
        [P(0, 0), 'rainbow'],
        [P(1, 0), 'bomb'],
      ],
    });
    const combo = comboAffectedArea(b, P(0, 0), P(1, 0));
    const greens = base.cells.filter((c) => c.piece?.color === 'green').length;
    expect(combo!.affected.length).toBeGreaterThan(greens + 1);
  });

  it('⑦ 彩虹 + 彩虹 → 清空全场', () => {
    const b = decorate(base, {
      specials: [
        [P(0, 0), 'rainbow'],
        [P(1, 0), 'rainbow'],
      ],
    });
    expect(comboAffectedArea(b, P(0, 0), P(1, 0))!.affected).toHaveLength(64);
  });

  it('组合的 affected 不含重复坐标', () => {
    const b = decorate(base, {
      specials: [
        [P(3, 3), 'rocketH'],
        [P(4, 3), 'bomb'],
      ],
    });
    const area = comboAffectedArea(b, P(3, 3), P(4, 3))!.affected;
    const keys = area.map((p) => `${p.col},${p.row}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('★ 组合范围跳过洞', () => {
    const holed = makeBoard(`
      RGBYPRGB
      GBYPRGBY
      BYPRGBYP
      YPR#BYPR
      PRGBYPRG
      RGBYPRGB
      GBYPRGBY
      BYPRGBYP
    `);
    const b = decorate(holed, {
      specials: [
        [P(0, 3), 'rocketH'],
        [P(1, 3), 'rocketV'],
      ],
    });
    const area = comboAffectedArea(b, P(0, 3), P(1, 3))!.affected;
    expect(has(area, P(3, 3))).toBe(false); // 洞不在影响范围内
  });
});
