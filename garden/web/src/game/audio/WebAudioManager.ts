/**
 * game/audio/WebAudioManager.ts —— 合成音实现
 *
 * ★ 为什么不用 Phaser 的音频系统：它面向**音频文件**，
 *   而 `assets/audio/` 目前是空的。合成音零素材依赖、零体积。
 *   将来有真素材，换掉本文件即可 —— `AudioManager` 接口不变。
 *
 * ★★ 移动端硬约束：**AudioContext 必须由用户手势解锁**。
 *   iOS Safari 与 Chrome 都会把未经手势创建的 context 挂在 `suspended`。
 *   所以这里**不在构造时创建 context**，而是等第一次真实输入。
 *   否则表现是"整局游戏一声不响"，且控制台一句话都没有。
 */

import { AUDIO_DEFAULTS, SFX, type SfxName, type ToneSpec } from '../../config/audio';
import type { CoreGameEvent } from '../../core/types';
import { planSfx } from './sfxPlan';
import { buildTimeline } from '../render/timeline';
import { DEFAULT_TEMPO, type Tempo } from '../../config/tuning';
import type { AudioManager } from './AudioManager';

/** 尾音留白，避免 release 被硬切产生咔哒声 */
const RELEASE_MS = 60;

export class WebAudioManager implements AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxVolume: number = AUDIO_DEFAULTS.sfxVolume;
  private bgmVolume: number = AUDIO_DEFAULTS.bgmVolume;
  private muted: boolean = AUDIO_DEFAULTS.muted;
  /** context 创建失败过就不再重试 —— 不要每次点击都抛一遍异常 */
  private unavailable = false;
  /**
   * ★ 解锁未完成时被搁置的那一段事件，等 resume 落地后补播。
   *   只留**最后一段**（见 flushPending）。
   */
  private pending: readonly CoreGameEvent[] | null = null;

  /**
   * ★ 节奏由外部注入 —— 音效要和动画对齐，就必须知道动画有多快。
   *   默认取 DEFAULT_TEMPO，这样测试与未接入场景时也能正常工作。
   */
  private getTempo: () => Tempo = () => DEFAULT_TEMPO;

  /** 供 LevelScene 接入当前节奏设置 */
  setTempoSource(fn: () => Tempo): void {
    this.getTempo = fn;
  }

  /**
   * ★ 必须在**用户手势的同步调用栈里**调用（pointerdown 等）。
   *   异步之后再创建，浏览器不认这个手势。
   *
   * ★★ iOS（含微信 WKWebView）比桌面严格得多，实测"Mac/Android 有声、
   *   iPhone 微信无声"就出在这里。三件事缺一不可：
   *
   *   1. **每次手势都重试 resume()**：iOS 上 context 经常在创建后仍是
   *      `suspended`，而且切后台 / 接电话 / 微信内跳转回来都会再次挂起。
   *      只在第一次解锁是不够的。
   *   2. **播一段静音 buffer**：这是 iOS 认可"用户确实允许放声音"的
   *      标志动作。只 resume 不发声，某些 WebView 仍然静默。
   *   3. **resume() 要等它真的完成**：它是 Promise，`void` 掉的话
   *      紧随其后的 playTone 会在仍然 suspended 的 context 上排期 ——
   *      声音永远不会出来，且没有任何报错。
   *
   * ⚠️ 还有一条**代码解决不了**：iOS 的 WebAudio 受**响铃/静音物理开关**
   *   控制。拨到静音档时整个网页都没声音，这不是 bug。
   */
  /**
   * ★★★ 接管 **Phaser 已经建好的那个 AudioContext**。
   *
   *   ⚠️⚠️ 这是"微信里一直没声、点一次设置才有"的**真正修复**。
   *   我先后归因到频率、时间轴、解锁竞态，都不是根因 ——
   *   根因是**页面上存在两个 AudioContext**：
   *
   *     · Phaser 在 `new Phaser.Game()` 时就自建了一个
   *       （WebAudioSoundManager 第 47 行），并在 **document.body** 上
   *       挂了 touchstart/touchend/mousedown/mouseup/keydown 解锁handler
   *     · 我们又在首次手势里 `new AudioContext()` 建了**第二个**
   *
   *   iOS 的解锁是**按 context 逐个授权**的：用户那一下手势被
   *   Phaser 的 handler 消费掉，解锁的是 **Phaser 的** context；
   *   我们这个第二 context 从来没被真正解锁，于是一直静默。
   *
   *   桌面 Chrome / Android 没有这条限制（context 建出来就是 running），
   *   所以只有 iOS/微信复现 —— 这解释了为什么它躲过了所有本地验证。
   *
   *   → 正确做法是**不自己建**，直接用 Phaser 那一个。
   *     它已经被 Phaser 的 body handler 解锁好了。
   *
   * @param ctx Phaser 的 `sound.context`（WebAudio 后端时才有）
   */
  adoptContext(ctx: AudioContext): void {
    if (this.ctx === ctx) return;
    try {
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 1;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.unavailable = false;
      this.resumeAndPrime();
    } catch {
      this.unavailable = true;
    }
  }

  unlock(): void {
    if (this.unavailable) return;

    if (this.ctx) {
      // ★ 每次手势都尝试恢复 —— iOS 会反复把 context 挂起
      this.resumeAndPrime();
      return;
    }

    /**
     * ★ 走到这里说明**没能接管 Phaser 的 context**
     *   （noAudio、或非 WebAudio 后端）。自建一个作为兜底。
     *   ⚠️ iOS 上这条路基本注定静默 —— 见 adoptContext 的说明。
     *   保留它只是为了不让"没有 Phaser 音频"直接变成崩溃。
     */
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.unavailable = true;
        return;
      }
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 1;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.resumeAndPrime();
    } catch {
      // ★ 没有声音是可以接受的降级；因为没声音而崩掉游戏不可接受
      this.unavailable = true;
    }
  }

  /**
   * 恢复 context 并播一段**静音 buffer**。
   *
   * ★ 静音 buffer 是 iOS 上的标准解锁手法：
   *   只调 resume() 而不实际产生一次输出，部分 WKWebView
   *   （微信内置浏览器就是其中之一）仍然不放行后续声音。
   */
  private resumeAndPrime(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const prime = (): void => {
      try {
        // 1 帧的空 buffer，听不见，但足以让 iOS 认账
        const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch {
        // 解锁失败不影响游戏
      }
    };

    if (ctx.state === 'running') {
      prime();
      this.flushPending();
      return;
    }
    // ★ 必须在 resume 完成之后再 prime，否则仍在 suspended 上排期
    void ctx
      .resume()
      .then(() => {
        prime();
        // ★ resume 落地后立刻补播等在门口的那一段（见 consume）
        this.flushPending();
      })
      .catch(() => undefined);
  }

  /**
   * ★★ 补播「解锁未完成时被搁置的那一段」。
   *
   *   ⚠️ 这是"微信里第一局没声、点一次设置才有声"的真正修复。
   *   见 consume() 里的详细说明。
   *
   *   只补**最后一段**：连续几个回合都排不出去时，补播全部会在
   *   resume 落地的瞬间**一起炸开**，比没声音更糟。
   */
  private flushPending(): void {
    const pending = this.pending;
    this.pending = null;
    if (!pending) return;
    if (this.ctx?.state !== 'running') return;
    this.schedule(pending);
  }

  /** context 是否真的在跑（供 UI 提示用） */
  isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  consume(events: readonly CoreGameEvent[]): void {
    if (!this.ctx || !this.master || this.muted) return;

    /**
     * ★★★ context 没在跑就**不要排期**，先存起来。
     *
     *   ⚠️⚠️ 这是"微信里第一局没声音、点一次设置才有声"的**真正原因**，
     *   它和之前修的时间轴对齐是**两个独立的 bug**：
     *
     *   `unlock()` 确实在 pointerdown 的同步栈里调了，但 `resume()`
     *   是 **Promise**，实测要 100~300ms 才落地。而同一次点击里
     *   pointerup → requestMove → runTurn → consume() 是**同步**走完的，
     *   此时 context 仍是 `suspended` ——
     *
     *     · suspended 的 context，`currentTime` **冻结在 0 不推进**
     *     · 于是整段音符全排在 0.000~0.520s
     *     · 等 resume 落地时 currentTime 已经 0.180s，
     *       排在它之前的音**全部成了过去式，永远不会响**
     *     · 而且 **不抛任何错误**，控制台干干净净
     *
     *   原来第 138 行的 `if (state !== 'running') this.resumeAndPrime()`
     *   救不回来：它是 fire-and-forget，下一行立刻就读了 currentTime。
     *
     *   点一次「设置」之所以有效，只是因为那次点击给了 resume()
     *   几百毫秒去落地 —— 不是设置面板做了什么。
     */
    if (this.ctx.state !== 'running') {
      // ★ 只留最后一段：见 flushPending 的说明
      this.pending = events;
      this.resumeAndPrime();
      return;
    }

    this.schedule(events);
  }

  /**
   * 把一段事件排进 context。
   *
   * ★ 抽出来是因为它有**两个调用点**：正常路径（consume）与
   *   解锁落地后的补播（flushPending）。两边必须用同一套时序，
   *   否则补播出来的那一段会和画面对不上。
   */
  private schedule(events: readonly CoreGameEvent[]): void {
    if (!this.ctx || !this.master) return;

    /**
     * ★★ 音效必须**对齐画面时间轴**，不能自己数节拍。
     *
     *   ⚠️ 这里曾经直接 planSfx(events)，游标按"第几个音"递增
     *   （0、60、80…）。但 consume() 是**一次性把整段排完**的，
     *   于是舒缓节奏下消除音排在 60ms、而消除动画 234ms 才开始 ——
     *   声音早了 174ms，正好压在交换音上糊成一声。
     *   玩家听见交换、听不到消除/火箭/合体（实测反馈 #3 #4 #6 #7）。
     *
     *   buildTimeline 算的就是"每个事件在画面上第几毫秒发生"，
     *   渲染层用它，音频层也用它 —— 两层消费同一份时序才会同步。
     */
    const timeline = buildTimeline(events, this.getTempo());
    const atByIndex = timeline.items.map((i) => i.atMs);

    const now = this.ctx.currentTime;
    for (const cue of planSfx(events, atByIndex)) {
      const spec = SFX[cue.name];
      this.playTone(spec, now + cue.atMs / 1000, cue.pitchScale);
    }
  }

  /**
   * 合成单个音。
   *
   * ★ 用 ADSR 里的 A 与 R 就够了：
   *   起音要快（中频 transient 是明确要求），收音要有 release
   *   （硬切会产生咔哒声，比没有音效更难受）。
   */
  private playTone(spec: ToneSpec, startAt: number, pitchScale: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const durSec = spec.durationMs / 1000;
    const endAt = startAt + durSec + RELEASE_MS / 1000;

    const voice = (ratio: number, gainScale: number): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = spec.wave;

      const f0 = spec.freq * ratio * pitchScale;
      osc.frequency.setValueAtTime(f0, startAt);
      if (spec.endFreq !== undefined) {
        // 滑音：线性到目标频率
        osc.frequency.linearRampToValueAtTime(spec.endFreq * ratio * pitchScale, startAt + durSec);
      }

      const peak = spec.gain * gainScale * this.sfxVolume;
      const attack = Math.max(0.001, spec.attackMs / 1000);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + attack);
      // 指数衰减到接近 0（exponentialRamp 不能真的到 0）
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

      osc.connect(gain);
      gain.connect(master);
      osc.start(startAt);
      osc.stop(endAt);
      // ★ 播完即断，否则节点会一直挂在图上（长局会累积成千上万个）
      osc.onended = (): void => {
        osc.disconnect();
        gain.disconnect();
      };
    };

    voice(1, 1);
    for (const p of spec.partials ?? []) voice(p.ratio, p.gain);
  }

  /**
   * 直接播一个音效（UI 反馈用，不经过事件）。
   *
   * ★ 同样要挡住 suspended：胜负音是在 `play()` 里放的，
   *   若 context 还没解锁，它会和 consume 一样静默丢失。
   *   这里**不做补播** —— 单个 UI 音迟到几百毫秒补出来，
   *   比不响更奇怪（"赢了半天才叮一声"）。
   */
  play(name: SfxName): void {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state !== 'running') {
      this.resumeAndPrime();
      return;
    }
    this.playTone(SFX[name], this.ctx.currentTime, 1);
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  setBgmVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** 供设置面板显示当前值 */
  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getBgmVolume(): number {
    return this.bgmVolume;
  }
}
