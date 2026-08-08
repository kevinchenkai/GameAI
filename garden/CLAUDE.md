# CLAUDE.md — 《Garden Match》Claude Code 约束规范

> 本文件是 Claude Code 在 garden 子项目工作的**强约束规范**。开工前必读，实现中遵守。
> 依据：框架设计 `docs/Garden Match 游戏框架设计 V1.1.md`
> ＋ **`docs/Garden MatchV1.1复查反馈（Codex）.md`（含 2 项必改，见 §3，以复查为准）**。
> 仓库级约定（远端、同步、部署边界）见根目录 [`../CLAUDE.md`](../CLAUDE.md)。

---

## 1. 项目一句话

移动端 H5 三消 + 萌宠伙伴 + 花园成长。低压力玩法，核心用户为 50 岁以上与 8~15 岁两端。Phaser 3 + TypeScript + Vite，**V1 纯前端、无后端**，本地存档。

---

## 2. 角色边界

Claude Opus 是**实现方**，只负责代码 / 逻辑 / 数据 / 工程：

- ✅ 产出：`web/src/**`、`web/tests/**`、`web/tools/**`、配置、`deploy.sh`
- ❌ **不生成、不修改任何图片像素，不写美术提示词**——美术由 Codex Image Gen 按[美术素材工单](./docs/)产出，投放到 `assets/`
- 在代码中**先行约定素材路径**（走 Asset Manifest），由 Codex 按路径产出同名文件

策划案由 Codex 维护。**发现策划与框架冲突，先提出，不擅自改策划案**。

---

## 3. 接口契约（冻结，改动 = 返工）

框架设计 §14 定死 6 条，**任何实现不得违背**：

1. `core/` 不认识 Phaser，**也不认识旺财（宠物）**
2. `settled` = 棋盘稳定；`turnResolved` = 棋盘稳定 + 目标 + 胜负
3. 宠物**只消费 `turnResolved`**，决策集中在**一个**函数
4. 宠物改棋盘**只经 `PetActionCommand` → `applyPetAction()`**
5. 优先级 `Victory > Pet Skill > Big Combo > Hint`
6. 素材路径**只走 Asset Manifest**，不硬编码

### 3.1 复查必改 2 项 ★ 以此为准，勿按 V1.1 原文实现

Codex 复查反馈指出 V1.1 有两处与上述契约自相矛盾，**实现时按修正后的版本写**：

**必改 1 — `CoreTurnSummary` 中删除 `petSkillReady`**

它让 `core` 知道了宠物技能状态，与契约 1 直接冲突。正确划分：

```ts
// core 只输出纯棋盘 / 关卡信息
interface CoreTurnSummary {
  maxCascade: number; totalCleared: number;
  specialCreated: SpecialKind[]; result: 'continue' | 'win' | 'lose';
}
// 宠物运行时状态归 pet 层自己所有
interface PetRuntimeState {
  energy: number; maxEnergy: number; skillReady: boolean; state: PetState;
}
// 决策入口同时吃两份输入
resolvePetDecision(turn: CoreTurnSummary, pet: PetRuntimeState)
```

**必改 2 — `settled` 不解锁玩家输入**

`settled` 仅表示棋盘物理稳定（动画可结束），**`settled ≠ 输入可用`**。否则 `settled → levelWin` 之间存在竞态窗口，玩家可能在进入 Victory Flow 前抢下一步。输入由 Turn Controller 门控：

```text
READY_FOR_INPUT → RESOLVING → BOARD_SETTLED → TURN_RESOLVED → PRESENTATION → READY_FOR_INPUT
```

只有同时满足：`turn.result === 'continue'`、无阻塞式 Pet Reaction、无 Skill Offer、无 Pet Skill 执行中、无 Result Popup，才回到 `READY_FOR_INPUT`。输入 Buffer 也挂在该状态上。

**附带 — `skillOffer` 与 `skill` 是两个状态，不可合并**

`skillOffer` = 1.5s 可点击窗口，**棋盘未变**，可安全取消；`skill` = 技能动画与 Gameplay Action 已开始，**棋盘正在变更**，不可回退。混成一个状态会让"取消"语义无处安放。（Stage 0 不实现技能，但状态划分先定死。）

> 需要改契约时：**停下来说明理由，等用户确认**，不要边改边说。

### 3.2 V1 Full 前必须补（Stage 0 不阻塞）

**Mastery Star 按历史最高评级增量发放**，否则玩家重刷同一简单关可无限刷星：

```ts
masteryGain = Math.max(0, newRating - bestRating);   // 不倒扣
```

存档记录 `bestRating: 0 | 1 | 2 | 3`（0 = 未通关）。**Progress Star 同理只在首次通关发放** —— 重打旧关卡不应推进花园。

### 3.3 已诊断、暂缓实施的技术债

| 事项 | 状态 | 何时做 |
|---|---|---|
| **首屏加载慢**（约 4.2MB，白屏数秒）| 已实测定位，见 [TODO-性能优化.md](./docs/TODO-性能优化.md) | 🔴 **M8 之前**必须做 |

主因：**院门 4 张（3054 KB）占预加载素材的 78%，但关卡页根本不显示它们**（花园页 M7 才用）。移出 `BootScene` + 旺财延后到 M6，首屏可从 3.9MB 降到约 430KB，且**均为纯代码改动、不依赖美术**。

