# Garden Match 游戏框架设计 V1.1

> 作者：Claude Opus（实现方）
> 依据：`Garden Match 项目策划方案V0.2.md` + `V0.2 评审意见（Claude）.md`
> 审核：`Garden Match框架与美术审核反馈（Codex）V1.md`
> 日期：2026-08-07
> 状态：**已按 Codex 审核意见修订，接口契约冻结，可进入 Stage 0**

---

## 修订记录：V1 → V1.1

Codex 审核提出 4 项必改 + 4 项建议优化，**全部接受并已落入本文档**：

| # | Codex 意见 | 处理 | 位置 |
|---|---|---|---|
| 必改 1 | 引入 `TurnResolved`，区分「棋盘稳定」与「回合结算完成」 | ✅ 采纳 | §4.3、§5.1 |
| 必改 2 | 技能 1.5s 窗口只在 `TurnResolved && result==='continue'` 后开启 | ✅ 采纳 | §6.4 |
| 必改 3 | Core Event 与 Pet Event 解耦，宠物经 `PetActionCommand` 改棋盘 | ✅ 采纳 | §4.3、§6.6 |
| 必改 4 | 主线用 Progress Star（固定 +1），评级星拆为 Mastery Star | ✅ 采纳 | §8 |
| 建议 | 输入 Buffer 收紧到末尾 100~150ms + 重新验证合法性 | ✅ 采纳 | §9.2 |
| 建议 | 布局改为算法推导，不硬编码百分比 | ✅ 采纳 | §10 |
| 建议 | 性能检测不阻塞启动，后台采样动态降级 | ✅ 采纳 | §9.3 |
| 建议 | 关卡配置加 Schema Validation 并纳入 `npm test` | ✅ 采纳 | §11.2 |

**另有一项我主动修正**（Codex §10 提醒引发）：原六色色板存在严重灰度冲突，已重算，见美术工单 V1.1 §1.2。

**Stage 0 范围按 Codex §20 收紧**：宠物**只做 Hint，不做能量与技能**（技能移入 Stage 0.5）。见 §12。

---

## 0. 本文档的作用

本文档定义 Garden Match 的**技术骨架**——目录结构、模块边界、数据流、核心数据结构、开发批次。

它回答的是"**怎么做**"。策划案回答"做什么"，美术工单回答"素材长什么样"。三份文档配套使用：

| 文档 | 负责人 | 回答 |
|---|---|---|
| `Garden Match 项目策划方案V0.2.md` | Codex | 做什么 |
| **本文档（V1.1）** | Claude | 怎么做 |
| `美术素材工单 V1.1（Codex image-2）.md` | Codex 执行 | 素材长什么样 |
| `Garden Match框架与美术审核反馈（Codex）V1.md` | Codex | 审核意见（已全部消化） |

**框架设计的第一原则**：策划案后续必然会改（V0.3、V0.4……）。因此框架必须让"改策划"只改数据、不改代码。凡是策划可能会调的东西（关卡目标、宠物台词、掉落权重、动画时长、经济数值），**一律进配置文件，不进逻辑代码**。

---

## 1. 技术栈与工程约定

### 1.1 选型

| 部分 | 选择 | 版本 |
|---|---|---|
| 渲染引擎 | Phaser 3 | ^3.90.0 |
| 语言 | TypeScript（`strict: true`） | ^5.8 |
| 构建 | Vite 5 | ^5.4 |
| 单元测试 | Vitest | ^2.x |
| 后端 | **无**（V1 纯前端，本地存档） | — |

**与仓库既有项目对齐**：`Tavern/web/` 已是 Phaser 3.90 + TS + Vite 5，构建配置、`tsconfig`、部署脚本模式直接复用，省掉脚手架时间。差异点：Garden 没有后端，不需要 API 代理。

### 1.2 与 Tavern 一致的约定（沿用）

- `strict: true`，不写 `any`
- 素材放**项目根 `assets/`**，Vite 中间件映射为 `/assets/`，前端只读不改写
- 素材路径统一走 `withPublicBase()`，支持 `VITE_ASSET_VERSION` 加版本号（对应根 CLAUDE.md「改图请换文件名」的缓存纪律）
- 生产构建 `base` 为 `/garden/`（对应部署子目录）

### 1.3 部署位置

按根 CLAUDE.md 的部署边界：

```
/www/wwwroot/g.ismayday.mobi/garden/     ← 本项目唯一可写目录
```

`deploy.sh` 沿用其它项目模式，`rsync --delete` **只对 `$REMOTE_APP_DIR`**，绝不碰站点根。

---

## 2. 架构总览：分层与数据流

### 2.1 核心架构决策

> **三消逻辑层（`core/`）零 Phaser 依赖。**

这是本项目最重要的技术决策，理由：

1. **关卡可解性可批量脚本验证** —— 30~50 关手工试关成本极高，`core` 能在 Node 里跑，可以写模拟器批量跑 1000 次验证"这关能不能过、平均剩几步"
2. **玩法逻辑可单元测试** —— 三消的连锁/特殊棋子组合是 bug 高发区，必须有测试
3. **换渲染层不用重写玩法** —— 将来上小游戏原生或 Unity，`core` 原样搬
4. **宠物系统与渲染系统消费同一份数据** —— 这是实现评审意见 §2「轻/重反应分层」的前提

### 2.2 数据流

```
玩家输入（滑动/点击）
        │
        ▼
  ┌───────────┐
  │  core/    │  纯 TS，无副作用，同步执行
  │  引擎     │  输入一个 Move，输出一段 GameEvent[]
  └───────────┘
        │
        │  GameEvent[]（事件序列 —— 全系统唯一真相源）
        │
   ┌────┴────┬──────────┐
   ▼         ▼          ▼
render/    pet/       audio/
Phaser    宠物状态机   音效
播动画     决定反应     播音
```

**关键点**：`core` 一次性算完整段结算（包括所有连锁），产出一个**事件序列**。渲染层负责把这段序列"播出来"，宠物层负责"看这段序列该做什么反应"。

三者消费同一份数据，天然同步，不会出现"动画播完了但逻辑还没算完"这类经典 bug。

### 2.3 为什么用「事件序列」而不是「逐帧回调」

如果用回调（每消除一次就 callback 一次），宠物系统只能看到"当前这一步"，无法知道"这段连锁最终有多大"。

而评审意见 §2.2 的规则要求：**重反应的强度按整段连锁的最高等级来**（连锁到 x5 就播一次 x5 的欢呼，而不是播 5 次）。

有了完整事件序列，宠物系统可以**先通读整段，再决定演什么**。这是分层反应能实现的技术前提。

