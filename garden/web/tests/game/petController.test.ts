/**
 * PetController 单测 —— 宠物状态机
 *
 * ★ 这些是**冻结契约**的可执行版本。契约 3 说"宠物只消费 turnResolved、
 *   永不消费裸 settled"，那就必须有一条测试在有人违反时变红，
 *   否则契约只是注释里的一句话。
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PetControllerImpl, type PetPresenter } from '../../src/game/pet/PetController';
import { PET_ANIM_BUDGET, COMBO_EXCITED_THRESHOLD } from '../../src/config/tuning';
import type { CoreGameEvent, CoreTurnSummary } from '../../src/core/types';
import type { PetState } from '../../src/game/pet/state';

function summary(over: Partial<CoreTurnSummary> = {}): CoreTurnSummary {
  return { maxCascade: 1, totalCleared: 3, specialCreated: [], result: 'continue', ...over };
}

function makePresenter(): PetPresenter & {
  happy: number;
  excited: number[];
  states: PetState[];
} {
  return {
    happy: 0,
    excited: [] as number[],
    states: [] as PetState[],
    playHappy(): void {
      this.happy++;
    },
    playExcited(ms: number): void {
      this.excited.push(ms);
    },
    setState(s: PetState): void {
      this.states.push(s);
    },
  };
}

/** 可控时钟 —— 预算与阻塞都依赖时间，不能用真实时间测 */
function clock(start = 0): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}

/**
 * ★ 用**真实事件形状**，不要 `as unknown as` 强转。
 *   第一版我写成 `{ cleared: [] }` 并强转过关 —— 而 core 的字段其实叫
 *   `positions`。强转把类型检查这道防线关掉了，测试便不再能证明
 *   "我消费的是 core 真的会发出来的事件"。
 */
const MATCH: CoreGameEvent = {
  t: 'match',
  positions: [{ col: 0, row: 0 }],
  color: 'red',
  cascadeLevel: 1,
};

function resolved(over: Partial<CoreTurnSummary> = {}): CoreGameEvent {
  return { t: 'turnResolved', summary: summary(over) };
}

describe('★★ 冻结契约 3：宠物只消费 turnResolved，永不消费裸 settled', () => {
  it('settled 不触发任何反应', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([
      { t: 'settled', maxCascade: 5, totalCleared: 20 },
      { t: 'movesChanged', left: 9 },
    ]);
    expect(p.happy).toBe(0);
    expect(p.excited).toEqual([]);
    expect(p.states).toEqual([]);
  });

  it('★ settled 之后才来的 turnResolved 才是触发点', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([
      { t: 'settled', maxCascade: 5, totalCleared: 20 },
      resolved({ maxCascade: COMBO_EXCITED_THRESHOLD }),
    ]);
    expect(p.excited.length).toBe(1);
  });
});

describe('轻反应（match）', () => {
  let p: ReturnType<typeof makePresenter>;
  let c: ReturnType<typeof clock>;
  let ctl: PetControllerImpl;
  beforeEach(() => {
    p = makePresenter();
    c = clock();
    ctl = new PetControllerImpl(p, c.now, 100);
  });

  it('每个 match 放一次轻反应', () => {
    ctl.consume([MATCH, MATCH, MATCH]);
    expect(p.happy).toBe(3);
  });

  it('★ 轻反应永不阻塞输入', () => {
    ctl.consume([MATCH, MATCH]);
    expect(ctl.isBlocking()).toBe(false);
  });

  it('★ 轻反应不计入动画预算', () => {
    for (let i = 0; i < 200; i++) ctl.consume([MATCH]);
    c.advance(1000);
    expect(ctl.isOverBudget()).toBe(false);
  });

  it('★ 重反应播放中，轻反应不打断它', () => {
    ctl.consume([resolved({ maxCascade: COMBO_EXCITED_THRESHOLD })]);
    const before = p.happy;
    ctl.consume([MATCH, MATCH]);
    expect(p.happy).toBe(before); // 被抑制
  });
});

