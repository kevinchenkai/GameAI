/**
 * meta/save.ts —— 存档（M7）
 *
 * ★ `version` 字段必须有，用于后续迁移。
 *
 * ★★ localStorage 在隐私模式 / 存储已满时会**抛异常**，不是返回 null。
 *   读写都要包起来 —— 存档丢失是可接受的降级（Stage 0 只有 8 关），
 *   因为存档写不进去而崩掉游戏不可接受。
 *
 * ★★ 逐字段校验，**不信任 localStorage 里的内容**：可能是旧版本写的、
 *   用户手改的、或别的项目同名键写坏的。任何一项不合法就退回默认值。
 */

import type { Tempo } from '../config/tuning';
import { DEFAULT_TEMPO, TEMPO } from '../config/tuning';
import { AUDIO_DEFAULTS } from '../config/audio';
import { GARDEN_ECONOMY } from '../config/garden';

const KEY = 'garden.save.v1';

export type Rating = 0 | 1 | 2 | 3;

export interface SaveData {
  readonly version: 1;

  /**
   * ★ 记录**历史最高**评级，而非最近一次（框架 §8.2）。
   *   0 = 未通关。
   *
   *   这是防刷分漏洞的关键：
   *     masteryGain = Math.max(0, newRating - bestRating)
   *   否则玩家反复重打第 1 关就能无限刷 Mastery Star。
   *   `Math.max(0, ...)` 不能省——不能倒扣玩家已拿到的星星。
   *
   *   ⚠️ Progress Star 同理只在**首次通关**发放（看 bestRating > 0 判断）。
   *      重打旧关卡不应推进花园——实现时容易漏。
   */
  readonly levels: Readonly<Record<number, { readonly bestRating: Rating }>>;

  readonly stars: {
    /** ★ 主线：通关 +1，与评级无关。只用于花园主线建设 */
    readonly progress: { readonly earned: number; readonly spent: number };
    /** ★ 评级星：装饰、图鉴、成就、宠物外观（V1 Full 启用） */
    readonly mastery: { readonly earned: number; readonly spent: number };
  };

  /** 建设节点 id → 已完成阶段数 */
  readonly garden: Readonly<Record<string, number>>;

  /** name 默认 '旺财'，预留玩家改名 */
  readonly pet: { readonly name: string; readonly level: number };

  readonly settings: {
    readonly bgm: number;
    readonly sfx: number;
    readonly haptics: boolean;
    readonly tempo: Tempo;
  };

  readonly stats: { readonly totalPlays: number; readonly lastPlayedAt: number };
}

export function createDefaultSave(): SaveData {
  return {
    version: 1,
    levels: {},
    stars: {
      progress: { earned: 0, spent: 0 },
      mastery: { earned: 0, spent: 0 },
    },
    garden: {},
    pet: { name: '旺财', level: 1 },
    settings: {
      bgm: AUDIO_DEFAULTS.bgmVolume,
      sfx: AUDIO_DEFAULTS.sfxVolume,
      haptics: true,
      tempo: DEFAULT_TEMPO,
    },
    stats: { totalPlays: 0, lastPlayedAt: 0 },
  };
}

function isTempo(v: unknown): v is Tempo {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(TEMPO, v);
}

function isRating(v: unknown): v is Rating {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

/**
 * 非负有限**整数**（计数用：星星、阶段、次数），否则回退默认值。
 *
 * ⚠️ 只用于计数字段。音量是 0~1 的小数，用 `frac()` ——
 *   第一版把音量也走了这个函数，`Math.floor(0.7)` 直接变成 0，
 *   表现是"存一次档音量就被清零"。单测存读往返立刻抓到。
 */
function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

/** 0~1 的小数（音量），越界夹紧 */
function frac(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
}

function readLevels(v: unknown): Record<number, { bestRating: Rating }> {
  const out: Record<number, { bestRating: Rating }> = {};
  if (typeof v !== 'object' || v === null) return out;
  for (const [k, entry] of Object.entries(v as Record<string, unknown>)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (typeof entry !== 'object' || entry === null) continue;
    const r = (entry as Record<string, unknown>)['bestRating'];
    if (isRating(r)) out[id] = { bestRating: r };
  }
  return out;
}

function readGarden(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof v !== 'object' || v === null) return out;
  for (const [k, stage] of Object.entries(v as Record<string, unknown>)) {
    if (typeof stage === 'number' && Number.isFinite(stage) && stage >= 0) {
      out[k] = Math.floor(stage);
    }
  }
  return out;
}