---

## 3. 目录结构

```
garden/
├── docs/                          策划与设计文档
├── assets/                        美术与音频素材（Codex 产出投放于此）
│   ├── pieces/                    棋子
│   ├── pet/                       宠物
│   ├── obstacles/                 障碍
│   ├── ui/                        UI 元件
│   ├── garden/                    花园场景与建设节点
│   ├── fx/                        特效
│   └── audio/                     音乐音效
├── web/
│   ├── src/
│   │   ├── core/                  ★ 纯逻辑，零 Phaser 依赖
│   │   │   ├── types.ts           核心类型（Piece / Board / GameEvent…）
│   │   │   ├── board.ts           棋盘状态与基础操作
│   │   │   ├── matcher.ts         匹配检测
│   │   │   ├── resolver.ts        连锁结算（核心，产出事件序列）
│   │   │   ├── special.ts         特殊棋子生成与组合效果
│   │   │   ├── obstacles.ts       障碍行为
│   │   │   ├── generator.ts       棋盘/掉落生成（动态辅助挂这里）
│   │   │   ├── objective.ts       关卡目标判定
│   │   │   ├── session.ts         单局状态机（步数/目标/胜负）
│   │   │   └── rng.ts             可种子化随机（复现 bug 的关键）
│   │   ├── config/                ★ 所有可调数值（策划改这里）
│   │   │   ├── pieces.ts          棋子定义
│   │   │   ├── levels/            关卡数据（每关一个文件）
│   │   │   ├── pet.ts             宠物配置：能量/技能/台词/动画时长
│   │   │   ├── garden.ts          花园建设节点与星星经济
│   │   │   ├── tuning.ts          全局手感参数（动画时长/节奏档位）
│   │   │   └── assistance.ts      动态辅助阈值
│   │   ├── game/
│   │   │   ├── scenes/            BootScene / LevelScene / GardenScene…
│   │   │   ├── render/            事件序列 → Phaser 动画
│   │   │   ├── pet/               宠物状态机
│   │   │   ├── ui/                HUD / 弹窗 / 设置
│   │   │   └── audio/             音频管理
│   │   ├── meta/                  花园进度、存档
│   │   └── main.ts
│   ├── tests/                     Vitest（主要测 core）
│   ├── tools/                     离线工具（关卡可解性模拟器等）
│   └── vite.config.ts
└── deploy.sh
```

**目录即架构**：`core/` 和 `config/` 里不允许出现 `import Phaser`。这条用 lint 规则强制。

---

## 4. 核心数据结构

### 4.1 棋子

```ts
// core/types.ts
export type PieceColor = 'red' | 'orange' | 'yellow' | 'green' | 'purple' | 'blue';

export type SpecialKind =
  | 'none'
  | 'rocketH'     // 横向火箭：清整行
  | 'rocketV'     // 纵向火箭：清整列
  | 'bomb'        // 炸弹：清周围区域
  | 'rainbow';    // 彩虹球：清同色全部

export interface Piece {
  id: number;              // 唯一 id，渲染层靠它做对象复用与补间
  color: PieceColor;
  special: SpecialKind;
}

export type Cell = {
  piece: Piece | null;
  obstacle: Obstacle | null;
  blocked: boolean;        // 该格是否为「洞」（不可放棋子）
};
```

> **为什么 `Piece` 有 `id`**：连锁中棋子会下落、会变成特殊棋子。渲染层需要知道"屏幕上这个精灵对应逻辑上哪个棋子"，靠 `id` 追踪，而不是靠坐标——坐标每帧都在变。

### 4.2 障碍

```ts
export type ObstacleKind =
  | 'ice'        // 冰块：覆盖棋子，需 N 次消除破坏
  | 'grass'      // 草地：格子上完成消除即清除
  | 'crate'      // 木箱：固定障碍，邻接消除受损
  | 'flower';    // 花朵成长：邻接消除推进生长阶段

export interface Obstacle {
  kind: ObstacleKind;
  hp: number;              // 剩余层数/阶段
  maxHp: number;
}
```

四种障碍抽象成同一个「hp + 触发条件」模型，差异只在**受伤条件**：
- `ice`：**本格**发生消除
- `grass`：**本格**发生消除（一次清）
- `crate`：**邻接格**发生消除或爆炸
- `flower`：**邻接格**发生消除（hp 归零 = 开花完成，可被收集）

统一模型的好处：新增障碍 = 加一条配置 + 一个受伤条件，不改结算逻辑。

### 4.3 事件序列 ★ 最重要的结构

```ts
export type GameEvent =
  // ——— 结构性事件：渲染层必须按序播 ———
  | { t: 'swap';        a: Pos; b: Pos }
  | { t: 'swapBack';    a: Pos; b: Pos }              // 无效交换弹回（不扣步）
  | { t: 'match';       positions: Pos[]; color: PieceColor; cascadeLevel: number }
  | { t: 'specialSpawn';pos: Pos; kind: SpecialKind }
  | { t: 'specialFire'; pos: Pos; kind: SpecialKind; affected: Pos[] }
  | { t: 'comboBlast';  kinds: [SpecialKind, SpecialKind]; affected: Pos[] }
  | { t: 'obstacleHit'; pos: Pos; kind: ObstacleKind; hpLeft: number }
  | { t: 'obstacleClear'; pos: Pos; kind: ObstacleKind }
  | { t: 'collect';     pos: Pos; target: string; count: number }
  | { t: 'fall';        moves: Array<{ id: number; from: Pos; to: Pos }> }
  | { t: 'spawn';       items: Array<{ piece: Piece; at: Pos }> }
  | { t: 'shuffle';     reason: 'deadlock' }

  // ——— 节奏标记 ———
  | { t: 'cascadeStart'; level: number }
  | { t: 'cascadeEnd';   level: number }
  | { t: 'settled';      maxCascade: number; totalCleared: number }   // 棋盘物理稳定
  | { t: 'movesChanged'; left: number }
  | { t: 'levelWin';     rating: 1 | 2 | 3; movesLeft: number }
  | { t: 'levelLose';    remaining: Record<string, number> }
  | { t: 'turnResolved'; summary: TurnSummary };                      // ★ 回合完整结算
```

> **注意**：`CoreGameEvent` 中**没有任何 `pet*` 事件**。这是 Codex 必改 3 —— 详见 §4.3.2。

#### 4.3.1 `settled` vs `turnResolved` ★（Codex 必改 1）

V1 把重反应和技能都挂在 `settled` 上，存在一个真实缺陷，Codex 举的场景成立：

