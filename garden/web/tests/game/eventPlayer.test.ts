/**
 * EventPlayer 单测 —— 用假 Phaser 场景测**播放承诺的兑现**
 *
 * ★ 这里测的不是"动画好不好看"（那要靠眼睛），而是一条硬性质：
 *   **`play()` 返回的 Promise 一定会兑现**。
 *
 *   M4 真机预览里出现过：`skipAll()` 把完成用的 timer 移除了，
 *   却没有 resolve 那个 Promise —— `await player.play(...)` 永远醒不过来，
 *   回合卡在 RESOLVING，输入被永久锁死。棋盘就那么不动了，**没有任何报错**。
 *
 *   tsc 全过、370 项测试全绿，因为没有一条测试碰过播放的兑现语义。
 */

import { describe, expect, it } from 'vitest';
import { PhaserEventPlayer } from '../../src/game/render/EventPlayer';
import type { CoreGameEvent } from '../../src/core/types';

const P = (col: number, row: number) => ({ col, row });

/** 可手动推进的假时钟 + 假场景 */
function makeFakeScene() {
  let now = 0;
  const pending: { at: number; fn: () => void; removed: boolean }[] = [];

  const scene = {
    time: {
      get now() {
        return now;
      },
      delayedCall(delay: number, fn: () => void) {
        const entry = { at: now + delay, fn, removed: false };
        pending.push(entry);
        return {
          remove() {
            entry.removed = true;
          },
        };
      },
    },
    tweens: {
      add(config: { onComplete?: () => void }) {
        return {
          stop() {
            /* 打断补间：不触发 onComplete */
          },
          config,
        };
      },
    },
  };

  /** 推进时钟，触发到期的回调 */
  const tick = (ms: number): void => {
    now += ms;
    // 复制一份再遍历 —— 回调里可能又注册新的 timer
    for (const e of [...pending]) {
      if (!e.removed && e.at <= now) {
        e.removed = true;
        e.fn();
      }
    }
  };

  return { scene, tick };
}

/** BoardView 的最小替身 */
function makeFakeView() {
  return {
    spriteOf: () => undefined,
    ensureSprite: () => ({
      setPosition: () => undefined,
      setAlpha: () => undefined,
    }),
    resetSpriteSize: () => undefined,
    removeSprite: () => undefined,
    showObstacle: () => undefined,
    clearObstacle: () => undefined,
    positionOf: () => ({ x: 0, y: 0 }),
    get pieceSize() {
      return 40;
    },
  };
}

function makePlayer() {
  const { scene, tick } = makeFakeScene();
  const view = makeFakeView();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const player = new PhaserEventPlayer(scene as any, view as any, () => 'calm');
  return { player, tick };
}

const EVENTS: CoreGameEvent[] = [
  { t: 'swap', a: P(0, 0), b: P(1, 0) },
  { t: 'match', positions: [P(0, 0), P(1, 0), P(2, 0)], color: 'red', cascadeLevel: 1 },
  { t: 'fall', moves: [{ id: 1, from: P(0, 0), to: P(0, 3) }] },
  { t: 'settled', maxCascade: 1, totalCleared: 3 },
];

describe('★★ play() 的 Promise 一定会兑现', () => {
  it('正常播完 → resolve', async () => {
    const { player, tick } = makePlayer();
    let done = false;
    const p = player.play(EVENTS).then(() => {
      done = true;
    });
    tick(10_000);
    await p;
    expect(done).toBe(true);
  });

  it('★★ 被 skipAll() 打断 → 也必须 resolve（否则 await 方永远卡死）', async () => {
    const { player } = makePlayer();
    let done = false;
    const p = player.play(EVENTS).then(() => {
      done = true;
    });
    player.skipAll(); // 不推进时钟，直接打断
    await p;
    expect(done).toBe(true);
  });

  it('★★ 被下一次 play() 打断 → 前一段也必须 resolve', async () => {
    const { player, tick } = makePlayer();
    let firstDone = false;
    const first = player.play(EVENTS).then(() => {
      firstDone = true;
    });
    // 前一段还没播完就开始下一段（连点、缓存兑现都会这样）
    const second = player.play(EVENTS);
    await first;
    expect(firstDone).toBe(true);
    tick(10_000);
    await second;
  });

  it('空事件序列也 resolve（时长 0）', async () => {
    const { player, tick } = makePlayer();
    const p = player.play([]);
    tick(1);
    await expect(p).resolves.toBeUndefined();
  });

  it('★ 连续多段都能依次兑现，不会漏掉任何一段', async () => {
    const { player, tick } = makePlayer();
    for (let i = 0; i < 5; i++) {
      const p = player.play(EVENTS);
      tick(10_000);
      await expect(p).resolves.toBeUndefined();
    }
  });
});

describe('remainingMs', () => {
  it('未播放时为 0', () => {
    const { player } = makePlayer();
    expect(player.remainingMs()).toBe(0);
  });

  it('★ 播放中随时间递减，播完为 0', async () => {
    const { player, tick } = makePlayer();
    const p = player.play(EVENTS);
    const atStart = player.remainingMs();
    expect(atStart).toBeGreaterThan(0);

    tick(100);
    expect(player.remainingMs()).toBeLessThan(atStart);

    tick(10_000);
    await p;
    expect(player.remainingMs()).toBe(0);
  });

  it('★ 打断后为 0（不会报告一个永远不会到来的剩余时长）', async () => {
    const { player } = makePlayer();
    const p = player.play(EVENTS);
    player.skipAll();
    await p;
    expect(player.remainingMs()).toBe(0);
  });
});
