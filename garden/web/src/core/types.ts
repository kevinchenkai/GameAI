/**
 * core/types.ts —— 核心数据结构（框架设计 §4）
 *
 * ★ 冻结契约 1：本文件（以及整个 core/）不认识 Phaser，**也不认识旺财**。
 *   这里出现任何 pet* 字段都是违约。宠物 runtime 见 game/pet/state.ts。
 */

// ————————————————————————————————————————————————
// 坐标
// ————————————————————————————————————————————————

export interface Pos {
  readonly col: number;
  readonly row: number;
}

// ————————————————————————————————————————————————
// 棋子（§4.1）
// ————————————————————————————————————————————————

export type PieceColor = 'red' | 'orange' | 'yellow' | 'green' | 'purple' | 'blue';

export type SpecialKind =
  | 'none'
  | 'rocketH' // 横向火箭：清整行
  | 'rocketV' // 纵向火箭：清整列
  | 'bomb' // 炸弹：清周围区域
  | 'rainbow'; // 彩虹球：清同色全部（Stage 0 不做）

export interface Piece {
  /**
   * 唯一 id。渲染层靠它做对象复用与补间——
   * 连锁中棋子会下落、会变成特殊棋子，坐标每帧都在变，只有 id 是稳定的。
   */
  readonly id: number;
  readonly color: PieceColor;
  readonly special: SpecialKind;
}

// ————————————————————————————————————————————————
// 障碍（§4.2）
// ————————————————————————————————————————————————

export type ObstacleKind =
  | 'ice' // 冰块：覆盖棋子，本格消除时受伤（Stage 0 唯一障碍）
  | 'grass' // 草地：本格消除即清除
  | 'crate' // 木箱：邻接消除或爆炸受伤
  | 'flower'; // 花朵成长：邻接消除推进生长阶段

export interface Obstacle {
  readonly kind: ObstacleKind;
  /** 剩余层数 / 阶段 */
  readonly hp: number;
  readonly maxHp: number;
}

// ————————————————————————————————————————————————
// 棋盘
// ————————————————————————————————————————————————

export interface Cell {
  readonly piece: Piece | null;
  readonly obstacle: Obstacle | null;
  /** 该格是否为「洞」（不可放棋子），用于做非矩形棋盘 */
  readonly blocked: boolean;
}

export interface BoardState {
  readonly cols: number;
  readonly rows: number;
  /** 行优先：cells[row * cols + col] */
  readonly cells: readonly Cell[];
}

// ————————————————————————————————————————————————
// 玩家输入
// ————————————————————————————————————————————————

export interface Move {
  readonly a: Pos;
  readonly b: Pos;
}

// ————————————————————————————————————————————————
// 关卡目标（§4.4）
// ————————————————————————————————————————————————

export type Objective =
  | { readonly kind: 'collect'; readonly piece: PieceColor; readonly count: number }
  | { readonly kind: 'clearObstacle'; readonly obstacle: ObstacleKind; readonly count: number }
  | { readonly kind: 'dropDown'; readonly item: string; readonly count: number };

export interface TutorialStep {
  readonly id: string;
  readonly highlight?: readonly Pos[];
  readonly text: string;
}

export interface LevelConfig {
  readonly id: number;
  readonly board: {
    readonly cols: number;
    readonly rows: number;
    /** 挖洞，做非矩形棋盘 */
    readonly blocked?: readonly Pos[];
  };
  readonly moves: number;
  /**
   * 本关启用的颜色。
   * ★ 降难度的第一手段是减颜色数，不是减步数（框架 §4.4）。
   */
  readonly colors: readonly PieceColor[];
  readonly objectives: readonly Objective[];
  readonly obstacles?: readonly {
    readonly pos: Pos;
    readonly kind: ObstacleKind;
    readonly hp: number;
  }[];
  readonly stars: {
    /** 剩余步数 ≥ 此值得 2 星 */
    readonly two: number;
    /** 剩余步数 ≥ 此值得 3 星 */
    readonly three: number;
  };
  readonly tutorial?: readonly TutorialStep[];
}

