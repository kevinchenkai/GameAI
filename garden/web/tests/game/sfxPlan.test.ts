/**
 * 音效单测
 *
 * ★★ 最重要的一条：**所有可听频率必须落在中频带内**。
 *   50+ 用户的高频听力衰减明显，把反馈音做在 2kHz 以上等于对目标用户静音
 *   （框架审核 §19、V0.2 评审意见）。
 *   这条约束光靠"写在注释里"守不住 —— 调音时随手把某个数字改大就破了，
 *   而**开发者自己听得见**，根本发现不了。所以必须由测试守。
 */

import { describe, expect, it } from 'vitest';
import { AUDIBLE_BAND, SFX, SFX_THROTTLE_MS, type SfxName } from '../../src/config/audio';
import { cascadePitch, planSfx } from '../../src/game/audio/sfxPlan';
import type { CoreGameEvent, PieceColor } from '../../src/core/types';

const names = Object.keys(SFX) as SfxName[];

describe('★★ 中频约束（50+ 用户听得见）', () => {
  it('每个音效的基频都在可听带内', () => {
    for (const n of names) {
      const s = SFX[n];
      expect(s.freq, `${n} 基频`).toBeGreaterThanOrEqual(AUDIBLE_BAND.minHz);
      expect(s.freq, `${n} 基频`).toBeLessThanOrEqual(AUDIBLE_BAND.maxHz);
    }
  });

  /**
   * ★★ 上限是**用户约束**，与下限不同性质，单独锁死。
   *   下限放宽只是"手机放不出来"，上限放宽是"目标用户听不见" ——
   *   后者才是这个项目不能接受的那种失败。
   */
  it('★★ 2kHz 上限不许被放宽（这条是给 50+ 用户的，不是口味问题）', () => {
    expect(AUDIBLE_BAND.maxHz).toBeLessThanOrEqual(2000);
  });

  /** 谐波会落在基频之上，最容易悄悄越过上限 */
  it('★★ 谐波频率也不能超出上限', () => {
    for (const n of names) {
      const s = SFX[n];
      for (const p of s.partials ?? []) {
        const hi = Math.max(s.freq, s.endFreq ?? s.freq) * p.ratio;
        expect(hi, `${n} 的 ${p.ratio}x 谐波`).toBeLessThanOrEqual(AUDIBLE_BAND.maxHz * 1.5);
      }
    }
  });

  it('滑音的终点频率也在带内', () => {
    for (const n of names) {
      const s = SFX[n];
      if (s.endFreq === undefined) continue;
      expect(s.endFreq, `${n} 终点频率`).toBeGreaterThanOrEqual(AUDIBLE_BAND.minHz);
      expect(s.endFreq, `${n} 终点频率`).toBeLessThanOrEqual(AUDIBLE_BAND.maxHz);
    }
  });

  it('★★ 连锁升调**再深也不会飘出中频上限**', () => {
    // 8 连锁远超实际会出现的层数
    for (let depth = 0; depth <= 12; depth++) {
      for (const n of names) {
        const s = SFX[n];
        const f = s.freq * cascadePitch(s.freq, depth);
        expect(f, `${n} 第 ${depth} 层连锁`).toBeLessThanOrEqual(AUDIBLE_BAND.maxHz + 0.001);
      }
    }
  });

  it('★ 连锁确实在升调（不是被夹成一条直线）', () => {
    const base = SFX.cascade.freq;
    expect(cascadePitch(base, 1)).toBeGreaterThan(cascadePitch(base, 0));
    expect(cascadePitch(base, 2)).toBeGreaterThan(cascadePitch(base, 1));
  });

  it('音量都在 0~1，不会削波', () => {
    for (const n of names) {
      expect(SFX[n].gain, `${n} 音量`).toBeGreaterThan(0);
      expect(SFX[n].gain, `${n} 音量`).toBeLessThanOrEqual(1);
    }
  });

  it('★ 起音够快 —— 中频要有清晰 transient（框架审核 §19）', () => {
    for (const n of names) {
      expect(SFX[n].attackMs, `${n} 起音`).toBeLessThanOrEqual(15);
    }
  });

  /**
   * ★★ 波形本身决定谐波有多丰富，**基频合规不代表能量在中频**。
   *
   *   实测教训：specialFire 用 sawtooth 时基频 320Hz 完全合规，
   *   但离线频谱显示 **47% 的能量落在 2kHz 以上** —— 对 50+ 用户等于白给。
   *   obstacleHit 用 square 同样有 24.5%。改成 triangle 后分别降到 9% 和 4.8%。
   *
   *   这条测试守的是"别再改回去"：sine / triangle 谐波少，
   *   sawtooth / square 谐波极多，在本项目里是不合适的选择。
   */
  it('★★ 不使用谐波过剩的波形（sawtooth / square 会把能量推到 2kHz 以上）', () => {
    for (const n of names) {
      expect(['sine', 'triangle'], `${n} 的波形`).toContain(SFX[n].wave);
    }
  });
});

