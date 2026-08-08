/**
 * game/pet/PetController.ts —— 宠物状态机（M6 实现）
 *
 * 消费 CoreGameEvent[]，按 §6.2 分两层反应：
 *   - `match` 事件      → 轻反应，可在连锁中叠加，**绝不阻塞棋盘**
 *   - `turnResolved` 事件 → 重反应，走 resolvePetDecision()，**一段连锁最多一次**
 *
 * ★ 永不消费裸 `settled`（冻结契约 3）——那时胜负还未知。
 *   `settled` 只说明棋盘不动了，可能下一刻就是 levelWin。
 *   在那里做反应会出现"先欢呼、再显示失败"的荒诞时序。
 *
 * ★★ 本文件**不碰 Phaser**，表现全部委托给注入的 PetPresenter。
 *   这样状态机可以在 Node 里单测 —— 宠物的规则（优先级、一段连锁最多
 *   一次重反应、预算超限降级）都是逻辑，不该绑在渲染上。
 */

import { PET_ANIM_BUDGET } from '../../config/tuning';
import type { CoreGameEvent } from '../../core/types';
import { resolvePetDecision, type PetDecision } from './reactionResolver';
import { createPetRuntime, type PetRuntimeState, type PetState } from './state';

/**
 * 表现侧接口。★ 只有"放什么"，没有"放完通知我" ——
 * 轻反应不允许有完成回调，那是阻塞的温床。
 */
export interface PetPresenter {
  playHappy(): void;
  playExcited(durationMs: number): void;
  setState(state: PetState): void;
}

/** 时间源。注入而非直接读 Date.now()，便于单测推进时间 */
export type NowFn = () => number;

export class PetControllerImpl {
  private runtimeState: PetRuntimeState;
  /** 重反应结束的时间戳；> now 表示正在播 */
  private blockingUntil = 0;
  /** 累计重反应时长，用于预算比例计算 */
  private heavyMs = 0;
  /** 观察窗口起点 —— 预算是**比例**，需要一个分母 */
  private windowStart: number;
  /** ★ 一段连锁最多一次重反应：turnResolved 才清零 */
  private heavyThisTurn = false;

  constructor(
    private readonly presenter: PetPresenter,
    private readonly now: NowFn,
    maxEnergy: number,
  ) {
    this.runtimeState = createPetRuntime(maxEnergy);
    this.windowStart = now();
  }

  get runtime(): PetRuntimeState {
    return this.runtimeState;
  }

  /**
   * 事件入口。
   *
   * ★ 遍历顺序即事件顺序 —— core 保证 turnResolved 是一段结算的最后一个事件，
   *   所以"先若干 match（轻反应），最后 turnResolved（重反应）"是自然结果，
   *   不需要在这里排序。
   */
  consume(events: readonly CoreGameEvent[]): void {
    for (const e of events) {
      switch (e.t) {
        case 'match':
          this.onLightReaction();
          break;
        case 'turnResolved':
          this.onHeavyReaction(resolvePetDecision(e.summary, this.runtimeState));
          break;
        default:
          // ★ 其余事件一概不看 —— 尤其是 `settled`（冻结契约 3）
          break;
      }
    }
  }

  /**
   * 轻反应：开心一下。
   *
   * ★ 不记预算、不置 blocking、不设状态机状态 ——
   *   它在连锁中可能触发很多次，任何一项都会把它变成阻塞源。
   */
  private onLightReaction(): void {
    if (this.isBlocking()) return; // 重反应播放中，不要被轻反应打断
    this.presenter.playHappy();
  }

  /**
   * 重反应：一段连锁**最多一次**。
   *
   * ★ `heavyThisTurn` 在这里置位、在下一次 turnResolved 前不清 ——
   *   实际上 core 一段结算只发一次 turnResolved，这个标志是**防御性**的：
   *   将来若有人在 cascade 中途补发 turnResolved，这里不会连放两次动画。
   */
  private onHeavyReaction(decision: PetDecision): void {
    if (this.heavyThisTurn) return;
    this.heavyThisTurn = true;

    if (decision.type === 'skillOffer') {
      // Stage 0 不实现技能（skillReady 恒为 false，走不到这里）
      return;
    }

    const state = decision.state;
    this.setState(state);

    // idle 不是"反应"，不占预算也不阻塞
    if (state === 'idle') return;

    /**
     * ★ 超预算就**降级为轻反应**，而不是硬播。
     *   maxHeavyRatio = 8%：重反应占比过高时，游戏节奏会被宠物拖住 ——
     *   这正是"宠物很可爱但玩起来很烦"的成因。
     */
    if (this.isOverBudget()) {
      this.presenter.playHappy();
      return;
    }

    const duration = this.durationFor(state);
    this.heavyMs += duration;
    this.blockingUntil = this.now() + duration;
    this.presenter.playExcited(duration);
  }

  private durationFor(state: PetState): number {
    switch (state) {
      case 'excited':
        return PET_ANIM_BUDGET.excitedDuration;
      case 'skill':
        return PET_ANIM_BUDGET.skillDuration;
      case 'hint':
        return PET_ANIM_BUDGET.hintDuration;
      default:
        // victory / encourage 用 excited 的时长，Stage 0 不单列
        return PET_ANIM_BUDGET.excitedDuration;
    }
  }

  /** 新回合开始时调用，允许下一次重反应 */
  beginTurn(): void {
    this.heavyThisTurn = false;
  }

  setState(state: PetState): void {
    if (this.runtimeState.state === state) return;
    this.runtimeState = { ...this.runtimeState, state };
    this.presenter.setState(state);
  }

  /**
   * 重反应是否正在播 —— TurnController 的 canAcceptInput 要看它。
   *
   * ★ 只有重反应算 blocking。轻反应永远返回 false，
   *   否则连锁中每次 match 都会锁一下输入，手感会变得黏。
   */
  isBlocking(): boolean {
    return this.now() < this.blockingUntil;
  }

  /**
   * 累计重反应时长是否已超 maxHeavyRatio。
   *
   * ★ 比例的分母是**真实经过时间**，不是回合数 ——
   *   玩家思考 30 秒时不该攒下"可以多播 3 次动画"的额度。
   */
  isOverBudget(): boolean {
    const elapsed = this.now() - this.windowStart;
    if (elapsed <= 0) return false;
    return this.heavyMs / elapsed > PET_ANIM_BUDGET.maxHeavyRatio;
  }

  /** 关卡重开时清零 —— 否则上一局的预算会污染新一局 */
  reset(): void {
    this.runtimeState = createPetRuntime(this.runtimeState.maxEnergy);
    this.blockingUntil = 0;
    this.heavyMs = 0;
    this.windowStart = this.now();
    this.heavyThisTurn = false;
  }
}

export interface PetController {
  consume(events: readonly CoreGameEvent[]): void;
  readonly runtime: PetRuntimeState;
  isBlocking(): boolean;
  isOverBudget(): boolean;
}
