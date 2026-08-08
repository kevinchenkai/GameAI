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
  unlock(): void {
    if (this.unavailable) return;

    if (this.ctx) {
      // ★ 每次手势都尝试恢复 —— iOS 会反复把 context 挂起
      this.resumeAndPrime();
      return;
    }

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
      return;
    }
    // ★ 必须在 resume 完成之后再 prime，否则仍在 suspended 上排期
    void ctx.resume().then(prime).catch(() => undefined);
  }

  /** context 是否真的在跑（供 UI 提示用） */
  isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  consume(events: readonly CoreGameEvent[]): void {
    if (!this.ctx || !this.master || this.muted) return;

    /**
     * ★ context 可能在中途被系统挂起（iOS 切后台、微信内跳转、
     *   接电话）。此时排期的音符**永远不会响**，而且不报错 ——
     *   表现就是"玩着玩着突然没声了"。这里顺手救一次。
     */
    if (this.ctx.state !== 'running') this.resumeAndPrime();

    const now = this.ctx.currentTime;
    for (const cue of planSfx(events)) {
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

  /** 直接播一个音效（UI 反馈用，不经过事件） */
  play(name: SfxName): void {
    if (!this.ctx || this.muted) return;
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