> 🔴 **为什么卡在 M8 之前**：M8 是真实用户测试。带着 4MB 首屏去测，
> 测到的是"加载慢"而不是"玩法好不好" —— 会污染整场测试的结论。
>
> 📌 其中**加载进度条**应纳入 **M5** 范围，不要等到优化阶段：
> 白屏是最差的等待形态，50+ 用户遇到白屏的默认反应是关掉页面。

---

## 4. 不可违背的实现准则

1. **`core/` 零引擎依赖**：`core/` 与 `config/` 中**禁止出现 `import Phaser`**（用 lint 规则强制），也**不得出现任何宠物概念**（见 §3.1 必改 1）。这是关卡可脚本验证、逻辑可单测、渲染层可替换的前提。
2. **事件序列是唯一真相源**：`core` 一次 Move 算完整段结算（含所有连锁），产出 `GameEvent[]`；渲染 / 宠物 / 音频三层**消费同一份序列**，不得各自维护一份棋盘状态。
3. **一切数值进配置**：关卡目标、宠物台词、掉落权重、动画时长、经济数值一律进 `config/`，**逻辑代码里不写死数值**。策划改案应当只改数据、不改代码。
4. **可复现随机**：随机统一走 `core/rng.ts` 的可种子化实现，**禁止散用 `Math.random()`**——复现 bug 依赖它。
5. **严格类型**：`strict: true`，**不写 `any`**。
6. **关卡数据必须过 Schema 校验**，且校验纳入 `npm test`；非法关卡数据要报错中止，**不静默失败**。

---

## 5. 目录与架构（详见框架设计 §3）

```
garden/
├── docs/              策划与设计文档
├── assets/            美术与音频（Codex 产出投放，Claude 只读）
└── web/src/
    ├── core/          ★ 纯逻辑，零 Phaser：board / matcher / resolver /
    │                    special / obstacles / generator / objective / session / rng
    ├── config/        ★ 所有可调数值：pieces / levels / pet / garden / tuning / assistance
    ├── game/          scenes / render / pet / ui / audio（Phaser 侧）
    ├── meta/          花园进度、存档
    └── main.ts
```

数据流：`输入 → core（同步、无副作用）→ GameEvent[] → render / pet / audio`

---

## 6. Stage 0 范围（已冻结，勿擅自扩张）

| 模块 | 做 | **不做** |
|---|---|---|
| 棋盘 | 8×8（可降 7×7）、6 色、Match-3、Cascade | — |
| 特殊棋子 | Rocket H/V、Bomb | **彩虹球** |
| 障碍 | **只做 Ice** | 草地、木箱、花朵成长 |
| 关卡 | **8 关** | 其余 |
| 宠物 | Idle、Happy、**Hint** | **能量、技能**（→ Stage 0.5） |
| 花园 | 1 个院门节点、3 阶段 | 其余节点、四季 |
| 系统 | 存档、节奏设置、暂停重开、Dead Board/Shuffle | 道具、商业化、进度码导出 |

> 宠物技能接口已在框架 §6.4 定死，Stage 0.5 接入不会返工——**但 Stage 0 不要提前实现**。

---

## 7. 技术栈与开发

| 部分 | 选择 |
|---|---|
| 渲染 | Phaser ^3.90 |
| 语言 | TypeScript ^5.8（`strict`） |
| 构建 | Vite ^5.4，生产 `base` = `/garden/` |
| 测试 | Vitest ^2.x（主要测 `core`） |
| 后端 | **无** |

工程约定沿用 `Tavern/web/`（同为 Phaser 3.90 + TS + Vite 5），差异：Garden 无后端、不需要 API 代理。

---

## 8. 验证与提交

- 提交前：`npm run build`（tsc + vite，零报错）、`npm test`（含关卡 Schema 校验）通过
- `core/` 改动必须补单测——连锁与特殊棋子组合是 bug 高发区
- 关卡改动跑 `tools/` 的可解性模拟器，确认可过关
- commit 前缀 `feat(garden): ...` / `fix(garden): ...` / `docs(garden): ...`，中文描述
- **未经用户要求不擅自 push**

---

## 9. 部署（尚未上线）

- 目标：`/www/wwwroot/g.ismayday.mobi/garden/` —— **本项目唯一可写目录**
- `deploy.sh` 沿用其它项目模式，`rsync --delete` **只对 `$REMOTE_APP_DIR`**，绝不碰站点根
- 站点根还有首页与 tavern / soulmate / star_fighter / journey，以及非本仓库的 mimo / mystock，详见[根 CLAUDE.md](../CLAUDE.md) §1.1

---

## 10. 红线

- ❌ 在 `core/` 或 `config/` 里 `import Phaser`，或让 `core` 出现宠物概念（如 `petSkillReady`）
- ❌ 用 `settled` 解锁玩家输入（须经 Turn Controller，见 §3.1 必改 2）
- ❌ 让宠物绕过 `PetActionCommand` 直接改棋盘
- ❌ 把数值 / 台词 / 时长写死进逻辑代码
- ❌ 散用 `Math.random()` 而非 `core/rng.ts`
- ❌ 写 `any`、关掉 `strict`
- ❌ 生成或修改美术素材、写美术提示词
- ❌ 擅自改动 §3 冻结契约或扩张 Stage 0 范围
- ❌ 部署波及站点根或其它子项目
- ❌ 未经用户要求 push
