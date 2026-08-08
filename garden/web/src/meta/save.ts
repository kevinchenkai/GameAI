/**
 * meta/save.ts —— 存档（M0 骨架，实现见 M7）
 *
 * ★ `version` 字段必须有，用于后续迁移。
 */

import type { Tempo } from '../config/tuning';
import { notImplemented } from '../core/notImplemented';

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
  readonly levels: Readonly<Record<number, { readonly bestRating: 0 | 1 | 2 | 3 }>>;

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

export function loadSave(): SaveData {
  return notImplemented('loadSave', 'M7');
}
export function saveSave(_data: SaveData): void {
  notImplemented('saveSave', 'M7');
}
export function createDefaultSave(): SaveData {
  return notImplemented('createDefaultSave', 'M7');
}

/**
 * ★ 导出 / 导入进度码（存档 JSON → base64）。
 *   localStorage 在移动端会丢。成本半天，兜住最坏情况——
 *   50+ 用户丢掉花园进度是不可逆流失。
 *
 * ⚠️ 移到 V1 Full（Codex §18）：它是保险不是验证点，
 *    Stage 0 只有 8 关，丢档损失可接受。
 */
export function exportProgressCode(_data: SaveData): string {
  return notImplemented('exportProgressCode', 'M7');
}
export function importProgressCode(_code: string): SaveData {
  return notImplemented('importProgressCode', 'M7');
}
