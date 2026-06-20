# 《Journey Ludo》Claude Code 开发任务手册

> 配套文档：[`JOURNEY_LUDO_V0_1_PLAN.md`](./JOURNEY_LUDO_V0_1_PLAN.md)（主方案，含 §3.4 规则裁决表与 §5.1 事件总表）
> 适用对象：**Claude Code + Godot**（编码线，详见主方案 §13.1 分工边界）
> 目标：按任务顺序开发出一局可玩的 72 格西游主题飞行棋 Demo。

---

## 0. 开发总则

1. **先逻辑、后美术**：M1–M4 全程使用占位图形（纯色圆形 / 方块），不等待任何美术素材。
2. **规则以 §3.4 为准**：所有事件链、击退、护盾、胜利判定必须严格按主方案 §3.4 裁决表实现，禁止自行约定。
3. **数据驱动**：地图 / 事件 / 角色 / 平衡全部由 `data/*.json` 配置，代码不写死规则数值。
4. **可复现**：统一单一 `RandomNumberGenerator`，支持 `balance.json.debug_seed` 固定种子。
5. **边界自律**：只产出 `.gd` / `.tscn` / `.json` / `project.godot` / `docs/`；**不生成、不修改任何图片像素，不写美术提示词**。
6. **每个 Task 一次提交**：完成即 commit，commit message 用 `feat(taskN): ...`。

---

## 1. 文件拥有权（Claude Code 侧）

| 目录 / 文件 | 说明 |
|---|---|
| `project.godot` | 引擎配置、autoload 单例注册 |
| `scenes/**` | 所有 `.tscn` 场景 |
| `scripts/**` | 所有 `.gd` 脚本 |
| `data/**` | `characters.json` / `board_72.json` / `events.json` / `balance.json` |
| `docs/**` | 开发文档（本文件、主方案） |
| `README.md` | 运行说明 |

**不拥有**（属 Codex）：`prompts/imagegen/**`、`assets/raw/**`、`assets/sprites/**`、`assets/backgrounds/**`、`docs/ART_ASSET_LIST.md`。
Claude Code 在数据文件中**先行约定素材路径**（如 `res://assets/sprites/characters/sun_wukong.png`），Codex 按该路径产出同名 PNG。占位阶段路径可指向临时占位图。

---

## 2. autoload 单例规划

在 `project.godot` 的 `[autoload]` 注册以下单例（全局可访问，避免到处传引用）：

```text
GameManager   res://scripts/GameManager.gd      # 主状态机
TurnManager   res://scripts/TurnManager.gd       # 回合 / 顺序
BoardManager  res://scripts/BoardManager.gd      # 棋盘数据与坐标
EventManager  res://scripts/EventManager.gd      # 事件原始效果结算
SkillManager  res://scripts/SkillManager.gd      # 被动技能 hook 管线
AudioManager  res://scripts/AudioManager.gd       # 首版空接口占位
GameRng       res://scripts/GameRng.gd            # 全局可复现随机数
```

> `DiceController` / `AIController` / `UIManager` / `CharacterPiece` 为场景内节点脚本，不作 autoload。

---

## 3. 任务列表

每个任务给出：目标、交付物、实现要点、验收。任务之间尽量解耦，可按序推进。

---

### Task 1 — 项目基础结构

**目标**：创建可运行的空 Godot 项目与目录骨架。

**交付**
- `project.godot`（2D 项目，Compatibility 渲染，autoload 注册见 §2）
- 目录结构（按主方案 §9.2）
- `scenes/Main.tscn`、`scenes/GameScene.tscn`、`scripts/GameManager.gd`（空状态机骨架）
- `scripts/GameRng.gd`：封装单一 RNG，读取 `balance.json.debug_seed`（null 则随机）
- `README.md`：如何在 Godot 4.x 打开与运行

