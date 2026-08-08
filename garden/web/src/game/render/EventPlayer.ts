/**
 * game/render/EventPlayer.ts —— CoreGameEvent[] → Phaser 动画
 *
 * ★ 渲染层**不维护自己的棋盘状态**，只按事件序列播动画（冻结契约：
 *   事件序列是唯一真相源）。想知道某格现在是什么，问 core，不要自己记。
 *
 * ★ 时长一律来自 timeline.ts（= TIMING.x × TEMPO[current]），
 *   本文件不写死任何数字。
 *
 * ★ 播放结束**不解锁输入** —— 输入归 TurnController 管（冻结契约 7）。
 *   本类 resolve 只表示"动画播完了"，不表示"可以操作了"。
 */

import type Phaser from 'phaser';
import type { CoreGameEvent } from '../../core/types';
import type { Tempo } from '../../config/tuning';
import type { BoardView } from './BoardView';
import { buildTimeline, type Timeline } from './timeline';

export interface EventPlayer {
  /** 播放一整段序列，resolve 时棋盘动画已结束（≠ 可输入） */
  play(events: readonly CoreGameEvent[]): Promise<void>;
  /** 整段剩余时长（ms），供输入缓存窗口判断 */
  remainingMs(): number;
  skipAll(): void;
}

export class PhaserEventPlayer implements EventPlayer {
  private timeline: Timeline = { items: [], totalMs: 0 };
  private startedAt = 0;
  private playing = false;
  private pendingTweens: Phaser.Tweens.Tween[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly view: BoardView,
    private readonly getTempo: () => Tempo,
  ) {}

  /**
   * ★ 当前这一段的 resolve。
   *
   *   必须存下来 —— `skipAll()` 会把完成用的 timer 一并移除，
   *   如果不在那里主动 resolve，`play()` 的 Promise **永远不会兑现**，
   *   `await player.play(...)` 就卡死，回合停在 RESOLVING、输入永久锁死。
   *   （M4 真机预览里实际发生过：棋盘不动了，也没有任何报错。）
   */
  private finishCurrent: (() => void) | null = null;

  play(events: readonly CoreGameEvent[]): Promise<void> {
    this.skipAll();
    this.timeline = buildTimeline(events, this.getTempo());
    this.startedAt = this.scene.time.now;
    this.playing = true;

    return new Promise<void>((resolve) => {
      this.finishCurrent = resolve;

      for (const item of this.timeline.items) {
        // ★ atMs 为 0 的事件也走 delayedCall(0)，保证**次序一致**：
        //   直接同步执行会让它抢在前面的动画之前完成。
        const timer = this.scene.time.delayedCall(item.atMs, () => {
          this.apply(item.event, item.durationMs);
        });
        this.timers.push(timer);
      }

      const done = this.scene.time.delayedCall(this.timeline.totalMs, () => {
        this.finish();
      });
      this.timers.push(done);
    });
  }

  /**
   * 结束当前这一段（正常播完或被打断），**保证 resolve 恰好一次**。
   *
   * ★★ 收尾时必须**结算掉所有还在跑的补间**。
   *
   *   ⚠️ 完成时刻由 `delayedCall(totalMs)` 决定，但**排在时间轴末尾的
   *   补间会在那之后才结束**（它们的 onComplete 还没跑）。
   *   于是顺序变成：
   *     play() resolve → LevelScene 调 reconcile() 把精灵摆到正确位置
   *     → 那些还活着的补间继续跑，**又把精灵挪走 / 漏掉销毁**
   *   表现就是用户截图里的"同一格叠着两个棋子"。
   *
   *   `complete()` 会把补间直接推进到终点并触发 onComplete —— 该销毁的
   *   销毁、该到位的到位 —— 这样 reconcile() 面对的是一个静止的棋盘。
   */
  private finish(): void {
    this.playing = false;
    this.settleTweens();
    const resolve = this.finishCurrent;
    this.finishCurrent = null;
    resolve?.();
  }

  /** 把未完成的补间瞬间推到终点（触发它们的 onComplete） */
  private settleTweens(): void {
    const running = this.pendingTweens;
    this.pendingTweens = [];
    for (const t of running) {
      // 已经自然结束的补间调 complete() 是无害的空操作
      if (t.isPlaying?.()) t.complete?.();
    }
  }

