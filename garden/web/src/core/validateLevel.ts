/**
 * core/validateLevel.ts —— 关卡 Schema 校验
 *
 * ★ 为什么必须有（框架 §11.2）：关卡未来会由 AI 批量生成，
 *   **TypeScript 类型只能保证结构，保证不了语义**——一个 blocked 坐标越界、
 *   或障碍放在洞里，类型检查全过，运行时才炸。
 *
 * ★ 校验纳入 `npm test`。非法关卡数据必须**报错中止，不静默失败**。
 */

import { createRng } from './rng';
import { generateInitialBoard } from './generator';
import { findAllMatches, hasAnyValidMove } from './matcher';
import type { LevelConfig, Pos } from './types';

export interface ValidationIssue {
  readonly code: ValidationCode;
  readonly message: string;
  readonly path?: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

/**
 * 必查项清单（框架 §11.2 表）。列成枚举而不是散在实现里，
 * 是为了让"漏了哪一条"一眼可查。
 */
export type ValidationCode =
  | 'BOARD_SIZE' //           cols/rows 在允许范围
  | 'POS_OUT_OF_BOUNDS' //    所有坐标在棋盘内
  | 'BLOCKED_DUPLICATE' //    blocked 去重
  | 'OBSTACLE_ILLEGAL' //     不在 blocked 格上、不重叠
  | 'OBJECTIVE_UNREACHABLE' // ★ 最重要：收集目标的颜色必须在 colors 里
  | 'STARS_THRESHOLD' //      three > two，且 two < moves
  | 'COLORS_COUNT' //         ≥3（少于 3 色无法形成有意义的匹配）
  | 'TUTORIAL_REF' //         引用的步骤/坐标存在
  | 'INITIAL_AUTO_MATCH' //   开局不自动 Match
  | 'INITIAL_NO_MOVE' //      开局存在合法 Move
  | 'MOVES_RANGE' //          步数为正
  | 'OBJECTIVE_EMPTY'; //     至少有一个目标

export const BOARD_LIMITS = { minCols: 5, maxCols: 9, minRows: 5, maxRows: 9 } as const;
export const MIN_COLORS = 3;

/** 开局校验的采样次数——generateInitialBoard 有随机性，单次通过不代表稳定 */
const INITIAL_BOARD_SAMPLES = 5;

const keyOf = (p: Pos): string => `${p.col},${p.row}`;

/**
 * ★ `OBJECTIVE_UNREACHABLE` 是全部检查里最重要的一条：
 *   它挡住"要求收集蓝莓、但本关颜色池里没有蓝莓"这种致命配置错误。
 *   人工审阅极易漏过，但对玩家是灾难——**永远打不过**。
 */
export function validateLevelConfig(level: LevelConfig): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const err = (code: ValidationCode, message: string, path?: string): void => {
    errors.push(path === undefined ? { code, message } : { code, message, path });
  };
  const warn = (code: ValidationCode, message: string, path?: string): void => {
    warnings.push(path === undefined ? { code, message } : { code, message, path });
  };

  const { cols, rows } = level.board;

  // ——— 棋盘尺寸 ———
  if (
    !Number.isInteger(cols) ||
    !Number.isInteger(rows) ||
    cols < BOARD_LIMITS.minCols ||
    cols > BOARD_LIMITS.maxCols ||
    rows < BOARD_LIMITS.minRows ||
    rows > BOARD_LIMITS.maxRows
  ) {
    err(
      'BOARD_SIZE',
      `棋盘尺寸 ${cols}×${rows} 超出允许范围 ` +
        `(${BOARD_LIMITS.minCols}~${BOARD_LIMITS.maxCols} × ${BOARD_LIMITS.minRows}~${BOARD_LIMITS.maxRows})`,
      'board',
    );
  }

  const inBounds = (p: Pos): boolean =>
    Number.isInteger(p.col) &&
    Number.isInteger(p.row) &&
    p.col >= 0 &&
    p.col < cols &&
    p.row >= 0 &&
    p.row < rows;

