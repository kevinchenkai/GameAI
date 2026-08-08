/**
 * core/resolver.ts —— 结算引擎（M1：Swap / Match / Clear / Fall / Spawn / Cascade）
 *
 * ★ 全项目最核心的文件。一次 applyMove 算**完整一整段结算**（含所有连锁），
 *   产出 CoreGameEvent[]。渲染 / 宠物 / 音频三层消费同一份序列，
 *   不得各自维护棋盘状态（框架 §2.3）。
 *
 * ★ 纯函数：不修改传入的 session，返回新 session + 事件序列。
 *   这让「撤销」「AI 试算」「关卡模拟器」全部免费获得（框架 §5.1）。
 *
 * ★ 事件顺序的硬约束（冻结契约 2 / 7）：
 *     ... → settled → movesChanged → (levelWin | levelLose)? → turnResolved
 *   `settled` 只表示棋盘物理稳定；`turnResolved` 才是"目标 + 胜负都算完"。
 *   宠物只消费 turnResolved，且输入不由这两者中的任何一个解锁。
 *
 * ⚠️ M1 未实现（M2 接入，接入点已用 TODO 标出）：
 *   特殊棋子生成与触发、障碍受损、目标结算与胜负判定。
 */

import { cellAt, isAdjacent, isPlayable, swapPieces, withCells } from './board';
import { generateRefill, shuffleBoard, type GeneratorOptions, type PieceIdSource } from './generator';
import { findAllMatches, hasAnyValidMove } from './matcher';
import { restoreGenerators, type SessionState } from './session';
import type { Rng } from './rng';
import type { BoardState, Cell, CoreGameEvent, CoreTurnSummary, Move, Piece, Pos } from './types';

export interface ResolveResult {
  readonly session: SessionState;
  readonly events: readonly CoreGameEvent[];
}

/** 一次结算过程中的可变上下文——只在函数内部存活，不泄漏到外面 */
interface ResolveCtx {
  board: BoardState;
  readonly events: CoreGameEvent[];
  readonly rng: Rng;
  readonly ids: PieceIdSource;
  readonly options: GeneratorOptions;
  maxCascade: number;
  totalCleared: number;
}

/** 防御性上限：正常连锁远达不到，用于挡住潜在的死循环 */
const MAX_CASCADE_LEVELS = 50;

// ————————————————————————————————————————————————
// 重力与补充
// ————————————————————————————————————————————————

/**
 * 让棋子下落填补空格，返回移动记录。
 *
 * ★ blocked 格（洞）**阻断下落** —— 棋子不会穿过洞。
 *   这让非矩形棋盘的行为符合直觉：洞下面的空格由洞下方的棋子填，
 *   洞上面的棋子停在洞上。
 */
function applyGravity(board: BoardState): {
  board: BoardState;
  moves: { id: number; from: Pos; to: Pos }[];
} {
  const moves: { id: number; from: Pos; to: Pos }[] = [];
  const updates: { pos: Pos; cell: Cell }[] = [];

  for (let col = 0; col < board.cols; col++) {
    // 自下而上扫描；写指针 wr 指向"最低的可填空位"
    let wr = board.rows - 1;
    for (let row = board.rows - 1; row >= 0; row--) {
      const cell = cellAt(board, { col, row }) as Cell;
      if (cell.blocked) {
        // 洞阻断：洞以上的棋子不能落到洞以下
        wr = row - 1;
        continue;
      }
      if (!cell.piece) continue;
      if (wr !== row) {
        const from = { col, row };
        const to = { col, row: wr };
        moves.push({ id: cell.piece.id, from, to });
        const target = cellAt(board, to) as Cell;
        updates.push({ pos: to, cell: { ...target, piece: cell.piece } });
        updates.push({ pos: from, cell: { ...cell, piece: null } });
      }
      wr--;
    }
  }

  // 同格既被写入又被清空时，"落入"必须后生效，否则棋子会丢
  const merged = new Map<string, { pos: Pos; cell: Cell }>();
  for (const u of updates) {
    const k = `${u.pos.col},${u.pos.row}`;
    const prev = merged.get(k);
    if (prev && u.cell.piece === null && prev.cell.piece !== null) continue;
    merged.set(k, u);
  }
  return { board: withCells(board, [...merged.values()]), moves };
}

