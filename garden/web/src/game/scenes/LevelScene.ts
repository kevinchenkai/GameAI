/**
 * game/scenes/LevelScene.ts —— 关卡场景
 *
 * 职责边界（不要越界）：
 *   - 拿玩家输入 → 交给 core.applyMove()
 *   - 拿 CoreGameEvent[] → 交给 EventPlayer 播放
 *   - **不自己维护棋盘状态**（事件序列是唯一真相源）
 *   - **不自己决定何时解锁输入**（归 TurnController，冻结契约 7）
 */

import Phaser from 'phaser';
import { createSession } from '../../core/session';
import { applyMove } from '../../core/resolver';
import { isSwappable } from '../../core/board';
import { getLevel } from '../../config/levels/index';
import { DEFAULT_TEMPO, INPUT_BUFFER, type Tempo } from '../../config/tuning';
import type { Move, Pos, SpecialKind } from '../../core/types';
import type { SessionState } from '../../core/session';
import { WebAudioManager } from '../audio/WebAudioManager';
import { BoardView } from '../render/BoardView';
import { HudView } from '../ui/HudView';
import { buildHudView, type HudModel } from '../ui/hudModel';
import { PhaserEventPlayer } from '../render/EventPlayer';
import { cellAtPoint, computeLayout, type LayoutResult } from '../render/layout';
import { buildTimeline, isBufferWindowOpen } from '../render/timeline';
import {
  advance,
  applySummary,
  bufferInput,
  canAcceptInput,
  createTurnState,
  takeBufferedMove,
  type TurnState,
} from '../TurnController';
import { createGestureState, stepGesture, type GestureState } from '../input/gesture';
import { readSafeAreaInsets } from '../safeArea';

export class LevelScene extends Phaser.Scene {
  private session!: SessionState;
  private layout!: LayoutResult;
  private view!: BoardView;
  private hud!: HudView;
  private readonly audio = new WebAudioManager();
  private player!: PhaserEventPlayer;
  private turn: TurnState = createTurnState();
  private gesture: GestureState = createGestureState();
  private tempo: Tempo = DEFAULT_TEMPO;
  /** 当前这一段动画的时间轴，仅用于缓存窗口判断 */
  private playStartedAt = 0;
  private playTotalMs = 0;

  constructor() {
    super('Level');
  }

  create(): void {
    // ★ 开发期可用 `?level=4` 直接打开指定关卡（4 是首个含冰关卡）。
    //   否则要真打通前三关才能看到冰，验证成本太高。
    const id = this.devLevelId() ?? 1;
    const level = getLevel(id);
    if (!level) throw new Error(`关卡 ${id} 不存在 —— config/levels 未正确加载`);

    // ★ 种子固定便于 M4 调试；M5 接入存档后改为真随机
    this.session = createSession(level, 20260808);

    this.devSeedSpecials();

    this.layout = this.measureLayout();
    this.view = new BoardView(this, this.layout);
    this.view.build(this.session.board);

    this.hud = new HudView(this, this.layout);
    this.hud.build(this.hudModel());

    this.player = new PhaserEventPlayer(this, this.view, () => this.tempo);
    this.syncPlayerIndex();

    this.bindInput();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
  }

  /**
   * ★ 开发期的 `?special=1`：在起始棋盘上直接种下三种特殊棋子。
   *
   *   特殊棋子要 match-4 / match-5 才生成，靠手点很难凑出来 ——
   *   而叠加层在**六色棋子上是否都看得清**恰恰是必须用眼睛验的
   *   （M4 教训：单测全绿也可能白屏，渲染层只有实跑才算数）。
   *
   *   生产构建里 `import.meta.env.DEV` 为 false，整段被 tree-shake 掉。
   */
  private devSeedSpecials(): void {
    if (!import.meta.env.DEV || typeof location === 'undefined') return;
    if (new URLSearchParams(location.search).get('special') !== '1') return;

    const kinds = ['rocketH', 'rocketV', 'bomb'] as const;
    const board = this.session.board;
    let seeded = 0;
    // 铺满一整行，六色都能看到同一种标记
    for (let row = 0; row < board.rows && seeded < kinds.length * board.cols; row++) {
      const kind = kinds[row % kinds.length];
      if (!kind) continue;
      for (let col = 0; col < board.cols; col++) {
        const piece = board.cells[row * board.cols + col]?.piece;
        if (!piece) continue;
        (piece as { special: SpecialKind }).special = kind;
        seeded++;
      }
      if (row >= kinds.length - 1) break;
    }
  }

