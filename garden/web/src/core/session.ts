/**
 * core/session.ts —— 单局状态机
 *
 * SessionState 是 core 层的**完整可序列化状态**：给定 seed + level + move 序列，
 * 能完全复现一局。这是回放（M3）与关卡模拟器的基础。
 *
 * ★ 「完整」的含义很严格：任何影响后续结果的东西都必须在这里，
 *   包括 RNG 状态和**下一个棋子 id**。漏掉任何一个，复现就会在
 *   某一步之后悄悄分叉——那种 bug 极难查。
 */

import { cellAt, withCells } from './board';
import { createIdSource, generateInitialBoard, type PieceIdSource } from './generator';
import { createRng, type Rng } from './rng';
import type { BoardState, LevelConfig } from './types';
import type { ObjectiveProgress } from './objective';

export interface SessionState {
  readonly level: LevelConfig;
  readonly board: BoardState;
  readonly movesLeft: number;
  readonly progress: ObjectiveProgress;
  readonly result: 'continue' | 'win' | 'lose';
  /** RNG 内部状态——存档与复现靠它，见 core/rng.ts */
  readonly rngState: number;
  /** ★ 下一个棋子 id。复现依赖它，不能只存 RNG */
  readonly nextPieceId: number;
  /** 已完成回合数，用于统计与模拟器报告 */
  readonly turnCount: number;
}

export function createSession(level: LevelConfig, seed: number): SessionState {
  const rng = createRng(seed);
  const ids = createIdSource(1);
  const generated = generateInitialBoard(level, rng, { colors: level.colors }, ids);

  // ★ 把关卡配置里的障碍放到棋盘上。
  //   ⚠️ 这一步曾经漏掉，后果是**破障目标永远无法完成** ——
  //     配置里写了冰，盘上却一块都没有。类型检查全过，测试也全过
  //     （因为当时的测试都是手工构造棋盘的），是模拟器跑出 0% 通过率
  //     才暴露的。这正是「先做模拟器再写关卡」的价值。
  const board = withObstacles(generated, level);

  return {
    level,
    board,
    movesLeft: level.moves,
    progress: {},
    result: 'continue',
    rngState: rng.getState(),
    nextPieceId: ids.next(), // 取走一个作为下次起点（该值尚未被使用）
    turnCount: 0,
  };
}

/**
 * 按关卡配置在棋盘上放置障碍。
 * 非法位置（越界 / 放在洞上）在此静默跳过 —— 那些情况由
 * validateLevelConfig 负责报错，这里不重复判断，也不应该崩。
 */
function withObstacles(board: BoardState, level: LevelConfig): BoardState {
  const updates = [];
  for (const o of level.obstacles ?? []) {
    const cell = cellAt(board, o.pos);
    if (!cell || cell.blocked) continue;
    updates.push({
      pos: o.pos,
      cell: { ...cell, obstacle: { kind: o.kind, hp: o.hp, maxHp: o.hp } },
    });
  }
  return withCells(board, updates);
}

/**
 * 从 session 恢复 RNG 与 id 源，供 resolver 在一次结算内使用。
 * 结算结束后必须把两者的最新状态写回 session（见 resolver.finishTurn）。
 *
 * ★ 这里顺手校验 `nextPieceId` 没有落后于盘上已用的最大 id。
 *   落后会让新棋子**重发已在盘上的 id** —— 渲染层靠 id 追踪精灵，
 *   撞 id 会让两个精灵抢同一个逻辑棋子，表现为"棋子鬼畜地闪来闪去"。
 *   这类 bug 在画面上极难定位，所以在数据层就拦掉。
 */
export function restoreGenerators(session: SessionState): { rng: Rng; ids: PieceIdSource } {
  assertPieceIdConsistent(session);
  return {
    rng: createRng(session.rngState),
    ids: createIdSource(session.nextPieceId),
  };
}

/**
 * 校验 nextPieceId 与棋盘一致。
 * 遍历一遍 64 格的成本可以忽略，且它挡住的是一类**画面上极难定位**的 bug，
 * 所以不做「仅开发期」的条件编译——`core/` 也不该依赖 process.env
 * （那是 Node 全局，浏览器里不存在，违反零依赖契约）。
 */
export function assertPieceIdConsistent(session: SessionState): void {
  let maxId = 0;
  for (const cell of session.board.cells) {
    if (cell.piece && cell.piece.id > maxId) maxId = cell.piece.id;
  }
  if (session.nextPieceId <= maxId) {
    throw new Error(
      `session.nextPieceId (${session.nextPieceId}) 不大于盘上最大 id (${maxId})，` +
        '新棋子会与现有棋子撞 id。通常是手工构造 session 时忘了同步该字段。',
    );
  }
}

/** 序列化 / 反序列化——回放与存档中途续局用 */
export function serializeSession(session: SessionState): string {
  return JSON.stringify(session);
}

export function deserializeSession(json: string): SessionState {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('deserializeSession: 不是合法的 JSON 对象');
  }
  const s = parsed as Partial<SessionState>;
  // 只校验复现所必需的字段——缺任何一个，复现都会静默分叉
  for (const key of ['level', 'board', 'rngState', 'nextPieceId'] as const) {
    if (s[key] === undefined) {
      throw new Error(`deserializeSession: 缺少必需字段 ${key}`);
    }
  }
  return s as SessionState;
}

/** 供测试与工具构造中间状态，不改变任何既有字段 */
export function withBoard(session: SessionState, board: BoardState): SessionState {
  return { ...session, board };
}