/** 找出所有需要补充新棋子的空格（可放棋子但当前为空） */
function findEmptyPositions(board: BoardState): Pos[] {
  const out: Pos[] = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const pos = { col, row };
      const cell = cellAt(board, pos) as Cell;
      if (!cell.blocked && !cell.piece) out.push(pos);
    }
  }
  return out;
}

// ————————————————————————————————————————————————
// 连锁循环
// ————————————————————————————————————————————————

/**
 * 反复「匹配 → 消除 → 下落 → 补充」直到棋盘稳定。
 *
 * @param preferredOrigin 玩家操作的格子，只影响特殊棋子生成位置的选取
 */
function runCascades(ctx: ResolveCtx, preferredOrigin: readonly Pos[]): void {
  for (let level = 0; level < MAX_CASCADE_LEVELS; level++) {
    // 第 0 层用玩家操作位；后续层是自然掉落形成的，没有"玩家操作位"
    const matches = findAllMatches(ctx.board, level === 0 ? preferredOrigin : []);
    if (matches.length === 0) return;

    ctx.events.push({ t: 'cascadeStart', level });
    ctx.maxCascade = Math.max(ctx.maxCascade, level);

    for (const group of matches) {
      ctx.events.push({
        t: 'match',
        positions: group.positions,
        color: group.color,
        cascadeLevel: level,
      });
    }

    // TODO(M2)：specialSpawn —— 按 group.shape 生成特殊棋子于 group.origin
    // TODO(M2)：specialFire —— 触发被消除的特殊棋子（可递归）
    // TODO(M2)：obstacleHit / obstacleClear —— damageObstacles(board, cleared)
    // TODO(M2)：collect —— 目标进度累计

    // 消除：去重（T/L 型的拐点会出现在两个 group 里）
    const cleared = new Map<string, Pos>();
    for (const group of matches) {
      for (const p of group.positions) cleared.set(`${p.col},${p.row}`, p);
    }
    ctx.totalCleared += cleared.size;
    ctx.board = withCells(
      ctx.board,
      [...cleared.values()].map((pos) => ({
        pos,
        cell: { ...(cellAt(ctx.board, pos) as Cell), piece: null },
      })),
    );

    const fell = applyGravity(ctx.board);
    ctx.board = fell.board;
    if (fell.moves.length > 0) ctx.events.push({ t: 'fall', moves: fell.moves });

    const empties = findEmptyPositions(ctx.board);
    if (empties.length > 0) {
      const items = generateRefill(empties, ctx.rng, ctx.options, ctx.ids);
      ctx.board = withCells(
        ctx.board,
        items.map(({ piece, at }) => ({
          pos: at,
          cell: { ...(cellAt(ctx.board, at) as Cell), piece },
        })),
      );
      ctx.events.push({ t: 'spawn', items });
    }

    ctx.events.push({ t: 'cascadeEnd', level });
  }

  throw new Error(
    `resolver: 连锁层数超过 ${MAX_CASCADE_LEVELS}，疑似死循环。` +
      '这几乎一定是 matcher 或 generator 的 bug，请带种子复现。',
  );
}

// ————————————————————————————————————————————————
// 收尾：死局 → settled → 胜负 → turnResolved
// ————————————————————————————————————————————————

/**
 * ★ 事件顺序在这里定死，不要改动（冻结契约 2）。
 *   settled 之后还有目标结算与胜负判定，宠物只能在 turnResolved 才做决定，
 *   否则会出现「已经赢了，宠物还在放技能」。
 */