```
玩家用掉最后一步 → 连锁 → 目标全部完成 → settled
  → 旺财能量满 → 释放技能 → levelWin
```

结果是**玩家已经赢了，宠物还在额外操作棋盘**。这违反既定优先级 `Victory > Pet Skill > Big Combo > Hint`。

**修正**：拆成两个语义不同的事件。

| 事件 | 含义 | 谁消费 |
|---|---|---|
| `settled` | **棋盘物理稳定** —— 无下落、无待消除 | 渲染层（解锁输入、停止动画） |
| `turnResolved` | **回合完整结算** —— 棋盘稳定 **+ 目标结算 + 胜负判定** 都已完成 | **宠物系统（唯一决策入口）** |

```ts
// core/types.ts —— 纯棋盘/关卡信息，不含任何宠物字段
export interface CoreTurnSummary {
  maxCascade: number;
  totalCleared: number;
  specialCreated: SpecialKind[];
  result: 'continue' | 'win' | 'lose';   // ★ 宠物据此决定演什么
}
```

> **PATCH A**：V1.1 初稿这里还留着 `petSkillReady: boolean`，与「core 不认识旺财」的冻结契约**直接矛盾**——Core 凭什么知道宠物技能好没好？已删除。宠物就绪状态属于 Pet 层自己的 runtime，见 §6.2。

**修正后的顺序**：

```
玩家输入 → Match/Cascade → 棋盘稳定(settled)
        → Objective 结算 → Win/Lose 判定
        → 生成 TurnSummary → turnResolved ★
        → Pet Reaction Resolver
```

宠物**只看 `turnResolved`，永不看裸 `settled`**。这样它做决定时，胜负已经是已知信息。

#### 4.3.2 Core 不认识旺财 ★（Codex 必改 3）

既然规定了 `core/` 不认识 Phaser，就应该同样规定：

> **`core/` 也不认识旺财** —— 不认识宠物 UI、宠物等级、宠物能量。Core 只负责棋盘规则和关卡规则。

因此 `petEnergy` / `petSkillReady` / `petSkillFire` 从 `CoreGameEvent` 中**移除**，另立一套：

```ts
// game/pet/events.ts —— 不在 core/ 里
export type PetEvent =
  | { t: 'petEnergyChanged';   value: number; max: number }
  | { t: 'petReactionRequested'; state: PetState; intensity: number }
  | { t: 'petSkillReady' }
  | { t: 'petSkillRequested';  skill: string }
  | { t: 'petStateChanged';    from: PetState; to: PetState };
```

**宠物技能不直接改棋盘**，而是向 Core 提交一个命令：

```ts
// core/petAction.ts —— core 只认识「命令」，不认识「谁发的」
export interface PetActionCommand {
  type: 'clearPositions' | 'convertToSpecial' | 'removeObstacle';
  positions: Pos[];
  payload?: { special?: SpecialKind };
}

export function applyPetAction(
  state: BoardState,
  command: PetActionCommand
): { state: BoardState; events: CoreGameEvent[] };
```

数据流：

```
Pet System  →  PetActionCommand  →  Core  →  CoreGameEvent[]  →  Render
（决定做什么）                    （棋盘发生什么）
```

**边界收益**：`applyPetAction` 与 `applyMove` 走完全相同的结算管线，所以宠物技能引发的连锁、障碍破坏、目标收集**自动全部正确**，不需要在宠物系统里重写一遍棋盘逻辑。这也意味着宠物技能天然可被关卡模拟器测试。

### 4.4 关卡定义

```ts
// config/levels/level-001.ts
export interface LevelConfig {
  id: number;
  board: {
    cols: number;                  // V1 固定 8
    rows: number;                  // V1 固定 8
    blocked?: Pos[];               // 挖洞，做非矩形棋盘
  };
  moves: number;                   // 步数上限
  colors: PieceColor[];            // 本关启用的颜色数（新手关用 4 色降难度）
  objectives: Objective[];
  obstacles?: Array<{ pos: Pos; kind: ObstacleKind; hp: number }>;
  stars: {
    two: number;                   // 剩余步数 ≥ 此值得 2 星
    three: number;                 // 剩余步数 ≥ 此值得 3 星
  };
  tutorial?: TutorialStep[];       // 新手引导（仅前几关）
}

export type Objective =
  | { kind: 'collect'; piece: PieceColor; count: number }
  | { kind: 'clearObstacle'; obstacle: ObstacleKind; count: number }
  | { kind: 'dropDown'; item: string; count: number };
```

**关卡是纯数据**。加一关 = 加一个文件，零代码改动。这样 Codex 可以直接产出关卡配置，我不需要介入。

> **降难度的第一手段是减颜色数**，不是减步数。4 色棋盘比 6 色棋盘容易得多，且玩家感知是"这关运气好"而不是"这关简单"。前 5 关建议 4 色，第 6~15 关 5 色，之后 6 色。

### 4.5 存档

```ts
// meta/save.ts
export interface SaveData {
  version: 1;                                  // ★ 必须有，用于后续迁移
  levels: Record<number, { rating: 1 | 2 | 3 }>;     // 评级
  stars: {
    progress: { earned: number; spent: number };     // ★ 主线（通关 +1）
    mastery:  { earned: number; spent: number };     // ★ 装饰/图鉴
  };
  garden: Record<string, number>;              // 建设节点 → 已完成阶段
  pet: { name: string; level: number };        // name 默认 '旺财'，预留玩家改名
  settings: { bgm: number; sfx: number; haptics: boolean; tempo: 'calm' | 'brisk' };
  stats: { totalPlays: number; lastPlayedAt: number };
}
```

**必做的兜底**（评审意见 §7.4）：`localStorage` 在移动端会丢。提供**导出/导入进度码**（存档 JSON → base64 字符串，可复制）。成本半天，兜住最坏情况。50+ 用户丢掉花园进度是不可逆流失。

---

## 5. 结算引擎设计（`core/resolver.ts`）

### 5.1 一次 Move 的完整流程

```
applyMove(board, move) → GameEvent[]

1.  校验交换合法性
    └─ 非法 → [swap, swapBack]，不扣步，结束
2.  执行交换 → emit swap
3.  循环（cascade level 从 0 开始）：
    a. emit cascadeStart(level)
    b. 检测所有匹配 → emit match[]
    c. 判定特殊棋子生成 → emit specialSpawn[]
    d. 触发被消除的特殊棋子 → emit specialFire[]（可递归）
    e. 结算障碍受损 → emit obstacleHit / obstacleClear
    f. 结算关卡目标 → emit collect
    g. 移除棋子 → 下落 → emit fall
    h. 顶部补充 → emit spawn
    i. emit cascadeEnd(level)
    j. 若仍有匹配 → level++，回到 a
4.  emit movesChanged
5.  检查死局 → 需要则 emit shuffle
6.  emit settled(maxCascade, totalCleared)        ← 棋盘物理稳定
7.  结算关卡目标最终状态
8.  判定胜负 → emit levelWin / levelLose
9.  组装 TurnSummary → emit turnResolved          ★ 回合完整结算
```

