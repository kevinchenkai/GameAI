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
import { INPUT_BUFFER, type Tempo } from '../../config/tuning';
import type { CoreGameEvent, Move, Pos, SpecialKind } from '../../core/types';
import { loadSettings, saveSettings } from '../../meta/settings';
import type { SessionState } from '../../core/session';
import { WebAudioManager } from '../audio/WebAudioManager';
import { BoardView } from '../render/BoardView';
import { HudView } from '../ui/HudView';
import { Panel } from '../ui/Panel';
import { ResultPanel } from '../ui/ResultPanel';
import { SettingsPanel } from '../ui/SettingsPanel';
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
  setFlags,
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
  private tempo: Tempo = loadSettings().tempo;
  private result!: ResultPanel;
  private settings!: SettingsPanel;
  private settingsButton: Panel | null = null;
  /**
   * ★ 跨 scene.restart() 传递关卡 id。
   *   restart 会重建实例字段，但 Phaser 的 Scene 对象本身是复用的，
   *   所以挂在 this 上的这个值能活过重启。
   */
  private pendingLevelId: number | null = null;
  /** ★ 存成字段才能在 shutdown 时正确解绑（箭头函数每次新建会解不掉） */
  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') this.audio.unlock();
  };
  /** 当前这一段动画的时间轴，仅用于缓存窗口判断 */
  private playStartedAt = 0;
  private playTotalMs = 0;

  constructor() {
    super('Level');
  }

  create(): void {
    // ★ 关卡来源优先级：重开指定的 > URL 的 ?level= > 第 1 关
    const id = this.pendingLevelId ?? this.devLevelId() ?? 1;
    this.pendingLevelId = null;
    const level = getLevel(id);
    if (!level) throw new Error(`关卡 ${id} 不存在 —— config/levels 未正确加载`);

    // ★ 每次重开换一个种子，否则"再试一次"会拿到一模一样的棋盘 ——
    //   玩家会以为按钮没生效。用时间戳而非 Math.random()（红线：随机走 rng）
    this.session = createSession(level, Date.now() & 0x7fffffff);

    /**
     * ★★ `scene.restart()` **不会重建实例**，只是再跑一次 `create()`。
     *   所以所有"字段初始化式"（`private turn = createTurnState()`）
     *   只在**第一次**执行，之后永远保留上一局的值。
     *
     *   ⚠️ 实测踩到：过关后点「下一关」，新关卡的相位仍停在
     *   `PRESENTATION` —— 输入被永久锁死，**棋盘看着正常但完全点不动**，
     *   而且没有任何报错。手势状态与时间轴同理。
     *   这类状态必须在 create() 里显式复位。
     */
    this.turn = createTurnState();
    this.gesture = createGestureState();
    this.playStartedAt = 0;
    this.playTotalMs = 0;

    // 设置同样要重新读
    const saved = loadSettings();
    this.tempo = saved.tempo;
    this.audio.setMuted(saved.muted);
    this.audio.setSfxVolume(saved.sfxVolume);

    this.result = new ResultPanel(this);
    this.settings = new SettingsPanel(this);
    // restart 后场景里的 GameObject 已被清空，旧引用是死的
    this.settingsButton = null;

    this.devSeedSpecials();

    this.layout = this.measureLayout();
    this.view = new BoardView(this, this.layout);
    this.view.build(this.session.board);

    this.hud = new HudView(this, this.layout);
    this.hud.build(this.hudModel());

    this.player = new PhaserEventPlayer(this, this.view, () => this.tempo);
    this.syncPlayerIndex();

    this.bindInput();
    this.buildSettingsButton();

    /**
     * ★ 从后台回来要重新解锁音频。
     *   iOS / 微信在页面进入后台时会挂起 AudioContext，回来后
     *   若不 resume，后续所有音效都排期到一个 suspended 的 context 上 ——
     *   静默失败，没有任何报错。
     */
    document.addEventListener('visibilitychange', this.onVisibility);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.onVisibility);
    });
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
   *
   * ★★ 游戏内坐标是**物理像素**（main.ts 按 DPR 放大了缓冲区，
   *   否则手机上文字全糊）。所以：
   *   - 兜底的 `window.innerWidth` 是 CSS 像素，**要乘回倍率**
   *   - Safe Area 由 CSS env() 读出，也是 CSS 像素，同样要换算
   *   两者任一漏乘，棋盘就会偏移或缩到半屏。
   */
  private measureLayout(): LayoutResult {
    const scale = this.renderScale();
    const w = this.scale.width || window.innerWidth * scale;
    const h = this.scale.height || window.innerHeight * scale;

    const css = readSafeAreaInsets();
    const insets = {
      top: css.top * scale,
      right: css.right * scale,
      bottom: css.bottom * scale,
      left: css.left * scale,
    };
    // ★ 列数以**关卡数据**为准，不让布局算法自选 ——
    //   否则关卡是 7×7、棋盘却按 8 列铺格，棋子不会变大（见 layout.ts 注释）。
    //   ⚠️ `session` 是 `!:` 断言字段，首次布局可能早于 createSession，
    //   这里用可选链兜底，不能直接点出来。
    return computeLayout(w, h, insets, scale, this.session?.board.cols);
  }

  /** 画布缓冲相对 CSS 尺寸的倍率（与 main.ts 的 renderScale 一致） */
  private renderScale(): number {
    const canvas = this.game.canvas;
    const cssW = canvas?.clientWidth ?? 0;
    if (!canvas || cssW <= 0) return 1;
    const ratio = canvas.width / cssW;
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
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

    /**
     * ★ 有模态面板开着时，棋盘手势必须整体停摆。
     *
     *   ⚠️ 光靠"压暗层吃掉点击"不够：Phaser 的 `this.input.on(POINTER_*)`
     *   是**场景级**监听，不管点在哪个对象上都会触发。
     *   不挡的话，玩家在结算弹窗上点"再试一次"，
     *   那一下**同时**被当成棋盘上的一次点选 —— 手势状态机被污染，
     *   重开后第一次滑动就会莫名其妙地换错棋子。
     */
    if (this.result.isOpen || this.settings.isOpen) {
      this.gesture = createGestureState();
      return;
    }

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

    /**
     * ★ 胜负结算走 **PRESENTATION** 相位（冻结契约 7 为此预留）。
     *   ⚠️ 不要在这里直接 advance 到 READY_FOR_INPUT ——
     *   那会让玩家在结算弹窗弹出**之前**抢到下一步输入。
     */
    if (this.session.result !== 'continue') {
      this.turn = advance(this.turn, 'PRESENTATION');
      this.turn = setFlags(this.turn, { resultPopupOpen: true });
      this.showResult(result.events);
      return; // 输入保持锁定，直到玩家在弹窗里做出选择
    }

    // M6 会在这里插入宠物反应（同样走 PRESENTATION）
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
    this.settingsButton?.destroy();
    this.buildSettingsButton();
    this.syncPlayerIndex();
  }

  /** HUD 的数据源。★ 由 core 的关卡 + 进度推导，渲染层不自己记账 */
  private hudModel(): HudModel {
    return buildHudView(this.session.level, this.session.progress, this.session.movesLeft);
  }

  // ————————————————————————————————————————————————
  // 结算与设置
  // ————————————————————————————————————————————————

  /** ★ 结算数据取自**事件**，不重新推断胜负（事件序列是唯一真相源） */
  private showResult(events: readonly CoreGameEvent[]): void {
    const win = events.find((e) => e.t === 'levelWin');
    const lose = events.find((e) => e.t === 'levelLose');

    if (win && win.t === 'levelWin') {
      this.audio.play('win');
      this.result.open({
        kind: 'win',
        rating: win.rating,
        movesLeft: win.movesLeft,
        hasNext: getLevel(this.session.level.id + 1) !== undefined,
        onReplay: () => this.restart(this.session.level.id),
        onNext: () => this.restart(this.session.level.id + 1),
      });
      return;
    }

    if (lose && lose.t === 'levelLose') {
      this.audio.play('lose');
      this.result.open({
        kind: 'lose',
        remaining: lose.remaining,
        onReplay: () => this.restart(this.session.level.id),
      });
    }
  }

  /**
   * 重开某一关。
   *
   * ★ 直接 restart 整个场景，而不是手工复位十几个字段。
   *   手工复位漏一个（棋盘、精灵、时间轴、手势、相位……）
   *   就会留下上一局的残留状态，且**不报错**。
   */
  private restart(levelId: number): void {
    this.result.close();
    this.settings.close();
    this.pendingLevelId = levelId;
    this.scene.restart();
  }

  /**
   * 设置入口。放在 controlsRect（棋盘下方），不放 HUD ——
   * HUD 那一行是"当前局势"，塞按钮进去会与步数/目标抢注意力。
   */
  private buildSettingsButton(): void {
    const r = this.layout.controlsRect;
    const panel = new Panel(this, 20);
    panel.button(this.scale.width / 2, r.y + r.h / 2, 160, {
      label: '⚙ 设置',
      onClick: () => this.openSettings(),
    });
    this.settingsButton = panel;
  }

  private openSettings(): void {
    this.audio.unlock();
    this.settings.open({
      tempo: this.tempo,
      muted: this.audio.isMuted(),
      onTempo: (t) => {
        this.tempo = t;
        this.persistSettings();
      },
      onMuted: (m) => {
        this.audio.setMuted(m);
        this.persistSettings();
      },
      onClose: () => undefined,
    });
  }

  private persistSettings(): void {
    saveSettings({
      tempo: this.tempo,
      sfxVolume: this.audio.getSfxVolume(),
      muted: this.audio.isMuted(),
    });
  }
}