export function loadSave(): SaveData {
  const def = createDefaultSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return def;
    const o = parsed as Record<string, unknown>;

    /**
     * ★ 版本不认识就**整份丢弃退回默认**，不做部分恢复。
     *   半个旧存档比没有存档更难排查。
     */
    if (o['version'] !== 1) return def;

    const stars = (o['stars'] ?? {}) as Record<string, unknown>;
    const prog = (stars['progress'] ?? {}) as Record<string, unknown>;
    const mast = (stars['mastery'] ?? {}) as Record<string, unknown>;
    const pet = (o['pet'] ?? {}) as Record<string, unknown>;
    const st = (o['settings'] ?? {}) as Record<string, unknown>;
    const stats = (o['stats'] ?? {}) as Record<string, unknown>;

    return {
      version: 1,
      levels: readLevels(o['levels']),
      stars: {
        progress: {
          earned: num(prog['earned'], 0),
          spent: num(prog['spent'], 0),
        },
        mastery: {
          earned: num(mast['earned'], 0),
          spent: num(mast['spent'], 0),
        },
      },
      garden: readGarden(o['garden']),
      pet: {
        name: typeof pet['name'] === 'string' && pet['name'] ? pet['name'] : def.pet.name,
        level: num(pet['level'], def.pet.level),
      },
      settings: {
        bgm: frac(st['bgm'], def.settings.bgm),
        sfx: frac(st['sfx'], def.settings.sfx),
        haptics: typeof st['haptics'] === 'boolean' ? st['haptics'] : def.settings.haptics,
        tempo: isTempo(st['tempo']) ? st['tempo'] : def.settings.tempo,
      },
      stats: {
        totalPlays: num(stats['totalPlays'], 0),
        lastPlayedAt: num(stats['lastPlayedAt'], 0),
      },
    };
  } catch {
    // 解析失败 / localStorage 不可用 —— 退回默认，不要崩
    return def;
  }
}

export function saveSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 存不下是可接受的降级
  }
}

/**
 * ★★ 通关结算 —— 本文件最容易写错的一段。
 *
 *   两条规则**都**基于「历史最高」，不是「这一次」：
 *
 *   1. **Progress Star 只在首次通关发放**（`bestRating === 0` 时）。
 *      重打旧关卡不应推进花园 —— 否则玩家反复刷第 1 关就能把院门修满，
 *      而 Stage 0 要验证的恰恰是"再玩两关就能修好院门"这个心理。
 *
 *   2. **Mastery 按增量发放**：`max(0, newRating - bestRating)`。
 *      夹到 0 是因为打得比历史最好差时不能倒扣。
 *      （Stage 0 不启用 Mastery，但先算对，V1 Full 直接用。）
 *
 * @returns 新存档 + 本次实际发放的星星（供 UI 展示）
 */
export function applyLevelResult(
  save: SaveData,
  levelId: number,
  rating: Rating,
): { save: SaveData; progressGained: number; masteryGained: number } {
  const prev = save.levels[levelId]?.bestRating ?? 0;

  // ★ 首次通关才给 Progress Star（rating > 0 表示通关）
  const firstClear = prev === 0 && rating > 0;
  const progressGained = firstClear ? GARDEN_ECONOMY.progressStarPerClear : 0;

  // ★ Mastery 按历史最高的增量，夹到 0
  const masteryGained = Math.max(0, rating - prev);

  const bestRating: Rating = rating > prev ? rating : prev;

  return {
    save: {
      ...save,
      levels: { ...save.levels, [levelId]: { bestRating } },
      stars: {
        progress: {
          earned: save.stars.progress.earned + progressGained,
          spent: save.stars.progress.spent,
        },
        mastery: {
          earned: save.stars.mastery.earned + masteryGained,
          spent: save.stars.mastery.spent,
        },
      },
      stats: {
        totalPlays: save.stats.totalPlays + 1,
        lastPlayedAt: save.stats.lastPlayedAt,
      },
    },
    progressGained,
    masteryGained,
  };
}

/** 可用于建设的 Progress Star（已赚 - 已花） */
export function availableProgressStars(save: SaveData): number {
  return Math.max(0, save.stars.progress.earned - save.stars.progress.spent);
}

/**
 * 已通关的最大关卡 id —— 用于解锁下一关。
 * ★ 看 bestRating > 0，不是看 levels 里有没有这个 key。
 */
export function highestClearedLevel(save: SaveData): number {
  let max = 0;
  for (const [k, v] of Object.entries(save.levels)) {
    const id = Number(k);
    if (v.bestRating > 0 && id > max) max = id;
  }
  return max;
}

/**
 * ★ 导出 / 导入进度码（存档 JSON → base64）。
 *   localStorage 在移动端会丢。成本半天，兜住最坏情况——
 *   50+ 用户丢掉花园进度是不可逆流失。
 *
 * ⚠️ 属 **V1 Full**（Codex §18）：它是保险不是验证点，
 *    Stage 0 只有 8 关，丢档损失可接受。故此处仍不实现。
 */
export function exportProgressCode(_data: SaveData): string {
  throw new Error('exportProgressCode 属 V1 Full，Stage 0 不实现');
}
export function importProgressCode(_code: string): SaveData {
  throw new Error('importProgressCode 属 V1 Full，Stage 0 不实现');
}
