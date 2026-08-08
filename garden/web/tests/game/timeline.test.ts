/**
 * timeline 单测 —— 事件序列 → 时间轴
 *
 * ★ 这里锁的不是"动画好不好看"，而是**总时长算得对**。
 *   输入缓存窗口（INPUT_BUFFER.openBeforeEndMs）直接依赖 totalMs，
 *   算错了窗口就会开在错误的时刻 —— 真机上极难定位。
 */

import { describe, expect, it } from 'vitest';
import { buildTimeline, isBufferWindowOpen } from '../../src/game/render/timeline';
import { INPUT_BUFFER, TEMPO, TIMING } from '../../src/config/tuning';
import type { CoreGameEvent } from '../../src/core/types';

const P = (col: number, row: number) => ({ col, row });

describe('时长计算', () => {
  it('swap 时长 = TIMING.swap × 节奏系数', () => {
    const t = buildTimeline([{ t: 'swap', a: P(0, 0), b: P(1, 0) }], 'calm');
    expect(t.totalMs).toBeCloseTo(TIMING.swap * TEMPO.calm, 5);
  });

  it('★ 节奏影响所有时长（brisk 比 calm 短）', () => {
    const events: CoreGameEvent[] = [
      { t: 'swap', a: P(0, 0), b: P(1, 0) },
      { t: 'match', positions: [P(0, 0)], color: 'red', cascadeLevel: 0 },
    ];
    expect(buildTimeline(events, 'brisk').totalMs).toBeLessThan(
      buildTimeline(events, 'calm').totalMs,
    );
  });

  it('swapBack = 换过去再换回来 = 两倍 swap', () => {
    const t = buildTimeline([{ t: 'swapBack', a: P(0, 0), b: P(1, 0) }], 'calm');
    expect(t.totalMs).toBeCloseTo(TIMING.swap * 2 * TEMPO.calm, 5);
  });

  it('★ 下落时长取最长的一列，不是每格累加（棋子是同时落的）', () => {
    const t = buildTimeline(
      [
        {
          t: 'fall',
          moves: [
            { id: 1, from: P(0, 0), to: P(0, 3) }, // 落 3 格
            { id: 2, from: P(1, 0), to: P(1, 1) }, // 落 1 格
          ],
        },
      ],
      'calm',
    );
    expect(t.totalMs).toBeCloseTo(3 * TIMING.fallPerRow * TEMPO.calm, 5);
  });

  it('瞬时标记不占时长', () => {
    const instant: CoreGameEvent[] = [
      { t: 'cascadeStart', level: 1 },
      { t: 'settled', maxCascade: 1, totalCleared: 3 },
      { t: 'movesChanged', left: 5 },
    ];
    expect(buildTimeline(instant, 'calm').totalMs).toBe(0);
  });
});

describe('★ 并行事件与前一个事件同时开始', () => {
  it('match 与它触发的 obstacleHit / collect 同时发生', () => {
    // 玩家看到的是"消除的同时冰裂了"，不是"消除完，停一下，冰再裂"
    const t = buildTimeline(
      [
        { t: 'match', positions: [P(0, 0)], color: 'red', cascadeLevel: 0 },
        { t: 'obstacleHit', pos: P(0, 1), kind: 'ice', hpLeft: 1 },
        { t: 'collect', pos: P(0, 0), target: 'red', count: 1 },
      ],
      'calm',
    );
    const [match, hit, collect] = t.items;
    expect(hit?.atMs).toBe(match?.atMs);
    expect(collect?.atMs).toBe(match?.atMs);
    // 并行事件不拉长整段
    expect(t.totalMs).toBeCloseTo(TIMING.matchPop * TEMPO.calm, 5);
  });

  it('★ 并行事件不会把整段时长累加起来（否则每一步都被拖长）', () => {
    const many: CoreGameEvent[] = [
      { t: 'match', positions: [P(0, 0)], color: 'red', cascadeLevel: 0 },
      ...Array.from(
        { length: 10 },
        (_, i) => ({ t: 'collect', pos: P(i, 0), target: 'red', count: i + 1 }) as CoreGameEvent,
      ),
    ];
    expect(buildTimeline(many, 'calm').totalMs).toBeCloseTo(TIMING.matchPop * TEMPO.calm, 5);
  });
});

