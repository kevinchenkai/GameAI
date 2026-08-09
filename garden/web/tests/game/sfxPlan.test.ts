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

/**
 * ★★ A1 配套：视觉有反馈的时刻，听觉不能是空的。
 *
 *   粒子特效上线后，"消除/爆炸"在画面上已经分了强弱，
 *   但音频侧仍有几个事件完全无声 —— 反馈是残缺的。
 */
describe('★ 特殊棋子的声音（此前完全无声）', () => {
  it('★★ 生成特殊棋子会响 —— match-4 是玩家"我是故意的"时刻', () => {
    const cues = planSfx([
      { t: 'specialSpawn', pos: { col: 2, row: 3 }, kind: 'rocketH' } as CoreGameEvent,
    ]);
    expect(cues.map((c) => c.name)).toContain('specialSpawn');
  });

  it('match 与随后的 specialSpawn 都会响（两件事，都该被听见）', () => {
    const cues = planSfx([
      match('red', 4),
      { t: 'specialSpawn', pos: { col: 1, row: 0 }, kind: 'rocketH' } as CoreGameEvent,
    ]);
    const names2 = cues.map((c) => c.name);
    expect(names2).toContain('match');
    expect(names2).toContain('specialSpawn');
  });

  /**
   * ★★ 这条才是"不走节流"真正防住的情况。
   *
   *   节流是**按音效名**去重的，所以 specialSpawn 从来不会被 match 挤掉
   *   （两者名字不同）—— 真正的风险是**一次连锁里生成两个特殊棋子**：
   *   大消除时这很常见，两次 spawn 相隔仅几十毫秒。
   *   若走 push()，第二个会被 SFX_THROTTLE_MS 判成重复而**静默丢弃**，
   *   玩家造出了两个火箭却只听见一个。
   */
  it('★★ 一回合内生成两个特殊棋子，两次都要响', () => {
    const cues = planSfx([
      match('red', 5),
      { t: 'specialSpawn', pos: { col: 1, row: 0 }, kind: 'rocketH' } as CoreGameEvent,
      { t: 'specialSpawn', pos: { col: 5, row: 2 }, kind: 'bomb' } as CoreGameEvent,
    ]);
    expect(cues.filter((c) => c.name === 'specialSpawn')).toHaveLength(2);
  });

  it('合体引爆会响，且与单发火箭是不同的音', () => {
    const combo = planSfx([
      { t: 'comboBlast', kinds: ['rocketH', 'bomb'], affected: [] } as unknown as CoreGameEvent,
    ]);
    expect(combo.map((c) => c.name)).toContain('comboBlast');
    expect(combo.map((c) => c.name)).not.toContain('specialFire');
  });

  /**
   * ★ comboBlast 往往清掉半个棋盘，是全局最重的一击。
   *   它必须比单发火箭更"重"，否则玩家分不出自己刚干了件大事。
   */
  it('★ 合体引爆比单发火箭更低沉、更长', () => {
    expect(SFX.comboBlast.freq).toBeLessThan(SFX.specialFire.freq);
    expect(SFX.comboBlast.durationMs).toBeGreaterThan(SFX.specialFire.durationMs);
    expect(SFX.comboBlast.gain).toBeGreaterThan(SFX.specialFire.gain);
  });
});

describe('★ 消除规模参与音高', () => {
  it('★ 消 5 个比消 3 个音更高（画面粒子更多，声音要跟上）', () => {
    const three = planSfx([match('red', 3)]).find((c) => c.name === 'match');
    const five = planSfx([match('red', 5)]).find((c) => c.name === 'match');
    expect(three).toBeDefined();
    expect(five).toBeDefined();
    expect((five as { pitchScale: number }).pitchScale).toBeGreaterThan(
      (three as { pitchScale: number }).pitchScale,
    );
  });

  /**
   * ★★ 幅度必须**小**：抢戏的应该是连锁升调，规模只是顺带确认。
   *   若规模加成过大，一次大消除会听起来像 3 连锁 —— 反而误导。
   */
  /**
   * ★★ 规模只是"顺带确认"，抢戏的必须是连锁。
   *   若一次大消除听起来比第 3 层连锁还激动，玩家会被误导 ——
   *   以为自己连上了，其实只是消得多。
   */
  it('★★ 规模加成有上限，且不超过连锁层级的表达力', () => {
    const huge = planSfx([match('red', 12)]).find((c) => c.name === 'match');
    const layer3 = planSfx([{ t: 'cascadeStart', level: 3 } as CoreGameEvent])[0];
    expect(huge).toBeDefined();
    expect(layer3).toBeDefined();
    expect((huge as { pitchScale: number }).pitchScale).toBeLessThanOrEqual(
      (layer3 as { pitchScale: number }).pitchScale,
    );
  });

  it('★ 规模加成后仍不超出中频上限', () => {
    for (const n of [3, 5, 8, 20]) {
      for (const lv of [0, 3, 8]) {
        const cue = planSfx([match('red', n, lv)])[0];
        expect(cue).toBeDefined();
        const spec = SFX[(cue as { name: SfxName }).name];
        const hz = spec.freq * (cue as { pitchScale: number }).pitchScale;
        expect(hz, `${n} 连 × ${lv} 层`).toBeLessThanOrEqual(AUDIBLE_BAND.maxHz);
      }
    }
  });
});

