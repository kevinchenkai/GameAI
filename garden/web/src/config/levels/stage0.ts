/**
 * config/levels/stage0.ts —— Stage 0 的 8 关
 *
 * ★ 关卡是**纯数据**。加一关 = 加一个条目，零代码改动。
 *
 * ★ 难度曲线的第一手段是**减颜色数**，不是减步数（框架 §4.4）。
 *   模拟器实测（关卡 1、目标 collect red 20）证实了这一点：
 *
 *   | 颜色 | 20 步 | 14 步 | 10 步 | 8 步 |
 *   |------|-------|-------|-------|------|
 *   | 4 色 | 100%  | 100%  | 100%  | 100% |
 *   | 5 色 | 100%  |  98%  |  90%  |  78% |
 *   | 6 色 |  93%  |  55%  |  30%  |  12% |
 *
 *   **4 色无论多少步都是 100%** —— 靠减步数根本调不动难度。
 *   所以曲线是 4 色 ×2 → 5 色 ×3 → 6 色 ×3。
 *
 * ★ 下面每关的数值都经模拟器 150 局验证，通过率标在注释里：
 *     npm run simulate -- --all --runs 200
 *   目标区间 55%~85%（见 core/simulate.ts）。低压力定位下前几关刻意偏高。
 */

import type { LevelConfig } from '../../core/types';

/** 前 2 关：4 色 —— 教会玩家「交换 → 消除」，刻意零挫败 */
const EASY_COLORS = ['red', 'yellow', 'green', 'blue'] as const;
/** 第 3~5 关：5 色 */
const MID_COLORS = ['red', 'yellow', 'green', 'blue', 'orange'] as const;
/** 第 6~8 关：6 色（全色） */
const FULL_COLORS = ['red', 'yellow', 'green', 'blue', 'orange', 'purple'] as const;

export const STAGE0_LEVELS: readonly LevelConfig[] = [
  {
    // 通过率 100% —— 新手关，刻意做成不可能失败
    id: 1,
    board: { cols: 8, rows: 8 },
    moves: 16,
    colors: [...EASY_COLORS],
    objectives: [{ kind: 'collect', piece: 'red', count: 25 }],
    stars: { two: 4, three: 7 },
    tutorial: [{ id: 'swap', text: '滑动相邻的两个水果，让三个一样的连成一条线' }],
  },
  {
    // 通过率 100%
    id: 2,
    board: { cols: 8, rows: 8 },
    moves: 16,
    colors: [...EASY_COLORS],
    objectives: [{ kind: 'collect', piece: 'yellow', count: 30 }],
    stars: { two: 4, three: 7 },
  },
  {
    // ★ 升到 5 色 —— 难度的真正来源。通过率 100%、3★ 75%
    id: 3,
    board: { cols: 8, rows: 8 },
    moves: 18,
    colors: [...MID_COLORS],
    objectives: [
      { kind: 'collect', piece: 'red', count: 22 },
      { kind: 'collect', piece: 'green', count: 22 },
    ],
    stars: { two: 4, three: 8 },
  },
  {
    // 首次出现冰：全部 1hp，且放在中间容易够到的位置。通过率 100%
    id: 4,
    board: { cols: 8, rows: 8 },
    moves: 18,
    colors: [...MID_COLORS],
    objectives: [{ kind: 'clearObstacle', obstacle: 'ice', count: 6 }],
    obstacles: [
      { pos: { col: 2, row: 2 }, kind: 'ice', hp: 1 },
      { pos: { col: 5, row: 2 }, kind: 'ice', hp: 1 },
      { pos: { col: 2, row: 5 }, kind: 'ice', hp: 1 },
      { pos: { col: 5, row: 5 }, kind: 'ice', hp: 1 },
      { pos: { col: 3, row: 3 }, kind: 'ice', hp: 1 },
      { pos: { col: 4, row: 4 }, kind: 'ice', hp: 1 },
    ],
    stars: { two: 4, three: 8 },
    tutorial: [
      {
        id: 'ice',
        text: '冰块盖住的水果照样能消，消掉它就能敲碎冰块',
        highlight: [{ col: 3, row: 3 }],
      },
    ],
  },
  {
    // 首次挖洞（只挖四角，不碰中央）。通过率 98%、星级已拉开
    id: 5,
    board: {
      cols: 8,
      rows: 8,
      blocked: [
        { col: 0, row: 0 },
        { col: 7, row: 0 },
        { col: 0, row: 7 },
        { col: 7, row: 7 },
      ],
    },
    moves: 18,
    colors: [...MID_COLORS],
    objectives: [{ kind: 'collect', piece: 'blue', count: 35 }],
    stars: { two: 4, three: 8 },
  },
  {
    // ★ 升到 6 色 —— 通过率 73%、3★ 14%（难度真正开始）
    id: 6,
    board: { cols: 8, rows: 8 },
    moves: 22,
    colors: [...FULL_COLORS],
    objectives: [{ kind: 'collect', piece: 'orange', count: 28 }],
    stars: { two: 5, three: 10 },
  },
  {
    // 6 色 + 冰（含 2hp）。通过率 81%、3★ 39%
    id: 7,
    board: { cols: 8, rows: 8 },
    moves: 26,
    colors: [...FULL_COLORS],
    objectives: [
      { kind: 'collect', piece: 'red', count: 20 },
      { kind: 'clearObstacle', obstacle: 'ice', count: 6 },
    ],
    obstacles: [
      { pos: { col: 2, row: 2 }, kind: 'ice', hp: 1 },
      { pos: { col: 5, row: 2 }, kind: 'ice', hp: 1 },
      { pos: { col: 2, row: 5 }, kind: 'ice', hp: 2 },
      { pos: { col: 5, row: 5 }, kind: 'ice', hp: 2 },
      { pos: { col: 3, row: 4 }, kind: 'ice', hp: 1 },
      { pos: { col: 4, row: 3 }, kind: 'ice', hp: 1 },
    ],
    stars: { two: 6, three: 11 },
  },
  {
    /**
     * Stage 0 收尾关：6 色 + 6 冰 + 挖洞。通过率 79%、星级 24/31/45。
     *
     * ⚠️ **洞只挖上方两角，绝不挖中央** —— 模拟器实测：
     *   4 洞（含中央 (3,3)(4,4)）→ 死局率 **18%**
     *   2 洞（只挖角落）        → 死局率 **1.3%**
     *   中央的洞把棋盘切碎，玩家会频繁看到棋盘自动重排。
     *
     * ⚠️ 冰全部 1hp —— 角落的 2hp 冰太难够到，通过率会掉到 43%。
     */
    id: 8,
    board: {
      cols: 8,
      rows: 8,
      blocked: [
        { col: 0, row: 0 },
        { col: 7, row: 0 },
      ],
    },
    moves: 30,
    colors: [...FULL_COLORS],
    objectives: [
      { kind: 'collect', piece: 'green', count: 20 },
      { kind: 'clearObstacle', obstacle: 'ice', count: 6 },
    ],
    obstacles: [
      { pos: { col: 1, row: 1 }, kind: 'ice', hp: 1 },
      { pos: { col: 6, row: 1 }, kind: 'ice', hp: 1 },
      { pos: { col: 1, row: 6 }, kind: 'ice', hp: 1 },
      { pos: { col: 6, row: 6 }, kind: 'ice', hp: 1 },
      { pos: { col: 4, row: 2 }, kind: 'ice', hp: 1 },
      { pos: { col: 3, row: 5 }, kind: 'ice', hp: 1 },
    ],
    stars: { two: 7, three: 13 },
  },
];
