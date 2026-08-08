/**
 * game/audio/AudioManager.ts —— 音频（M0 骨架，实现见 M5）
 *
 * ★ 音效走**中频**：50+ 用户的高频听力衰减明显，
 *   把反馈音做在 2kHz 以上等于对目标用户静音。
 *
 * ★ 与渲染消费同一份 CoreGameEvent[]，不另起一套时序。
 */

import type { CoreGameEvent } from '../../core/types';

export interface AudioManager {
  consume(events: readonly CoreGameEvent[]): void;
  setBgmVolume(v: number): void;
  setSfxVolume(v: number): void;
}
