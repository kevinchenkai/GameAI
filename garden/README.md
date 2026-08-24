# Garden Match / 治愈花园

移动端优先的 **H5 三消 + 萌宠伙伴 + 花园成长**。低压力玩法——不限时、不催促，
每次通关都让花园长出一点新风景。核心用户是 **50 岁以上与 8~15 岁**两端，
因此一切设计向**可读性与从容节奏**倾斜。

**线上体验**：https://g.ismayday.mobi/garden/

**当前状态**：Stage 0 全部功能上线，UI 美化（A 类 + B1）已完成。下一步 **M8 真人测试**。

---

## 特性

| | |
|---|---|
| **8 关** | 7×7 棋盘、6 色，全部经可解性模拟器验证 |
| **Match-3 + 连锁** | 一次 Move 由 `core` 算完整段结算，含所有 Cascade |
| **特殊棋子** | Rocket H/V、Bomb（彩虹球属 Stage 1，未做） |
| **障碍** | Ice（草地 / 木箱 / 花朵成长属后续阶段） |
| **萌宠旺财** | Idle / Happy / Hint 三种反应，只消费 `turnResolved` |
| **花园成长** | 院门节点 3 阶段，随通关推进 |
| **不卡死** | Dead Board 检测 + Shuffle；refill 从源头避免制造死局，死局率 **8% → 0.5%** |
| **完整存档** | 关卡进度、花园进度、节奏设置、音量偏好 |
| **首屏 206 KB** | 从 4276 KB 降 95%，详见下文 |

---

## 技术栈

| 部分 | 选择 |
|---|---|
| 渲染 | Phaser ^3.90 |
| 语言 | TypeScript ^5.8（`strict`，零 `any`） |
| 构建 | Vite ^5.4，生产 `base` = `/garden/` |
| 测试 | Vitest ^2.1（**680 项 / 40 文件**） |
| 后端 | **无**——纯前端，localStorage 存档 |

规模：源码 10493 行 / 59 文件，测试 8469 行 / 41 文件。

---

## 架构

```
garden/
├── docs/              策划与设计文档（入口见 docs/README.md）
├── orders/            美术出图工单（Codex 产出，Claude 只读）
├── assets/            美术与音频素材
└── web/src/
    ├── core/          ★ 纯逻辑，零 Phaser、零宠物概念
    │   ├── board / matcher / resolver / special / obstacles
    │   ├── generator / objective / session
    │   ├── petAction.ts     PetActionCommand —— 宠物改棋盘的唯一入口
    │   ├── validateLevel.ts 关卡 Schema 校验（纳入 npm test）
    │   ├── simulate.ts      可解性 / 死局率模拟
    │   └── rng.ts           可种子化随机
    ├── config/        ★ 所有可调数值：pieces / levels / pet / pet-rig /
    │                    garden / tuning / assistance / audio / assets
    ├── game/          Phaser 侧
    │   ├── TurnController.ts  ★ 回合状态机，门控玩家输入
    │   ├── scenes / render / pet / ui / audio / input
    └── meta/          save / settings / gardenProgress
```

数据流：`输入 → core（同步、无副作用）→ GameEvent[] → render / pet / audio`

### 冻结契约（改动 = 返工）

1. **`core/` 不认识 Phaser，也不认识旺财**——关卡可脚本验证、逻辑可单测的前提
2. `settled` = 棋盘稳定；`turnResolved` = 棋盘稳定 + 目标 + 胜负
3. 宠物**只消费 `turnResolved`**，决策集中在一个函数
4. 宠物改棋盘**只经 `PetActionCommand` → `applyPetAction()`**
5. 优先级 `Victory > Pet Skill > Big Combo > Hint`
6. 素材路径**只走 Asset Manifest**，不硬编码

完整规范与两项复查必改见 [CLAUDE.md](./CLAUDE.md) §3。

---

## 开发

```bash
cd web
npm install
npm run dev
```

提交前三件套（必须全绿）：

```bash
npm run lint && npm test && npm run build
```

关卡工具：

```bash
npm run validate-levels    # 校验全部关卡可解
npm run simulate           # 批量试玩，输出通过率 / 死局率 / 调优建议
```

---

## 三个必读的坑

### 1. `settled` 不解锁玩家输入

`settled` 只表示棋盘**物理**稳定（动画可结束）。直接用它开输入，
`settled → levelWin` 之间存在竞态窗口，玩家能在进入 Victory Flow 前抢下一步。
输入统一由 `TurnController` 门控：

```text
READY_FOR_INPUT → RESOLVING → BOARD_SETTLED → TURN_RESOLVED → PRESENTATION → READY_FOR_INPUT
```

### 2. 全项目只能有一个 AudioContext，且必须是 Phaser 那个

Phaser 在 `new Phaser.Game()` 时就自建了 context 并挂了解锁 handler。
iOS **按 context 逐个授权**——自己再 `new AudioContext()` 必然静默。
`LevelScene` 里 `adoptContext(this.sound.context)` 接管。

> ⚠️ **iOS 行为无头浏览器复现不了，音频改动必须真机复验，单测不作数。**
> 这个坑归因错了三次，复盘见 [M8 §7](./docs/M8%20真人测试准备.md)。

### 3. 单测全绿 ≠ 渲染层没问题

Stage 0 出现 4 次以上：数据对、**接缝**错。渲染层改动必须浏览器实跑，
且**读运行时状态**而非只看截图。

---

## 首屏优化（4276 KB → 206 KB，降 95%）

三步：院门移出 `BootScene`（−3064 KB）、**删掉 6 张从没被画过的贴图**
（−660 KB，占当时首屏 54%）、pngquant 压缩（−63%）。

> 📌 已加防回归测试：`BootScene` 里 load 的每个 TEX 必须在渲染层被引用。
> 这类"下载了但没人画"的浪费**没有任何症状**，靠人 review 抓不到。

完整过程见 [TODO-性能优化](./docs/TODO-性能优化.md)。

---

## 文档

| 文档 | 内容 |
|---|---|
| [文档索引](./docs/README.md) | **推荐入口**——按"我想做什么"导航 |
| [CLAUDE.md](./CLAUDE.md) | 红线、冻结契约、Stage 0 范围、部署边界 |
| [游戏框架设计 V1.1](./docs/Garden%20Match%20游戏框架设计%20V1.1.md) | 架构、数据流、状态机、布局算法 |
| [开发日志 Stage 0（M0~M7）](./docs/开发日志%20Stage%200（M0~M7）.md) | 踩过的坑与取舍——代码里看不出来的原因 |
| [开发日志 UI 美化](./docs/开发日志%20UI%20美化（A%20类%20+%20B1）.md) | A1~A6 + B1 的完整记录 |
| [M8 真人测试准备](./docs/M8%20真人测试准备.md) | 主持人速查卡 + 记录表，可直接打印 |
| [美术素材工单 V1.1](./docs/美术素材工单%20V1.1（Codex%20image-2）.md) | 色板、尺寸、命名、各批素材规格 |

---

## 协作方式

**Kevin（产品决策与真机验收）+ Codex（策划与美术）+ Claude（实现与工程）**。

角色边界是硬的：Claude 只写代码 / 逻辑 / 数据 / 配置，
**不生成也不修改任何图片像素，不写美术提示词**——
美术由 Codex 按工单产出，代码侧先经 Asset Manifest 约定路径。
