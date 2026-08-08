/**
 * game/pet/PetView.ts —— 旺财的绘制（Puppet 5 层合成 + Idle 微动作）
 *
 * ★★ 设计核心（config/pet.ts IDLE_MICRO 的注释已说明，这里是实现侧的落点）：
 *   玩家感知到的"这只狗很活泼"，**80% 来自它在你不操作时也一直在动**。
 *   所以 Idle 微动作是本文件的主体，而不是附属功能。
 *
 * ★ 全部用 Phaser Tween，**不占动画预算**（PET_ANIM_BUDGET 只约束重反应）。
 *   Idle 永远不阻塞棋盘 —— 它连"知道棋盘在干什么"都不需要。
 *
 * ★ 随机一律走 `core/rng.ts`（红线：禁止散用 Math.random()）。
 *   眨眼间隔、耳朵抖动、抬头看玩家都是随机的，但必须可复现。
 */

import type Phaser from 'phaser';
import { IDLE_MICRO } from '../../config/pet';
import { WANGCAI_LAYER_ORDER, WANGCAI_RIG, type WangcaiPart } from '../../config/pet-rig';
import type { Rng } from '../../core/rng';
import type { Rect } from '../render/layout';
import { TEX } from '../textureKeys';
import type { PetState } from './state';

/** body 画布边长 —— rig 的坐标系基准（见 pet-rig.ts） */
const RIG_CANVAS = 512;

/**
 * 旺财占 pet 区高度的比例。
 *
 * ★ 留白是刻意的：贴着边画会让它看起来被"塞"进去。
 *   pet 区本身已经是弹性分配的结果（LAYOUT.weights.pet），这里再收一点。
 */
const PET_FILL = 0.92;