**实现要点**
- `GameManager` 实现 §10.1 状态枚举（先空转，仅打印状态）。
- 若计划 Web 展示：本任务内**验证空项目可成功导出 HTML5**，记录到 README。

**验收**：Godot 打开无报错，运行进入 `Main.tscn`，控制台打印初始状态；（可选）Web 导出成功。

---

### Task 2 — 72 格棋盘

**目标**：由配置生成 72 格并提供路径查询。

**交付**
- `scenes/board/Board.tscn`、`scenes/board/Tile.tscn`
- `scripts/BoardManager.gd`
- `data/board_72.json`（72 条，字段：`index` / `region` / `tile_type` / `event_id`，按 §5.1）
- 格子索引显示调试开关（每格上方显示编号）

**实现要点**
- `BoardManager` 加载 JSON 后**校验**：每个非空 `event_id` 必须存在于 `events.json`（见 Task 5），否则 `push_error` 中止。
- 保存每格屏幕坐标，提供 `get_tile_position(index)`、`get_event_id(index)`、`get_tile_type(index)`。
- 占位：格子用纯色圆形，按 §3.4.4 类型上色（普通灰 / 奖励绿 / 惩罚红 / 驿站蓝 / 传送紫 / 起终点金）。

**验收**：72 格按取经路线排布，调试开关可显示编号，坐标查询正确。

---

### Task 3 — 角色与移动

**目标**：4 个角色可按点数逐格移动。

**交付**
- `scenes/pieces/CharacterPiece.tscn`、`scripts/CharacterPiece.gd`
- `data/characters.json`（4 角色，字段按主方案 §11.1）

**实现要点**
- 逐格移动动画（Tween 沿路径点逐格走，便于将来在中途格触发事件）。
- 同格并排显示：四角偏移（左上/右上/左下/右下），见 §3.4.4。
- `current_index` 状态、状态图标挂点、气泡挂点（供后续技能用）。

**验收**：4 个占位棋子出现在起点，给定点数能正确逐格走到目标格并停下。

---

### Task 4 — 回合与骰子

**目标**：玩家与 AI 轮流掷骰行动，回合不卡死。

**交付**
- `scripts/TurnManager.gd`、`scripts/DiceController.gd`
- `scripts/AIController.gd`（仅自动行动，见 §8.2）
- `scenes/ui/TurnPanel.tscn`、`scenes/ui/DicePanel.tscn`

**实现要点**
- 行动顺序固定 悟空→八戒→唐僧→沙僧；**玩家所选角色插到首发**（§3.4.7）。
- `DiceController` 用 `GameRng`，应用 `dice_plus` / `dice_minus`（夹在 1–6）。
- 玩家回合：等待点击骰子；AI 回合：按 §8.2 时序自动（等待 0.5s → 掷 → 等动画 → 移动 → 等 0.5s → 结束）。
- 接入 `GameManager` 状态机回边：`stay` 状态在 `TURN_START` 直接跳 `NEXT_TURN`。

**验收**：玩家点击掷骰、AI 自动掷骰，四方循环行动，连续多回合不卡死。

---

### Task 5 — 事件系统

**目标**：落地格触发事件并弹窗展示。

**交付**
- `scripts/EventManager.gd`
- `data/events.json`（35 条，按 §5.1 总表，含 `negative` 标签）
- `scenes/ui/EventPopup.tscn`

**实现要点**
- 支持全部 `effect_type` 枚举（§5.1）：`move_forward` / `move_backward` / `warp_to` / `stay` / `stay_and_shield` / `gain_status` / `clear_negative` / `clear_then_forward` / `re_roll` / `dice_gate` / `dice_gate_stay` / `swap_random` / `swap_front` / `reorder_all` / `random_negative` / `finish`。
- **严格遵守 §3.4.1**：事件引发的移动落地后**不再二次触发**事件（用 `事件移动` flag）。
- `re_roll` 单回合限 1 次（§3.4.2）；胜利判定每次移动后即时（§3.4.3）。
- 交换 / 重排序按 §3.4.6 处理边界（排除终点角色、前方无人则无效）。
- `EventManager` 只算**原始效果**，技能与护盾由 SkillManager 管线介入（见 Task 6），此处不做技能判断。

