/**
 * 设置持久化单测
 *
 * ★★ 重点是**不信任 localStorage 里的内容**。
 *   它可能是旧版本写的、被用户手改的、被同名键写坏的。
 *   最危险的一条：`tempo` 若变成 undefined，buildTimeline 会算出
 *   NaN 时长 → 动画永远不结束 → **输入永久锁死**，且不报任何错。
 *   所以逐字段校验，任何一项不合法就退回默认值。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../src/meta/settings';
import { TEMPO } from '../../src/config/tuning';

/** 十几行的假 localStorage —— 测试环境是 node，没有真的 */
function installStorage(initial: Record<string, string> = {}): Record<string, string> {
  const store: Record<string, string> = { ...initial };
  vi.stubGlobal('localStorage', {
    getItem: (k: string): string | null => store[k] ?? null,
    setItem: (k: string, v: string): void => {
      store[k] = v;
    },
    removeItem: (k: string): void => {
      delete store[k];
    },
  });
  return store;
}

/** 模拟隐私模式：读写都抛 */
function installThrowingStorage(): void {
  vi.stubGlobal('localStorage', {
    getItem: (): string => {
      throw new Error('SecurityError');
    },
    setItem: (): void => {
      throw new Error('QuotaExceededError');
    },
    removeItem: (): void => undefined,
  });
}

const KEY = 'garden.settings.v1';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('读写往返', () => {
  beforeEach(() => {
    installStorage();
  });

  it('没有存过时返回默认值', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('存了再读能拿回同样的值', () => {
    saveSettings({ tempo: 'brisk', sfxVolume: 0.4, muted: true });
    expect(loadSettings()).toEqual({ tempo: 'brisk', sfxVolume: 0.4, muted: true });
  });

  it('默认节奏是「舒缓」—— 50+ 用户永远不会打开设置面板', () => {
    expect(DEFAULT_SETTINGS.tempo).toBe('calm');
  });
});

describe('★★ 不信任存储内容', () => {
  it('★★ tempo 非法时退回默认（若漏掉会让动画时长变 NaN，输入永久锁死）', () => {
    installStorage({ [KEY]: JSON.stringify({ tempo: 'turbo', sfxVolume: 0.5, muted: false }) });
    expect(loadSettings().tempo).toBe(DEFAULT_SETTINGS.tempo);
    // 拿回来的值必须是 TEMPO 表里真实存在的键
    expect(Object.keys(TEMPO)).toContain(loadSettings().tempo);
  });

  it('★ tempo 缺失时退回默认', () => {
    installStorage({ [KEY]: JSON.stringify({ sfxVolume: 0.5 }) });
    expect(loadSettings().tempo).toBe(DEFAULT_SETTINGS.tempo);
  });

  it('★ 音量越界被夹到 0~1', () => {
    installStorage({ [KEY]: JSON.stringify({ tempo: 'calm', sfxVolume: 99, muted: false }) });
    expect(loadSettings().sfxVolume).toBe(1);

    installStorage({ [KEY]: JSON.stringify({ tempo: 'calm', sfxVolume: -5, muted: false }) });
    expect(loadSettings().sfxVolume).toBe(0);
  });

  it('★ 音量是 NaN / 字符串时退回默认', () => {
    installStorage({ [KEY]: JSON.stringify({ tempo: 'calm', sfxVolume: 'loud' }) });
    expect(loadSettings().sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
  });

  it('★ JSON 损坏时退回默认，不抛错', () => {
    installStorage({ [KEY]: '{这不是 JSON' });
    expect(() => loadSettings()).not.toThrow();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('★ 存的是数组 / null 等非对象时退回默认', () => {
    installStorage({ [KEY]: '[1,2,3]' });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    installStorage({ [KEY]: 'null' });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('★ 返回值永远不含 undefined 字段', () => {
    installStorage({ [KEY]: JSON.stringify({}) });
    const s = loadSettings();
    expect(s.tempo).toBeDefined();
    expect(s.sfxVolume).toBeDefined();
    expect(s.muted).toBeDefined();
  });
});

describe('★ 存储不可用时静默降级（隐私模式 / 配额满）', () => {
  beforeEach(() => {
    installThrowingStorage();
  });

  it('读抛异常时返回默认值，不把异常抛给游戏', () => {
    expect(() => loadSettings()).not.toThrow();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('★ 写抛异常时也不打断游戏 —— 存不下只是下次要重设', () => {
    expect(() => saveSettings({ tempo: 'brisk', sfxVolume: 0.5, muted: false })).not.toThrow();
  });
});
