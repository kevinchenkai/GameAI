/**
 * gesture 单测 —— 手势识别（框架 §10.2）
 *
 * ★ 手势 bug 是"手滑了但没反应""滑错了格"这类**只在真机上偶发**的问题。
 *   这里用脚本枚举轨迹，把它们变成可复现的用例。
 *
 * ★ 点选通道（点 A 再点 B）是 50+ 用户与手抖用户的**救命通道**，
 *   不是"顺便支持一下" —— 所以它的用例比滑动还多。
 */

import { describe, expect, it } from 'vitest';
import {
  createGestureState,
  stepGesture,
  type GestureState,
  type PointerSample,
} from '../../src/game/input/gesture';
import { INPUT } from '../../src/config/tuning';
import type { Pos } from '../../src/core/types';

const CELL = 44;
const COLS = 8;
const ROWS = 8;

/** 格子 → 像素中心 */
const px = (col: number, row: number) => ({ x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 });

const cellOf = (x: number, y: number): Pos | null => {
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return null;
  return { col, row };
};

/** 默认全盘可交互 */
const allInBounds = (): boolean => true;

/** 依次喂入若干采样，返回最后一次的结果与状态 */
function feed(
  state: GestureState,
  samples: readonly PointerSample[],
  inBounds: (p: Pos) => boolean = allInBounds,
) {
  let s = state;
  let last: ReturnType<typeof stepGesture>['result'] = null;
  const all: ReturnType<typeof stepGesture>['result'][] = [];
  for (const sample of samples) {
    const step = stepGesture(s, sample, cellOf, inBounds);
    s = step.state;
    last = step.result;
    all.push(step.result);
  }
  return { state: s, result: last, all };
}

const SWIPE_MIN = INPUT.swipeThresholdRatio * INPUT.referenceCellPt;

describe('滑动', () => {
  it('★ 向右滑足够距离 → 与右邻格交换', () => {
    const a = px(2, 3);
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'move', x: a.x + SWIPE_MIN + 1, y: a.y, t: 50 },
    ]);
    expect(result).toEqual({ kind: 'swap', a: { col: 2, row: 3 }, b: { col: 3, row: 3 } });
  });

  it('四个方向都能滑', () => {
    const cases = [
      { dx: SWIPE_MIN + 1, dy: 0, b: { col: 3, row: 3 } },
      { dx: -SWIPE_MIN - 1, dy: 0, b: { col: 1, row: 3 } },
      { dx: 0, dy: SWIPE_MIN + 1, b: { col: 2, row: 4 } },
      { dx: 0, dy: -SWIPE_MIN - 1, b: { col: 2, row: 2 } },
    ];
    for (const c of cases) {
      const a = px(2, 3);
      const { result } = feed(createGestureState(), [
        { phase: 'down', x: a.x, y: a.y, t: 0 },
        { phase: 'move', x: a.x + c.dx, y: a.y + c.dy, t: 50 },
      ]);
      expect(result).toEqual({ kind: 'swap', a: { col: 2, row: 3 }, b: c.b });
    }
  });

  it('位移不够 → 不触发', () => {
    const a = px(2, 3);
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'move', x: a.x + SWIPE_MIN - 1, y: a.y, t: 50 },
    ]);
    expect(result).toBeNull();
  });

  it('★ 斜着滑按主轴吸附（手抖用户滑不出直线是常态）', () => {
    const a = px(2, 3);
    // 右下方向，但水平分量更大 → 应认成"向右"
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'move', x: a.x + SWIPE_MIN + 10, y: a.y + SWIPE_MIN - 2, t: 50 },
    ]);
    expect(result).toEqual({ kind: 'swap', a: { col: 2, row: 3 }, b: { col: 3, row: 3 } });
  });

  it('★ 一次按下只产出一次 swap（滑长线不连续触发）', () => {
    const a = px(2, 3);
    const { all } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'move', x: a.x + SWIPE_MIN + 1, y: a.y, t: 50 },
      { phase: 'move', x: a.x + SWIPE_MIN + 60, y: a.y, t: 80 },
      { phase: 'move', x: a.x + SWIPE_MIN + 120, y: a.y, t: 110 },
    ]);
    expect(all.filter((r) => r?.kind === 'swap')).toHaveLength(1);
  });

  it('★ 往棋盘外滑不触发（边缘格子）', () => {
    const a = px(0, 3);
    const inBounds = (p: Pos) => p.col >= 0 && p.row >= 0 && p.col < COLS && p.row < ROWS;
    const { result } = feed(
      createGestureState(),
      [
        { phase: 'down', x: a.x, y: a.y, t: 0 },
        { phase: 'move', x: a.x - SWIPE_MIN - 1, y: a.y, t: 50 },
      ],
      inBounds,
    );
    expect(result).toBeNull();
  });

  it('★ 往洞里滑不触发', () => {
    const a = px(2, 3);
    const hole: Pos = { col: 3, row: 3 };
    const inBounds = (p: Pos) => !(p.col === hole.col && p.row === hole.row);
    const { result } = feed(
      createGestureState(),
      [
        { phase: 'down', x: a.x, y: a.y, t: 0 },
        { phase: 'move', x: a.x + SWIPE_MIN + 1, y: a.y, t: 50 },
      ],
      inBounds,
    );
    expect(result).toBeNull();
  });
});

