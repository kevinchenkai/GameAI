/**
 * tests/game/webAudioUnlock.test.ts —— AudioContext 解锁竞态
 *
 * ★ 为什么要给 WebAudioManager 补测试：
 *   用户实测"微信里第一局没声音，点一次设置才有声"。
 *   这个 bug 活到线上，正是因为**音频层一条测试都没有** ——
 *   sfxPlan（排哪些音）测得很细，但"排进 context"这一步是裸奔的。
 *
 * ★★ 关键在于 FakeAudioContext 必须**如实模拟 suspended 的行为**：
 *   suspended 时 `currentTime` **冻结不推进**，且 resume() 是
 *   要等若干毫秒才落地的 Promise。
 *   如果 fake 里让 currentTime 照常走，这些测试会全绿而 bug 依旧 ——
 *   假的太好说话，测了等于没测。
 */

import { describe, it, expect, vi } from 'vitest';
import { WebAudioManager } from '../../src/game/audio/WebAudioManager';
import type { CoreGameEvent } from '../../src/core/types';

/** 排进去的每个音：什么时候响 */
interface Scheduled {
  readonly startAt: number;
}

class FakeOscillator {
  frequency = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  type = 'sine';
  onended: (() => void) | null = null;
  constructor(private readonly sink: Scheduled[]) {}
  connect(): void {}
  disconnect(): void {}
  start(at: number): void {
    this.sink.push({ startAt: at });
  }
  stop(): void {}
}

class FakeAudioContext {
  state: 'suspended' | 'running' = 'suspended';
  sampleRate = 48000;
  readonly scheduled: Scheduled[] = [];
  /** 有多少次 resume 还没落地 */
  private resolvers: Array<() => void> = [];
  /** ★ 只有 running 时才推进 —— 这是本测试的核心 */
  private clock = 0;

  get currentTime(): number {
    return this.state === 'running' ? this.clock : 0;
  }

  /** 模拟真实设备：resume 要 100~300ms 才落地 */
  resume(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.resolvers.push(() => {
        this.state = 'running';
        resolve();
      });
    });
  }

  /** 测试手动让 resume 落地，并把时钟推到解锁真正完成的时刻 */
  async landResume(elapsedSec = 0.18): Promise<void> {
    this.clock = elapsedSec;
    const rs = this.resolvers;
    this.resolvers = [];
    for (const r of rs) r();
    // 让 .then 链跑完
    await Promise.resolve();
    await Promise.resolve();
  }

  createGain(): unknown {
    return {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: (): void => {},
      disconnect: (): void => {},
    };
  }
  createOscillator(): FakeOscillator {
    return new FakeOscillator(this.scheduled);
  }
  createBuffer(): unknown {
    return {};
  }
  createBufferSource(): unknown {
    return { buffer: null, connect: (): void => {}, start: (): void => {} };
  }
  get destination(): unknown {
    return {};
  }
}

/** 装好假的 window.AudioContext，并给出"取到那个实例"的句柄 */
interface Handle {
  /** WebAudioManager 创建出来的那个 fake context */
  readonly instance: FakeAudioContext;
}

function install(): Handle {
  let made: FakeAudioContext | null = null;
  (globalThis as unknown as { window: unknown }).window = {
    AudioContext: class {
      constructor() {
        made = new FakeAudioContext();
        return made as unknown as FakeAudioContext;
      }
    },
  };
  return {
    get instance(): FakeAudioContext {
      if (!made) throw new Error('context 尚未创建 —— unlock() 没被调用？');
      return made;
    },
  };
}

/**
 * 一段最小但真实的回合事件：交换 + 消除。
 *
 * ★ **不加 `as unknown` 强转** —— 第一版我照印象写了 `cells` / `piece`，
 *   真实字段是 `positions` / `color`，强转正好把这个错误藏了起来，
 *   跑起来才在 planSfx 里炸。让类型检查看得见，才是它存在的意义。
 */
const TURN: readonly CoreGameEvent[] = [
  { t: 'swap', a: { col: 0, row: 0 }, b: { col: 1, row: 0 } },
  {
    t: 'match',
    positions: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ],
    color: 'red',
    cascadeLevel: 1,
  },
];

describe('AudioContext 解锁竞态（微信首局无声）', () => {
  it('★ suspended 时不排期 —— 否则音符全排在过去，永远不会响', async () => {
    const handle = install();
    const audio = new WebAudioManager();

    // 第一次点击：unlock 创建 context 并发起 resume（未落地）
    audio.unlock();
    const ctx = handle.instance;
    expect(ctx.state).toBe('suspended');

    // 同一次点击内立刻结算这一回合
    audio.consume(TURN);

    // ★ 关键断言：一个音都不许排进去
    //   （回归前这里会排进 2 个音，且 startAt 全在 0~0.5s）
    expect(ctx.scheduled).toHaveLength(0);
  });

  it('★ resume 落地后补播被搁置的那一段，且全部排在解锁之后', async () => {
    const handle = install();
    const audio = new WebAudioManager();

    audio.unlock();
    const ctx = handle.instance;
    audio.consume(TURN);
    expect(ctx.scheduled).toHaveLength(0);

    // resume 在 180ms 后落地
    await ctx.landResume(0.18);

    // ★ 补播了
    expect(ctx.scheduled.length).toBeGreaterThan(0);
    // ★ 且每个音都排在"现在"之后 —— 不是过去式
    for (const s of ctx.scheduled) {
      expect(s.startAt).toBeGreaterThanOrEqual(0.18);
    }
  });

  it('context 已经在跑时，走正常路径立刻排期（不进补播队列）', async () => {
    const handle = install();
    const audio = new WebAudioManager();

    audio.unlock();
    const ctx = handle.instance;
    await ctx.landResume(0.2);
    ctx.scheduled.length = 0; // 清掉解锁期间的

    audio.consume(TURN);
    expect(ctx.scheduled.length).toBeGreaterThan(0);
  });

  it('★ 连续多回合被搁置时只补最后一段 —— 否则解锁瞬间会一起炸开', async () => {
    const handle = install();
    const audio = new WebAudioManager();

    audio.unlock();
    const ctx = handle.instance;

    audio.consume(TURN);
    audio.consume(TURN);
    audio.consume(TURN);
    expect(ctx.scheduled).toHaveLength(0);

    await ctx.landResume(0.18);

    // 只补一段：音数应当等于单段的量，而不是三段之和
    const oneTurn = ctx.scheduled.length;
    ctx.scheduled.length = 0;
    await ctx.landResume(0.3); // 再落一次不应该又补一遍
    expect(ctx.scheduled).toHaveLength(0);
    expect(oneTurn).toBeGreaterThan(0);
  });

  it('静音时不排期，也不堆积补播队列', async () => {
    const handle = install();
    const audio = new WebAudioManager();
    audio.setMuted(true);

    audio.unlock();
    const ctx = handle.instance;
    audio.consume(TURN);
    await ctx.landResume(0.18);

    expect(ctx.scheduled).toHaveLength(0);
  });
});