  // ——— 步数 ———
  if (!Number.isInteger(level.moves) || level.moves <= 0) {
    err('MOVES_RANGE', `步数必须是正整数，收到 ${level.moves}`, 'moves');
  }

  // ——— 颜色数 ———
  if (level.colors.length < MIN_COLORS) {
    err(
      'COLORS_COUNT',
      `至少需要 ${MIN_COLORS} 种颜色（少于 3 色无法形成有意义的匹配），收到 ${level.colors.length}`,
      'colors',
    );
  }
  if (new Set(level.colors).size !== level.colors.length) {
    err('COLORS_COUNT', 'colors 中有重复颜色', 'colors');
  }

  // ——— blocked ———
  const blocked = level.board.blocked ?? [];
  const blockedKeys = new Set<string>();
  for (const [i, p] of blocked.entries()) {
    if (!inBounds(p)) {
      err('POS_OUT_OF_BOUNDS', `blocked[${i}] 坐标 (${p.col},${p.row}) 越界`, `board.blocked[${i}]`);
      continue;
    }
    if (blockedKeys.has(keyOf(p))) {
      err('BLOCKED_DUPLICATE', `blocked 中坐标 (${p.col},${p.row}) 重复`, `board.blocked[${i}]`);
    }
    blockedKeys.add(keyOf(p));
  }

  // 洞太多会让可玩格数不足
  const playableCells = cols * rows - blockedKeys.size;
  if (playableCells < 9) {
    err('BOARD_SIZE', `可放棋子的格数只有 ${playableCells}，太少无法形成匹配`, 'board.blocked');
  }

  // ——— 障碍 ———
  const obstacleKeys = new Set<string>();
  for (const [i, o] of (level.obstacles ?? []).entries()) {
    const path = `obstacles[${i}]`;
    if (!inBounds(o.pos)) {
      err('POS_OUT_OF_BOUNDS', `${path} 坐标 (${o.pos.col},${o.pos.row}) 越界`, path);
      continue;
    }
    if (blockedKeys.has(keyOf(o.pos))) {
      err('OBSTACLE_ILLEGAL', `${path} 放在了洞 (${o.pos.col},${o.pos.row}) 上`, path);
    }
    if (obstacleKeys.has(keyOf(o.pos))) {
      err('OBSTACLE_ILLEGAL', `${path} 与另一个障碍重叠于 (${o.pos.col},${o.pos.row})`, path);
    }
    obstacleKeys.add(keyOf(o.pos));
    if (!Number.isInteger(o.hp) || o.hp <= 0) {
      err('OBSTACLE_ILLEGAL', `${path} 的 hp 必须是正整数，收到 ${o.hp}`, path);
    }
  }

  // ——— 目标 ———
  if (level.objectives.length === 0) {
    err('OBJECTIVE_EMPTY', '关卡至少要有一个目标，否则永远无法通关', 'objectives');
  }
  for (const [i, o] of level.objectives.entries()) {
    const path = `objectives[${i}]`;
    if (!Number.isInteger(o.count) || o.count <= 0) {
      err('OBJECTIVE_UNREACHABLE', `${path} 的 count 必须是正整数，收到 ${o.count}`, path);
      continue;
    }
    switch (o.kind) {
      case 'collect':
        // ★ 最重要的一条
        if (!level.colors.includes(o.piece)) {
          err(
            'OBJECTIVE_UNREACHABLE',
            `${path} 要求收集 ${o.piece}，但本关颜色池 [${level.colors.join(', ')}] 里没有它 —— ` +
              '这关**永远不可能通关**',
            path,
          );
        }
        break;
      case 'clearObstacle': {
        // ⚠️ 这里曾把 o.kind（= 'clearObstacle'）误当成障碍种类去比，
        //    导致 available 恒为 0、所有破障关卡都被误报。要比的是 o.obstacle。
        const available = (level.obstacles ?? []).filter((x) => x.kind === o.obstacle).length;
        if (available < o.count) {
          err(
            'OBJECTIVE_UNREACHABLE',
            `${path} 要求清除 ${o.count} 个 ${o.obstacle}，但盘上只放了 ${available} 个 —— ` +
              '这关永远不可能通关',
            path,
          );
        }
        break;
      }
      case 'dropDown':
        // Stage 0 不做掉落物，先给警告不给错误
        warn('OBJECTIVE_UNREACHABLE', `${path} 是 dropDown 目标，Stage 0 尚未实现`, path);
        break;
    }
  }

