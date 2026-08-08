/**
 * game/ui/SettingsPanel.ts —— 节奏与音量设置
 *
 * ★★ 这个设置项叫**「节奏」**，不叫「难度」，更不叫「简单模式」。
 *   （config/tuning.ts 已注明）理由：
 *   - 「简单模式」对 50+ 用户是**羞辱**，他们宁可玩得难受也不会去开
 *   - 「节奏」是中性的偏好描述，像调音量一样自然
 *   选项文案同理：**舒缓 / 明快**，不是"慢 / 快"（慢暗示"你不行"）。
 *
 * ★ 年轻玩家玩两局就会自己来找"能不能快点"；
 *   50+ 用户永远不会打开这个面板 —— 所以默认值必须是对他们最友好的那个。
 */

import type Phaser from 'phaser';
import type { Tempo } from '../../config/tuning';
import { MIN_TAP_PT, Panel } from './Panel';

export interface SettingsPanelOptions {
  readonly tempo: Tempo;
  readonly muted: boolean;
  readonly onTempo: (t: Tempo) => void;
  readonly onMuted: (m: boolean) => void;
  readonly onClose: () => void;
}

/** 节奏选项的**面向玩家**文案。★ 不要出现"慢""难度""简单" */
const TEMPO_LABEL: Readonly<Record<Tempo, string>> = {
  calm: '舒缓',
  brisk: '明快',
};

export class SettingsPanel {
  private panel: Panel | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  get isOpen(): boolean {
    return this.panel !== null;
  }

  open(opts: SettingsPanelOptions): void {
    this.close();
    const p = new Panel(this.scene, 200);
    this.panel = p;

    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    const cardW = Math.min(320, width - 40);

    /**
     * ★ 卡片高度**由内容逐项累加算出**，不写死。
     *
     *   ⚠️ 第一版写死 330，结果"继续游戏"直接压在"已开启"上面 ——
     *   按钮高度有下限（MIN_TAP_PT = 52，为 50+ 用户放宽过），
     *   一旦按钮变大，写死的高度就装不下。这类重叠**单测抓不到**，
     *   只有真机截图看得出来。
     */
    const BTN_H = MIN_TAP_PT;
    const PAD = 26;
    const GAP = 16;
    const titleH = 34;
    const labelH = 24;
    const cardH =
      PAD + titleH + GAP + labelH + BTN_H + GAP + labelH + BTN_H + GAP + BTN_H + PAD;

    p.scrim();
    p.card(cx, cy, cardW, cardH);

    // 从卡片顶部开始逐项下移，每项自己知道占多高
    let y = cy - cardH / 2 + PAD;

    p.title(cx, y + titleH / 2, '设置');
    y += titleH + GAP;

    // —— 节奏 ——
    p.label(cx, y + labelH / 2, '节奏');
    y += labelH;
    const btnW = (cardW - 2 * PAD - 12) / 2;
    for (const [i, t] of (['calm', 'brisk'] as const).entries()) {
      const x = cx + (i === 0 ? -btnW / 2 - 6 : btnW / 2 + 6);
      p.button(x, y + BTN_H / 2, btnW, {
        label: TEMPO_LABEL[t],
        primary: opts.tempo === t,
        onClick: () => {
          opts.onTempo(t);
          // 重开面板以刷新选中态（面板很小，重建比做局部状态简单可靠）
          this.open({ ...opts, tempo: t });
        },
      });
    }
    y += BTN_H + GAP;

    // —— 音效 ——
    p.label(cx, y + labelH / 2, '音效');
    y += labelH;
    p.button(cx, y + BTN_H / 2, cardW - 2 * PAD, {
      label: opts.muted ? '已关闭' : '已开启',
      primary: !opts.muted,
      onClick: () => {
        const next = !opts.muted;
        opts.onMuted(next);
        this.open({ ...opts, muted: next });
      },
    });
    y += BTN_H + GAP;

    p.button(cx, y + BTN_H / 2, cardW - 2 * PAD, {
      label: '继续游戏',
      primary: true,
      onClick: () => {
        this.close();
        opts.onClose();
      },
    });
  }

  close(): void {
    this.panel?.destroy();
    this.panel = null;
  }
}
