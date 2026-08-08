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
      add(config: { onComplete?: () => void; duration?: number }) {
        /**
         * ★ 补间也挂在假时钟上：到期时触发 onComplete。
         *   原来的假补间**从不触发 onComplete**，于是所有
         *   "在 onComplete 里销毁精灵"的逻辑在测试里根本跑不到 ——
         *   这正是"精灵残留"那个 bug 能躲过 467 项测试的原因。
         */
        const entry = {
          at: now + (config.duration ?? 0),
          fn: () => config.onComplete?.(),
          removed: false,
        };
        pending.push(entry);
        return {
          stop() {
            // 打断补间：不触发 onComplete
            entry.removed = true;
          },
          /** 还没到期就算还在跑 */
          isPlaying: () => !entry.removed,
          /** ★ 推到终点并触发 onComplete —— finish() 靠它结算残留补间 */
          complete() {
            if (entry.removed) return;
            entry.removed = true;
            entry.fn();
          },
          config,
        };
      },
    },
  };

  /**
   * 推进时钟，触发到期的回调。
   *
   * ★ **分步推进**，不是一次跳到终点：
   *   事件的 timer 回调里会**再注册补间**（`at = 当时的 now + duration`）。
   *   一次跳到 now=10000 的话，那些补间的到期时刻会落在 10000 之后，
   *   本轮永远轮不到 —— 于是"在 onComplete 里销毁精灵"的逻辑测不到。
   */
  const tick = (ms: number): void => {
    const target = now + ms;
    const STEP = 50;
    while (now < target) {
      now = Math.min(target, now + STEP);
      // 复制一份再遍历 —— 回调里可能又注册新的 timer
      for (const e of [...pending]) {
        if (!e.removed && e.at <= now) {
          e.removed = true;
          e.fn();
        }
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

/**
 * ★★ 回归：特殊棋子爆炸波及的格子，精灵必须被销毁
 *
 * 用户实测截图：消除过程中同一格叠着两个棋子（梨压在蓝莓上）。
 *
 * 根因：`specialFire` / `comboBlast` 在 EventPlayer 里曾是**空实现**。
 * 一发火箭在 core 里清掉 8 格，但只有玩家凑出三连的那 2 格产出 `match`
 * 事件 —— 另外 6 格的精灵**永远留在屏幕上**，新棋子随后落进同一格。
 *
 * core 从不产出"请删掉这个精灵"，它只说"这些格子被波及了"；
 * 把 affected 翻译成销毁是渲染层的职责。
 *
 * ⚠️ 467 项测试全绿也没抓到，因为原来的假 view 的 spriteOf() 恒返回
 *    undefined —— 测试**碰不到销毁这条路径**。
 */
describe('★★ 回归：爆炸波及的精灵会被销毁（同格重叠）', () => {
  /** 会真正记账的假 view：谁活着、谁被销毁 */
  function makeTrackingView() {
    const alive = new Set<number>();
    const removed: number[] = [];
    const tweens: { targets: unknown; onComplete?: () => void }[] = [];
    const view = {
      alive,
      removed,
      tweens,
      spriteOf: (id: number) => (alive.has(id) ? { id, x: 0, y: 0, alpha: 1 } : undefined),
      ensureSprite: (piece: { id: number }) => {
        alive.add(piece.id);
        return { setPosition: () => undefined, setAlpha: () => undefined };
      },
      resetSpriteSize: () => undefined,
      removeSprite: (id: number) => {
        alive.delete(id);
        removed.push(id);
      },
      followOverlay: () => undefined,
      showObstacle: () => undefined,
      clearObstacle: () => undefined,
      positionOf: () => ({ x: 0, y: 0 }),
      get pieceSize() {
        return 40;
      },
    };
    return view;
  }

  function setup() {
    const { scene, tick } = makeFakeScene();
    const view = makeTrackingView();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = new PhaserEventPlayer(scene as any, view as any, () => 'calm');
    // 一行 8 格，id = col + 1
    const entries = Array.from({ length: 8 }, (_, col) => ({ id: col + 1, pos: P(col, 0) }));
    for (const e of entries) view.alive.add(e.id);
    player.syncPositions(entries);
    return { player, tick, view };
  }

  it('★★ specialFire 波及的每一格都会被销毁', async () => {
    const { player, tick, view } = setup();
    const affected = Array.from({ length: 8 }, (_, col) => P(col, 0));

    const p = player.play([
      { t: 'specialFire', pos: P(0, 0), kind: 'rocketH', affected },
      { t: 'settled', maxCascade: 1, totalCleared: 8 },
    ]);
    tick(10_000);
    await p;

    expect(view.removed.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(view.alive.size).toBe(0);
  });

  it('★★ 只有部分格子有 match 事件时，其余格子也不会残留', async () => {
    const { player, tick, view } = setup();
    // 真实形态：8 格被炸，其中只有 2 格是玩家凑出的三连
    const p = player.play([
      { t: 'match', positions: [P(0, 0), P(1, 0)], color: 'red', cascadeLevel: 0 },
      {
        t: 'specialFire',
        pos: P(0, 0),
        kind: 'rocketH',
        affected: Array.from({ length: 8 }, (_, col) => P(col, 0)),
      },
      { t: 'settled', maxCascade: 1, totalCleared: 8 },
    ]);
    tick(10_000);
    await p;

    // ★ 关键：8 格全部销毁，不是只销毁有 match 的那 2 格
    expect(view.alive.size, `残留 ${view.alive.size} 个精灵，会与新落下的棋子重叠`).toBe(0);
  });

  it('★★ comboBlast 同理', async () => {
    const { player, tick, view } = setup();
    const p = player.play([
      {
        t: 'comboBlast',
        kinds: ['rocketH', 'bomb'],
        affected: Array.from({ length: 8 }, (_, col) => P(col, 0)),
      },
      { t: 'settled', maxCascade: 1, totalCleared: 8 },
    ]);
    tick(10_000);
    await p;
    expect(view.alive.size).toBe(0);
  });

  it('★ 同一格被两发火箭波及也不会重复销毁（连环引爆）', async () => {
    const { player, tick, view } = setup();
    const p = player.play([
      { t: 'specialFire', pos: P(0, 0), kind: 'rocketH', affected: [P(0, 0), P(1, 0), P(2, 0)] },
      { t: 'specialFire', pos: P(2, 0), kind: 'rocketH', affected: [P(1, 0), P(2, 0), P(3, 0)] },
      { t: 'settled', maxCascade: 2, totalCleared: 4 },
    ]);
    tick(10_000);
    await p;

    // 每个 id 最多出现一次 —— 索引被抹掉后第二发拿不到同一个精灵
    const counts = new Map<number, number>();
    for (const id of view.removed) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, n] of counts) expect(n, `精灵 ${id} 被销毁了 ${n} 次`).toBe(1);
  });
});

/**
 * ★★ 回归：play() 兑现时，**不能还有补间在跑**
 *
 * 用户实测的"同一格叠两个棋子"，除了 specialFire 空实现外还有第二层原因：
 *
 *   完成时刻由 `delayedCall(totalMs)` 决定，但排在时间轴末尾的补间
 *   会在那之后才结束。于是顺序变成：
 *     play() resolve → LevelScene 调 reconcile() 把精灵摆正
 *     → 那些还活着的补间继续跑，**又把精灵挪走 / 漏掉销毁**
 *
 *   实测：一次 27 连引爆后，reconcile 之后仍有 8 格重叠、少 1 个精灵；
 *   手动再 reconcile 一次就全好了 —— 说明问题出在"对账时棋盘还在动"。
 */
describe('★★ 回归：play() 兑现时棋盘必须已经静止', () => {
  function makeTrackingView() {
    const alive = new Set<number>();
    const removed: number[] = [];
    return {
      alive,
      removed,
      spriteOf: (id: number) => (alive.has(id) ? { id, x: 0, y: 0, alpha: 1 } : undefined),
      ensureSprite: (piece: { id: number }) => {
        alive.add(piece.id);
        return { setPosition: () => undefined, setAlpha: () => undefined };
      },
      resetSpriteSize: () => undefined,
      removeSprite: (id: number) => {
        alive.delete(id);
        removed.push(id);
      },
      followOverlay: () => undefined,
      showObstacle: () => undefined,
      clearObstacle: () => undefined,
      positionOf: () => ({ x: 0, y: 0 }),
      get pieceSize() {
        return 40;
      },
    };
  }

  it('★★ resolve 的那一刻，所有该销毁的精灵都已销毁', async () => {
    const { scene, tick } = makeFakeScene();
    const view = makeTrackingView();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = new PhaserEventPlayer(scene as any, view as any, () => 'calm');
    const entries = Array.from({ length: 8 }, (_, col) => ({ id: col + 1, pos: P(col, 0) }));
    for (const e of entries) view.alive.add(e.id);
    player.syncPositions(entries);

    let aliveAtResolve = -1;
    const p = player
      .play([
        // ★ 与 core 的真实顺序一致：match 在前，fall / spawn 在后。
        //   消除补间要跑满 matchPop，而它是在 t=0 注册的 ——
        //   最后一个 fall 结束时它早该完成；真正的风险在于
        //   **最后那批补间的 onComplete 落在 totalMs 之后**。
        { t: 'match', positions: [P(1, 0), P(2, 0), P(3, 0)], color: 'red', cascadeLevel: 0 },
        { t: 'fall', moves: [{ id: 5, from: P(4, 0), to: P(4, 3) }] },
        { t: 'match', positions: [P(6, 0), P(7, 0)], color: 'blue', cascadeLevel: 1 },
      ])
      .then(() => {
        // ★ 就在 resolve 的这一刻检查 —— 这正是 reconcile() 被调用的时机
        aliveAtResolve = view.alive.size;
      });
    tick(10_000);
    await p;

    // 5 个被消除的棋子（1,2,3 + 6,7）必须都已销毁，剩 3 个
    expect(aliveAtResolve, '兑现时仍有精灵没销毁，reconcile() 会对着一个动着的棋盘对账').toBe(3);
  });

  it('★★ 被 skipAll() 打断时，已经开始的消除动画也要把精灵销毁掉', async () => {
    const { scene, tick } = makeFakeScene();
    const view = makeTrackingView();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player = new PhaserEventPlayer(scene as any, view as any, () => 'calm');
    const entries = Array.from({ length: 4 }, (_, col) => ({ id: col + 1, pos: P(col, 0) }));
    for (const e of entries) view.alive.add(e.id);
    player.syncPositions(entries);

    const p = player.play([
      { t: 'match', positions: [P(0, 0), P(1, 0), P(2, 0)], color: 'red', cascadeLevel: 0 },
      { t: 'fall', moves: [{ id: 4, from: P(3, 0), to: P(3, 5) }] },
    ]);
    // 先让消除动画**开始**（补间已建立），再打断 —— 这才是真实的抢步场景
    tick(60);
    player.skipAll();
    await p;

    /**
     * ★ 关键：`stop()` 会让补间停在半路且**不触发 onComplete**，
     *   那 3 个精灵就永远留在盘上了。必须用 complete() 推到终点。
     */
    expect(view.alive.size, '打断后残留精灵，会与新棋子重叠').toBe(1);
    expect(view.removed.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });
});