  /** 开发期的 `?level=N`。生产构建里整段被消除 */
  private devLevelId(): number | null {
    if (!import.meta.env.DEV || typeof location === 'undefined') return null;
    const raw = new URLSearchParams(location.search).get('level');
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  /**
   * ★ 量当前视口。
   *
   *   Phaser 的 ScaleManager 在容器还没完成布局时会报 **0×0**，
   *   拿它算布局会得到"棋子边长为 0"的空棋盘（M4 实测遇到过）。
   *   这里退回到窗口尺寸兜底 —— RESIZE 事件随后会给出准确值并重排。
   */
  private measureLayout(): LayoutResult {
    const w = this.scale.width || window.innerWidth;
    const h = this.scale.height || window.innerHeight;
    return computeLayout(w, h, readSafeAreaInsets());
  }

  /** 把 core 的棋盘位置同步给播放器（每回合开头一次） */
  private syncPlayerIndex(): void {
    const entries: { id: number; pos: Pos }[] = [];
    const b = this.session.board;
    for (let row = 0; row < b.rows; row++) {
      for (let col = 0; col < b.cols; col++) {
        const cell = b.cells[row * b.cols + col];
        if (cell?.piece) entries.push({ id: cell.piece.id, pos: { col, row } });
      }
    }
    this.player.syncPositions(entries);
  }

  // ————————————————————————————————————————————————
  // 输入
  // ————————————————————————————————————————————————

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.onPointer('down', p);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.onPointer('move', p);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      this.onPointer('up', p);
    });
  }

  private onPointer(phase: 'down' | 'move' | 'up', p: Phaser.Input.Pointer): void {
    /**
     * ★ 在**用户手势的同步栈里**解锁音频。
     *   iOS Safari / Chrome 都要求这一点；异步之后再创建 AudioContext
     *   浏览器不认这个手势，表现是整局游戏一声不响、控制台还没有报错。
     */
    if (phase === 'down') this.audio.unlock();

    const step = stepGesture(
      this.gesture,
      { phase, x: p.x, y: p.y, t: this.time.now },
      (x, y) => cellAtPoint(this.layout, x, y),
      (pos) => isSwappable(this.session.board, pos),
    );
    this.gesture = step.state;

    const result = step.result;
    if (!result) return;

    if (result.kind === 'select') {
      this.view.showSelection(result.pos);
      return;
    }
    if (result.kind === 'deselect') {
      this.view.showSelection(null);
      return;
    }

    this.view.showSelection(null);
    this.requestMove({ a: result.a, b: result.b });
  }

  /**
   * ★ 输入闸门在这里 —— 唯一的入口。
   *
   *   不能输入时**不是直接丢弃**：如果正处在整段动画的最后
   *   INPUT_BUFFER.openBeforeEndMs 内，就缓存起来，等回到
   *   READY_FOR_INPUT 再兑现（冻结契约 7）。
   */
  private requestMove(move: Move): void {
    if (canAcceptInput(this.turn) || this.turn.phase === 'READY_FOR_INPUT') {
      void this.runTurn(move);
      return;
    }

    const elapsed = this.time.now - this.playStartedAt;
    const windowOpen = isBufferWindowOpen(
      { items: [], totalMs: this.playTotalMs },
      elapsed,
      INPUT_BUFFER.openBeforeEndMs,
    );
    this.turn = bufferInput(this.turn, move, windowOpen);
  }

  // ————————————————————————————————————————————————
  // 回合
  // ————————————————————————————————————————————————

  private async runTurn(move: Move): Promise<void> {
    this.turn = advance(this.turn, 'RESOLVING');

    const result = applyMove(this.session, move);
    this.session = result.session;

    // ★ 音频与渲染消费**同一份事件序列**，不另起一套时序
    this.audio.consume(result.events);

    // 时间轴要在播放前算好 —— 缓存窗口判断依赖它
    const timeline = buildTimeline(result.events, this.tempo);
    this.playStartedAt = this.time.now;
    this.playTotalMs = timeline.totalMs;

    await this.player.play(result.events);

    this.turn = advance(this.turn, 'BOARD_SETTLED');
    this.turn = advance(this.turn, 'TURN_RESOLVED');

    const summary = result.events.find((e) => e.t === 'turnResolved');
    if (summary && summary.t === 'turnResolved') {
      this.turn = applySummary(this.turn, summary.summary);
    }

    // ★ 与 core 对账：以 core 的棋盘为准，不累积渲染层的推测
    this.view.reconcile(this.session.board);
    this.hud.update(this.hudModel());
    this.syncPlayerIndex();
    this.rebuildIfNeeded(result.events);

    // M5/M6 会在这里插入 PRESENTATION（宠物反应、结算弹窗）
    this.turn = advance(this.turn, 'READY_FOR_INPUT');

    // ★ 兑现缓存 —— **必须重新验证合法性**（棋盘已变），非法则静默丢弃
    const taken = takeBufferedMove(this.turn);
    this.turn = taken.state;
    if (taken.move && this.isStillLegal(taken.move)) {
      void this.runTurn(taken.move);
    }
  }

  private isStillLegal(move: Move): boolean {
    return (
      this.session.result === 'continue' &&
      this.session.movesLeft > 0 &&
      isSwappable(this.session.board, move.a) &&
      isSwappable(this.session.board, move.b)
    );
  }

  /**
   * Shuffle 后棋盘整体重排，逐个补间没有意义 —— 直接重建。
   * ★ 判断依据是**事件**，不是渲染层自己的比较。
   */
  private rebuildIfNeeded(events: readonly { t: string }[]): void {
    if (!events.some((e) => e.t === 'shuffle')) return;
    this.view.build(this.session.board);
    this.syncPlayerIndex();
  }

  // ————————————————————————————————————————————————
  // 尺寸变化（转屏、地址栏收起）
  // ————————————————————————————————————————————————

  private onResize(): void {
    this.layout = this.measureLayout();
    this.view.setLayout(this.layout);
    this.view.build(this.session.board);
    this.hud.setLayout(this.layout);
    this.hud.rebuild(this.hudModel());
    this.syncPlayerIndex();
  }

  /** HUD 的数据源。★ 由 core 的关卡 + 进度推导，渲染层不自己记账 */
  private hudModel(): HudModel {
    return buildHudView(this.session.level, this.session.progress, this.session.movesLeft);
  }
}