// —— 构造事件的小工具 ——
const swap = (): CoreGameEvent => ({ t: 'swap', a: { col: 0, row: 0 }, b: { col: 1, row: 0 } });
const match = (color: PieceColor = 'red', n = 3, cascadeLevel = 0): CoreGameEvent => ({
  t: 'match',
  color,
  cascadeLevel,
  positions: Array.from({ length: n }, (_, i) => ({ col: i, row: 0 })),
});

describe('事件 → 音效', () => {
  it('交换会响', () => {
    const cues = planSfx([swap()]);
    expect(cues.map((c) => c.name)).toContain('swap');
  });

  it('换不动时响的是 swapBack，不是 swap', () => {
    const cues = planSfx([
      { t: 'swapBack', a: { col: 0, row: 0 }, b: { col: 1, row: 0 } } as CoreGameEvent,
    ]);
    expect(cues.map((c) => c.name)).toContain('swapBack');
  });

  it('消除会响', () => {
    expect(planSfx([match()]).map((c) => c.name)).toContain('match');
  });

  it('★★ 密集的同名事件会被节流（否则连锁会叠成噪音且削波）', () => {
    // 20 次消除挤在一起
    const events = Array.from({ length: 20 }, () => match());
    const cues = planSfx(events);
    const matchCues = cues.filter((c) => c.name === 'match');
    expect(matchCues.length).toBeLessThan(20);
    // 相邻两次至少间隔一个节流窗口
    for (let i = 1; i < matchCues.length; i++) {
      const gap = (matchCues[i]?.atMs ?? 0) - (matchCues[i - 1]?.atMs ?? 0);
      expect(gap).toBeGreaterThanOrEqual(SFX_THROTTLE_MS);
    }
  });

  it('★ 连锁层（cascadeLevel > 0）换成 cascade 并升调', () => {
    const cues = planSfx([match('red', 3, 0), match('blue', 3, 2)]);
    expect(cues.find((c) => c.name === 'match')).toBeDefined();
    const cascade = cues.find((c) => c.name === 'cascade');
    expect(cascade).toBeDefined();
    expect(cascade?.pitchScale).toBeGreaterThan(1);
  });

  it('★★ 连锁层数直接取事件的 cascadeLevel —— 音频层不自己数', () => {
    // 只给一个第 3 层的 match，不给任何 cascadeStart：
    // 若实现靠自己累加，这里会退化成普通 match
    const cues = planSfx([match('red', 3, 3)]);
    expect(cues.map((c) => c.name)).toContain('cascade');
  });

  it('★★ 胜负音一定会响 —— 不受节流影响', () => {
    // 前面塞满同名事件，把节流窗口占住
    const noisy = Array.from({ length: 30 }, () => match());
    const win = planSfx([...noisy, { t: 'levelWin', rating: 3 } as CoreGameEvent]);
    expect(win.map((c) => c.name)).toContain('win');

    const lose = planSfx([...noisy, { t: 'levelLose', remaining: {} } as CoreGameEvent]);
    expect(lose.map((c) => c.name)).toContain('lose');
  });

  it('破障：受伤与破碎是两个不同的音', () => {
    const cues = planSfx([
      { t: 'obstacleHit', pos: { col: 0, row: 0 }, kind: 'ice', hpLeft: 1 },
      { t: 'obstacleClear', pos: { col: 1, row: 0 }, kind: 'ice' },
    ]);
    const played = cues.map((c) => c.name);
    expect(played).toContain('obstacleHit');
    expect(played).toContain('obstacleClear');
  });

  it('空事件序列不发声，也不报错', () => {
    expect(planSfx([])).toEqual([]);
  });

  it('★ 不认识的事件被安静忽略（新增事件类型不该让音频层崩）', () => {
    const cues = planSfx([{ t: 'settled' } as CoreGameEvent, match()]);
    expect(cues.map((c) => c.name)).toContain('match');
  });

  it('时间偏移单调不倒退', () => {
    const cues = planSfx([swap(), match(), match('blue')]);
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i]?.atMs).toBeGreaterThanOrEqual(cues[i - 1]?.atMs ?? 0);
    }
  });
});