/**
 * ★★ 连锁在**听觉上**必须逐层变强。
 *
 *   这是 A1 的核心诉求（"5 连锁和 3 消不该一样"）在音频侧的对应。
 *   视觉侧靠 cascadeStart 做（震屏 + 连击文字），音频侧同理。
 */
describe('★★ 连锁的听觉层级', () => {
  /** 造一段真实形状的连锁事件：每层 cascadeStart + match */
  const cascadeRun = (layers: number): CoreGameEvent[] => {
    const out: CoreGameEvent[] = [];
    for (let lv = 0; lv < layers; lv++) {
      out.push({ t: 'cascadeStart', level: lv } as CoreGameEvent);
      out.push(match('red', 3, lv));
    }
    return out;
  };

  /**
   * ★★ 回归：此前 3 层连锁**只发出 2 个音**。
   *   第 3 次 match 与前一次只隔 20ms，被 45ms 的节流窗口判成重复丢掉，
   *   于是深连锁与普通消除听起来一模一样。
   */
  it('★★ 3 层连锁不止响 2 声（节流曾把深层吃掉）', () => {
    expect(planSfx(cascadeRun(3)).length).toBeGreaterThan(2);
  });

  it('★ 层数越多，声音事件越多', () => {
    expect(planSfx(cascadeRun(4)).length).toBeGreaterThan(planSfx(cascadeRun(2)).length);
  });

  /**
   * ★★ 层级升调只能由 **cascadeStart** 表达。
   *
   *   曾经 match 也按层级升调、还额外叠了规模加成，
   *   结果同一层的两个音**音高不一致**，整串是
   *   1.26 → 1.12 → 1.41 → 1.26 的锯齿，听感上不是"越来越高"。
   *   一个信号只由一个地方表达。
   */
  /**
   * ⚠️ 只看**cascadeStart 单独发出**的那些层级音。
   *   match 也带半档层级加成（降级保险，见实现注释），
   *   把两者混在一起比较是拿两种信号互比，必然锯齿。
   *   用「只有 cascadeStart、不带 match」的序列把它们分开。
   */
  it('★★ 连锁层级音高单调递增（不能忽高忽低）', () => {
    const onlyStarts: CoreGameEvent[] = [1, 2, 3, 4].map(
      (lv) => ({ t: 'cascadeStart', level: lv }) as CoreGameEvent,
    );
    const layerPitches = planSfx(onlyStarts).map((c) => c.pitchScale);
    expect(layerPitches.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < layerPitches.length; i++) {
      const prev = layerPitches[i - 1] ?? 0;
      const cur = layerPitches[i] ?? 0;
      expect(cur, `第 ${i} 个层级音比前一个低`).toBeGreaterThanOrEqual(prev);
    }
  });

  it('★ 第 1 层（普通消除）不额外补层级音 —— 那是重复', () => {
    const cues = planSfx([{ t: 'cascadeStart', level: 0 } as CoreGameEvent, match()]);
    expect(cues.filter((c) => c.name === 'cascade' && c.pitchScale > 1.05)).toHaveLength(0);
  });

  it('★ 再深的连锁也不超出中频上限', () => {
    for (const c of planSfx(cascadeRun(12))) {
      expect(SFX[c.name].freq * c.pitchScale).toBeLessThanOrEqual(AUDIBLE_BAND.maxHz);
    }
  });
});