describe('★ 排期单调不倒流', () => {
  it('事件的 atMs 单调不减', () => {
    const events: CoreGameEvent[] = [
      { t: 'swap', a: P(0, 0), b: P(1, 0) },
      { t: 'cascadeStart', level: 1 },
      { t: 'match', positions: [P(0, 0), P(1, 0), P(2, 0)], color: 'red', cascadeLevel: 1 },
      { t: 'collect', pos: P(0, 0), target: 'red', count: 3 },
      { t: 'fall', moves: [{ id: 1, from: P(0, 0), to: P(0, 2) }] },
      { t: 'spawn', items: [] },
      { t: 'cascadeEnd', level: 1 },
      { t: 'settled', maxCascade: 1, totalCleared: 3 },
    ];
    const t = buildTimeline(events, 'calm');
    let prev = -1;
    for (const item of t.items) {
      expect(item.atMs).toBeGreaterThanOrEqual(prev);
      prev = item.atMs;
    }
  });

  it('★ 每个事件都排上了（不漏播）', () => {
    const events: CoreGameEvent[] = [
      { t: 'swap', a: P(0, 0), b: P(1, 0) },
      { t: 'match', positions: [P(0, 0)], color: 'red', cascadeLevel: 1 },
      { t: 'turnResolved', summary: { maxCascade: 1, totalCleared: 3, specialCreated: [], result: 'continue' } },
    ];
    expect(buildTimeline(events, 'calm').items).toHaveLength(events.length);
  });

  it('★ 所有事件都在整段时长之内结束', () => {
    const events: CoreGameEvent[] = [
      { t: 'swap', a: P(0, 0), b: P(1, 0) },
      { t: 'match', positions: [P(0, 0)], color: 'red', cascadeLevel: 1 },
      { t: 'obstacleHit', pos: P(0, 1), kind: 'ice', hpLeft: 1 },
      { t: 'fall', moves: [{ id: 1, from: P(0, 0), to: P(0, 4) }] },
    ];
    const t = buildTimeline(events, 'calm');
    for (const item of t.items) {
      expect(item.atMs + item.durationMs).toBeLessThanOrEqual(t.totalMs + 0.001);
    }
  });

  it('空序列 → 时长 0，不崩', () => {
    const t = buildTimeline([], 'calm');
    expect(t.totalMs).toBe(0);
    expect(t.items).toHaveLength(0);
  });
});

describe('★ 输入缓存窗口', () => {
  const events: CoreGameEvent[] = [
    { t: 'swap', a: P(0, 0), b: P(1, 0) },
    { t: 'match', positions: [P(0, 0)], color: 'red', cascadeLevel: 1 },
    { t: 'fall', moves: [{ id: 1, from: P(0, 0), to: P(0, 4) }] },
  ];

  it('★ 整段刚开始时窗口关闭（坐标语义会漂移）', () => {
    const t = buildTimeline(events, 'calm');
    expect(isBufferWindowOpen(t, 0, INPUT_BUFFER.openBeforeEndMs)).toBe(false);
  });

  it('★ 只在最后 openBeforeEndMs 内开启', () => {
    const t = buildTimeline(events, 'calm');
    const justBefore = t.totalMs - INPUT_BUFFER.openBeforeEndMs - 1;
    const inside = t.totalMs - INPUT_BUFFER.openBeforeEndMs + 1;
    expect(isBufferWindowOpen(t, justBefore, INPUT_BUFFER.openBeforeEndMs)).toBe(false);
    expect(isBufferWindowOpen(t, inside, INPUT_BUFFER.openBeforeEndMs)).toBe(true);
  });

  it('播放结束后窗口仍开着（此时应直接进 READY_FOR_INPUT）', () => {
    const t = buildTimeline(events, 'calm');
    expect(isBufferWindowOpen(t, t.totalMs, INPUT_BUFFER.openBeforeEndMs)).toBe(true);
  });
});
