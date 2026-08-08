/**
 * validateLevel 单测 —— 框架 §11.2 的必查项逐条覆盖
 *
 * ★ 每条检查都要有**一个反例**（能触发）和**一个正例**（不误报）。
 *   只测"合法关卡通过"是不够的 —— 那样把整个校验函数删掉，测试照样绿。
 */

import { describe, expect, it } from 'vitest';
import { assertValidLevel, validateLevelConfig } from '../../src/core/validateLevel';
import { LEVELS } from '../../src/config/levels/index';
import { makeLevel } from './helpers';
import type { ValidationCode } from '../../src/core/validateLevel';

const codesOf = (level: Parameters<typeof validateLevelConfig>[0]): ValidationCode[] =>
  validateLevelConfig(level).errors.map((e) => e.code);

describe('★ Stage 0 的 8 关全部合法（纳入 npm test）', () => {
  it('8 关都在', () => {
    expect(LEVELS).toHaveLength(8);
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('关卡 %i 通过校验', (_id, level) => {
    const r = validateLevelConfig(level);
    if (!r.ok) console.error(r.errors);
    expect(r.ok).toBe(true);
  });

  it('关卡 id 不重复', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('BOARD_SIZE', () => {
  it('过小报错', () => {
    expect(codesOf(makeLevel({ board: { cols: 3, rows: 3 } }))).toContain('BOARD_SIZE');
  });
  it('过大报错', () => {
    expect(codesOf(makeLevel({ board: { cols: 20, rows: 20 } }))).toContain('BOARD_SIZE');
  });
  it('8×8 合法', () => {
    expect(codesOf(makeLevel())).not.toContain('BOARD_SIZE');
  });
});

describe('POS_OUT_OF_BOUNDS / BLOCKED_DUPLICATE', () => {
  it('blocked 越界报错', () => {
    const codes = codesOf(makeLevel({ board: { cols: 8, rows: 8, blocked: [{ col: 9, row: 0 }] } }));
    expect(codes).toContain('POS_OUT_OF_BOUNDS');
  });

  it('blocked 重复报错', () => {
    const codes = codesOf(
      makeLevel({
        board: { cols: 8, rows: 8, blocked: [{ col: 1, row: 1 }, { col: 1, row: 1 }] },
      }),
    );
    expect(codes).toContain('BLOCKED_DUPLICATE');
  });

  it('障碍越界报错', () => {
    const codes = codesOf(
      makeLevel({ obstacles: [{ pos: { col: 99, row: 0 }, kind: 'ice', hp: 1 }] }),
    );
    expect(codes).toContain('POS_OUT_OF_BOUNDS');
  });
});

describe('OBSTACLE_ILLEGAL', () => {
  it('★ 障碍放在洞上报错', () => {
    const codes = codesOf(
      makeLevel({
        board: { cols: 8, rows: 8, blocked: [{ col: 2, row: 2 }] },
        obstacles: [{ pos: { col: 2, row: 2 }, kind: 'ice', hp: 1 }],
      }),
    );
    expect(codes).toContain('OBSTACLE_ILLEGAL');
  });

  it('两个障碍重叠报错', () => {
    const codes = codesOf(
      makeLevel({
        obstacles: [
          { pos: { col: 2, row: 2 }, kind: 'ice', hp: 1 },
          { pos: { col: 2, row: 2 }, kind: 'ice', hp: 1 },
        ],
      }),
    );
    expect(codes).toContain('OBSTACLE_ILLEGAL');
  });

  it('hp 非正报错', () => {
    const codes = codesOf(
      makeLevel({ obstacles: [{ pos: { col: 2, row: 2 }, kind: 'ice', hp: 0 }] }),
    );
    expect(codes).toContain('OBSTACLE_ILLEGAL');
  });
});

describe('★★ OBJECTIVE_UNREACHABLE —— 全部检查里最重要的一条', () => {
  it('收集的颜色不在色池里 → 报错（这关永远打不过）', () => {
    const codes = codesOf(
      makeLevel({
        colors: ['red', 'green', 'blue'],
        objectives: [{ kind: 'collect', piece: 'purple', count: 10 }],
      }),
    );
    expect(codes).toContain('OBJECTIVE_UNREACHABLE');
  });

  it('颜色在色池里 → 不报错', () => {
    const codes = codesOf(
      makeLevel({
        colors: ['red', 'green', 'blue'],
        objectives: [{ kind: 'collect', piece: 'red', count: 10 }],
      }),
    );
    expect(codes).not.toContain('OBJECTIVE_UNREACHABLE');
  });

  it('★ 要求清除的障碍多于盘上实际数量 → 报错', () => {
    const codes = codesOf(
      makeLevel({
        objectives: [{ kind: 'clearObstacle', obstacle: 'ice', count: 5 }],
        obstacles: [{ pos: { col: 2, row: 2 }, kind: 'ice', hp: 1 }],
      }),
    );
    expect(codes).toContain('OBJECTIVE_UNREACHABLE');
  });

  it('★ 障碍数量刚好够 → 不报错（曾把 o.kind 误当障碍种类，导致全部误报）', () => {
    const codes = codesOf(
      makeLevel({
        objectives: [{ kind: 'clearObstacle', obstacle: 'ice', count: 2 }],
        obstacles: [
          { pos: { col: 2, row: 2 }, kind: 'ice', hp: 1 },
          { pos: { col: 3, row: 3 }, kind: 'ice', hp: 1 },
        ],
      }),
    );
    expect(codes).not.toContain('OBJECTIVE_UNREACHABLE');
  });

  it('count 非正报错', () => {
    expect(
      codesOf(makeLevel({ objectives: [{ kind: 'collect', piece: 'red', count: 0 }] })),
    ).toContain('OBJECTIVE_UNREACHABLE');
  });

  it('目标为空报错（永远无法通关）', () => {
    expect(codesOf(makeLevel({ objectives: [] }))).toContain('OBJECTIVE_EMPTY');
  });
});

describe('STARS_THRESHOLD', () => {
  it('three ≤ two 报错', () => {
    expect(codesOf(makeLevel({ moves: 20, stars: { two: 10, three: 5 } }))).toContain(
      'STARS_THRESHOLD',
    );
  });
  it('two ≥ moves 报错（2 星不可能达成）', () => {
    expect(codesOf(makeLevel({ moves: 10, stars: { two: 10, three: 12 } }))).toContain(
      'STARS_THRESHOLD',
    );
  });
  it('three ≥ moves 报错', () => {
    expect(codesOf(makeLevel({ moves: 10, stars: { two: 3, three: 10 } }))).toContain(
      'STARS_THRESHOLD',
    );
  });
  it('合法阈值不报错', () => {
    expect(codesOf(makeLevel({ moves: 20, stars: { two: 5, three: 10 } }))).not.toContain(
      'STARS_THRESHOLD',
    );
  });
});

describe('COLORS_COUNT / MOVES_RANGE', () => {
  it('少于 3 色报错', () => {
    expect(codesOf(makeLevel({ colors: ['red', 'green'] }))).toContain('COLORS_COUNT');
  });
  it('颜色重复报错', () => {
    expect(codesOf(makeLevel({ colors: ['red', 'red', 'green'] }))).toContain('COLORS_COUNT');
  });
  it('步数非正报错', () => {
    expect(codesOf(makeLevel({ moves: 0 }))).toContain('MOVES_RANGE');
  });
});

describe('TUTORIAL_REF', () => {
  it('高亮坐标越界报错', () => {
    const codes = codesOf(
      makeLevel({ tutorial: [{ id: 'x', text: 'hi', highlight: [{ col: 99, row: 0 }] }] }),
    );
    expect(codes).toContain('TUTORIAL_REF');
  });
  it('合法教程不报错', () => {
    const codes = codesOf(
      makeLevel({ tutorial: [{ id: 'x', text: 'hi', highlight: [{ col: 1, row: 1 }] }] }),
    );
    expect(codes).not.toContain('TUTORIAL_REF');
  });
});

describe('开局可玩性', () => {
  it('★ 洞太多导致可玩格不足 → 报错', () => {
    const blocked = [];
    for (let c = 0; c < 8; c++) for (let r = 0; r < 7; r++) blocked.push({ col: c, row: r });
    expect(codesOf(makeLevel({ board: { cols: 8, rows: 8, blocked } }))).toContain('BOARD_SIZE');
  });

  it('正常关卡的开局既不自带匹配、也有合法 Move', () => {
    const codes = codesOf(makeLevel());
    expect(codes).not.toContain('INITIAL_AUTO_MATCH');
    expect(codes).not.toContain('INITIAL_NO_MOVE');
  });
});

describe('assertValidLevel —— 不静默失败', () => {
  it('非法关卡抛错，错误信息含 code', () => {
    expect(() =>
      assertValidLevel(
        makeLevel({ colors: ['red', 'green', 'blue'], objectives: [{ kind: 'collect', piece: 'purple', count: 5 }] }),
      ),
    ).toThrow(/OBJECTIVE_UNREACHABLE/);
  });

  it('合法关卡不抛错', () => {
    expect(() => assertValidLevel(makeLevel())).not.toThrow();
  });

  it('★ Stage 0 的 8 关都不抛错', () => {
    for (const level of LEVELS) expect(() => assertValidLevel(level)).not.toThrow();
  });
});