**步骤 6 与 9 必须分开**（Codex 必改 1）。`settled` 之后还有目标结算与胜负判定，宠物只能在第 9 步才做决定 —— 否则会出现「已经赢了，宠物还在放技能」。

**纯函数**：`applyMove` 不修改传入的 board，返回新 board + 事件序列。这让"撤销"、"AI 试算"、"关卡模拟器"全部免费获得。

### 5.2 特殊棋子生成规则

| 匹配形状 | 产出 | 生成位置 |
|---|---|---|
| 横向 4 连 | 纵向火箭 `rocketV` | 玩家操作的那个棋子位置 |
| 纵向 4 连 | 横向火箭 `rocketH` | 同上 |
| 5 连（直线） | 彩虹球 `rainbow` | 同上 |
| T / L 型 | 炸弹 `bomb` | 拐点位置 |

> **注意火箭方向**：横向 4 连产出**纵向**火箭。理由是玩家横着连了一排，奖励应该能清他还没清的方向。
>
> ⚠️ **但这条待真机验证**（Codex §16 提醒得对）：各家三消对此惯例并不一致，而玩家真正需要的不是"符合行业惯例"，而是**能预测这个特殊棋子会清哪里**。Stage 0 先用本规则，**M8 真人测试时专门观察理解率**；若玩家频繁误判，**立即改成视觉最直觉的方案，不要坚持理论**。
>
> 实现上这是 `special.ts` 里的一个常量翻转，改动成本约 5 分钟——所以不值得现在争论，值得的是记得去测。

**生成位置必须是玩家操作的棋子**（不是匹配的中点）。这让玩家感觉"是我造出来的"，而不是"系统随机给的"。这是爽感的关键细节。

### 5.3 特殊棋子组合

| 组合 | 效果 |
|---|---|
| 火箭 + 火箭 | 十字：整行 + 整列 |
| 火箭 + 炸弹 | 3 行 + 3 列的粗十字 |
| 炸弹 + 炸弹 | 5×5 大爆炸 |
| 彩虹 + 普通 | 清除该颜色全部 |
| 彩虹 + 火箭 | 该颜色全部**变成火箭**并全部触发 ← 全场最爽 |
| 彩虹 + 炸弹 | 该颜色全部变成炸弹并全部触发 |
| 彩虹 + 彩虹 | 清空全场 |

`彩虹 + 火箭` 和 `彩虹 + 彩虹` 是 8~15 岁玩家的核心记忆点，**动画必须给足**（评审意见的 8% 时长预算里，这类应该拿走大头）。

### 5.4 死局检测与 Shuffle

每次 `settled` 前检查是否存在可行 move。无解则自动 shuffle，emit `shuffle` 事件。

**低压力 UX 要求**：shuffle 必须是**自动的**，不能弹窗问"是否重排"。玩家零操作、零心理负担。

**Stage 0 的宠物表现要克制**（Codex §17）：

```
旺财轻微歪头 → 棋盘 Shuffle → 旺财尾巴摇一下
```

**不做完整的"我来帮你整理"重动画**。Dead Board 本身已经是一次意外中断，如果再叠加一段重动画，就变成"卡住了还要等它演完"——这与低压力目标相反。轻表现即可传达"旺财注意到了"。

---

## 6. 宠物系统（`game/pet/`）

### 6.0 角色设定 ✅ 已确认

| 项 | 内容 |
|---|---|
| **名字** | **旺财** |
| **性格** | 活泼、惹人喜爱 |
| **口头禅** | 「快来玩呀！」 |

**对实现的三点影响**：

1. **资产命名**：宠物素材统一为 `pet-wangcai-*.png`（详见美术工单 §4）
2. **口头禅的使用时机**：「快来玩呀！」是**招呼语**，用在 (a) 进入游戏首屏 (b) 长时间未操作的 Hint 首次触发。语气是邀请而非催促——与策划案 §7.5「提示，不催促」一致。**不要用在失败后**（那里需要的是鼓励，不是招呼）
3. **「活泼」是有代价的** ★：活泼角色天然倾向于"动得多"，这与动画时长预算（重反应 ≤ 单局 8%）**直接冲突**。解决办法见 §6.3 ——**活泼靠 Idle 的高频轻微小动作体现，而不是靠更多重反应**。这是本项目宠物表现的核心手法。

### 6.1 状态机

```ts
export type PetState =
  | 'idle'        // 待机：呼吸、偶尔眨眼、摇尾巴
  | 'watching'    // 玩家操作中：看向棋盘
  | 'happy'       // 轻反应：小幅开心
  | 'excited'     // 重反应：跳跃欢呼（大 Combo）
  | 'thinking'    // 玩家停顿 3s：歪头思考
  | 'hint'        // 玩家停顿 5s：跑向提示方向
  | 'skill'       // 释放技能
  | 'encourage'   // 濒临失败/失败
  | 'victory';    // 通关庆祝
```

### 6.2 Pet Reaction Resolver（★ 单一决策入口）

**PATCH A 后的正确形态**：宠物状态属于 Pet 层，Core 完全不知道它的存在。

```ts
// game/pet/state.ts —— Pet 层自己的 runtime，core/ 看不见
export interface PetRuntimeState {
  energy: number;
  maxEnergy: number;
  skillReady: boolean;
  state: PetState;
}
```

决策函数**同时吃两份输入**：Core 给的回合结果 + Pet 自己的状态。

```ts
// game/pet/reactionResolver.ts
export type PetDecision =
  | { type: 'reaction'; state: PetState }
  | { type: 'skillOffer' };        // ★ 开启 1.5s 可点击窗口，尚未释放

function resolvePetDecision(
  turn: CoreTurnSummary,          // 来自 core：只有棋盘/关卡信息
  pet: PetRuntimeState            // 来自 pet 层：能量、就绪
): PetDecision {
  if (turn.result === 'win')  return { type: 'reaction', state: 'victory' };
  if (turn.result === 'lose') return { type: 'reaction', state: 'encourage' };
  if (pet.skillReady)         return { type: 'skillOffer' };          // ★ 不是 'skill'
  if (turn.maxCascade >= COMBO_EXCITED_THRESHOLD)
                              return { type: 'reaction', state: 'excited' };
  return { type: 'reaction', state: 'idle' };
}
```

