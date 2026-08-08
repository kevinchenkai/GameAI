/**
 * game/ui/ResultPanel.ts —— 过关 / 未过关结算
 *
 * ★★ 失败文案永远指向**"还差多少"**，不指向**"你失败了"**。
 *   （框架 §objective：remaining 字段就是为这句话准备的）
 *   低压力定位下，"失败"两个字本身就是惩罚。
 *   所以标题是「就差一点点」，不是「关卡失败」；
 *   按钮是「再试一次」，不是「重新开始」。
 *
 * ★ 星级只在**赢**的时候出现。输了不显示 0 星 ——
 *   那等于把"你一颗都没拿到"再说一遍。
 */

import type Phaser from 'phaser';
import type { Rating } from '../../core/types';
import { MIN_TAP_PT, Panel } from './Panel';
import { fontPx, px } from './uiScale';

/**
 * ★★ 花园建设进度 —— **必须在结算页显示**（框架 §8.1）。
 *
 *   不是为了信息完整，而是为了卡在"还要不要再玩一关"的决策点上：
 *   玩家看到"还差 1 颗星就能修院门"时，会自己按下一关。
 *   只在花园页显示就晚了 —— 那时玩家已经决定退出了。
 */
export interface GardenBarView {
  /** 已完成阶段 / 总阶段 */
  readonly stage: number;
  readonly totalStages: number;
  /** 还差几颗星（0 = 可建设） */
  readonly starsShort: number;
  /** 本次通关是否新得了星星 */
  readonly gained: number;
}

export interface WinOptions {
  readonly kind: 'win';
  readonly rating: Rating;
  readonly movesLeft: number;
  readonly onReplay: () => void;
  readonly onNext: () => void;
  /** 没有下一关时隐藏「下一关」按钮 */
  readonly hasNext: boolean;
  /** 花园进度；全部建完时为 null（不显示） */
  readonly garden: GardenBarView | null;
  /** 去花园。★ 可建设时才提供 */
  readonly onGarden?: () => void;
}

export interface LoseOptions {
  readonly kind: 'lose';
  /** 各目标还差多少（core 的 levelLose.remaining） */
  readonly remaining: Readonly<Record<string, number>>;
  readonly onReplay: () => void;
}

export type ResultOptions = WinOptions | LoseOptions;

export class ResultPanel {
  private panel: Panel | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  get isOpen(): boolean {
    return this.panel !== null;
  }

  open(opts: ResultOptions): void {
    this.close();
    const p = new Panel(this.scene, 300);
    this.panel = p;

    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    const cardW = Math.min(px(this.scene, 320), width - px(this.scene, 40));
    /**
     * ★ 同 SettingsPanel：高度由内容累加，**不写死**。
     *   按钮高度有下限（MIN_TAP_PT），写死会导致按钮相互重叠 ——
     *   设置面板已经踩过一次。
     *
     * ★ 花园进度条与「去花园」按钮都是**条件出现**的，
     *   两者都要如实计入，漏算就会把按钮压到进度条上。
     */
    const winBtns = opts.kind === 'win' ? (opts.hasNext ? 2 : 1) + (opts.onGarden ? 1 : 0) : 1;
    const gardenH = opts.kind === 'win' && opts.garden ? 52 : 0;
    const bodyH = (opts.kind === 'win' ? 96 : 40) + gardenH;
    const cardH = px(this.scene, 26 + 34 + 16 + bodyH + winBtns * (MIN_TAP_PT + 10) + 26);

    p.scrim(0.5);
    p.card(cx, cy, cardW, cardH);

    if (opts.kind === 'win') this.buildWin(p, opts, cx, cy, cardW, cardH);
    else this.buildLose(p, opts, cx, cy, cardW, cardH);
  }