**验收**：踩到各类特殊格弹出对应事件并正确改变状态/位置；无死循环；过 72 即胜。

---

### Task 6 — 角色被动技能（hook 管线）

**目标**：4 角色差异化，护盾/免疫/状态正确结算。

**交付**
- `scripts/SkillManager.gd`（hook 管线，见主方案 §10.7）
- 状态系统：`shield`（上限 2）/ `stay` / `dice_plus` / `dice_minus` / `negate_negative` / `counter_shield`

**实现要点（hook 时机）**
- `on_before_dice`：孙悟空掷 6 额外 +2；应用 dice±1。
- `on_reward_move` / `on_negative_move`：沙僧 +1 / -1（双向，§6.4）。
- `on_negative_apply`：结算优先级 **免疫负面 > 护盾**（§7）。
- `on_knockback`：八戒 50% 免疫；反击护盾让攻击者后退 3，双方都有时只结算一层不互弹（§3.4.5）。
- `on_pass_post_station`：唐僧过驿站 +1 护盾，封顶 2。
- 中性位置事件（`swap_*` / `reorder_all`）**护盾不可抵消**（§3.4.5）。

**验收**：四角色被动均生效；护盾抵消负面、停留跳过、骰子修正、气泡显示正常；护盾不超过 2。

---

### Task 7 — 结算界面

**目标**：终局显示胜者与排名，可重开。

**交付**
- `scenes/ResultScene.tscn`、`scenes/ui/RankingPanel.tscn`
- 排名数据（按 `current_index` 降序，已达终点者优先）
- 重新开始按钮（回到角色选择）

**验收**：第一个到达/超过 72 的角色判胜，结算界面显示胜者与四方排名，重开可再玩一局。

---

### Task 8 — 美术接入（与 Codex 交接）

**目标**：用 Codex 产出的正式 PNG 替换占位图形。

**Claude Code 负责的部分**
- 在场景 / 数据中**引用并调整显示**：替换占位为 `assets/sprites/...` 下的正式素材，调整缩放、锚点、层级。
- 地图底图与格子节点分离（底图一层，格子/棋子在上层），见主方案 §16.1。

**不负责**：把 PNG 放进目录、生成素材本身（属 Codex）。

**前置依赖**：Codex 已按 `docs/ART_ASSET_LIST.md` 产出素材并落位。若某素材未就绪，保留占位、记录待接入，不阻塞其它工作。

**验收**：占位图形全部替换为正式 Q 版素材，地图/角色/图标/UI 显示正常，可导出 PC（及可选 Web）展示版。

---

## 4. 平衡验证任务（M4 后）

- 写**纯逻辑模拟脚本**（无渲染），借助 `GameRng` 固定种子跑 1000 局自动对局。
- 统计：平均回合数、单局时长方差、四角色胜率分布。
- 据此微调事件密度与技能数值（见主方案 §16.4）。

---

## 5. 里程碑对照（与主方案 §14 一致）

| 里程碑 | 覆盖任务 | 关键验收 |
|---|---|---|
| M0 项目准备 | Task 1 | 可运行空场景；（可选）Web 导出验证；autoload 就绪 |
| M1 核心循环 | Task 2/3/4 | 占位棋子可掷骰、移动、轮流、判胜；可复现 RNG 就绪 |
| M2 地图与事件 | Task 5 | 72 格 + 主要事件可触发，弹窗显示结果 |
| M3 AI 陪玩 | Task 4(AI) | 3 AI 自动完整对局，不卡回合 |
| M4 角色差异化 | Task 6 | 4 被动生效，状态系统正常 |
| M5 美术接入 | Task 7/8 | 正式素材接入，可导出展示版 |
