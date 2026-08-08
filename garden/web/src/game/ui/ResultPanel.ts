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

export interface WinOptions {
  readonly kind: 'win';
  readonly rating: Rating;
  readonly movesLeft: number;
  readonly onReplay: () => void;
  readonly onNext: () => void;
  /** 没有下一关时隐藏「下一关」按钮 */
  readonly hasNext: boolean;
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
     */
    const btnCount = opts.kind === 'win' ? (opts.hasNext ? 2 : 1) : 1;
    const bodyH = opts.kind === 'win' ? 96 : 40;
    const cardH = px(this.scene, 26 + 34 + 16 + bodyH + btnCount * (MIN_TAP_PT + 10) + 26);

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

    const btnW = cardW - px(this.scene, 60);
    const step = px(this.scene, MIN_TAP_PT + 10);
    const half = px(this.scene, MIN_TAP_PT) / 2;
    if (opts.hasNext) {
      p.button(cx, y + half, btnW, {
        label: '下一关',
        primary: true,
        onClick: opts.onNext,
      });
      y += step;
      p.button(cx, y + half, btnW, { label: '再玩一次', onClick: opts.onReplay });
    } else {
      p.button(cx, y + half, btnW, {
        label: '再玩一次',
        primary: true,
        onClick: opts.onReplay,
      });
    }
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
