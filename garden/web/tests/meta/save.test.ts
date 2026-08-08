/**
 * save 单测 —— 存档与星星发放
 *
 * ★★ 重点全在 `applyLevelResult`：框架 §8.2 明确点名这里"实现时容易漏"。
 *   两条规则都基于**历史最高**而非"这一次"，写反了不会报错、
 *   只会让玩家反复刷第 1 关就把院门修满 —— 而那恰恰是 Stage 0
 *   要验证的留存心理，一旦被绕过，整场测试的结论都不可信。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyLevelResult,
  availableProgressStars,
  createDefaultSave,
  highestClearedLevel,
  loadSave,
  saveSave,
  type Rating,
  type SaveData,
} from '../../src/meta/save';
import { GARDEN_ECONOMY } from '../../src/config/garden';

/** 连打若干关，返回最终存档 */
function play(save: SaveData, plays: readonly [number, Rating][]): SaveData {
  let s = save;
  for (const [id, r] of plays) s = applyLevelResult(s, id, r).save;
  return s;
}

describe('createDefaultSave', () => {
  it('全新存档没有任何进度', () => {
    const s = createDefaultSave();
    expect(s.version).toBe(1);
    expect(s.levels).toEqual({});
    expect(availableProgressStars(s)).toBe(0);
    expect(highestClearedLevel(s)).toBe(0);
  });

  it('宠物默认叫旺财', () => {
    expect(createDefaultSave().pet.name).toBe('旺财');
  });
});

describe('★★ Progress Star —— 只在首次通关发放', () => {
  it('首次通关 +1', () => {
    const r = applyLevelResult(createDefaultSave(), 1, 1);
    expect(r.progressGained).toBe(GARDEN_ECONOMY.progressStarPerClear);
    expect(availableProgressStars(r.save)).toBe(1);
  });

  /**
   * ★★ 这是防刷的核心。写成"每次通关都 +1"不会有任何报错，
   *   但玩家重打第 1 关十次就能把院门直接修满。
   */
  it('★★ 重打已通关的关卡 —— 不再发放', () => {
    let s = applyLevelResult(createDefaultSave(), 1, 1).save;
    for (let i = 0; i < 10; i++) {
      const r = applyLevelResult(s, 1, 3);
      expect(r.progressGained).toBe(0);
      s = r.save;
    }
    expect(availableProgressStars(s)).toBe(1); // 仍然只有首通那 1 颗
  });

  it('★ 1 星和 3 星发放一样多 —— 所有玩家推进节奏一致', () => {
    const a = applyLevelResult(createDefaultSave(), 1, 1);
    const b = applyLevelResult(createDefaultSave(), 1, 3);
    expect(a.progressGained).toBe(b.progressGained);
  });

  it('失败（rating = 0）不发放，也不算通关', () => {
    const r = applyLevelResult(createDefaultSave(), 1, 0);
    expect(r.progressGained).toBe(0);
    expect(highestClearedLevel(r.save)).toBe(0);
  });

  it('★ 打完 3 关正好够建一个阶段', () => {
    const s = play(createDefaultSave(), [
      [1, 1],
      [2, 1],
      [3, 1],
    ]);
    expect(availableProgressStars(s)).toBe(GARDEN_ECONOMY.nodeStageCost);
  });
});

describe('★★ Mastery Star —— 按历史最高的增量发放', () => {
  it('首次 2 星 → +2', () => {
    const r = applyLevelResult(createDefaultSave(), 1, 2);
    expect(r.masteryGained).toBe(2);
  });

  it('★ 2 星后再打 3 星 → 只 +1（增量）', () => {
    const s = applyLevelResult(createDefaultSave(), 1, 2).save;
    expect(applyLevelResult(s, 1, 3).masteryGained).toBe(1);
  });

  /**
   * ★★ `Math.max(0, ...)` 不能省：
   *   打得比历史最好差时增量为负，必须夹到 0 —— 不能倒扣已拿到的星星。
   */
  it('★★ 3 星后再打 1 星 → +0，且不倒扣', () => {
    const s = applyLevelResult(createDefaultSave(), 1, 3).save;
    const r = applyLevelResult(s, 1, 1);
    expect(r.masteryGained).toBe(0);
    expect(r.save.stars.mastery.earned).toBe(3); // 没被扣
  });

  it('★ 反复重打不会刷出额外 Mastery', () => {
    let s = applyLevelResult(createDefaultSave(), 1, 3).save;
    for (let i = 0; i < 20; i++) s = applyLevelResult(s, 1, 3).save;
    expect(s.stars.mastery.earned).toBe(3);
  });
});

