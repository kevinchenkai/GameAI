/**
 * hintSchedule 单测 —— Hint 节奏
 *
 * ★ 这段代码最容易写出**恼人**的体验，而"恼人"在真机上要等 10 秒才感受得到。
 *   把节奏钉在测试里，比反复在手机上盯着看可靠得多。
 */

import { describe, expect, it } from 'vitest';
import {
  createHintState,
  phaseFor,
  resetHint,
  shouldSpeak,
  tickHint,
} from '../../src/game/pet/hintSchedule';
import { HINT_TIMING } from '../../src/config/pet';

describe('阶段划分', () => {
  it('刚操作完是 none', () => {
    expect(phaseFor(0)).toBe('none');
  });

  it('★ 阈值用 >=：配置写 3000 就在 3000ms 触发', () => {
    expect(phaseFor(HINT_TIMING.thinkingAfterMs - 1)).toBe('none');
    expect(phaseFor(HINT_TIMING.thinkingAfterMs)).toBe('thinking');
  });

  it('5s → hint', () => {
    expect(phaseFor(HINT_TIMING.hintAfterMs)).toBe('hint');
  });

  it('10s → repeat', () => {
    expect(phaseFor(HINT_TIMING.repeatAfterMs)).toBe('repeat');
  });

  it('★ 阶段顺序是单调的（不会 5s 反而比 3s 更弱）', () => {
    const order = ['none', 'thinking', 'hint', 'repeat'];
    let last = 0;
    for (const ms of [0, 1000, 3000, 4000, 5000, 8000, 10000, 30000]) {
      const idx = order.indexOf(phaseFor(ms));
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });
});

describe('★★ justEntered —— 只在跨入瞬间为真', () => {
  it('同一阶段内连续 tick 只报告一次', () => {
    let s = createHintState(0);
    const r1 = tickHint(s, HINT_TIMING.thinkingAfterMs);
    expect(r1.justEntered).toBe(true);
    s = r1.state;

    // 停在 thinking 阶段内反复 tick
    for (const t of [3100, 3500, 4000, 4900]) {
      const r = tickHint(s, t);
      expect(r.justEntered).toBe(false);
      s = r.state;
    }
  });

  /**
   * ★ 如果每帧都按 phase 播动画，5s 之后旺财会每帧重启一次跑动，
   *   看起来像卡住。这条测试就是防这个。
   */
  it('★ 长时间停在 hint 阶段不会反复触发', () => {
    let s = createHintState(0);
    s = tickHint(s, HINT_TIMING.hintAfterMs).state;
    let fired = 0;
    for (let t = HINT_TIMING.hintAfterMs; t < HINT_TIMING.repeatAfterMs; t += 16) {
      const r = tickHint(s, t);
      if (r.justEntered) fired++;
      s = r.state;
    }
    expect(fired).toBe(0);
  });

  it('跨入下一阶段时再次为真', () => {
    let s = createHintState(0);
    s = tickHint(s, HINT_TIMING.thinkingAfterMs).state;
    const r = tickHint(s, HINT_TIMING.hintAfterMs);
    expect(r.justEntered).toBe(true);
    expect(r.state.phase).toBe('hint');
  });
});

describe('★★ 玩家操作后归零', () => {
  it('归零后回到 none', () => {
    const s = resetHint(12_345);
    expect(s.phase).toBe('none');
    expect(s.idleSince).toBe(12_345);
  });

  /**
   * ★ 归零必须**彻底**（phase 也回 none）。
   *   若只重置 idleSince 而留着 phase='repeat'，
   *   下次计时到 hint 时 `phase !== state.phase` 成立，
   *   会凭空多播一次提示 —— 玩家刚走完一步就被提示，很突兀。
   */
  it('★ 从 repeat 归零后重新计时，不会立刻误报 justEntered', () => {
    let s = createHintState(0);
    s = tickHint(s, HINT_TIMING.repeatAfterMs).state;
    expect(s.phase).toBe('repeat');

    s = resetHint(20_000);
    const r = tickHint(s, 20_100); // 刚操作完 100ms
    expect(r.justEntered).toBe(false);
    expect(r.state.phase).toBe('none');
  });
});

describe('文案纪律', () => {
  it('★ 只有首次 hint 出文字', () => {
    expect(shouldSpeak('hint')).toBe(true);
  });

  it('★★ repeat 阶段静默 —— 同一句话说两遍就从"可爱"变成"聒噪"', () => {
    expect(shouldSpeak('repeat')).toBe(false);
  });

  it('thinking 与 none 都不出文字', () => {
    expect(shouldSpeak('thinking')).toBe(false);
    expect(shouldSpeak('none')).toBe(false);
  });
});

describe('配置自洽', () => {
  it('★ 三个阈值必须递增，否则阶段永远跳不到后面', () => {
    expect(HINT_TIMING.thinkingAfterMs).toBeLessThan(HINT_TIMING.hintAfterMs);
    expect(HINT_TIMING.hintAfterMs).toBeLessThan(HINT_TIMING.repeatAfterMs);
  });
});

/**
 * ★★ 回归：进入 hint 阶段时**不能当场把状态覆盖回 idle**。
 *
 *   真实 bug：`showHintMove()` 一上来调了整套 `clearHint()` 做清理，
 *   而 `clearHint()` 会把旺财从 hint/thinking 拉回 idle ——
 *   于是 `setState('hint')` 刚设好就被自己覆盖，
 *   旺财永远进不了 hint 状态。
 *
 *   画面上**完全看不出来**：Idle 微动作是独立 tween，尾巴照样摇，
 *   呼吸提示也照常出现。只有查运行时状态才发现。
 *   修法是把"停 tween"和"复位状态"拆成两个函数。
 *
 *   这里用一个最小状态机复刻当时的调用序列，锁住这个顺序契约。
 */
describe('★★ 回归：进入 hint 不被自身清理覆盖', () => {
  /** 复刻 LevelScene 的两个清理函数的**职责边界** */
  function makeScene() {
    const s = {
      petState: 'idle' as string,
      tween: null as string | null,
      stopHintTween(): void {
        s.tween = null; // 只停动画，不碰状态
      },
      clearHint(): void {
        s.stopHintTween();
        if (s.petState === 'thinking' || s.petState === 'hint') s.petState = 'idle';
      },
      showHintMove(): void {
        s.stopHintTween(); // ★ 关键：不是 clearHint()
        s.tween = 'breathing';
      },
      enterHint(): void {
        s.petState = 'hint';
        s.showHintMove();
      },
    };
    return s;
  }

  it('★ enterHint 之后状态必须停在 hint', () => {
    const s = makeScene();
    s.enterHint();
    expect(s.petState).toBe('hint');
    expect(s.tween).toBe('breathing');
  });

  it('★ 连续进入 hint（repeat 阶段）不会丢状态，也不会叠加动画', () => {
    const s = makeScene();
    s.enterHint();
    s.enterHint();
    expect(s.petState).toBe('hint');
    expect(s.tween).toBe('breathing'); // 只有一个，不累积
  });

  it('★ clearHint 才把旺财拉回 idle 并停掉动画', () => {
    const s = makeScene();
    s.enterHint();
    s.clearHint();
    expect(s.petState).toBe('idle');
    expect(s.tween).toBeNull();
  });

  it('clearHint 不影响非提示状态（例如 excited 不该被踩成 idle）', () => {
    const s = makeScene();
    s.petState = 'excited';
    s.clearHint();
    expect(s.petState).toBe('excited');
  });
});
