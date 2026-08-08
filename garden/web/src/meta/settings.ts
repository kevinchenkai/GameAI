/**
 * meta/settings.ts —— 设置项的读写（M5）
 *
 * ★ 为什么不并进 meta/save.ts：那是 M7 的完整存档（关卡评级、星星、
 *   花园进度），格式还会变。设置是**现在就要能持久化**的一小块，
 *   把它挂在一个尚未定型的结构上，等于提前锁死 M7 的设计。
 *   M7 接入完整存档时，把这里的值搬进去即可（有 version 字段兜底）。
 *
 * ★ localStorage 在隐私模式 / 存储已满时会**抛异常**，不是返回 null。
 *   读写都必须包起来 —— 设置存不下是可接受的降级，
 *   因为设置存不下而白屏不可接受。
 */

import { AUDIO_DEFAULTS } from '../config/audio';
import { DEFAULT_TEMPO, TEMPO, type Tempo } from '../config/tuning';

const KEY = 'garden.settings.v1';

export interface GameSettings {
  readonly tempo: Tempo;
  readonly sfxVolume: number;
  readonly muted: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  tempo: DEFAULT_TEMPO,
  sfxVolume: AUDIO_DEFAULTS.sfxVolume,
  muted: AUDIO_DEFAULTS.muted,
};

function isTempo(v: unknown): v is Tempo {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(TEMPO, v);
}

/**
 * 读设置。
 *
 * ★ 逐字段校验，**不信任 localStorage 里的内容**：
 *   它可能是旧版本写的、被用户手改的、或者别的项目同名键写坏的。
 *   任何一项不合法就用默认值，绝不把 undefined 传进游戏
 *   （tempo 为 undefined 会让 buildTimeline 算出 NaN 时长，
 *   表现是动画永远不结束 —— 输入永久锁死）。
 */
export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS;

    const o = parsed as Record<string, unknown>;
    const sfx = typeof o['sfxVolume'] === 'number' && Number.isFinite(o['sfxVolume'])
      ? Math.max(0, Math.min(1, o['sfxVolume']))
      : DEFAULT_SETTINGS.sfxVolume;

    return {
      tempo: isTempo(o['tempo']) ? o['tempo'] : DEFAULT_SETTINGS.tempo,
      sfxVolume: sfx,
      muted: typeof o['muted'] === 'boolean' ? o['muted'] : DEFAULT_SETTINGS.muted,
    };
  } catch {
    // 隐私模式 / JSON 损坏 / 存储不可用
    return DEFAULT_SETTINGS;
  }
}

/** 写设置。★ 失败静默 —— 存不下只是下次要重设，不该打断游戏 */
export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 忽略：配额满 / 隐私模式
  }
}