这正是既定优先级 `Victory > Pet Skill > Big Combo > Hint` 的直接编码。**优先级写成一串 if 而不是散落各处**，是为了让"赢了就不该再放技能"这类规则一眼可验证。

#### `skillOffer` ≠ `skill`（Codex 复查 §1.3）

这两个是**不同阶段**，V1.1 初稿把它们混成一个状态是错的：

| 阶段 | 含义 | 棋盘 |
|---|---|---|
| `skillOffer` | 1.5s 可点击窗口，宠物发光待命 | **未改变** |
| `skill` | 技能动画 + Gameplay Action 已开始 | **正在改变** |

完整链路：

```
turnResolved
   ↓
PetDecision = skillOffer
   ↓
1.5s 窗口（点击 or 超时）
   ↓
PetSkillRequested
   ↓
PetActionCommand
   ↓
core.applyPetAction()
   ↓
PetState = 'skill' + CoreGameEvent[] 播放
```

分开的价值：**窗口期棋盘没变，可以安全取消**（比如玩家此时暂停）；一旦进入 `skill`，就是不可回退的棋盘变更。混成一个状态会让"取消"语义无处安放。

```ts
// 事件消费
function onCoreEvents(events: CoreGameEvent[]) {
  for (const e of events) {
    // 轻反应：连锁进行中可叠加，纯表现层，绝不阻塞棋盘
    if (e.t === 'match') {
      pet.flash('happy', { intensity: e.cascadeLevel });
    }
    // 重反应：只在 turnResolved，只一次
    if (e.t === 'turnResolved') {
      applyDecision(resolvePetDecision(e.summary, petRuntime));
    }
  }
}
```

**四条硬规则，写进代码注释，不许违反**：

1. 轻反应**永不阻塞**棋盘推进
2. 重反应**只在 `turnResolved`**，一段连锁最多一次
3. 宠物 Gameplay Action **绝不插入 Cascade**
4. 宠物**永不消费裸 `settled`** —— 那时胜负还未知

### 6.3 动画时长预算

```ts
// config/tuning.ts
export const PET_ANIM_BUDGET = {
  maxHeavyRatio: 0.08,        // 重反应累计 ≤ 单局时长 8%
  excitedDuration: 800,       // ms
  skillDuration: 1000,
  hintDuration: 1200,
};
```

运行时统计累计重反应时长，**超预算自动降级**（跳过部分 excited，只播轻反应）。这是防止"陪伴变打断"的自动保险。

#### 「活泼」怎么在预算内实现 ★

旺财的性格是活泼，直觉做法是"多蹦几次"——**这条路走不通**，会撞爆 8% 预算，把陪伴变成打断。

正确做法：**把活泼放在 Idle 层，而不是反应层。**

| 层 | 是否占预算 | 旺财的活泼体现 |
|---|---|---|
| **Idle 微动作**（自发） | **否**（不阻塞、不独占） | 尾巴持续小幅摆动、偶尔眨眼、耳朵抖一下、重心左右微晃、偶尔回头看玩家 |
| 轻反应（随消除） | 否 | 表情切换更快、幅度略大 |
| 重反应（`settled`） | **是** | 跳跃欢呼——**频率不增加**，只是幅度比温吞角色更大 |

```ts
// config/pet.ts
export const IDLE_MICRO = {
  tailWagPeriod: 900,        // 尾巴摆动周期，持续进行
  blinkIntervalRange: [2000, 4500],
  earTwitchChance: 0.15,     // 每个 idle 循环的概率
  glanceAtPlayerChance: 0.08,// 偶尔看向玩家 —— 「陪伴感」的最大来源
};
```

**核心洞察**：玩家感知到的"这只狗很活泼"，**80% 来自它在你不操作时也一直在动**，而不是来自它庆祝得多用力。前者零预算成本（纯 Idle 循环，不阻塞棋盘），后者是稀缺资源。

> `glanceAtPlayerChance`（偶尔抬头看玩家一眼）这一条我认为是全项目性价比最高的一个细节：实现成本约 10 行，但它是"陪伴"从概念变成体感的关键——被注视的感觉，比任何庆祝动画都强。

### 6.4 技能触发：自动 + 可提前点击 ★（Codex 必改 2）

> ⚠️ **Stage 0 不实现本节**。按 Codex §20，能量与技能移入 **Stage 0.5**，Stage 0 只做 Hint。本节是 Stage 0.5 的接口契约，提前定死避免返工。

原方案说"能量满 → 1.5s 窗口 → 点了就立即释放"，其中**「立即释放」有歧义**：如果能量是在 Cascade 中途满的，"立即"就会让技能插入连锁，违反硬规则 3。

**修正后的规则**：

> **1.5 秒窗口只在 `turnResolved` 且 `result === 'continue'` 之后开启。**

```
Cascade → settled → Objective/WinLose → turnResolved
                                            │
              ┌─────────────────────────────┼──────────────────────┐
              ▼                             ▼                      ▼
        result = win                  result = lose         result = continue
              │                             │                      │
          Victory                      Encourage            技能就绪 UI 亮起
        （不开窗口）                  （不开窗口）                 │
                                                              1.5s 窗口
                                                        ┌─────────┴─────────┐
                                                     点击                  未点
                                                   立即释放              自动释放
```

能量可以在 Cascade 中途涨满，但**技能就绪 UI 要等到 `turnResolved` 才亮**。玩家看不到按钮，也就不会点，从根上消除了"我点了怎么没反应"的困惑。

**为什么不做「Cascade 中允许点击、缓存 skillRequested」**（Codex §3.3，我同意）：状态更多、UI 容易让玩家误以为点击失效、测试复杂度上升。Stage 0.5 用最稳的方案。

### 6.5 宠物化 Hint

```
玩家无操作 3s  → pet: 'thinking'（歪头，看棋盘）
玩家无操作 5s  → pet: 'hint'（跑向某方向）+ 目标棋子轻微呼吸缩放
                 首次触发时气泡：「快来玩呀！」
玩家无操作 10s → 重复一次，节奏放缓，不再出文字
```

**永不弹窗、永不画大箭头。** 「提示，不催促。」

> 口头禅放在 Hint **首次**触发，是因为此刻语境正好——玩家愣住了，旺财招呼你一起玩。**重复触发不再出文字**，否则同一句话循环出现会从"可爱"变成"聒噪"。

### 6.6 台词配置

台词全部进配置，**不硬编码在场景里**（沿用 Tavern「数据驱动人物」的准则）：