  remainingMs(): number {
    if (!this.playing) return 0;
    return Math.max(0, this.timeline.totalMs - (this.scene.time.now - this.startedAt));
  }

  /**
   * 立即结束当前这一段（玩家抢下一步时用）。
   *
   * ★ 与 finish() 的区别：这里用 `complete()` 而不是 `stop()`。
   *   `stop()` 会让补间**停在半路且不触发 onComplete** ——
   *   那些"在 onComplete 里销毁精灵"的逻辑就被跳过了，
   *   精灵永远留在盘上。被打断也必须把该销毁的销毁掉。
   */
  skipAll(): void {
    for (const t of this.timers) t.remove(false);
    this.timers = [];
    // ★ 被打断也要兑现承诺，否则 await 方永远醒不过来
    //   （finish() 内部会 settleTweens，把补间推到终点）
    this.finish();
  }

  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
    this.pendingTweens.push(this.scene.tweens.add(config));
  }

  /** 把单个事件变成动画。★ 不改棋盘状态，只动精灵 */
  private apply(e: CoreGameEvent, durationMs: number): void {
    switch (e.t) {
      case 'swap':
      case 'swapBack': {
        // swapBack 是"换过去再换回来"，durationMs 已是两倍
        const half = e.t === 'swapBack' ? durationMs / 2 : durationMs;
        this.swapSprites(e.a, e.b, half);
        if (e.t === 'swapBack') {
          // 再换回来。此时索引已经交换过，直接再交换一次即可复原
          const back = this.scene.time.delayedCall(half, () => {
            this.swapSprites(e.a, e.b, half);
          });
          this.timers.push(back);
        }
        break;
      }

      case 'match': {
        // 消除：缩小淡出。精灵在补间结束时销毁
        for (const pos of e.positions) {
          const id = this.idAt(pos);
          if (id === null) continue;
          const sprite = this.view.spriteOf(id);
          if (!sprite) continue;
          this.tween({
            targets: sprite,
            scale: 0,
            alpha: 0,
            duration: durationMs,
            ease: 'Back.easeIn',
            onUpdate: () => this.view.followOverlay(id),
            onComplete: () => this.view.removeSprite(id),
          });
          // ★ 同 specialFire：消掉的格子要从索引里抹掉
          this.forgetPosition(pos);
        }
        break;
      }

      case 'fall': {
        for (const m of e.moves) {
          const sprite = this.view.spriteOf(m.id);
          if (!sprite) continue;
          const to = this.view.positionOf(m.to);
          this.tween({
            targets: sprite,
            x: to.x,
            y: to.y,
            duration: durationMs,
            // ★ 回弹让下落有重量感 —— 这是"手感"的主要来源之一
            ease: 'Quad.easeIn',
            // 特殊棋子的叠加层要跟着一起掉，否则标记会留在原地
            onUpdate: () => this.view.followOverlay(m.id),
          });
          this.trackPosition(m.id, m.to);
        }
        break;
      }

      case 'spawn': {
        for (const item of e.items) {
          const sprite = this.view.ensureSprite(item.piece, item.at);
          const to = this.view.positionOf(item.at);
          // 从棋盘上方落入
          sprite.setPosition(to.x, to.y - this.view.pieceSize * 2);
          sprite.setAlpha(1);
          // ★ 复位尺寸必须走 BoardView —— 它才知道"一格应该多大"。
          //   曾经这里写 setScale(1)，那是把 512px 原图放到 1.0 倍，
          //   棋子会变成整屏那么大（setDisplaySize 设的是 ~0.078 的分数缩放）。
          this.view.resetSpriteSize(sprite);
          this.tween({ targets: sprite, y: to.y, duration: durationMs, ease: 'Quad.easeIn' });
          this.trackPosition(item.piece.id, item.at);
        }
        break;
      }

      case 'obstacleHit':
        this.view.showObstacle(e.pos, e.hpLeft);
        break;

      case 'obstacleClear':
        this.view.clearObstacle(e.pos);
        break;

      /**
       * ★★ 特殊棋子爆炸波及的格子**也要销毁精灵**。
       *
       *   ⚠️ 这两条曾经是空实现，后果：一发火箭在 core 里清掉 8 格，
       *   但其中只有 2 格产出 `match` 事件（那 2 格是玩家凑出的三连），
       *   **另外 6 格的精灵永远留在屏幕上**。新棋子随后落进同一格，
       *   于是同一个格子里叠着两个棋子 —— 用户实测截图里的
       *   "梨压着蓝莓"就是这么来的。
       *
       *   core 从不产出"请删掉这个精灵"的指令，它只说"这些格子被波及了"。
       *   把 affected 翻译成销毁，是渲染层的职责。
       */
      case 'specialFire':
      case 'comboBlast': {
        for (const pos of e.affected) {
          const id = this.idAt(pos);
          if (id === null) continue;
          const sprite = this.view.spriteOf(id);
          if (!sprite) continue;
          this.tween({
            targets: sprite,
            scale: 0,
            alpha: 0,
            duration: durationMs,
            ease: 'Back.easeIn',
            onUpdate: () => this.view.followOverlay(id),
            onComplete: () => this.view.removeSprite(id),
          });
          // ★ 位置索引也要清掉，否则后续事件会拿它当作还在盘上的棋子
          this.forgetPosition(pos);
        }
        break;
      }

      case 'specialSpawn':
      case 'shuffle':
      case 'collect':
      case 'cascadeStart':
      case 'cascadeEnd':
      case 'settled':
      case 'movesChanged':
      case 'levelWin':
      case 'levelLose':
      case 'turnResolved':
        // M5 接特效与 HUD；M4 只保证时间轴与位移正确
        break;
    }
  }

  // ————————————————————————————————————————————————
  // 精灵位置索引
  // ————————————————————————————————————————————————

  /**
   * ★ `pos → pieceId` 的**临时**索引。
   *
   *   ⚠️ 这不是"渲染层自己的棋盘"。它只记录精灵当前画在哪，
   *   用来把 `match` 事件里的坐标翻译成精灵。core 才是棋盘的真相源。
   *   每次 play() 开头由 LevelScene 用 core 的棋盘重建，不跨回合累积。
   */
  private posIndex = new Map<string, number>();

  private key(p: { col: number; row: number }): string {
    return `${p.col},${p.row}`;
  }

  syncPositions(entries: readonly { id: number; pos: { col: number; row: number } }[]): void {
    this.posIndex.clear();
    for (const e of entries) this.posIndex.set(this.key(e.pos), e.id);
  }

  private trackPosition(id: number, to: { col: number; row: number }): void {
    for (const [k, v] of this.posIndex) {
      if (v === id) this.posIndex.delete(k);
    }
    this.posIndex.set(this.key(to), id);
  }

  private idAt(p: { col: number; row: number }): number | null {
    return this.posIndex.get(this.key(p)) ?? null;
  }

  /**
   * 把某格从位置索引里抹掉（棋子已被消除 / 炸掉）。
   *
   * ★ 不抹的话，后续事件仍会把这一格解析成那个**已经在淡出**的精灵：
   *   连环引爆时第二发火箭会去动一个正在消失的棋子，
   *   表现是"有些棋子该炸没炸"。
   */
  private forgetPosition(p: { col: number; row: number }): void {
    this.posIndex.delete(this.key(p));
  }

  /**
   * 交换两格的精灵，**并同步更新位置索引**。
   *
   * ⚠️ 必须先把两个 id 都读出来再写回去 —— 逐个 move 会让第二次读到
   *   已被第一次改过的索引，交换就退化成"两个精灵都跑到同一格"。
   */
  private swapSprites(
    a: { col: number; row: number },
    b: { col: number; row: number },
    duration: number,
  ): void {
    const idA = this.idAt(a);
    const idB = this.idAt(b);

    const move = (id: number | null, to: { col: number; row: number }): void => {
      if (id === null) return;
      const sprite = this.view.spriteOf(id);
      if (!sprite) return;
      const target = this.view.positionOf(to);
      this.tween({
        targets: sprite,
        x: target.x,
        y: target.y,
        duration,
        ease: 'Quad.easeInOut',
        onUpdate: () => this.view.followOverlay(id),
      });
    };

    move(idA, b);
    move(idB, a);

    // 索引同步交换（含一侧为空的情况）
    if (idA !== null) this.posIndex.set(this.key(b), idA);
    else this.posIndex.delete(this.key(b));
    if (idB !== null) this.posIndex.set(this.key(a), idB);
    else this.posIndex.delete(this.key(a));
  }
}
