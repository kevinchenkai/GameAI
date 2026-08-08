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

import { cellAt, isAdjacent, isSwappable, swapPieces, withCells } from './board';
import {
  generateRefillAvoidingDeadlock,
  shuffleBoard,
  type GeneratorOptions,
  type PieceIdSource,
} from './generator';
import { findAllMatches, hasAnyValidMove } from './matcher';
import { damageObstacles } from './obstacles';
import {
  accumulateProgress,
  computeRating,
  isAllComplete,
  remainingCounts,
} from './objective';
import { restoreGenerators, type SessionState } from './session';
import { comboAffectedArea, specialAffectedArea, specialFromMatch } from './special';
import type { Rng } from './rng';
import type {
  BoardState,
  Cell,
  CoreGameEvent,
  CoreTurnSummary,
  Move,
  Piece,
  Pos,
  SpecialKind,
} from './types';

const keyOf = (p: Pos): string => `${p.col},${p.row}`;

/**
 * ★ Stage 0 冻结范围：不做彩虹球（框架 §12）。
 *   5 连仍然识别得出来，只是不生成彩虹球棋子。
 *   V1 Full 把这个常量改成 true 即可启用，组合表已在 special.ts 定死。
 */
const ENABLE_RAINBOW = false;

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
  readonly specialCreated: SpecialKind[];
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

/**
 * 清除这些格子上的棋子。
 *
 * ★ **仍有血的障碍会挡住清除** —— 这就是"冰需要 N 次消除才破"的实现：
 *   第 1 次消除把冰打掉一层，棋子**留在原地**（玩家看到冰变薄了）；
 *   等冰的血空了、障碍消失，下一次消除才真正清走棋子。
 *
 *   ⚠️ 调用顺序有讲究：必须在 `damageObstacles` **之后**调用，
 *   这样"这一轮刚好被打空的冰"已经从格子上移除，其下棋子会被正常清走。
 */
function clearPieces(board: BoardState, positions: readonly Pos[]): BoardState {
  const updates: { pos: Pos; cell: Cell }[] = [];
  for (const pos of positions) {
    const cell = cellAt(board, pos);
    if (!cell || !cell.piece) continue;
    if (cell.obstacle) continue; // 障碍还在（血没空）→ 这一轮护住棋子
    updates.push({ pos, cell: { ...cell, piece: null } });
  }
  return withCells(board, updates);
}

// ————————————————————————————————————————————————
// 特殊棋子触发
// ————————————————————————————————————————————————

/**
 * 引爆消除集合中的特殊棋子，返回被波及的额外格子。
 *
 * ★ 连锁引爆：火箭清出的一行里若还有炸弹，炸弹也要爆。
 *   用 `visited` 集合防止 A 引爆 B、B 又引爆 A 的无限循环 ——
 *   **每个特殊棋子一次结算内最多引爆一次**。
 *
 * ★ 产出 specialFire 事件，渲染层据此播放爆炸动画。
 */