```ts
// config/pet.ts
export const PET_LINES = {
  name: '旺财',
  greeting:     ['快来玩呀！'],                    // 首屏 / Hint 首次
  hintRepeat:   [],                                // ★ 空数组 = 不出文字
  levelWin:     ['我们赢啦！', '太棒啦！'],
  levelLose:    ['只差 {n} 个啦！', '差一点点！'],   // {n} 由目标剩余量填充
  assistOffer:  ['这局我来帮你！'],                 // ★ 仅二级动态辅助
  gardenBuild:  ['我们的院子越来越好啦！'],
};
```

**三条文案纪律**：

1. **失败文案永远指向"还差多少"，不指向"你失败了"**（策划案 §12）——`只差 {n} 个啦！` 而不是 `再试一次吧`
2. **`assistOffer` 只在二级辅助出现**，一级辅助完全静默。连续听"我来帮你"会变成"系统在提醒我很菜"
3. **同一句话不连续重复**。相同 key 连续触发时轮换或静默

> 台词是纯配置，**Codex 可以直接扩充，不需要我介入**。

---

## 7. 动态辅助（`core/generator.ts` + `config/assistance.ts`）

按评审意见 §4，**只做生成阶段的两种，不做运行时干预**：

```ts
// config/assistance.ts
export const ASSISTANCE = {
  trigger: { level1: 2, level2: 4 },      // 同关连续失败次数
  resetOnWin: true,
  level1: {                                // ★ 完全静默，宠物不说话
    targetPieceWeightBonus: 0.15,          // 目标棋子掉落权重 +15%
    guaranteedFourInLineOpenings: 1,       // 开局保证 ≥1 个 4 连机会
  },
  level2: {                                // 宠物出面「这局我来帮你」
    targetPieceWeightBonus: 0.30,
    guaranteedFourInLineOpenings: 2,
    petLine: 'assist_offer',
  },
  maxLevel: 2,                             // 封顶，不做三级
};
```

**为什么一级静默**：连续听宠物说"我来帮你"会变成"系统在提醒我很菜"。最好的动态辅助是玩家察觉不到的。宠物包装是二级的安全网，不是常规表现。

**为什么不做运行时干预**：玩家会隐约感觉"棋盘在配合我"，破坏"挑战来自思考"的核心承诺；而且这类逻辑极难 debug——出问题时无法区分是 bug 还是辅助生效。

---

## 8. 星星经济与花园（`config/garden.ts` + `meta/`）

### 8.1 双维度奖励 ★（Codex 必改 4）

V1 的方案（花园直接消费 1/2/3 星总数）有一个我没看出来的缺陷，Codex 指出得对：

> **高水平玩家的主线花园推进速度是普通玩家的 3 倍。**

更糟的是它**破坏了 Stage 0 的验证目的**。我们要验证的心理是「再玩两关，我就能把院门修好了」——但如果玩家第一关就拿三星、当场就能建设，这个心理**根本没被测到**。

**修正**：拆成两个互不干扰的维度。

| 维度 | 获取 | 用途 | 面向 |
|---|---|---|---|
| **Progress Star**（主线星） | **通关即 +1，与评级无关** | **只用于花园主线建设** | 所有人节奏一致 |
| **Mastery Star**（评级星） | 关卡评级 1/2/3 | 装饰、图鉴、成就、宠物外观、收藏 | 8~15 岁的追求 |

```ts
// config/garden.ts
export const GARDEN_ECONOMY = {
  progressStarPerClear: 1,   // ★ 通关固定 +1，1 星和 3 星一样
  nodeStageCost: 3,          // 每个建设阶段消耗 3 Progress Star
  // → 所有玩家：3 关推进一个阶段，节奏完全一致
};
```

**为什么这比原方案好**：

- **50+**：通关 → 花园一定推进。节奏可预期，「再玩两关」的承诺是真的
- **8~15**：通关拿主线进度 + 追三星拿 Mastery 奖励，**两条线都有事做**
- **验证有效性**：所有测试者的花园节奏一致，Stage 0 的留存数据才可比

> 原方案里「三星玩家建设更快」看似是奖励，实际是**把追求深度的玩家更快推到内容尽头**——Stage 0 只有 8 关 1 个节点，快 3 倍意味着他 3 关就玩完了花园部分。

`SaveData` 相应调整：

```ts
stars: {
  progress: { earned: number; spent: number };   // 主线
  mastery:  { earned: number; spent: number };   // 评级/装饰
};
```

**"再玩两关就能把池塘修好了"** —— 这个心理是留存核心。所以：

- 建设进度条**必须在关卡结算界面就显示**，让玩家在"还要不要再玩一关"的决策点看到"就差一点"
- 节点拆成 2~3 个可见阶段（如院门：清杂草 → 修门框 → 挂灯笼），**每 3 关就有一次可见变化**，而不是攒 10 关才动一次

### 8.3 花园节点结构

```ts
export interface GardenNode {
  id: string;
  name: string;
  unlockAtLevel: number;
  stages: Array<{ cost: number; assetKey: string; petReaction?: string }>;
}
```

节点是数据。加内容 = 加数据 + 加图，零代码。

---

## 9. 渲染层与手感（`game/render/` + `config/tuning.ts`）

### 9.1 全局节奏系数（实现评审意见 §3.3）

```ts
// config/tuning.ts
export const TEMPO = {
  calm:  1.3,     // 「舒缓」——默认
  brisk: 0.8,     // 「明快」
};

export const TIMING = {
  swap: 180,
  matchPop: 220,
  fallPerRow: 90,
  cascadeGap: 120,
  specialFire: 320,
};
// 实际时长 = TIMING.x * TEMPO[current]
```

设置项叫**「节奏」**，不叫「难度」或「简单模式」——避免羞辱感。默认「舒缓」。年轻玩家玩两局就会自己去设置里找"能不能快点"，50+ 用户永远不会打开这个设置。

**实现成本约 20 行。**

### 9.2 事件播放器

```ts
// render/EventPlayer.ts
// 把 GameEvent[] 转成 Phaser Timeline，按序播放
// 关键：播放期间锁定输入，settled 后解锁
```

**输入缓存策略**（按 Codex §12 收紧）：

原方案说"连锁播放全程可缓存输入"，风险是 Codex 指出的**坐标语义漂移**——玩家在 Cascade 中途看到的棋盘，不是结算后的棋盘。他对着一个正在下落的位置滑动，缓存下来之后执行的可能是完全不同的两个棋子。

**修正**：

```ts
export const INPUT_BUFFER = {
  openBeforeEndMs: 120,     // 只在整段动画最后 ~120ms 开放
};
```

