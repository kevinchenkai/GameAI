# StackPop / 萌宠叠叠消

移动端优先的**竖屏 H5 Triple-Match**（羊了个羊类）消除游戏。
从棋盘上取牌进入下方 7 格暂存区，**同色三张自动消除**；暂存区满则失败。

**线上体验**：https://g.ismayday.mobi/stack/

**当前状态**：V1 已上线，iPhone 真机验收通过。20 关全部经 Solver 穷举验证可解。

---

## 特性

| | |
|---|---|
| **20 关** | L1~L5 手工配置，L6~L20 按 V0.3.4 难度曲线种子生成，全部可解 |
| **保证不卡死** | 打乱走 `findSolvableShuffle`，只在存在可解排列时提供 |
| **三星评级** | 按步数与撤回次数评定 |
| **完整存档** | 关卡进度、断点续玩、音量与震动偏好 |
| **8 类图案** | 灰度 32px 下仍可辨——色盲玩家可玩 |
| **高分屏适配** | 缓冲区按 DPR 放大（封顶 2×），文字锐利 |
| **BGM + 音效** | 全局单 AudioContext，iOS 静音路径已排除 |

---

## 技术栈

| 部分 | 选择 |
|---|---|
| 渲染 | Phaser ^3.90 |
| 语言 | TypeScript ^5.8（`strict`，零 `any`） |
| 构建 | Vite ^5.4，生产 `base` = `/stack/` |
| 测试 | Vitest ^2.1（**131 项 / 19 文件**） |
| 后端 | **无**——纯前端，localStorage 存档 |

规模：源码 5332 行 / 53 文件，测试 1567 行。

---

## 架构

```
web/src/game/
├── core/            ★ 纯逻辑，零 Phaser 依赖
│   ├── rules/       ★ 规则单一真源——canPick / applyPick / resolveMatches / checkStatus
│   │                  被 GameModel / Solver / Simulator 共用
│   ├── GameModel.ts       对局状态机
│   ├── Solver.ts          BFS 求解器（按整列内容剪枝）
│   ├── Simulator.ts       三种 Bot 策略批量试玩
│   ├── Shuffle.ts         findSolvableShuffle —— 只在存在可解排列时打乱
│   ├── UndoManager.ts     撤回栈
│   ├── LevelGenerator.ts  按难度曲线生成关卡
│   ├── StarRating.ts      三星评级
│   └── SeededRandom.ts    可种子化随机
├── render/          纯绘制模块（只吃 layout + state，只产出 GameObject）
├── ui/              uiScale / RoundedButton / tileVisualStyle / toolButtonStyle / trayPresentation
├── layout/          GameLayout —— 纯函数布局求解
├── systems/         AudioSystem / SaveManager / InputQueue / SolverWorkerClient
├── scenes/          Boot / Preload / Home / HowToPlay / LevelSelect / Game / Settings / BackgroundMusic
├── workers/         Solver Web Worker
└── config/          ★ 所有可调数值：layout / tuning / assets / levelCurve
```

### 关键约束

1. **`core/` 零引擎依赖**——不 `import Phaser`，逻辑可脱离渲染单测
2. **规则单一真源**——`core/rules/` 被 GameModel / Solver / Simulator 共用，有**引用相等性测试**锁死
3. **纯函数返回命中区**——`calculateBottomAlignedBoardPlacements` 让渲染与测试共用同一套坐标，**结构上杜绝**「画面改了但点击留在旧位置」
4. **视觉参数集中**——`GAME_UI` token，逻辑代码里不写死数值
5. **可复现随机**——统一走 `core/SeededRandom.ts`，禁止散用 `Math.random()`

---

## 开发

```bash
cd web
npm install
npm run dev          # 开发服务器 :5176
```

提交前三件套（必须全绿）：

```bash
npm run lint && npm test && npm run build
```

关卡工具：

```bash
npm run generate-levels                  # 按难度曲线生成 L6~L20
npm run validate-levels                  # 校验全部关卡可解
npm run validate-levels:stable           # 多种子稳定性校验
npm run simulate                         # 三 Bot 批量试玩
```

### 布局调试参数

```text
?level=1  ?level=20
?layout=depth12&overlap=0.80
?layout=depth12&overlap=0.83
```

---

## 两个必读的坑

### 1. 全项目只能有一个 AudioContext，且必须是 Phaser 那个

Phaser 在 `new Phaser.Game()` 时就自建了 context 并挂了解锁 handler。
iOS **按 context 逐个授权**——自己再 `new AudioContext()` 必然静默。
音频层统一走 `adoptContext(this.sound.context)` 接管。

> ⚠️ **iOS 行为无头浏览器复现不了，音频改动必须真机复验，单测不作数。**

### 2. 游戏内坐标是物理像素，不是 CSS 像素

`main.ts` 用 `Scale.NONE` + `zoom = 1/renderScale()` 把缓冲区按 DPR 放大
（封顶 2×，因为 3× 意味着 **9 倍填充率**）。因此：

- 布局与字号**一律**经 `game/ui/uiScale.ts` 的 `px()` / `fontPx()` 换算
- `scaleLayout()` 必须先在 CSS px 下解算布局再缩放——直接喂物理像素会撞 `tileSizeMax`
- 漏乘 `px()` **不报错**，只是看起来不对，`uiLint.test.ts` 有防回归规则

---

## 文档

| 文档 | 内容 |
|---|---|
| [项目总结 V1](./docs/StackPop_项目总结_V1.md) | **推荐入口**——完整设计 / 开发 / 验收流程，Claude + Codex 共同撰写 |
| [策划方案 V0.3](./docs/H5_StackPop_游戏策划和执行方案_V0.3.md) | 玩法与难度曲线设计 |
| [美术素材工单 V1](./docs/StackPop_美术素材工单_V1.md) | 素材规格与验收门槛 |
| [整体 Code Review](./docs/CodeReview_整体_Claude_20260824.md) | 全量复查与技术债清单 |
| [DPR 模糊修复记录](./docs/BUGFIX_手机端字体模糊_DPR.md) | 高分屏适配的完整归因 |
| `docs/UI_R*` | 三轮 UI 精修的方案、量化门槛与验收记录 |

---

## 协作方式

本项目由 **Kevin（产品决策与真机验收）+ Codex（实现与美术）+ Claude（设计评审与独立验收）** 三方协作完成。

核心纪律是**不采信报告、全部自己重跑**：验收方自己跑 lint / test / build，
自己重算对方报告里的每个关键数字，并写独立的对抗测试。
新增防回归测试后**故意改坏代码确认测试变红**——没做这步的测试可能测的是空气。

详见[项目总结 §1](./docs/StackPop_项目总结_V1.md)。