function finishTurn(ctx: ResolveCtx, session: SessionState, movesLeft: number): ResolveResult {
  // 5. 死局检测与 Shuffle（框架 §5.4）——必须自动，不弹窗问玩家
  if (!hasAnyValidMove(ctx.board)) {
    const shuffled = shuffleBoard(ctx.board, ctx.rng);
    if (shuffled !== ctx.board) {
      ctx.board = shuffled;
      ctx.events.push({ t: 'shuffle', reason: 'deadlock' });
    }
  }

  // 6. settled —— 棋盘物理稳定。★ 不解锁输入（冻结契约 7）
  ctx.events.push({
    t: 'settled',
    maxCascade: ctx.maxCascade,
    totalCleared: ctx.totalCleared,
  });

  ctx.events.push({ t: 'movesChanged', left: movesLeft });

  // 7~8. TODO(M2)：目标结算 → 胜负判定 → levelWin / levelLose
  const result: CoreTurnSummary['result'] = 'continue';

  // 9. turnResolved —— ★ 宠物唯一的决策入口
  const summary: CoreTurnSummary = {
    maxCascade: ctx.maxCascade,
    totalCleared: ctx.totalCleared,
    specialCreated: [], // TODO(M2)
    result,
  };
  ctx.events.push({ t: 'turnResolved', summary });

  return {
    session: {
      ...session,
      board: ctx.board,
      movesLeft,
      result,
      rngState: ctx.rng.getState(),
      nextPieceId: ctx.ids.next(),
      turnCount: session.turnCount + 1,
    },
    events: ctx.events,
  };
}

function createCtx(session: SessionState): ResolveCtx {
  const { rng, ids } = restoreGenerators(session);
  return {
    board: session.board,
    events: [],
    rng,
    ids,
    options: { colors: session.level.colors },
    maxCascade: 0,
    totalCleared: 0,
  };
}

// ————————————————————————————————————————————————
// 对外入口
// ————————————————————————————————————————————————

/**
 * 玩家的一次交换。
 * ★ 无效交换产出 [swap, swapBack]，**不扣步**、也不产出 turnResolved
 *   （没有回合发生，所以宠物不该有反应）。
 */
export function applyMove(session: SessionState, move: Move): ResolveResult {
  const { a, b } = move;

  const legal =
    session.result === 'continue' &&
    session.movesLeft > 0 &&
    isAdjacent(a, b) &&
    isPlayable(session.board, a) &&
    isPlayable(session.board, b) &&
    !!cellAt(session.board, a)?.piece &&
    !!cellAt(session.board, b)?.piece;

  if (!legal) {
    // 连相邻/有棋子都不满足时，连 swap 动画都不该播
    return { session, events: [] };
  }

  const ctx = createCtx(session);
  ctx.board = swapPieces(ctx.board, a, b);
  ctx.events.push({ t: 'swap', a, b });

  // TODO(M2)：特殊棋子组合（comboAffectedArea）在此判定 —— 组合交换即使不成 3 连也合法
  if (findAllMatches(ctx.board).length === 0) {
    // 无效交换：弹回，不扣步，不产出 turnResolved
    return {
      session,
      events: [...ctx.events, { t: 'swapBack', a, b }],
    };
  }

  runCascades(ctx, [a, b]);
  return finishTurn(ctx, session, session.movesLeft - 1);
}

/**
 * 结算一次棋盘变更引发的全部连锁，直到稳定。
 * ★ applyMove 与 applyPetAction 共用此函数——这是「宠物技能引发的连锁、
 *   障碍破坏、目标收集自动全部正确」的原因（框架 §4.3.2）。
 *   **不扣步**（宠物技能不消耗玩家步数）。
 */
export function resolveCascades(session: SessionState): ResolveResult {
  const ctx = createCtx(session);
  runCascades(ctx, []);
  return finishTurn(ctx, session, session.movesLeft);
}

/**
 * 死局检测 + Shuffle（§5.4）。
 * 独立入口，供进关时校验使用；回合内的死局由 finishTurn 自动处理。
 */
export function shuffleIfDeadlocked(session: SessionState): ResolveResult {
  if (hasAnyValidMove(session.board)) return { session, events: [] };

  const ctx = createCtx(session);
  const shuffled = shuffleBoard(ctx.board, ctx.rng);
  if (shuffled === ctx.board) return { session, events: [] };

  return {
    session: { ...session, board: shuffled, rngState: ctx.rng.getState() },
    events: [{ t: 'shuffle', reason: 'deadlock' }],
  };
}

/** 供测试与工具读取棋子，避免直接依赖 cells 布局 */
export function pieceIdsOf(board: BoardState): readonly (Piece | null)[] {
  return board.cells.map((c) => c.piece);
}
