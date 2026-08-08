/**
 * core/special.ts —— 特殊棋子生成与组合（M0 骨架，实现见 M2）
 *
 * Stage 0 只做 rocketH / rocketV / bomb，**不做彩虹球**（冻结范围）。
 * 但组合表提前定死，避免 V1 Full 返工。
 */

import type { BoardState, Pos, SpecialKind } from './types';
import type { MatchGroup } from './matcher';
import { notImplemented } from './notImplemented';

/** 由匹配形状决定生成什么特殊棋子（§5.2） */
export function specialFromMatch(_group: MatchGroup): SpecialKind {
  return notImplemented('specialFromMatch', 'M2');
}

/** 单个特殊棋子的影响范围 */
export function specialAffectedArea(
  _board: BoardState,
  _pos: Pos,
  _kind: SpecialKind,
): readonly Pos[] {
  return notImplemented('specialAffectedArea', 'M2');
}

/**
 * 两个特殊棋子交换时的组合效果（§5.3，共 7 种）。
 * 返回 null 表示不构成组合，按普通交换处理。
 */
export function comboAffectedArea(
  _board: BoardState,
  _a: Pos,
  _b: Pos,
): { readonly kinds: readonly [SpecialKind, SpecialKind]; readonly affected: readonly Pos[] } | null {
  return notImplemented('comboAffectedArea', 'M2');
}
