# CLAUDE.md — 《Journey Ludo》Claude Code 约束规范

> 本文件是 Claude Code 在本项目工作的**强约束规范**。开工前必读，实现中遵守。
> 关联文档：主方案 [`docs/JOURNEY_LUDO_V0_1_PLAN.md`](./docs/JOURNEY_LUDO_V0_1_PLAN.md)、任务手册 [`docs/CLAUDE_TASKS.md`](./docs/CLAUDE_TASKS.md)、协作边界 [`AGENTS.md`](./AGENTS.md)。

---

## 1. 项目一句话

以《西游记》取经路线为主题的 Q 版 2D 单线 72 格飞行棋（Godot 4.x）。玩家选 1 角色，其余 3 个 AI，先到第 72 格者胜。首版目标：一局可玩、可展示的核心闭环 Demo。

---

## 2. 角色边界（铁律）

Claude Code 是**编码线**，只负责代码 / 逻辑 / 数据 / 引擎工程：

- ✅ 产出：`*.gd`、`*.tscn`、`project.godot`、`data/*.json`、`docs/`、`README.md`
- ❌ **不生成、不修改任何图片像素，不写美术提示词**（属 Codex + imagegen，见 [AGENTS.md](./AGENTS.md) §2）
- ❌ 不动 `prompts/imagegen/**`、`assets/raw|sprites|backgrounds/**`、`docs/ART_ASSET_LIST.md`
- 在数据文件中**先行约定素材路径**（如 `res://assets/sprites/characters/sun_wukong.png`），由 Codex 按路径产出同名 PNG。

---

## 3. 不可违背的实现准则

1. **规则唯一来源**：所有游戏逻辑以主方案 **§3.4 规则裁决表** 与 **§5.1 事件总表** 为准。禁止自行约定与文档冲突的规则；发现规则空洞，**先补主方案文档，再实现**。
2. **数据驱动**：地图 / 事件 / 角色 / 平衡数值全部由 `data/*.json` 配置，**代码不写死规则数值**。新事件优先复用已有 `effect_type`，只换 `id` / `name` / 文案。
3. **可复现随机**：全局统一单一 `RandomNumberGenerator`（autoload `GameRng`），读取 `balance.json.debug_seed`（null 则随机）。禁止散落的 `randi()` 直接调用。
4. **先逻辑后美术**：M1–M4 全程用占位图形（纯色圆形 / 方块）跑通逻辑，**不等待任何美术素材**；正式素材在 M5 替换占位。
5. **数据校验前置**：`BoardManager` 加载 `board_72.json` 时校验每个非空 `event_id` 必须存在于 `events.json`，否则 `push_error` 中止——**禁止运行时静默失败**。
6. **技能解耦**：`EventManager` 只算原始效果；技能与护盾由 `SkillManager` 以 hook 注册介入（见主方案 §10.7）。禁止跨 Manager 直接硬编码技能判断。

---

## 4. 核心规则速查（细节以主方案 §3.4 为准）

| 主题 | 规则 |
|---|---|
| 事件二次触发 | 骰子移动落地触发事件；**事件引发的移动落地不再二次触发**（`re_roll` 除外） |
| 再掷一次 | 单回合最多 1 次；停留时整回合跳过、不结算事件 |
| 胜利判定 | 每次位置变更后即时判定 `index>=72`，判胜立即中止本回合后续结算 |
| 击退 | 后退 3 格；**起点格 / 已到终点角色豁免**；允许同格四角偏移渲染 |
| 护盾 | 仅抵消 `negative==true` 且直接作用于自己的效果；**上限 2 层**；中性位置事件（交换/重排序）不可抵消 |
| 状态优先级 | 免疫负面 > 护盾 |
| 行动顺序 | 悟空→八戒→唐僧→沙僧循环；**玩家所选角色插到首发** |

---

## 5. 目录与命名约定

- 目录结构遵守主方案 §9.2。autoload 单例见 [CLAUDE_TASKS.md](./docs/CLAUDE_TASKS.md) §2。
- 脚本：`PascalCase.gd`（与节点 / 类名一致）。
- 数据文件：`snake_case.json`，字段 `snake_case`。
- `event_id` / `status` / `effect_type`：`snake_case`，取值必须出自主方案 §5.1 枚举。
- 资源引用统一用 `res://...` 绝对路径。

---

## 6. 编码规范（GDScript / Godot 4.x）

- 目标引擎 **Godot 4.2+**，2D 项目，Compatibility 渲染。
- 用 GDScript 静态类型标注（`var x: int`、`func f() -> void`），优先信号（signal）解耦节点通信。
- 节点查找避免硬编码深路径，优先导出变量（`@export`）或 autoload 单例引用。
- UI 文案、数值不写死在脚本里——文案随事件数据，数值入 `balance.json`。
- `AudioManager` 首版仅保留**空接口方法签名**，不接入音频资源。

---

## 7. 验证与提交

- **每个 Task 一次提交**，完成即 commit。
- commit 前自检：Godot 打开无报错、目标场景可运行、无回合卡死（对照主方案 §15 验收标准）。
- M4 后写**纯逻辑模拟脚本**（无渲染，固定种子跑 1000 局）验证平衡，再调数值（主方案 §16.4）。
- 若计划 Web 展示：M0 即验证空项目能成功导出 HTML5，勿拖到 M5。

### 提交规范
- 分支：首版可简化为 `main`（或 `main → dev`）。当前文档已落在 `main`。
- commit 前缀：`feat(taskN): ...` / `fix: ...` / `docs(journey): ...`。
- commit message 结尾附：
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- 不提交 `.DS_Store`（已 gitignore）；不擅自提交美术素材（属 Codex 的批次提交）。
- **未经用户要求不擅自 push**。

---

## 8. 红线（禁止项汇总）

- ❌ 生成 / 修改图片、写美术提示词
- ❌ 把规则数值写死在代码里
- ❌ 绕过主方案 §3.4 / §5.1 自定规则
- ❌ 散用 `randi()` 而非全局 `GameRng`
- ❌ 数据引用错配时静默失败
- ❌ 为跑通逻辑而阻塞等待美术素材
- ❌ 未经要求 push 或改动其它项目（仓库根下还有 soulmate / Tavern 等，互不干涉）