```
Cascade 播放中 ────────────────────┬── 最后 120ms ──┐
   输入完全丢弃                     │  开放缓存      │
                                    └───────────────┘
                                            ↓
                                      turnResolved
                                            ↓
                              ★ 重新验证该 Move 当前是否合法
                                     ├─ 合法 → 执行
                                     └─ 非法 → 静默丢弃
```

**重新验证是关键**，不能直接执行缓存的坐标。这样既服务了年轻玩家的连续操作，又不会产生"我明明滑了这两个，怎么换的是别的"的混乱。

### 9.3 性能降级（按 Codex §14 修正）

```ts
export const FX_QUALITY = {
  high:   { particles: true,  maxParticles: 40, shake: true },
  medium: { particles: true,  maxParticles: 15, shake: true },
  low:    { particles: false, maxParticles: 0,  shake: false },
};
```

原方案"启动时测 3 秒帧率"是错的——**用户会感觉游戏卡在启动画面 3 秒**，这本身就是糟糕的第一印象。

**修正**：正常开始游戏，**后台持续采样**帧率与掉帧比例，动态在 `high → medium → low` 之间调整。玩家无感，且能应对中途发热降频（老手机的真实场景）。

**只降不升**（或升级需更长的稳定观察窗口），避免画质在两档之间反复横跳——那比一直低画质更难受。

---

## 10. 布局：竖屏与安全区

### 10.1 布局是算法，不是固定百分比 ★（Codex §13）

以下比例**只是设计参考，不是实现**：

```
┌─────────────────┐  ← 顶部安全区
│   目标 + 步数    │  ~12%   HUD
├─────────────────┤
│     棋盘 8×8    │  ~58%   正方形
├─────────────────┤
│      旺财       │  ~20%   ★ 宠物在下方
├─────────────────┤
│  暂停 / 道具     │  ~10%
└─────────────────┘  ← 底部安全区
```

**硬编码百分比会在小屏上把棋子挤到不可用**。实现必须反过来：**先保证棋子尺寸，再分配剩余空间。**

```
1. 读取 Safe Area（刘海、Home Indicator、浏览器地址栏）
2. 计算水平可用宽度
3. 由宽度推导最大棋盘边长（正方形）
4. ★ 校验棋子尺寸 ≥ MIN_PIECE_SIZE
      不满足 → 降级 8×8 → 7×7（★ 而不是继续缩小棋子）
5. 剩余高度按 HUD : Pet : Controls 的弹性权重分配
6. Pet 区有最小高度保障，不足则改用「半身」构图
```

```ts
// config/tuning.ts
export const LAYOUT = {
  minPieceSizePt: 38,        // ★ 硬底线，低于此值降棋盘尺寸
  boardFallback: [8, 7],     // 依次尝试
  petMinHeightPt: 96,
  weights: { hud: 1.2, pet: 2.0, controls: 1.0 },
};
```

**核心原则**：棋子大小是**约束**，布局比例是**结果**。策划案第一原则是"棋子够大够清楚"，那它就不能是被动挤压的一方。

### 10.2 棋子尺寸底线

```
iPhone SE（375pt 宽，最小目标机型）
棋盘可用宽度 = 375 - 2×16(边距) = 343pt
8 列 → 每格 42.8pt → 棋子直径 ≈ 38pt
```

**38pt 是可接受下限**（Apple HIG 建议可点击目标 ≥44pt，棋子靠滑动操作可略小）。低于此值按 §10.1 第 4 步降到 7×7，保持正方形。

**宠物放下方的理由**（此处确认）：竖屏下方是拇指自然区域，更像"蹲在你旁边"；不遮挡视线路径（人观察棋盘习惯从上往下扫）；顶部留给目标信息（50+ 用户需要随时确认"我要收集什么"）。

---

## 11. 测试策略

### 11.1 单元测试（Vitest，只测 `core`）

必测：
- 匹配检测：3/4/5 连、T/L 型、边界情况
- 特殊棋子生成位置与方向
- 全部 7 种特殊组合的影响范围
- 连锁：多层连锁不丢事件、不重复消除
- 障碍：4 种受伤条件
- 死局检测与 shuffle
- 目标判定与胜负

### 11.2 关卡 Schema 校验 ★（Codex §15）

关卡未来会由 AI 批量生成，**TypeScript 类型只能保证结构，保证不了语义**——一个 `blocked` 坐标越界、或障碍放在洞里，类型检查全过，运行时才炸。

```ts
// core/validateLevel.ts
export function validateLevelConfig(level: LevelConfig): ValidationResult;
```

必查项：

| 检查 | 说明 |
|---|---|
| Board Size 合法 | cols/rows 在允许范围 |
| Pos 不越界 | 所有坐标在棋盘内 |
| Blocked Cell 不重复 | 去重 |
| 障碍位置合法 | 不在 blocked 格上、不重叠 |
| **目标可被满足** | 收集目标的颜色必须在 `colors` 里 —— 否则关卡**永不可能通关** |
| Stars 阈值合法 | `three > two`，且 `two < moves` |
| Colors 数量合法 | ≥3（少于 3 色无法形成有意义的匹配） |
| Tutorial 引用合法 | 引用的步骤/坐标存在 |
| **开局不自动 Match** | 否则一进关就自己消除 |
| **开局存在合法 Move** | 否则一进关就 shuffle |

纳入 CI：

```bash
npm run validate-levels
```

**「目标可被满足」这一条最重要**：它能挡住"要求收集蓝莓、但本关颜色池里没有蓝莓"这种致命配置错误。这类错误人工审阅极易漏过，但对玩家是灾难（永远打不过）。

### 11.3 关卡可解性模拟器（`tools/`）

```bash
npm run simulate -- --level 12 --runs 1000
```

用随机 AI（或简单贪心 AI）跑 1000 次，输出：

```
关卡 12：通过率 68%  平均剩余步数 2.3  死局率 0.4%
→ 建议：通过率偏低，+2 步 或 减 1 色
```

**这是 30 关调优的刚需工具**。手工试关一关要 5 分钟，30 关调 3 轮 = 7.5 小时；模拟器 30 秒跑完。

**这个工具应该在写关卡之前先做。** 它也是 `core` 零 Phaser 依赖的最大回报。

### 11.4 真机测试清单

Playable Core 完成后必测：
- iPhone SE（最小屏，棋子尺寸底线）
- 一台 3 年以上的安卓（性能降级验证）
- **找 1~2 位真实 50+ 用户实际玩**，观察而不是问

---

## 11.5 Asset Manifest（Codex §11）