  // ——— 星级阈值 ———
  const { two, three } = level.stars;
  if (!Number.isInteger(two) || !Number.isInteger(three)) {
    err('STARS_THRESHOLD', 'stars.two / stars.three 必须是整数', 'stars');
  } else {
    if (three <= two) {
      err('STARS_THRESHOLD', `stars.three(${three}) 必须大于 stars.two(${two})`, 'stars');
    }
    if (two >= level.moves) {
      err(
        'STARS_THRESHOLD',
        `stars.two(${two}) 必须小于总步数(${level.moves})，否则 2 星不可能达成`,
        'stars',
      );
    }
    if (three >= level.moves) {
      err(
        'STARS_THRESHOLD',
        `stars.three(${three}) 必须小于总步数(${level.moves})，否则 3 星不可能达成`,
        'stars',
      );
    }
    if (two < 0) err('STARS_THRESHOLD', 'stars.two 不能为负', 'stars');
  }

  // ——— 教程引用 ———
  for (const [i, step] of (level.tutorial ?? []).entries()) {
    const path = `tutorial[${i}]`;
    if (!step.id) err('TUTORIAL_REF', `${path} 缺少 id`, path);
    for (const p of step.highlight ?? []) {
      if (!inBounds(p)) {
        err('TUTORIAL_REF', `${path} 高亮坐标 (${p.col},${p.row}) 越界`, path);
      }
    }
  }

  // ——— 开局可玩性（必须先过前面的检查，否则生成器会直接抛错）———
  if (errors.length === 0) {
    checkInitialBoard(level, err, warn);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * 开局校验：不自动 Match、存在合法 Move。
 *
 * ★ 多采样几个种子 —— generateInitialBoard 有随机性，
 *   单次通过不代表这个配置**稳定**可用。
 */
function checkInitialBoard(
  level: LevelConfig,
  err: (code: ValidationCode, message: string, path?: string) => void,
  warn: (code: ValidationCode, message: string, path?: string) => void,
): void {
  for (let i = 0; i < INITIAL_BOARD_SAMPLES; i++) {
    const seed = 1000 + i * 7919; // 固定种子，让校验结果可复现
    let board;
    try {
      board = generateInitialBoard(level, createRng(seed));
    } catch (e) {
      err(
        'INITIAL_NO_MOVE',
        `种子 ${seed} 无法生成合法开局：${e instanceof Error ? e.message : String(e)}`,
        'board',
      );
      return;
    }
    if (findAllMatches(board).length > 0) {
      err('INITIAL_AUTO_MATCH', `种子 ${seed} 的开局自带匹配（一进关就会自己消除）`, 'board');
      return;
    }
    if (!hasAnyValidMove(board)) {
      err('INITIAL_NO_MOVE', `种子 ${seed} 的开局没有合法 Move（一进关就会 shuffle）`, 'board');
      return;
    }
  }

  // 颜色数少 + 盘子大 = 开局容易自带匹配，虽然生成器会重试，但值得提醒
  if (level.colors.length === MIN_COLORS && level.board.cols * level.board.rows >= 64) {
    warn(
      'COLORS_COUNT',
      `3 色 + ${level.board.cols}×${level.board.rows} 大盘：连锁会非常频繁，建议确认这是有意为之`,
      'colors',
    );
  }
}

/** 抛错版本，供 npm test / 启动时使用——不静默失败 */
export function assertValidLevel(level: LevelConfig): void {
  const result = validateLevelConfig(level);
  if (!result.ok) {
    const detail = result.errors.map((e) => `[${e.code}] ${e.message}`).join('\n  ');
    throw new Error(`关卡 ${level.id} 校验未通过：\n  ${detail}`);
  }
}