  private buildWin(
    p: Panel,
    opts: WinOptions,
    cx: number,
    cy: number,
    cardW: number,
    cardH: number,
  ): void {
    let y = cy - cardH / 2 + px(this.scene, 26);
    p.title(cx, y + px(this.scene, 17), '过关啦！');
    y += px(this.scene, 34 + 16);

    // 星级：亮星 + 暗星，一眼看出"还能更好"
    const stars = '★★★'.slice(0, opts.rating) + '☆☆☆'.slice(0, 3 - opts.rating);
    const t = this.scene.add
      .text(cx, y + px(this.scene, 26), stars, {
        fontFamily: '"PingFang SC", sans-serif',
        fontSize: fontPx(this.scene, 40),
        color: '#FFB03A',
      })
      .setOrigin(0.5);
    p.add(t);
    y += px(this.scene, 56);

    p.label(cx, y + px(this.scene, 12), `还剩 ${opts.movesLeft} 步`);
    y += px(this.scene, 40);

    if (opts.garden) {
      this.buildGardenBar(p, opts.garden, cx, y);
      y += px(this.scene, 52);
    }

    const btnW = cardW - px(this.scene, 60);
    const step = px(this.scene, MIN_TAP_PT + 10);
    const half = px(this.scene, MIN_TAP_PT) / 2;

    // ★ 可建设时「去花园」排在最前 —— 这一刻它才是玩家最想点的
    if (opts.onGarden) {
      p.button(cx, y + half, btnW, {
        label: '去花园建设',
        primary: true,
        onClick: opts.onGarden,
      });
      y += step;
    }
    if (opts.hasNext) {
      p.button(cx, y + half, btnW, {
        label: '下一关',
        primary: !opts.onGarden,
        onClick: opts.onNext,
      });
      y += step;
      p.button(cx, y + half, btnW, { label: '再玩一次', onClick: opts.onReplay });
    } else {
      p.button(cx, y + half, btnW, {
        label: '再玩一次',
        primary: !opts.onGarden,
        onClick: opts.onReplay,
      });
    }
  }

  /**
   * 花园建设进度条。
   *
   * ★ 用**离散格子**而不是连续进度条：规则是"3 颗星建一阶段"，
   *   连续条会让玩家以为差一点点就能建，实际还差一整颗。
   *
   * ★ 本次新得的星星单独标出来（"+1"），让"我刚才那一关有用"
   *   这件事被看见 —— 这是把"再玩一关"变成习惯的关键反馈。
   */
  private buildGardenBar(p: Panel, g: GardenBarView, cx: number, y: number): void {
    const line =
      g.starsShort === 0 ? '院门可以建设啦！' : `院门还差 ${g.starsShort} 颗星`;
    const t = this.scene.add
      .text(cx - (g.gained > 0 ? px(this.scene, 16) : 0), y + px(this.scene, 10), line, {
        fontFamily: '"PingFang SC", sans-serif',
        fontSize: fontPx(this.scene, 16),
        color: '#5A4632',
      })
      .setOrigin(0.5);
    p.add(t);

    if (g.gained > 0) {
      const plus = this.scene.add
        .text(t.x + t.displayWidth / 2 + px(this.scene, 10), y + px(this.scene, 10), `+${g.gained}★`, {
          fontFamily: '"PingFang SC", sans-serif',
          fontSize: fontPx(this.scene, 16),
          fontStyle: 'bold',
          color: '#FFB03A',
        })
        .setOrigin(0.5);
      p.add(plus);
    }

    // 阶段格子
    const box = px(this.scene, 14);
    const gap = px(this.scene, 8);
    const startX = cx - ((g.totalStages - 1) * (box + gap)) / 2;
    const boxY = y + px(this.scene, 28);
    const gfx = this.scene.add.graphics();
    for (let i = 0; i < g.totalStages; i++) {
      const bx = startX + i * (box + gap) - box / 2;
      if (i < g.stage) {
        gfx.fillStyle(0xffb03a, 1);
        gfx.fillRoundedRect(bx, boxY, box, box, px(this.scene, 3));
      } else {
        gfx.lineStyle(px(this.scene, 2), 0x8a6a4a, 0.5);
        gfx.strokeRoundedRect(bx, boxY, box, box, px(this.scene, 3));
      }
    }
    p.add(gfx);
  }

  private buildLose(
    p: Panel,
    opts: LoseOptions,
    cx: number,
    cy: number,
    cardW: number,
    cardH: number,
  ): void {
    let y = cy - cardH / 2 + px(this.scene, 26);
    // ★ 不是「关卡失败」
    p.title(cx, y + px(this.scene, 17), '就差一点点');
    y += px(this.scene, 34 + 16);

    /**
     * ★ 指向"还差多少"而不是"你没做到"。
     *   只报**最接近完成**的那一个目标 —— 列一长串没完成的东西
     *   会把"差一点"变成"差很多"，与文案意图相反。
     */
    const rest = Object.values(opts.remaining).filter((n) => n > 0);
    const closest = rest.length > 0 ? Math.min(...rest) : 0;
    p.label(cx, y + px(this.scene, 12), closest > 0 ? `还差 ${closest} 个就好啦` : '再来一次就成啦');
    y += px(this.scene, 40);

    p.button(cx, y + px(this.scene, MIN_TAP_PT) / 2, cardW - px(this.scene, 60), {
      label: '再试一次', // ★ 不是「重新开始」
      primary: true,
      onClick: opts.onReplay,
    });
  }

  close(): void {
    this.panel?.destroy();
    this.panel = null;
  }
}