describe('重反应（turnResolved）', () => {
  it('大 combo 触发 excited', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([resolved({ maxCascade: COMBO_EXCITED_THRESHOLD })]);
    expect(p.states).toContain('excited');
    expect(p.excited).toEqual([PET_ANIM_BUDGET.excitedDuration]);
  });

  it('小 combo 只是 idle，不放动画、不阻塞', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([resolved({ maxCascade: 1 })]);
    expect(p.excited).toEqual([]);
    expect(ctl.isBlocking()).toBe(false);
  });

  it('胜利演 victory', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([resolved({ result: 'win' })]);
    expect(p.states).toContain('victory');
  });

  it('失败演 encourage', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([resolved({ result: 'lose' })]);
    expect(p.states).toContain('encourage');
  });

  /**
   * ★★ 防御性：core 目前一段结算只发一次 turnResolved。
   *   但如果将来有人在 cascade 中途补发，这里不能连放两次动画。
   */
  it('★ 一段连锁最多一次重反应', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([
      resolved({ maxCascade: COMBO_EXCITED_THRESHOLD }),
      resolved({ maxCascade: COMBO_EXCITED_THRESHOLD }),
    ]);
    expect(p.excited.length).toBe(1);
  });

  it('beginTurn() 之后才允许下一次重反应', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([resolved({ maxCascade: COMBO_EXCITED_THRESHOLD })]);
    c.advance(10_000); // 让上一次播完，且预算比例回落
    ctl.beginTurn();
    ctl.consume([resolved({ maxCascade: COMBO_EXCITED_THRESHOLD })]);
    expect(p.excited.length).toBe(2);
  });
});

describe('阻塞窗口', () => {
  it('★ 重反应期间 isBlocking() 为真，播完自动解除', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([resolved({ maxCascade: COMBO_EXCITED_THRESHOLD })]);
    expect(ctl.isBlocking()).toBe(true);
    c.advance(PET_ANIM_BUDGET.excitedDuration - 1);
    expect(ctl.isBlocking()).toBe(true);
    c.advance(2);
    expect(ctl.isBlocking()).toBe(false);
  });

  it('idle 决策不产生阻塞窗口', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([resolved({ maxCascade: 1 })]);
    expect(ctl.isBlocking()).toBe(false);
  });
});

describe('★★ 动画预算（maxHeavyRatio = 8%）', () => {
  it('★ 超预算时降级为轻反应，而不是硬播重动画', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);

    // 连续快速触发重反应：时间几乎不走，比例迅速超标
    for (let i = 0; i < 6; i++) {
      ctl.beginTurn();
      c.advance(PET_ANIM_BUDGET.excitedDuration); // 只走动画本身的时间
      ctl.consume([resolved({ maxCascade: COMBO_EXCITED_THRESHOLD })]);
    }
    expect(ctl.isOverBudget()).toBe(true);
    // 超标后应当出现降级（轻反应）
    expect(p.happy).toBeGreaterThan(0);
  });

  it('★ 玩家长时间思考不该攒下额度（分母是真实时间，不是回合数）', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    ctl.consume([resolved({ maxCascade: COMBO_EXCITED_THRESHOLD })]);
    c.advance(60_000); // 思考一分钟
    expect(ctl.isOverBudget()).toBe(false);
  });

  it('开局瞬间（elapsed = 0）不误判超预算', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    expect(ctl.isOverBudget()).toBe(false);
  });
});

describe('reset()', () => {
  it('★ 重开关卡后预算与阻塞都清零 —— 否则上一局会污染新一局', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    for (let i = 0; i < 6; i++) {
      ctl.beginTurn();
      c.advance(PET_ANIM_BUDGET.excitedDuration);
      ctl.consume([resolved({ maxCascade: COMBO_EXCITED_THRESHOLD })]);
    }
    expect(ctl.isOverBudget()).toBe(true);

    ctl.reset();
    expect(ctl.isOverBudget()).toBe(false);
    expect(ctl.isBlocking()).toBe(false);
    expect(ctl.runtime.state).toBe('idle');
  });
});

describe('Stage 0 边界', () => {
  it('★ skillReady 恒为 false —— Stage 0 不做技能', () => {
    const p = makePresenter();
    const c = clock();
    const ctl = new PetControllerImpl(p, c.now, 100);
    expect(ctl.runtime.skillReady).toBe(false);
  });
});
