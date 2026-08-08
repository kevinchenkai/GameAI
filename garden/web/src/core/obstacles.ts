/**
 * core/obstacles.ts —— 障碍行为
 *
 * 四种障碍抽象成同一个「hp + 受伤条件」模型（框架 §4.2），
 * 差异只在受伤条件：
 *   ice    本格消除
 *   grass  本格消除（一次清）
 *   crate  邻接消除或爆炸
 *   flower 邻接消除（hp 归零 = 开花完成，可被收集）
 *
 * 好处：新增障碍 = 加一条配置 + 一个受伤条件，**不改结算逻辑**。
 * Stage 0 只启用 ice。
 */

import { cellAt, inBounds, withCells } from './board';
import type { BoardState, Cell, CoreGameEvent, ObstacleKind, Pos } from './types';

export type DamageTrigger = 'sameCell' | 'adjacent';

/** 各障碍的受伤条件——这张表是「统一模型」的全部内容 */
export const OBSTACLE_TRIGGER: Readonly<Record<ObstacleKind, DamageTrigger>> = {
  ice: 'sameCell',
  grass: 'sameCell',
  crate: 'adjacent',
  flower: 'adjacent',
};

/**
 * 一次受伤扣多少 hp。
 * `grass` 是「一次清」，所以扣满；其余每次扣 1。
 */
const DAMAGE_PER_HIT: Readonly<Record<ObstacleKind, number>> = {
  ice: 1,
  grass: Number.MAX_SAFE_INTEGER,
  crate: 1,
  flower: 1,
};

/**
 * ★ 障碍是否封锁其下的棋子（不可匹配、不可交换）。
 *   实现在 types.ts —— board 与 matcher 都要用它，
 *   定义在那里可以避免 board ↔ obstacles 的循环依赖。
 *   这里重导出，让"障碍相关的东西在 obstacles.ts"这个直觉仍然成立。
 */
export { locksPieceBeneath } from './types';

const keyOf = (p: Pos): string => `${p.col},${p.row}`;

/** 正交四邻 */
function neighbors(pos: Pos): Pos[] {
  return [
    { col: pos.col - 1, row: pos.row },
    { col: pos.col + 1, row: pos.row },
    { col: pos.col, row: pos.row - 1 },
    { col: pos.col, row: pos.row + 1 },
  ];
}

/**
 * 对一次消除结算所有受影响的障碍。
 * 产出 obstacleHit / obstacleClear 事件。
 *
 * @param clearedPositions 本次被消除的格子
 */
export function damageObstacles(
  board: BoardState,
  clearedPositions: readonly Pos[],
): { readonly board: BoardState; readonly events: readonly CoreGameEvent[] } {
  if (clearedPositions.length === 0) return { board, events: [] };

  const clearedSet = new Set(clearedPositions.map(keyOf));

  // 邻接型障碍：统计每个位置被多少个"消除格"波及。
  // ★ 一次结算内同一障碍只扣一次血，否则一个大爆炸能瞬秒所有木箱 ——
  //   那会让障碍形同虚设。
  const adjacentHits = new Set<string>();
  for (const p of clearedPositions) {
    for (const n of neighbors(p)) {
      if (inBounds(board, n) && !clearedSet.has(keyOf(n))) adjacentHits.add(keyOf(n));
    }
  }

  const events: CoreGameEvent[] = [];
  const updates: { pos: Pos; cell: Cell }[] = [];

  const visit = (pos: Pos, trigger: DamageTrigger): void => {
    const cell = cellAt(board, pos);
    const ob = cell?.obstacle;
    if (!cell || !ob) return;
    if (OBSTACLE_TRIGGER[ob.kind] !== trigger) return;

    const hpLeft = Math.max(0, ob.hp - DAMAGE_PER_HIT[ob.kind]);
    if (hpLeft > 0) {
      events.push({ t: 'obstacleHit', pos, kind: ob.kind, hpLeft });
      updates.push({ pos, cell: { ...cell, obstacle: { ...ob, hp: hpLeft } } });
    } else {
      events.push({ t: 'obstacleClear', pos, kind: ob.kind });
      updates.push({ pos, cell: { ...cell, obstacle: null } });
    }
  };

  // 本格型：被消除的格子上的障碍
  for (const p of clearedPositions) visit(p, 'sameCell');

  // 邻接型：与被消除格相邻的格子上的障碍
  for (const k of adjacentHits) {
    const [col, row] = k.split(',').map(Number);
    visit({ col: col as number, row: row as number }, 'adjacent');
  }

  return { board: withCells(board, updates), events };
}

/**
 * 统计盘上某种障碍的剩余数量 —— 目标判定与关卡校验用。
 */
export function countObstacles(board: BoardState, kind: ObstacleKind): number {
  let n = 0;
  for (const cell of board.cells) {
    if (cell.obstacle?.kind === kind) n++;
  }
  return n;
}