describe('★ 点选通道 —— 50+ 用户与手抖用户的救命通道', () => {
  it('点第一格 → 选中', () => {
    const a = px(2, 3);
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'up', x: a.x, y: a.y, t: 100 },
    ]);
    expect(result).toEqual({ kind: 'select', pos: { col: 2, row: 3 } });
  });

  it('★ 点第一格再点相邻格 → 交换', () => {
    const a = px(2, 3);
    const b = px(3, 3);
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'up', x: a.x, y: a.y, t: 100 },
      { phase: 'down', x: b.x, y: b.y, t: 300 },
      { phase: 'up', x: b.x, y: b.y, t: 400 },
    ]);
    expect(result).toEqual({ kind: 'swap', a: { col: 2, row: 3 }, b: { col: 3, row: 3 } });
  });

  it('点同一格两次 → 取消选中', () => {
    const a = px(2, 3);
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'up', x: a.x, y: a.y, t: 100 },
      { phase: 'down', x: a.x, y: a.y, t: 300 },
      { phase: 'up', x: a.x, y: a.y, t: 400 },
    ]);
    expect(result).toEqual({ kind: 'deselect' });
  });

  it('★ 点了不相邻的格子 → 改选新格（不报错、不忽略）', () => {
    // 老年用户点错位置是常态，让他直接重选比"必须先取消"友好
    const a = px(2, 3);
    const far = px(6, 6);
    const { result, state } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'up', x: a.x, y: a.y, t: 100 },
      { phase: 'down', x: far.x, y: far.y, t: 300 },
      { phase: 'up', x: far.x, y: far.y, t: 400 },
    ]);
    expect(result).toEqual({ kind: 'select', pos: { col: 6, row: 6 } });
    expect(state.selected).toEqual({ col: 6, row: 6 });
  });

  it('★ 点到棋盘外 → 取消选中（给玩家一个反悔的出口）', () => {
    const a = px(2, 3);
    const outside = { x: COLS * CELL + 30, y: 10 };
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'up', x: a.x, y: a.y, t: 100 },
      { phase: 'down', x: outside.x, y: outside.y, t: 300 },
      { phase: 'up', x: outside.x, y: outside.y, t: 400 },
    ]);
    expect(result).toEqual({ kind: 'deselect' });
  });

  it('★ 轻微抖动仍算点击（容差 16pt）—— 手抖用户不该被判为拖动', () => {
    const a = px(2, 3);
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'up', x: a.x + INPUT.tapMaxMovePt - 1, y: a.y, t: 150 },
    ]);
    expect(result).toEqual({ kind: 'select', pos: { col: 2, row: 3 } });
  });

  it('长按超时不算点击（是犹豫，不是选择）', () => {
    const a = px(2, 3);
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'up', x: a.x, y: a.y, t: INPUT.tapMaxDurationMs + 1 },
    ]);
    expect(result).toBeNull();
  });

  it('点洞不产生选中', () => {
    const a = px(2, 3);
    const inBounds = (p: Pos) => !(p.col === 2 && p.row === 3);
    const { result } = feed(
      createGestureState(),
      [
        { phase: 'down', x: a.x, y: a.y, t: 0 },
        { phase: 'up', x: a.x, y: a.y, t: 100 },
      ],
      inBounds,
    );
    expect(result).toBeNull();
  });
});

describe('★ 两种模式不打架', () => {
  it('滑动后抬起，不再额外产生点选动作', () => {
    const a = px(2, 3);
    const { all } = feed(createGestureState(), [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'move', x: a.x + SWIPE_MIN + 1, y: a.y, t: 50 },
      { phase: 'up', x: a.x + SWIPE_MIN + 1, y: a.y, t: 100 },
    ]);
    expect(all.filter((r) => r !== null)).toHaveLength(1);
    expect(all[1]?.kind).toBe('swap');
  });

  it('★ 已选中某格后改用滑动 → 滑动优先，选中被清掉', () => {
    const a = px(2, 3);
    const b = px(5, 5);
    const { state, all } = feed(createGestureState(), [
      // 先点选 (2,3)
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'up', x: a.x, y: a.y, t: 100 },
      // 再从 (5,5) 滑动
      { phase: 'down', x: b.x, y: b.y, t: 300 },
      { phase: 'move', x: b.x + SWIPE_MIN + 1, y: b.y, t: 350 },
    ]);
    expect(all[3]).toEqual({ kind: 'swap', a: { col: 5, row: 5 }, b: { col: 6, row: 5 } });
    expect(state.selected).toBeNull();
  });

  it('★ 滑动结束后状态干净，下一次点选正常工作', () => {
    const a = px(2, 3);
    let s = createGestureState();
    ({ state: s } = feed(s, [
      { phase: 'down', x: a.x, y: a.y, t: 0 },
      { phase: 'move', x: a.x + SWIPE_MIN + 1, y: a.y, t: 50 },
      { phase: 'up', x: a.x + SWIPE_MIN + 1, y: a.y, t: 100 },
    ]));
    expect(s.consumed).toBe(false);

    const c = px(1, 1);
    const { result } = feed(s, [
      { phase: 'down', x: c.x, y: c.y, t: 300 },
      { phase: 'up', x: c.x, y: c.y, t: 400 },
    ]);
    expect(result).toEqual({ kind: 'select', pos: { col: 1, row: 1 } });
  });
});

describe('退化输入不崩', () => {
  it('没按下就移动', () => {
    expect(() =>
      feed(createGestureState(), [{ phase: 'move', x: 10, y: 10, t: 0 }]),
    ).not.toThrow();
  });

  it('没按下就抬起', () => {
    expect(() => feed(createGestureState(), [{ phase: 'up', x: 10, y: 10, t: 0 }])).not.toThrow();
  });

  it('在棋盘外按下再滑入棋盘 → 不产生交换', () => {
    const { result } = feed(createGestureState(), [
      { phase: 'down', x: -50, y: -50, t: 0 },
      { phase: 'move', x: px(2, 3).x, y: px(2, 3).y, t: 50 },
    ]);
    expect(result).toBeNull();
  });
});
