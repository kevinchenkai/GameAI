# AGENTS.md — 《Journey Ludo》多智能体协作边界

> 本文件规定 **Claude Code** 与 **Codex** 在同一项目目录中的协作规则。
> 两个执行体共享仓库，但职责边界严格划分，**互不越界**。
> 详细分工见主方案 [`docs/JOURNEY_LUDO_V0_1_PLAN.md`](./docs/JOURNEY_LUDO_V0_1_PLAN.md) §13。

---

## 1. 角色与职责

| 执行体 | 角色 | 一句话职责 |
|---|---|---|
| **Claude Code + Godot** | 编码线 | 一切代码、逻辑、数据、引擎工程 |
| **Codex + imagegen** | 美术线 | 一切视觉素材的提示词与生成 |

---

## 2. 目录拥有权（硬边界）

| 路径 | 拥有方 | 另一方权限 |
|---|---|---|
| `project.godot` | Claude Code | Codex 只读 |
| `scenes/**` | Claude Code | Codex 只读 |
| `scripts/**` | Claude Code | Codex 只读（可审核提建议） |
| `data/**`（`*.json`） | Claude Code | Codex 只读 |
| `docs/JOURNEY_LUDO_V0_1_PLAN.md` | 共同（改动需双方知会） | — |
| `docs/CLAUDE_TASKS.md` | Claude Code | Codex 只读 |
| `README.md` | Claude Code | Codex 只读 |
| `prompts/imagegen/**` | Codex | Claude Code 只读 |
| `prompts/audio/S4_SFX_BRIEF.md` | Claude Code（写需求）→ Codex（执行检索） | 需求由编码侧写定，Codex 据此产出 SFX |
| `prompts/audio/S4_BGM_PROMPTS.md` | Claude Code（写提示词）→ 用户 + Gemini（生成） | BGM 由用户用 Gemini 产出 |
| `assets/raw/**` | Codex | Claude Code 只读 |
| `assets/sprites/**` | Codex（产出文件） | Claude Code 只读引用 |
| `assets/backgrounds/**` | Codex（产出文件） | Claude Code 只读引用 |
| `assets/audio/sfx/**` | Codex（产出文件，CC0 检索） | Claude Code 只读引用 |
| `assets/audio/bgm/**` | 用户 + Gemini（产出文件） | Claude Code 只读引用 |
| `docs/ART_ASSET_LIST.md` | Codex | Claude Code 只读 |
| `AGENTS.md` | 共同（改动需双方知会） | — |

**铁律**
- Claude Code **不生成、不修改任何图片像素 / 音频采样，不写美术提示词**（音频需求 brief 由编码侧写、产出归 Codex / Gemini）。
- Codex **不写、不改任何 `.gd` / `.tscn` / `.json` 代码与数据文件**（含 `data/audio.json`）。

---

## 3. 交接契约（接口约定）

两侧通过**文件命名 + 目录约定**解耦，互不阻塞。

### 3.1 命名契约
- 素材文件名 / 路径由 **Claude Code 在 `data/*.json` 中先行约定**（如 `"sprite": "res://assets/sprites/characters/sun_wukong.png"`）。
- **Codex 按该路径产出同名 PNG**。
- 完整命名映射见 [`prompts/imagegen/ART_ASSET_PROMPTS.md`](./prompts/imagegen/ART_ASSET_PROMPTS.md) §3。
- 任一方需新增 / 改名素材：**先改主方案文档登记，再执行**。

### 3.2 规格契约
- 尺寸、透明背景、分层要求由主方案 §12.2 与 `ART_ASSET_PROMPTS.md` 固定。
- 变更规格需先改文档。

### 3.3 占位先行
- Claude Code 用**占位图形**（纯色圆形 / 方块）跑通逻辑（Milestone 1–4），**不等待美术**。
- Codex 的正式素材在 **Milestone 5** 替换占位图。
- 二者并行，任一方未就绪不阻塞另一方。

### 3.4 接入归属
- 把 PNG **放进目录** → Codex。
- 在场景 / 数据中**引用并调整显示**（缩放、锚点、层级）→ Claude Code。

### 3.5 审核（只读）
- Codex 可对 Claude Code 的实现做**只读审核并提建议**，**不直接改代码**，由 Claude Code 落实。
- Claude Code 可对美术风格 / 命名一致性提反馈，**不直接改素材**，由 Codex 落实。

---

## 4. 状态同步

- **资产状态**：Codex 维护 `docs/ART_ASSET_LIST.md`，标记每项素材为 `待生成 / 已生成 / 已接入`。
- **接入触发**：Codex 完成一批素材并落位后，更新清单 → Claude Code 据清单接入（Task 8）。
- **里程碑**：双方共同对齐主方案 §14 的 M0–M5；M1–M4 为编码线主导，M5 为美术接入。

---

## 5. 规则一致性（编码线必须遵守）

所有游戏逻辑实现以主方案 **§3.4 规则裁决表** 与 **§5.1 事件总表** 为唯一准绳：
事件链二次触发、再掷上限、胜利判定时机、击退距离、护盾语义、交换边界、行动顺序、可复现 RNG。
**禁止任一执行体自行约定与文档冲突的规则。** 如发现规则空洞，先补主方案文档，再实现。

---

## 6. 提交规范

- 每完成一个模块 / 一批素材提交一次 commit。
- 编码线 commit 前缀：`feat(taskN): ...` / `fix: ...`。
- 美术线 commit 前缀：`art(BN): ...`（N 为批次号）。
- 涉及共享文档（主方案 / AGENTS）的改动，commit message 注明知会对方。