export class PetView {
  private readonly layer: Phaser.GameObjects.Container;
  private readonly parts = new Map<WangcaiPart, Phaser.GameObjects.Image>();
  /** 眨眼用：闭眼图与睁眼图重叠放置，靠 visible 切换（同尺寸，不位移） */
  private eyesBlink: Phaser.GameObjects.Image | null = null;
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private state: PetState = 'idle';
  /** rig 坐标 → 屏幕坐标的缩放系数，供微动作换算位移量 */
  private rigScale = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private rect: Rect,
    private readonly rng: Rng,
  ) {
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(5); // 在棋盘之上、HUD(10) 之下
  }

  /**
   * 建立 Puppet。
   *
   * ★ 按 WANGCAI_LAYER_ORDER 依次添加 —— **添加顺序即绘制顺序**，
   *   tail 必须先于 body，否则尾巴会盖在身体上。
   */
  build(): void {
    this.clear();

    const size = Math.min(this.rect.h * PET_FILL, this.rect.w * 0.5);
    if (size <= 0) return; // 视口退化时不画，等下一次 resize

    this.rigScale = size / RIG_CANVAS;
    // 整只狗在 pet 区居中
    const originX = this.rect.x + this.rect.w / 2 - size / 2;
    const originY = this.rect.y + this.rect.h / 2 - size / 2;

    for (const part of WANGCAI_LAYER_ORDER) {
      const rig = WANGCAI_RIG[part];
      const key = this.textureOf(part);
      if (!this.scene.textures.exists(key)) continue; // 素材没加载成功就跳过该层

      const img = this.scene.add.image(0, 0, key);
      img.setOrigin(rig.originX, rig.originY);
      img.setDisplaySize(rig.width * this.rigScale, rig.height * this.rigScale);
      // rig 给的是层的**左上角**；Phaser 定位的是 origin 点，要加回 origin 偏移
      img.x = originX + (rig.x + rig.width * rig.originX) * this.rigScale;
      img.y = originY + (rig.y + rig.height * rig.originY) * this.rigScale;

      this.layer.add(img);
      this.parts.set(part, img);

      // 闭眼图与睁眼图同位置同尺寸，叠在上面待命
      if (part === 'eyes' && this.scene.textures.exists(TEX.petEyesBlink)) {
        const blink = this.scene.add.image(img.x, img.y, TEX.petEyesBlink);
        blink.setOrigin(rig.originX, rig.originY);
        blink.setDisplaySize(rig.width * this.rigScale, rig.height * this.rigScale);
        blink.setVisible(false);
        this.layer.add(blink);
        this.eyesBlink = blink;
      }
    }

    this.startIdle();
  }

  private textureOf(part: WangcaiPart): string {
    switch (part) {
      case 'body':
        return TEX.petBody;
      case 'tail':
        return TEX.petTail;
      case 'ears':
        return TEX.petEars;
      case 'eyes':
        return TEX.petEyesOpen;
    }
  }

  /**
   * Idle 微动作循环。
   *
   * ★ 四个动作**互相独立**，各跑各的周期 —— 这是"活"的关键。
   *   如果统一到一个节拍上，会立刻显出机械感。
   */
  private startIdle(): void {
    this.startTailWag();
    this.startBreathing();
    this.scheduleBlink();
    this.scheduleEarTwitch();
  }

  /** 摇尾巴：绕根部来回摆。★ 这是"活泼"最直观的信号 */
  private startTailWag(): void {
    const tail = this.parts.get('tail');
    if (!tail) return;
    const amp = 11; // 度
    tail.setAngle(-amp);
    this.tweens.push(
      this.scene.tweens.add({
        targets: tail,
        angle: amp,
        duration: IDLE_MICRO.tailWagPeriod / 2,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      }),
    );
  }

  /** 呼吸：body 纵向微幅起伏。幅度极小，看不出来才对 —— 看得出来就成了喘气 */
  private startBreathing(): void {
    const body = this.parts.get('body');
    if (!body) return;
    const baseH = body.displayHeight;
    this.tweens.push(
      this.scene.tweens.add({
        targets: body,
        displayHeight: baseH * (1 + IDLE_MICRO.breathScaleDelta),
        duration: IDLE_MICRO.breathPeriod / 2,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      }),
    );
  }

  /**
   * 眨眼：随机间隔切换闭眼图。
   *
   * ★ 用**随机间隔**而不是固定周期 —— 固定频率的眨眼比不眨眼更诡异。
   */
  private scheduleBlink(): void {
    const [lo, hi] = IDLE_MICRO.blinkIntervalRange;
    const delay = this.rng.range(lo, hi);
    this.timers.push(
      this.scene.time.delayedCall(delay, () => {
        this.blinkOnce();
        this.scheduleBlink();
      }),
    );
  }

  private blinkOnce(): void {
    const open = this.parts.get('eyes');
    const blink = this.eyesBlink;
    if (!open || !blink) return;
    // 眨眼期间偶尔抬头看玩家一眼 —— 「陪伴感」的最大来源
    if (this.rng.next() < IDLE_MICRO.glanceAtPlayerChance) this.glanceAtPlayer();
    open.setVisible(false);
    blink.setVisible(true);
    this.timers.push(
      this.scene.time.delayedCall(110, () => {
        open.setVisible(true);
        blink.setVisible(false);
      }),
    );
  }

  /**
   * 抬头看玩家：只平移 eyes 容器，**不拆 head 层**。
   * （Stage 0 的取舍，见 config/pet.ts IDLE_MICRO 注释。）
   */
  private glanceAtPlayer(): void {
    const eyes = this.parts.get('eyes');
    const blink = this.eyesBlink;
    if (!eyes) return;
    const dx = IDLE_MICRO.glanceEyeOffsetPx * this.rigScale;
    const targets = blink ? [eyes, blink] : [eyes];
    const baseX = eyes.x;
    this.tweens.push(
      this.scene.tweens.add({
        targets,
        x: baseX + dx,
        duration: 420,
        ease: 'Sine.easeInOut',
        yoyo: true,
        hold: 900,
      }),
    );
  }

  /** 耳朵抖动：低概率触发，幅度很小 */
  private scheduleEarTwitch(): void {
    this.timers.push(
      this.scene.time.delayedCall(IDLE_MICRO.tailWagPeriod, () => {
        if (this.rng.next() < IDLE_MICRO.earTwitchChance) this.twitchEars();
        this.scheduleEarTwitch();
      }),
    );
  }

  private twitchEars(): void {
    const ears = this.parts.get('ears');
    if (!ears) return;
    this.tweens.push(
      this.scene.tweens.add({
        targets: ears,
        angle: 6,
        duration: 110,
        ease: 'Quad.easeOut',
        yoyo: true,
        repeat: 1,
      }),
    );
  }

  /**
   * 轻反应：开心一下。
   *
   * ★ **绝不阻塞棋盘** —— 没有回调、没有 await，放完就放完。
   *   连锁中可以叠加触发，后一次会打断前一次，这是可接受的。
   */
  playHappy(): void {
    const body = this.parts.get('body');
    if (!body) return;
    const baseY = body.y;
    this.scene.tweens.add({
      targets: body,
      y: baseY - 8 * this.rigScale,
      duration: 140,
      ease: 'Quad.easeOut',
      yoyo: true,
    });
  }

  /** 重反应：跳跃欢呼。时长由调用方按 PET_ANIM_BUDGET 控制 */
  playExcited(durationMs: number): void {
    const hop = Math.max(1, Math.floor(durationMs / 260));
    for (const part of ['body', 'ears', 'eyes'] as const) {
      const img = this.parts.get(part);
      if (!img) continue;
      const baseY = img.y;
      this.scene.tweens.add({
        targets: img,
        y: baseY - 18 * this.rigScale,
        duration: 130,
        ease: 'Quad.easeOut',
        yoyo: true,
        repeat: hop - 1,
      });
    }
    if (this.eyesBlink) this.eyesBlink.setVisible(false);
  }

  setState(state: PetState): void {
    this.state = state;
  }

  getState(): PetState {
    return this.state;
  }

  /** 布局变化（旋转 / 窗口缩放）后整体重建 */
  setRect(rect: Rect): void {
    this.rect = rect;
    this.build();
  }

  clear(): void {
    for (const t of this.tweens) t.remove();
    this.tweens.length = 0;
    for (const t of this.timers) t.remove(false);
    this.timers.length = 0;
    for (const img of this.parts.values()) img.destroy();
    this.parts.clear();
    this.eyesBlink?.destroy();
    this.eyesBlink = null;
    this.layer.removeAll(true);
  }

  destroy(): void {
    this.clear();
    this.layer.destroy();
  }
}