function fireSpecials(ctx: ResolveCtx, initial: ReadonlyMap<string, Pos>): Pos[] {
  const visited = new Set<string>();
  const extra = new Map<string, Pos>();
  const queue: Pos[] = [...initial.values()];

  while (queue.length > 0) {
    const pos = queue.shift() as Pos;
    const k = keyOf(pos);
    if (visited.has(k)) continue;

    const piece = cellAt(ctx.board, pos)?.piece;
    if (!piece || piece.special === 'none') continue;
    visited.add(k);

    const affected = specialAffectedArea(ctx.board, pos, piece.special);
    ctx.events.push({ t: 'specialFire', pos, kind: piece.special, affected });

    for (const p of affected) {
      const pk = keyOf(p);
      if (!initial.has(pk)) extra.set(pk, p);
      // 波及到的格子若也是特殊棋子，入队等待引爆
      if (!visited.has(pk) && cellAt(ctx.board, p)?.piece?.special !== 'none') {
        queue.push(p);
      }
    }
  }
  return [...extra.values()];
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

    // ——— 消除集合：去重（T/L 型的拐点会出现在两个 group 里）———
    const cleared = new Map<string, Pos>();
    for (const group of matches) {
      for (const p of group.positions) cleared.set(keyOf(p), p);
    }

    // ——— 特殊棋子生成 ★ 必须在消除**之前**决定，之后那些棋子就没了 ———
    // 生成位置从消除集合里**移除**：新生成的特殊棋子留在盘上，不被一起消掉。
    const spawnedSpecials: { pos: Pos; kind: SpecialKind }[] = [];
    for (const group of matches) {
      const kind = specialFromMatch(group);
      if (kind === 'none') continue;
      if (kind === 'rainbow' && !ENABLE_RAINBOW) continue; // Stage 0 冻结范围
      spawnedSpecials.push({ pos: group.origin, kind });
      cleared.delete(keyOf(group.origin));
      ctx.specialCreated.push(kind);
    }

    // ——— 特殊棋子触发：被消除的格子里若有特殊棋子，逐个引爆（可连锁引爆）———
    const fired = fireSpecials(ctx, cleared);

    // 引爆波及的格子也计入消除
    for (const p of fired) cleared.set(keyOf(p), p);
    // 但已生成的新特殊棋子仍然保留（不被自己那一轮的爆炸清掉）
    for (const s of spawnedSpecials) cleared.delete(keyOf(s.pos));

    ctx.totalCleared += cleared.size;

    // ——— 障碍受损（★ 在消除生效前算，需要知道哪些格被消除）———
    const dmg = damageObstacles(ctx.board, [...cleared.values()]);
    ctx.board = dmg.board;
    ctx.events.push(...dmg.events);

    // ——— 真正清除棋子 ———
    ctx.board = clearPieces(ctx.board, [...cleared.values()]);

    // ——— 写入新生成的特殊棋子 ———
    for (const s of spawnedSpecials) {
      const cell = cellAt(ctx.board, s.pos) as Cell;
      const base = cell.piece;
      if (!base) continue;
      ctx.board = withCells(ctx.board, [
        { pos: s.pos, cell: { ...cell, piece: { ...base, special: s.kind } } },
      ]);
      ctx.events.push({ t: 'specialSpawn', pos: s.pos, kind: s.kind });
    }

    const fell = applyGravity(ctx.board);
    ctx.board = fell.board;
    if (fell.moves.length > 0) ctx.events.push({ t: 'fall', moves: fell.moves });

    const empties = findEmptyPositions(ctx.board);
    if (empties.length > 0) {
      /**
       * ★ 用**避免制造死局**的版本填充（见 generator.ts）。
       *   盲填会让整盘凑不出可交换对，于是回合末触发 shuffle ——
       *   玩家看到"棋盘自己动了一下"。这里提前把那一掷换掉。
       *   重掷只换颜色不换位置，不影响掉落动画，也不改变难度分布。
       */
      const items = generateRefillAvoidingDeadlock(
        ctx.board,
        empties,
        ctx.rng,
        ctx.options,
        ctx.ids,
      );
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

  // 7. 目标结算 —— 只认事件，不看棋盘（事件序列是唯一真相源）
  const progress = accumulateProgress(session.level, session.progress, ctx.events);

  // 8. 胜负判定
  //    ★ 顺序很重要：先判赢再判输。步数用尽的同一回合里若目标也完成了，
  //      那应该算赢 —— 玩家用最后一步达成目标是最爽的时刻，不能判他输。
  let result: CoreTurnSummary['result'] = 'continue';
  if (isAllComplete(session.level, progress)) {
    result = 'win';
    ctx.events.push({
      t: 'levelWin',
      rating: computeRating(session.level, movesLeft),
      movesLeft,
    });
  } else if (movesLeft <= 0) {
    result = 'lose';
    ctx.events.push({
      t: 'levelLose',
      remaining: remainingCounts(session.level, progress),
    });
  }

  // 9. turnResolved —— ★ 宠物唯一的决策入口
  const summary: CoreTurnSummary = {
    maxCascade: ctx.maxCascade,
    totalCleared: ctx.totalCleared,
    specialCreated: ctx.specialCreated,
    result,
  };
  ctx.events.push({ t: 'turnResolved', summary });

  return {
    session: {
      ...session,
      board: ctx.board,
      movesLeft,
      progress,
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
    specialCreated: [],
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

  // ★ isSwappable 比 isPlayable 严：被冰锁住的棋子不能交换
  const legal =
    session.result === 'continue' &&
    session.movesLeft > 0 &&
    isAdjacent(a, b) &&
    isSwappable(session.board, a) &&
    isSwappable(session.board, b);

  if (!legal) {
    // 连相邻/可交换都不满足时，连 swap 动画都不该播
    return { session, events: [] };
  }

  // ★ 组合判定在交换**之前** —— comboAffectedArea 要读两格各自的
  //   special 类型，交换后 a/b 上的棋子就对调了，语义会拧。
  const combo = comboAffectedArea(session.board, a, b);

  const ctx = createCtx(session);
  ctx.board = swapPieces(ctx.board, a, b);
  ctx.events.push({ t: 'swap', a, b });

  if (combo) {
    // ★ 特殊棋子组合：即使不成 3 连也是合法操作，直接引爆。
    //   这是「彩虹 + 火箭」这类全场最爽时刻的入口（框架 §5.3）。
    ctx.events.push({ t: 'comboBlast', kinds: combo.kinds, affected: combo.affected });
    applyComboBlast(ctx, combo.affected, [a, b]);
    runCascades(ctx, []);
    return finishTurn(ctx, session, session.movesLeft - 1);
  }

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
 * 执行组合爆炸：清除受影响区域，结算障碍，然后下落补充。
 * 之后交给 runCascades 处理后续连锁。
 */
function applyComboBlast(ctx: ResolveCtx, affected: readonly Pos[], origin: readonly Pos[]): void {
  const cleared = new Map<string, Pos>();
  for (const p of affected) cleared.set(keyOf(p), p);
  // 组合的两个棋子自身也消失
  for (const p of origin) cleared.set(keyOf(p), p);

  // 波及范围里的其它特殊棋子照样引爆
  for (const p of fireSpecials(ctx, cleared)) cleared.set(keyOf(p), p);

  ctx.totalCleared += cleared.size;

  const dmg = damageObstacles(ctx.board, [...cleared.values()]);
  ctx.board = dmg.board;
  ctx.events.push(...dmg.events);

  ctx.board = clearPieces(ctx.board, [...cleared.values()]);

  const fell = applyGravity(ctx.board);
  ctx.board = fell.board;
  if (fell.moves.length > 0) ctx.events.push({ t: 'fall', moves: fell.moves });

  const empties = findEmptyPositions(ctx.board);
  if (empties.length > 0) {
    // ★ 与 runCascades 中的补充走同一条路（避免制造死局）
    const items = generateRefillAvoidingDeadlock(
      ctx.board,
      empties,
      ctx.rng,
      ctx.options,
      ctx.ids,
    );
    ctx.board = withCells(
      ctx.board,
      items.map(({ piece, at }) => ({
        pos: at,
        cell: { ...(cellAt(ctx.board, at) as Cell), piece },
      })),
    );
    ctx.events.push({ t: 'spawn', items });
  }
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