describe('bestRating 取历史最高', () => {
  it('打出更好成绩会更新', () => {
    let s = applyLevelResult(createDefaultSave(), 1, 1).save;
    s = applyLevelResult(s, 1, 3).save;
    expect(s.levels[1]?.bestRating).toBe(3);
  });

  it('★ 打出更差成绩不会覆盖', () => {
    let s = applyLevelResult(createDefaultSave(), 1, 3).save;
    s = applyLevelResult(s, 1, 1).save;
    expect(s.levels[1]?.bestRating).toBe(3);
  });
});

describe('highestClearedLevel', () => {
  it('返回已通关的最大关卡', () => {
    const s = play(createDefaultSave(), [
      [1, 1],
      [2, 2],
      [3, 1],
    ]);
    expect(highestClearedLevel(s)).toBe(3);
  });

  it('★ 失败的关卡不算通关（bestRating = 0）', () => {
    const s = play(createDefaultSave(), [
      [1, 1],
      [2, 0],
    ]);
    expect(highestClearedLevel(s)).toBe(1);
  });
});

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

describe('★★ 读档必须容错 —— 不信任 localStorage 里的内容', () => {
  beforeEach(() => {
    installStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('没有存档 → 默认档', () => {
    expect(loadSave()).toEqual(createDefaultSave());
  });

  it('★ 内容不是 JSON → 默认档，不抛异常', () => {
    localStorage.setItem('garden.save.v1','这不是 JSON{{{');
    expect(() => loadSave()).not.toThrow();
    expect(loadSave()).toEqual(createDefaultSave());
  });

  it('★ 版本不认识 → 整份丢弃（半个旧存档比没有更难排查）', () => {
    localStorage.setItem('garden.save.v1',JSON.stringify({ version: 99, levels: { 1: {} } }));
    expect(loadSave()).toEqual(createDefaultSave());
  });

  it('★ 字段类型被改坏 → 逐项回退，不把 undefined 传进游戏', () => {
    localStorage.setItem(
      'garden.save.v1',
      JSON.stringify({
        version: 1,
        levels: { 1: { bestRating: '三星' }, abc: { bestRating: 2 } },
        stars: { progress: { earned: 'x', spent: null } },
        garden: { gate: -5 },
        settings: { tempo: '飞快' },
      }),
    );
    const s = loadSave();
    expect(s.levels[1]).toBeUndefined(); // 非法评级被丢弃
    expect(s.stars.progress.earned).toBe(0);
    expect(s.garden['gate']).toBeUndefined(); // 负数阶段被丢弃
    expect(s.settings.tempo).toBe(createDefaultSave().settings.tempo);
  });

  it('★ 合法存档能原样读回', () => {
    const s = play(createDefaultSave(), [
      [1, 3],
      [2, 1],
    ]);
    saveSave(s);
    expect(loadSave()).toEqual(s);
  });

  /**
   * ★★ 回归：音量是 **0~1 的小数**，不能按整数处理。
   *
   *   第一版存档的数值校验统一走了 `Math.floor()`（为计数字段写的），
   *   于是 `sfx: 0.7` 存一次读回来变成 **0** —— 玩家每存一次档音量就被清零，
   *   而且不报任何错。存读往返测试当场抓到。
   */
  it('★★ 音量小数必须原样保留（不能被 Math.floor 抹成 0）', () => {
    const s: SaveData = {
      ...createDefaultSave(),
      settings: { ...createDefaultSave().settings, sfx: 0.7, bgm: 0.35 },
    };
    saveSave(s);
    const back = loadSave();
    expect(back.settings.sfx).toBeCloseTo(0.7);
    expect(back.settings.bgm).toBeCloseTo(0.35);
  });

  it('★ 音量越界要夹紧到 0~1', () => {
    localStorage.setItem(
      'garden.save.v1',
      JSON.stringify({ ...createDefaultSave(), settings: { sfx: 9, bgm: -3, tempo: 'calm' } }),
    );
    const s = loadSave();
    expect(s.settings.sfx).toBe(1);
    expect(s.settings.bgm).toBe(0);
  });

  it('★ 存档写入失败不能崩（隐私模式 / 存储已满）', () => {
    const orig = localStorage.setItem;
    localStorage.setItem = (): never => {
      throw new Error('QuotaExceededError');
    };
    expect(() => saveSave(createDefaultSave())).not.toThrow();
    localStorage.setItem = orig;
  });
});