export type Rating = 1 | 2 | 3;

// ————————————————————————————————————————————————
// 回合结算摘要（§4.3.1）
// ————————————————————————————————————————————————

/**
 * ★ PATCH A：纯棋盘 / 关卡信息，**不含任何宠物字段**。
 *
 * V1.1 初稿这里留着 `petSkillReady: boolean`，与「core 不认识旺财」的
 * 冻结契约直接矛盾——Core 凭什么知道宠物技能好没好？已删除。
 * 宠物就绪状态属于 Pet 层自己的 runtime（game/pet/state.ts）。
 */
export interface CoreTurnSummary {
  readonly maxCascade: number;
  readonly totalCleared: number;
  readonly specialCreated: readonly SpecialKind[];
  /** ★ 宠物据此决定演什么（但决策函数在 pet 层，不在这里） */
  readonly result: 'continue' | 'win' | 'lose';
}

// ————————————————————————————————————————————————
// 事件序列 ★ 最重要的结构（§4.3）
// ————————————————————————————————————————————————

/**
 * ★ 注意：本类型中**没有任何 pet* 事件**（冻结契约 1）。
 *   宠物事件另立一套，见 game/pet/events.ts。
 *
 * 渲染 / 宠物 / 音频三层消费**同一份序列**，不得各自维护一份棋盘状态。
 */
export type CoreGameEvent =
  // ——— 结构性事件：渲染层必须按序播 ———
  | { readonly t: 'swap'; readonly a: Pos; readonly b: Pos }
  /** 无效交换弹回——不扣步 */
  | { readonly t: 'swapBack'; readonly a: Pos; readonly b: Pos }
  | {
      readonly t: 'match';
      readonly positions: readonly Pos[];
      readonly color: PieceColor;
      readonly cascadeLevel: number;
    }
  | { readonly t: 'specialSpawn'; readonly pos: Pos; readonly kind: SpecialKind }
  | {
      readonly t: 'specialFire';
      readonly pos: Pos;
      readonly kind: SpecialKind;
      readonly affected: readonly Pos[];
    }
  | {
      readonly t: 'comboBlast';
      readonly kinds: readonly [SpecialKind, SpecialKind];
      readonly affected: readonly Pos[];
    }
  | {
      readonly t: 'obstacleHit';
      readonly pos: Pos;
      readonly kind: ObstacleKind;
      readonly hpLeft: number;
    }
  | { readonly t: 'obstacleClear'; readonly pos: Pos; readonly kind: ObstacleKind }
  | { readonly t: 'collect'; readonly pos: Pos; readonly target: string; readonly count: number }
  | {
      readonly t: 'fall';
      readonly moves: readonly { readonly id: number; readonly from: Pos; readonly to: Pos }[];
    }
  | {
      readonly t: 'spawn';
      readonly items: readonly { readonly piece: Piece; readonly at: Pos }[];
    }
  | { readonly t: 'shuffle'; readonly reason: 'deadlock' }

  // ——— 节奏标记 ———
  | { readonly t: 'cascadeStart'; readonly level: number }
  | { readonly t: 'cascadeEnd'; readonly level: number }
  /**
   * 棋盘物理稳定——无下落、无待消除。
   * ★ 冻结契约 7：**`settled` 不解锁输入**。输入只在 READY_FOR_INPUT 解锁。
   */
  | { readonly t: 'settled'; readonly maxCascade: number; readonly totalCleared: number }
  | { readonly t: 'movesChanged'; readonly left: number }
  | { readonly t: 'levelWin'; readonly rating: Rating; readonly movesLeft: number }
  | { readonly t: 'levelLose'; readonly remaining: Readonly<Record<string, number>> }
  /**
   * ★ 回合完整结算 —— 棋盘稳定 + 目标结算 + 胜负判定都已完成。
   * 冻结契约 3：宠物**只消费这个**，永不消费裸 `settled`。
   */
  | { readonly t: 'turnResolved'; readonly summary: CoreTurnSummary };

export type CoreGameEventType = CoreGameEvent['t'];