美术工单里有两条**看似冲突**的原则：

- 原则 A：占位图与正式图同名覆盖，代码零修改
- 原则 B：已部署静态图不能同名修改（服务器 `expires 30d`）

**它们其实分属两个阶段，用 Manifest 一层间接解决**：

```ts
// config/assets.ts —— 唯一的素材路径真相源
export const ASSETS = {
  pieces: {
    red:    '/assets/pieces/piece-red.png',
    orange: '/assets/pieces/piece-orange.png',
  },
  pet: {
    body: '/assets/pet/wangcai/body.png',
  },
} as const;
```

| 阶段 | 规则 |
|---|---|
| **开发期** | 允许同名覆盖（`piece-red.png`），Manifest 不变 |
| **发布期** | 改图必须换名（`piece-red-v2.png`），**只改 Manifest 一处** |

**硬性纪律**：

> **Scene / Gameplay 代码中不允许出现任何硬编码素材文件名。** 一律走 `ASSETS.*`。

这样换图永远只改一个文件，同时满足根 CLAUDE.md 的缓存纪律。沿用 Tavern `data/assets.ts` 的既有模式。

---

## 12. 开发批次

### Stage 0 冻结范围 ★（按 Codex §20）

| 模块 | 做 | 不做 |
|---|---|---|
| 棋盘 | 8×8（可降 7×7）、6 色、Match-3、Cascade | — |
| 特殊棋子 | Rocket H/V、Bomb | **彩虹球** |
| 障碍 | **只做 Ice** | 草地、木箱、花朵成长 |
| 关卡 | **8 关** | 其余 |
| 宠物 | Idle Puppet、Happy、**Hint** | **能量、技能**（→ Stage 0.5） |
| 花园 | 1 个院门节点、3 阶段 | 其余节点、四季 |
| 系统 | 存档、节奏设置、暂停重开、Dead Board/Shuffle | 道具、商业化、进度码导出 |

> **宠物在 Stage 0 只做 Hint、不做技能**，这是我接受 Codex 的一处范围收缩。理由成立：Hint 是"陪伴感"的最小验证单元，且策划案自己就说宠物化 Hint 是核心记忆点。技能涉及能量、UI、1.5s 窗口、`PetActionCommand` 全链路，验证价值却低于 Hint。**移入 Stage 0.5**，接口已在 §6.4 定死，不会返工。
>
> **进度码导出移到 V1 Full**（Codex §18）：它是保险不是验证点，Stage 0 只有 8 关，丢档损失可接受。

### Milestone 拆解（采纳 Codex §21）

| M | 内容 | 可验证产物 |
|---|---|---|
| **M0** | Pure TS Core + Seeded RNG + Vitest | 测试跑通 |
| **M1** | Swap / Match / Clear / Fall / Spawn / Cascade | 事件序列正确 |
| **M2** | Rocket / Bomb / Objectives / Win-Lose / DeadBoard / Shuffle | Core 玩法完整 |
| **M3** | Replay + Level Validation + Simulation | **关卡可批量验证** |
| **M4** | Phaser EventPlayer + 移动端输入 | 能用手滑了 |
| **M5** | 可玩三消 + Tempo + 基础音效 | **手感可评价** |
| **M6** | 旺财 Puppet + Reaction Resolver + Hint | **陪伴感可评价** |
| **M7** | 8 关 + 1 个花园节点 | Stage 0 完成 |
| **M8** | 真人测试 | 5 个问题的答案 |

> **M3 在 M4 之前**是刻意的：先有验证工具，再有画面。这样关卡数据从第一天起就是可信的。这也是 `core` 零 Phaser 依赖的最大回报。

**M8 验收的 5 个问题**：

1. 三消爽不爽？
2. 旺财烦不烦？
3. 50+ 用户不解释会不会玩？
4. 棋子够不够大？
5. 院门建设是否让玩家愿意继续下一关？

> 美术**并行进行**：Codex 按美术工单 V1.1 的 Stage 0 清单产出，产出后替换占位图，零改代码（走 Asset Manifest）。

### 批次 2：V1 Full（约 3~4 周）

- 彩虹球 + 全部 7 种组合
- 剩余 3 种障碍（草地、木箱、花朵成长）
- 关卡扩到 **30 关**（非 50，见评审意见 §5.3）
- 宠物完整状态机 + 能量 + 技能
- 动态辅助
- 花园完整节点 + 四季**其一**（春）
- 音频、震动、性能降级

### 批次 3：上线准备

- 微信/抖音小游戏适配评估
- 分包加载
- 商业化（**此时才设计**，V1 不留接口）

---

## 13. 需要 Kevin / Codex 确认的事项

| # | 事项 | 我的默认方案 | 影响 |
|---|---|---|---|
| 1 | 宠物位置 | **棋盘下方**（占比由 §10.1 算法推导，不固定 20%） | 已落入布局算法 |
| 2 | 棋盘尺寸 | **8×8**，小屏自动降 7×7 | 已落入布局算法 |
| 3 | 技能触发 | 自动 + 1.5s 窗口，**仅在 `turnResolved && continue` 后** | Stage 0.5，接口已冻结 |
| 4 | 星星经济 | **Progress Star 通关 +1 / 阶段 3 颗**；Mastery 另计 | 可调，纯配置 |
| 5 | 六色棋子 | ⚠️ **原色板灰度冲突，已重算** | 见美术工单 V1.1 §1.2 |
| ~~6~~ | ~~小狗名字/性格~~ | ✅ 旺财 / 活泼惹人喜爱 / 「快来玩呀！」 | 已落入 §6.0、§6.6 |

**当前无阻塞项，接口契约已冻结，可进入 M0。**

---

## 14. 接口契约冻结清单

以下 6 条是 Stage 0 的**不可变契约**。改动它们意味着返工，需要重新评审：

1. `core/` 不认识 Phaser，**也不认识旺财**
2. `settled` = 棋盘稳定；`turnResolved` = 棋盘稳定 + 目标 + 胜负
3. 宠物**只消费 `turnResolved`**，决策集中在 `resolveReaction()` 一个函数
4. 宠物改棋盘**只经 `PetActionCommand` → `applyPetAction()`**
5. 优先级 `Victory > Pet Skill > Big Combo > Hint`
6. 素材路径**只走 Asset Manifest**，不硬编码

---

## 15. 一句话总结

> **`core/` 零引擎依赖（不认识 Phaser、也不认识旺财）+ `turnResolved` 单一决策入口 + 一切数值进配置**——这三条让关卡能被脚本验证、宠物永不越界操作棋盘、策划改案不用改代码。
