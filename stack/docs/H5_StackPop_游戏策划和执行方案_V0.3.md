# H5《StackPop / 萌宠叠叠消》游戏策划与执行方案 V0.3

> **文档性质**：**可执行版本**。这是交给 Codex / Claude Code 开始编码的唯一依据。
> **版本谱系**：V0.1（初稿，规则错误）→ V0.2（Claude 修订玩法与 Solver）→ **V0.3（合并 Codex Review，可执行）**
> **V0.1 与 V0.2 均已作废**，实现一律以本文件为准。
> **命名**：中文工作名「萌宠叠叠消」／英文项目名 **StackPop**／目录 `stack/`／package `stackpop`
> **角色分工**：
> - **Claude Opus** = 方案设计方，产出本文档与[美术素材工单](./StackPop_美术素材工单_V1.md)，**不写实现代码**
> - **Codex Sol** = 执行方，负责全部代码实现 + 用 Image Gen 产出美术素材
> - **Kevin** = 决策方；开发完成后由 Kevin 与 Claude 共同验收（见 §66）
> **日期**：2026-08-22
> **目标平台**：移动端 H5 竖屏，**优先 iPhone / Android，兼容 PC 浏览器**（见 §44、§45）。
> **发布地址**：https://g.ismayday.mobi/stack/
> **本阶段核心约束**：**完全不做商业化**。无广告、无激励视频、无广告解锁、无内购、无相关抽象层。

---

# 0. V0.3 改了什么

V0.3 = V0.2 + Codex Review 的全部 P0/P1 + 部分 P2。

## 0.1 P0 修正（编码前必须落实，共 5 项）

| # | 问题 | V0.2 | V0.3 | 验证情况 |
|---|---|---|---|---|
| P0-1 | Solver 对称剪枝错误 | 顶部 type 相同的列去重 | **完整列内容相同才去重** | ✅ 已实证，见 §12.5 |
| P0-2 | solution 数据结构过时 | `number[][]`（按三张一组） | **`SolutionStep[]` 逐步序列** | ✅ 逻辑推导 |
| P0-3 | Hint 使用过期 solution | 兜底读取预存 solution 下一步 | **纯当前状态启发式，4 级优先级** | ✅ 逻辑推导 |
| P0-4 | Demo 验收关卡数据错误 | 声称初始顶部 6 张含 3 GRASS | **实为 `PAW×3 GRASS×2 CAN×1`** | ✅ 已实证，见 §64 |
| P0-5 | 商业化残留 | RewardedAdProvider / 广告槽位 / 广告埋点 | **全部删除** | — |

## 0.2 P1 修正（M2 前完成，共 5 项）

| # | 内容 |
|---|---|
| P1-1 | `simulate` 阈值改为分级告警，只有极高失败率才 build fail（§13.2） |
| P1-2 | 运行时 Shuffle 校验移入 **Web Worker**，不阻塞主线程（§7.5） |
| P1-3 | InputQueue 在 Win/Fail/Restart/Undo/Shuffle/Shutdown 时 **必须 clear**（§32.2） |
| P1-4 | **Solver / Simulator / Game 共享同一套纯规则函数**（§29.2）★ 本版最重要的工程约束 |
| P1-5 | Simulator 增加 **Random / Greedy / Cautious 三种 Bot**（§13.3） |

## 0.3 P2 修正

| # | 内容 |
|---|---|
| P2-1 | 存档区分 `saveSchemaVersion` 与 `levelRevision`（§34） |
| P2-2 | 难度统计增加 `avgMaxTray / p95MaxTray / distinctTrayTypes`（§13.4） |
| P2-3 | 项目命名统一 **StackPop**（§0.4） |
| P2-4 | M0 重叠比例对比改为 **0.80 / 0.83 / 0.85**（去掉余量过小的 0.88）（§19.4） |

## 0.35 V0.3 迭代补充（对齐 garden 工程实践）

在 Codex Review 之外，V0.3 另补三块内容，均以同仓库 **garden** 项目的已上线实践为依据：

| 章节 | 内容 | 依据 |
|---|---|---|
| §44、§45、§46 | **多端适配**：手机优先，PC 限宽居中 + 可见边界，横屏提示排除桌面 | garden UI 美化阶段实测 |
| §54.5 | **部署规范**：发布地址、站点根红线、`deploy.sh` 模板、发布纪律 | 根 `CLAUDE.md` §1.1 + `garden/deploy.sh` |
| §26.1、§26.2 | **工程骨架复用**：直接复制 garden/web 配置；四条硬约束 | `garden/CLAUDE.md` |
| §21~22 + 独立工单 | **美术规范**：23 张素材、轮廓分组、Prompt 模板、批次计划 | `garden` 美术工单格式 |
| §66 | **验收清单**：7 关验收，含命令、规则、布局、真机、工程、美术、部署 | 本次新增 |

并把 garden 的三条**踩坑教训**写进了对应章节，避免重复试错：

```text
① AudioContext 必须接管 Phaser 的，不能自建 —— 否则 iPhone 静音（§24）
   且该 bug 在桌面/Android 无法复现，音频改动必须真机复验
② 桌面判定必须三条件，只判宽度会把横屏手机当电脑（§44.2）
③ 首屏「load 了但没被画过」的纹理没有任何症状，需防回归测试（§43）
```

## 0.4 命名统一

```text
中文工作名：萌宠叠叠消
英文项目名：StackPop
Git 目录：  stack/
package：   stackpop
localStorage Key: stackpop-save-v1        ← 不再使用 pet-stack-match-save-v1
```

## 0.5 V0.2 中被**锁定**、不再讨论的决策

以下由 Claude 提出、经 Codex 复核确认，**V0.3 起冻结，改动 = 返工**：

```text
7 格 Tray（所有关卡固定，不动态变化）
6 列 MVP（不做 6/8 动态切换）
最大列深 10
不同类正常暂存（玩法核心）
任意三同立即消除
Tray 按 type 分组排列
无限 Undo，每关 3 次 Shuffle
Solver 状态含 Tray、动作为逐张 Pick
GameModel / RuleEngine 与 View 分离，core/ 禁止 import phaser
Seeded RNG + Snapshot 撤回
InputQueue（动画期间入队而非丢弃）
纵向重叠布局
20 关难度曲线以图案种类数为主轴
```

---

# 1. 一句话定义

一款 **「竖向卡牌堆叠 + 只取最上层 + 七格暂存槽 + 三枚同类自动消除 + 撤回/打乱辅助」** 的轻度益智 H5 小游戏。

> **观察各列最上方图案 → 把有用的牌捞进暂存槽 → 槽位逐渐紧张 → 凑齐三枚自动消除、腾出空间 → 暴露下一层 → 直到清空棋盘。**

单局 1~3 分钟，纯点击操作。

## 1.1 核心体验循环（本作的灵魂）

```
张力累积                          张力释放
─────────────────────────────►  ╱╲  ─────────►
槽位 2/7 → 4/7 → 6/7           砰！三消      槽位回到 4/7
"还剩一格了"                    "腾出来了"     "又能喘口气"
```

这个循环完全依赖一个前提：**暂存槽可以存放不同类的牌**。玩家敢先捞一张暂时凑不齐的牌，是因为相信"后面还能补上"——这份"赌一把"的心理活动就是玩法的全部乐趣。

**任何会削弱这个循环的改动，都要先回到这一节重新评估。**

---

# 2. MVP 范围

## 2.1 必须实现

```text
✅ H5 竖屏                    ✅ 首页 / 关卡选择 / 游戏场景
✅ 6 列棋盘，最大列深 10       ✅ 7 格 Tray，不同类可暂存
✅ 任意三同立即消除            ✅ Tray 按 type 分组排列
✅ 无限 Undo                  ✅ 每关 3 次 Shuffle
✅ Win / Fail / Restart       ✅ 20 关（JSON 配置）
✅ Solver（构建期）            ✅ Simulator（三种 Bot）
✅ LocalStorage 存档 + 刷新恢复 ✅ Debug 模式
✅ 音效 / 震动                 ✅ 移动端适配（4 种 viewport）
```

## 2.2 明确不做

```text
❌ 广告 / 激励视频 / 广告解锁槽位 / 广告复活
❌ 任何商业化抽象层（含 RewardedAdProvider）
❌ 登录 / 后端 / 排行榜 / 云存档 / PvP
❌ 复杂养成 / 宠物数值系统
❌ 6/8 列动态切换
❌ 运行时 Solver 求解 Hint
```

> **§2.2 是硬边界。** Codex 在实现中若认为需要引入以上任一项，应先提出，不得自行添加。特别是**不要"为未来预留"广告接口**——当前阶段的抽象成本大于收益，未来接入时再加 Adapter 成本极低。

---

# 3. 核心玩法规则

## 3.1 棋盘结构

```ts
columnCount = 6        // MVP 固定
maxColumnDepth = 10    // 硬上限，validate 时拦截
```

每列从下向上堆叠。**数组下标 0 = 最底部，最后一个元素 = 当前可点击的顶部 Tile。**

```text
Column 0: [PAW, GRASS, CAN, PAW, BELL]
                                  ↑ 顶部，可点击
```

> 此约定全项目统一（JSON / Model / Solver / Simulator / View），**任何模块不得反转**。

## 3.2 Tile 类型

```ts
type TileType = 'paw' | 'grass' | 'watering' | 'bell'
              | 'fish' | 'yarn' | 'bone' | 'flowerpot';
```

前 4 种用于早期关卡（§10）。

## 3.3 可点击规则

```text
可点击 ⟺ 该列非空 且 tray.length < traySize
```

- 每列只有最上方 Tile 可点击
- 被压住的 Tile 不可点击
- 空列不可点击
- **tray 满（7/7）时所有 Tile 不可点击**（见 §5.2）

可点击 Tile 正常亮度，点击时轻微上浮。不可点击 Tile **不做灰色处理**，只是不响应输入（视觉更干净）。

---

# 4. 暂存槽与三消

## 4.1 槽位规格

```ts
traySize = 7          // 所有关卡固定，MVP 不做任何动态变化
```

**为什么固定 7（Codex §2.2 确认）：**

1. 7 是 Triple-Match 品类行业标准值
2. 固定值让失败率、`maxTrayOccupancy`、撤回次数等指标**可直接横向比较**
3. Solver / Simulator / Generator **无需处理动态槽位**，模型大幅简化
4. 与 §9.2 的 `typeCount × 2` 难度公式形成稳定基线

## 4.2 消除规则

```text
每次有 Tile 进入 tray 后：
  while (存在某 type 计数 >= 3):
      消除该 type 的 3 枚
      其余 Tile 向左紧凑（保持相对顺序）
```

**关键：不是"满格才判定"，而是"每次插入后立即判定"。不同类的牌正常暂存，不是失败条件。**

## 4.3 Tray 分组插入规则

**按 type 分组排列，不是纯点击顺序。**

```text
若 tray 中已存在同 type 的 Tile → 插入到该组最后一个之后
否则                          → 追加到队尾
```

例：点击顺序 PAW→GRASS→PAW，实际显示：

```text
[PAW] [PAW] [GRASS] [ ] [ ] [ ] [ ]
```

**为什么必须分组：** 让玩家一眼看清"我已经攒了 2 个爪子，还差 1 个"。若散乱排列，玩家需逐格扫描计数——纯认知负担，零策略价值。

插入时播放 100~140ms 的"挤开"位移动画，让分组过程可见。

## 4.4 完整点击流程

```text
 1. status 检查
 2. canPick 检查（列非空 且 tray 未满）
 3. push GameSnapshot
 4. 从 Column 尾部移除 Tile
 5. Tile 跳跃动画 → 飞入 tray 目标槽位
 6. 其余 tray Tile 挤开位移
 7. while (某 type 计数 >= 3)：三消动画 → 移除 → 左移紧凑
 8. 检查胜利 → 9. 检查失败 → 10. 保存当前局
```

## 4.5 三消动画

```text
scale 1 → 1.12 → pause 40ms → scale 0 + alpha 0
粒子 6~10 个星光
剩余 Tile 左移紧凑，120ms
```

**总时长 320~450ms，不得超过 600ms。**

---

# 5. 胜负规则

## 5.1 胜利

```text
所有 columns 为空 AND tray 为空
```

流程：最后三消 → 0.3s 停顿 → 星星/彩纸 → 胜利弹窗（第 X 关完成、星级、步数、撤回次数、[下一关]、[再玩一次]）。

## 5.2 失败

```text
tray.length === traySize (7)  AND  不存在任何 type 计数 >= 3
```

> 由于 §4.2 是"随时三同即消"，tray 满时必然不存在三同。因此实际判定可简化为 `tray.length === 7`，但代码保留完整条件作为**不变量断言**。

**输入锁定：** tray 满时不允许再点击任何 Tile（§3.3）。玩家能看到自己正在走向死路，而不是被突然宣判。

## 5.3 失败界面（无商业化）

```text
这一步卡住啦！

[撤回一步]   [打乱]   [重新开始]
```

`[打乱]` 仅在剩余次数 > 0 时显示。由于 **Undo 无限**，玩家永远有明确恢复路径，**不需要任何"看视频继续"入口**。

## 5.4 软失败不做主动检测

存在一种情况：tray 未满，但理论上已无法通关。**MVP 不主动检测。** 理由：运行时跑 Solver 成本高且拖慢每一步；玩家会自然撞到 tray 满走 §5.2；主动弹「你已经输了」体验极差。

保障手段是 §7 的打乱（必须真正能救场）。

## 5.5 边界规则（硬性定义）

| # | 场景 | 规则 |
|---|---|---|
| 1 | 打乱后能否撤回 | **能**。打乱前也 push snapshot |
| 2 | 消除动画中点击其他牌 | **入队**，不丢弃（§32） |
| 3 | columns 空但 tray 非空 | **数据错误**，抛错 + 上报，不得静默卡死 |
| 4 | 刷新后撤回栈 | **保存最近 5 步 snapshot** |
| 5 | 撤回到起始状态后再点撤回 | 按钮置灰 |
| 6 | tray 满时点击 Tile | 无响应 + tray 摇晃 ±4px / 80ms + 震动 [20] |

---

# 6. 撤回系统

## 6.1 Snapshot

```ts
interface GameSnapshot {
  columns: TileData[][];
  tray: TileData[];
  moveCount: number;
  combo: number;
  rngState: number;
}
```

**用 snapshot，不写反向补丁逻辑。** 90 张牌的 snapshot 不到 2KB，栈深 5~20 无压力；反向补丁的 bug 率是 snapshot 的数十倍。

## 6.2 次数

```ts
undoLimit = -1        // 无限，MVP 全程
```

理由：首版目标是**验证体验**而非制造失败；撤回次数本身是最有价值的关卡难度指标，限次会污染数据。

**但撤回次数影响星级**（§15）——新手可自由尝试，高手仍有挑战目标。

## 6.3 动画

Tray 中的 Tile 倒飞回原列顶部。MVP 可先用 180ms 状态过渡，M4 补飞行轨迹。

---

# 7. 打乱系统

## 7.1 规则

只重排**棋盘中尚未消除的 Tile**。保持：列数不变、每列高度不变、Tile 总数不变、**tray 不变**。

```ts
shuffleLimit = 3      // 每关 3 次，免费，用完即止
```

> Undo 是回退行为，Shuffle 是直接改变未来局面，强度高得多，因此不设为无限。用完后玩家仍有 Undo 和 Restart。

## 7.2 步骤

```text
1. 收集 columns 中全部 tile type
2. Fisher-Yates shuffle（seeded RNG）
3. 按原列高度重新填回
4. ★ 校验 solver.canSolve({ columns: 打乱后, tray: 当前 tray }) === true
5. 不通过则重 shuffle，最多 50 次
6. 仍失败 → generateSafeState(当前 tray) 兜底
```

## 7.3 第 4 步为什么必须带 tray

若只校验「顶部有三同类」（V0.1 做法）：假设 tray 已占 6 格，打乱后即使顶部有 3 个 PAW，玩家也只能再点 1 张，照样死。**打乱会变成安慰剂，玩家点了没用，信任崩塌。**

正确校验是**以玩家当前 tray 状态为起点，整局是否仍可解**。

## 7.4 兜底：generateSafeState

50 次 shuffle 仍失败时，直接构造安全局面：

```text
1. 统计 columns + tray 中各 type 的剩余数量
2. 取 tray 中已有 2 张的 type（若有），把该 type 的第 3 张放到某列顶部
3. 其余 Tile 按「同 type 尽量集中在相近深度」回填
4. 再次 canSolve 校验；仍失败则退化为「按 type 排序后顺序回填」（必定可解）
```

## 7.5 运行时 Solver 必须走 Web Worker ★ P1-2

```text
80ms ≈ 5 个 60FPS 帧。跑在主线程玩家会明显感到卡顿。
```

**方案：**

```text
点击打乱
  ↓ push Snapshot
  ↓ 播放洗牌动画（约 500ms，遮蔽计算时间）
  ↓ 后台 Worker：shuffle + canSolve(含当前 tray)
  ↓ 找到安全局面
  ↓ 动画结束 → 提交新棋盘
```

玩家看到的是「正在洗牌」，而不是「页面冻结」。

```text
src/game/workers/SolverWorker.ts
```

**Worker 内部复用 §29.2 的纯规则函数**，不重写规则。Worker 超时（总预算 400ms）则走 §7.4 兜底。

> 若 M2 阶段不想立刻引入 Worker，可临时用 `setTimeout` 分片；但 `SolverWorker.ts` 是最终形态——Editor / Generator / Runtime Shuffle 都会复用它。

---

# 8. Hint 功能 ★ P0-3 已修正

MVP 隐藏 UI，代码预留（关卡 JSON 中 `hint: 0`）。

## 8.1 为什么不能读预存 solution

预存 solution **只保证「从初始状态沿该路径走可以通关」**。玩家一旦走了不同路径，当前状态已偏离 solution path，此时 `solution[n]` 完全没有意义：

- Column 可能已空
- 该列顶部可能已不是原 Tile
- 这一步在当前状态下**可能反而加速进入死局**

**因此 Hint 必须完全基于当前状态，不依赖任何预存路径。**

## 8.2 四级启发式（纯当前状态）

```text
Priority 1  tray 中某 type 已有 2 张，且棋盘顶部存在同 type
            → 高亮那第 3 张                      【最安全、最易懂】

Priority 2  tray 中某 type 已有 1 张，且棋盘顶部至少有 2 张同 type
            → 高亮其中一个

Priority 3  棋盘顶部某 type >= 3
            → 高亮其中 3 个

Priority 4  以上都不满足
            → 不强行提示某一步
            → 轻微高亮 [撤回] / [打乱]，或不做任何提示
```

动画：`scale 1.0 → 1.08 → 1.0`，循环 2 次。**不自动替玩家点击。**

## 8.3 不做运行时 Solver Hint

虽然可以「对当前 State 跑 Solver 找一条可解路径返回第一步」，但 MVP 不做：增加运行时 CPU 压力、需要 Worker、Hint 非核心功能、玩家已有无限 Undo + Shuffle。

**先做简单、安全、可解释的 Hint。**

---

# 9. 关卡设计

## 9.1 硬性约束

```text
totalTileCount % 3 === 0
count(每种 type) % 3 === 0
maxColumnDepth <= 10
columnCount === 6
```

违反任一条 → `validate-levels` 报错，不允许进入构建。

## 9.2 难度维度（按影响力排序）

### 1️⃣ 图案种类数 vs 槽位数（最强旋钮）

tray 中每种 type 最多停留 2 张而不触发消除。因此**理论上最多可塞进 `typeCount × 2` 张牌而不成三**：

| 图案种类 | 最多可暂存不成三 | vs 7 格槽 | 死局可能性 |
|---:|---:|---|---|
| 3 | 6 | 6 < 7 | **数学上不可能死局** |
| 4 | 8 | 8 > 7 | 可能，但需极端凑巧 |
| 5 | 10 | 10 > 7 | 有真实压力 |
| 6 | 12 | 12 > 7 | 明显压力 |
| 7 | 14 | 14 > 7 | 高压 |
| 8 | 16 | 16 > 7 | 极高压 |

**唯一的"绝对安全区"是 3 种图案**（6 < 7，无论怎么点都不可能填满 tray）。这是 §10 中第 1、2 关采用 3 种图案的原因——**新手关的"不会输"是数学保证的，不是靠关卡设计小心翼翼堆出来的。**

### 2️⃣ 同类牌的空间离散度

```text
同层、相邻列        → 极简单
同层、分散列        → 简单
不同层、深度差 <= 2 → 适中
深度差 >= 5         → 难（必须先挖开，占用槽位）
一个在 col0 底部    → 陷阱（几乎必须撤回）
```

量化：`avgDepthSpread = 平均(同 type 三张牌的最大深度 - 最小深度)`

### 3️⃣ 列深

越深需要提前规划越多。上限 10（受 §19 布局约束）。

### 4️⃣ 陷阱密度

「误选后需撤回几步才能恢复」。教学关 0，中期 1~2，后期 3+。

### 5️⃣ Tile 总数（只控时长，不控难度）

按每步 1.2~1.5 秒估算：36 张≈50s，54 张≈75s，72 张≈100s，90 张≈130s。

---

# 10. 前 20 关难度曲线

| 关卡 | 图案种类 | Tile 数 | 列数 | 最大列深 | 目标时长 | 设计目标 |
|---:|---:|---:|---:|---:|---:|---|
| 1 | 3 | 18 | 4 | 5 | 25s | 教「只点顶部」 |
| 2 | 3 | 27 | 5 | 6 | 40s | 教「三枚同类自动消除」 |
| 3 | 4 | 36 | 5 | 8 | 50s | 教「槽位可暂存不同类」 |
| 4 | 4 | 42 | 6 | 8 | 60s | 第一次需要观察全局 |
| 5 | 4 | 48 | 6 | 8 | 65s | 巩固 |
| 6 | **5** | 48 | 6 | 8 | 65s | ⚠️ 首个真实难度台阶 |
| 7 | 5 | 54 | 6 | 9 | 75s | 槽位开始有压力 |
| 8 | 5 | 54 | 6 | 9 | 75s | 首个明显陷阱 |
| 9 | 5 | 60 | 6 | 10 | 85s | 需要撤回意识 |
| 10 | **6** | 60 | 6 | 10 | 85s | ⚠️ 第二个台阶 |
| 11 | 6 | 66 | 6 | 10 | 90s | 中等 |
| 12 | 6 | 66 | 6 | 10 | 90s | 中等 |
| 13 | 6 | 72 | 6 | 10 | 100s | 长局 |
| 14 | 6 | 72 | 6 | 10 | 100s | 顶部干扰 |
| 15 | 6 | 78 | 6 | 10 | 110s | 中高 |
| 16 | 6 | 78 | 6 | 10 | 110s | 中高 |
| 17 | **7** | 78 | 6 | 10 | 110s | ⚠️ 第三个台阶 |
| 18 | 7 | 84 | 6 | 10 | 120s | 陷阱 |
| 19 | 7 | 84 | 6 | 10 | 120s | 需要规划 |
| 20 | 7 | 90 | 6 | 10 | 130s | 阶段挑战 |

**曲线说明：**

- **1~2 关**：3 种图案 → `3×2=6 < 7`，**数学上不可能失败**
- **3~5 关**：4 种图案 → 理论可死（8>7），实际需极端凑巧。软着陆区
- **第 6、10、17 关**：三个明确台阶，各引入 1 种新图案
- **列数固定 6**，Tile 总数只控时长

> 每次台阶（6/10/17）的前一关应刻意做得轻松，形成「放松—紧张」节奏。

---

# 11. 关卡生成

## 11.1 逆向生成

先生成必定能消除的解题顺序（每 3 个一组），倒序分配到各列。

```ts
function generateSolvableLevel(config: LevelConfig, rng: SeededRandom): TileType[][] {
  const groups = createTripleGroups(config, rng);
  const columns = createEmptyColumns(config.columnCount);

  for (const group of reverse(groups)) {
    distributeGroupIntoColumns(group, columns, config, rng);
  }

  if (!solver.canSolve({ columns, tray: [] })) return generateSolvableLevel(config, rng);
  if (!difficultyInRange(columns, config))     return generateSolvableLevel(config, rng);

  return columns;
}
```

## 11.2 难度定向控制

```ts
interface LevelConfig {
  id: number;
  typeCount: number;
  tileCount: number;
  columnCount: number;       // 固定 6（1~3 关可用 4/5）
  maxDepth: number;          // <= 10
  targetDepthSpread: [min: number, max: number];   // 教学关 [0,1]，后期 [3,6]
  trapCount: number;
  seed: number;
}
```

## 11.3 手工 vs 生成

```text
Level 1~5   手工设计（教学局面必须精确控制，见 §16）
Level 6~20  Generator 生成 + Solver 校验 + Simulator 分级 + 人工试玩
```

---

# 12. Solver ★ P0-1 已修正

## 12.1 状态

```ts
interface SolverState {
  columns: TileType[][];
  tray: TileType[];        // ★ 必须进状态
}
```

## 12.2 动作

```text
动作 = 取某一列的顶部一张（不是一次弹三张）

合法条件：该列非空 且 tray.length < traySize
apply 后：tray 分组插入 → while (某 type >= 3) 消除    ← 确定性，不产生分支
```

## 12.3 为什么动作必须是「取单张」

7 格规则下，玩家可以先拿 `PAW, GRASS, CAN` 三张不同的牌（都不成三），把三列的下一层露出来，第 4 步才拿到第二个 PAW。这类**「先铺垫再收割」**的解法，若把「一组三连」当作单次动作，**永远搜不到**，会把大量好关卡误判为不可解。

## 12.4 剪枝（按重要性）

**1️⃣ Canonical Hash（最重要）**

列的左右顺序、tray 内部顺序**在规则上均无意义**。排序后再 hash，状态数降 1~2 个数量级。

```ts
function hashState(s: SolverState): string {
  const cols = s.columns
    .filter(c => c.length > 0)
    .map(c => c.join(','))
    .sort();                        // ★ 列排序
  const tray = [...s.tray].sort();  // ★ tray 排序
  return cols.join('|') + '#' + tray.join(',');
}
```

**2️⃣ 对称去重：完整列内容相同才去重** ★ P0-1

```ts
function getDistinctPickColumns(state: SolverState): number[] {
  const seen = new Set<string>();
  const result: number[] = [];
  for (let i = 0; i < state.columns.length; i++) {
    const column = state.columns[i];
    if (column.length === 0) continue;
    const signature = column.join(',');     // ★ 完整列，不是 column[column.length-1]
    if (seen.has(signature)) continue;
    seen.add(signature);
    result.push(i);
  }
  return result;
}
```

**3️⃣ 死路剪枝**

```text
tray.length >= traySize → 必死 → 返回 false
```

**4️⃣ 计数可行性剪枝**

```text
对每个 type：count(columns) + count(tray) 必须 % 3 === 0，否则剪掉
```

**5️⃣ 节点上限**

```ts
const MAX_NODES = 2_000_000;   // 超出抛 SolverBudgetExceeded
```

## 12.5 P0-1 的实证 ★ 重要

「顶部 type 相同即去重」这条剪枝**不成立**：

```text
Column A = [BELL, PAW]     顶部 PAW
Column B = [FISH, PAW]     顶部 PAW

Pick A → 暴露 BELL
Pick B → 暴露 FISH         ← 两个完全不同的后继状态
```

**topTileType 相同 ≠ Column 状态等价。**

本文档编写时对该剪枝做了实证测试：随机生成约 4000 个合法局面，以「不剪枝的完整 DFS」为真值对照——

```text
toptype 剪枝（错误）：  5 个局面判定与真值不符，全部是「本可解 → 误判不可解」
fullcol 剪枝（正确）：  0 个不符
```

误判方向全部是**假阴性**：Generator 会默默丢弃可解的好关卡，且**不会报错**——这类 bug 极难被发现，只会表现为「生成器效率莫名很低」。

**因此实现时必须使用 `column.join(',')` 作为 signature，并配套单测（§53）。**

## 12.6 DFS + Memo

```ts
function canSolve(state: SolverState, memo: Map<string, boolean>, budget: Counter): boolean {
  if (isEmpty(state.columns) && state.tray.length === 0) return true;
  if (state.tray.length >= TRAY_SIZE) return false;
  if (budget.exceeded()) throw new SolverBudgetExceeded();

  const hash = hashState(state);
  if (memo.has(hash)) return memo.get(hash)!;
  memo.set(hash, false);                                   // 防环

  for (const colIdx of getDistinctPickColumns(state)) {     // ★ 完整列去重
    const next = applyPickToState(state, colIdx);           // ★ 复用 §29.2 纯规则
    if (!countFeasible(next)) continue;
    if (canSolve(next, memo, budget)) { memo.set(hash, true); return true; }
  }
  return false;
}
```

## 12.7 运行预算

```text
✅ 构建期（validate-levels）：每关 10 秒
✅ 运行时唯一例外：Shuffle 校验，走 Web Worker，总预算 400ms（§7.5）
❌ 其它任何运行时求解：不做
```

---

# 13. 可解性保障：三层防线

Solver 只能证明「**存在**一条通关路径」。但玩家会走错。走错之后 tray 塞满废牌 → 死局。**这才是本品类真正的运营难点。**

## 13.1 第 1 层：构建期 Solver（理论可解）

```bash
npm run validate-levels
```

```text
20/20 levels schema valid
20/20 levels count-divisible (total % 3, per-type % 3)
20/20 levels depth <= 10
20/20 levels solvable (solver)
20/20 levels solution verified (逐步重放校验，见 §14.2)
```

## 13.2 第 2 层：Simulator（人类可通）★ P1-1 阈值已修正

```bash
npm run simulate
```

**Codex 的关键提醒（已采纳）：`simDeadlockRate` 是「当前 Bot 策略在该关的失败率」，不是真人失败率。** 若直接 `>45% → build fail`，Generator 会开始**专门适应 Bot 而不是适应真人**，形成错误的优化目标。

**MVP 分级阈值：**

| 关卡范围 | Greedy Bot 失败率 | 判定 |
|---|---|---|
| Level 1~5 | < 5% | ✅ PASS（教学关应接近零压力） |
| Level 1~5 | >= 5% | ❌ **BUILD FAIL**（教学关不允许有压力） |
| Level 6~20 | 0% ~ 35% | ✅ PASS |
| Level 6~20 | 35% ~ 55% | ⚠️ WARNING + 人工试玩 |
| Level 6~20 | 55% ~ 70% | ⚠️ HIGH WARNING，默认建议重做 |
| Level 6~20 | > 70% | ❌ **BUILD FAIL** |

> 未来拿到真人数据后，做 `humanFailRate vs simDeadlockRate` 相关性分析，若高度相关再逐步收紧自动阈值。

## 13.3 三种 Bot 策略 ★ P1-5

单一 Bot 的数字信息量不足。三种策略并跑：

**Bot A — Random**（完全不思考的玩家）

```text
在所有合法顶部中随机点
```

**Bot B — Greedy**（普通玩家）

```text
1. tray 已有 2 张同 type → 补第 3 张
2. tray 已有 1 张同 type → 找同类
3. 顶部三同 → 收集
4. 否则随机
```

**Bot C — Cautious**（有经验的玩家）

```text
在 Greedy 基础上：
  尽量避免引入新 type
  尽量降低 tray 的 distinctTypeCount
```

输出示例：

```text
Level 10
  Random:   72% fail
  Greedy:   31% fail      ← 用于 §13.2 阈值判定
  Cautious: 12% fail
```

**这个数据比单一的 31% 有意义得多**——它能看出「是不是只有聪明玩家才能过」。若 `Cautious` 也很高，说明关卡本身有问题；若只有 `Random` 高，说明关卡是健康的。

## 13.4 难度统计指标 ★ P2-2

```json
"meta": {
  "generatedBy": "levelGenerator@v1",
  "seed": 60006,
  "levelRevision": 1,
  "sim": {
    "randomFailRate": 0.68,
    "greedyFailRate": 0.24,
    "cautiousFailRate": 0.09,
    "avgMaxTray": 5.8,
    "p95MaxTray": 7,
    "avgDistinctTrayTypes": 4.2,
    "avgMoves": 52
  }
}
```

这些指标能区分「关卡难」到底是因为**槽位压力大**（`p95MaxTray` 高）还是**需要特定路线**（`cautiousFailRate` 远低于 `greedyFailRate`）。

## 13.5 第 3 层：运行时救场

1. **撤回无限免费**（§6.2）
2. **打乱带 tray 校验 + Worker**（§7）
3. **tray 满时锁输入**（§3.3）——让玩家看见危险而非被突然宣判

---

# 14. 关卡 JSON 规范 ★ P0-2 已修正

## 14.1 格式

```json
{
  "id": 6,
  "name": "第6关",
  "schemaVersion": 1,
  "levelRevision": 1,
  "columnCount": 6,
  "traySize": 7,
  "tileTypes": ["paw", "grass", "watering", "bell", "fish"],
  "columns": [
    ["paw", "grass", "watering", "paw", "grass", "bell", "fish", "paw"],
    ["grass", "watering", "bell", "paw", "fish", "grass", "bell", "watering"],
    ["bell", "grass", "paw", "grass", "watering", "fish", "paw", "bell"],
    ["watering", "paw", "grass", "fish", "bell", "watering", "grass", "fish"],
    ["grass", "bell", "paw", "watering", "fish", "bell", "paw", "grass"],
    ["paw", "watering", "bell", "fish", "grass", "watering", "fish", "bell"]
  ],
  "tools": { "undo": -1, "shuffle": 3, "hint": 0 },
  "stars": { "three": 0, "two": 2 },
  "solution": [
    { "columnIndex": 0, "expectedTileType": "paw" },
    { "columnIndex": 2, "expectedTileType": "bell" },
    { "columnIndex": 4, "expectedTileType": "grass" }
  ],
  "meta": { }
}
```

## 14.2 solution 必须是逐步序列 ★ P0-2

**V0.2 的 `number[][]`（每三步一组）已作废。** 它隐含「每三步固定为一组」，与 7 格 Tray 玩法不一致——真实解法完全可能是：

```text
PAW → GRASS → CAN → PAW → BELL → PAW → 此时 PAW 消除
```

不同 Tile 可以先进入 Tray，消除时机不与「第 3 次点击」对齐。

**V0.3 格式：**

```ts
interface SolutionStep {
  columnIndex: number;
  expectedTileType: TileType;
}

// 关卡 JSON 中：solution: SolutionStep[]
```

`expectedTileType` 用于**关卡数据漂移检测**：`validate-levels` 逐步重放 solution，若某步 `expectedTileType !== 当前该列顶部`，立即报错。这能发现「关卡 JSON 被手工改过但 solution 没更新」的情况。

> 最简形式 `solutionMoves: number[]` 也可行，但**推荐带 `expectedTileType` 的版本**——多几个字节，换来数据完整性校验能力。

## 14.3 约定

- `columns` 内数组顺序统一 `bottom → top`
- `tools.undo: -1` 表示无限
- `solution` / `meta` 是构建期产物，人工不填
- `levelRevision` 关卡数据每次实质修改必须 +1（§34）

---

# 15. 星级

```text
★★★  Undo + Shuffle 合计 0 次
★★   合计 1~2 次
★     成功过关
```

首版**不强制展示星级**，可先只显示「通关」，但数据必须记录（存档 + 埋点）。

这个设计让**无限 Undo 与挑战性并存**：新人可自由尝试，高手有明确目标。

---

# 16. 新手教学

## Level 1 —— 教「只能点顶部」

初始棋盘明确露出 3 个爪子。手指动画依次提示三下。

```text
点击最上面的卡片
```

## Level 2 —— 教「三枚同类自动消除」

```text
集齐 3 个相同图案就会消除
```

玩家攒到第 2 个同类时，高亮暂存槽并提示 `还差 1 个！`

## Level 3 —— 教「槽位可暂存不同类」★ 最关键

**7 格规则下，玩家必须理解「可以先捞不同类的牌」，否则会一直不敢点。**

设计：初始局面**故意让顶部没有任何三同类**，玩家必须先取 2~3 张不同的牌才能露出可消组合。

```text
凑不齐？先放进下面的格子里，等后面再补
```

tray 满时提示：

```text
格子满了！点击「撤回」把牌放回去
```

> Level 3 是首个 4 种图案的关卡，此时死局理论上首次成为可能。但只有 36 张牌且深度差压在 [0,2]，实际触发概率极低——**这一关要教会玩家"敢暂存"，而不是吓退他**。

## Level 4~5 —— 放手

不再强制引导，仅在玩家 15 秒无操作时给出 Hint 动画（§8.2）。

---

# 17. UI / 布局

## 17.1 设计基准

```text
逻辑设计尺寸：750 × 1624
实际运行：device width × device height
缩放：contain + safe area
```

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

必须兼容：iPhone 刘海、Dynamic Island、Android 状态栏、浏览器底部工具栏。

## 17.2 主界面

```text
┌────────────────────────────┐
│ ⚙      StackPop · 第6关     │  ← 12~15%
├────────────────────────────┤
│   ▢  ▢  ▢     ▢  ▢  ▢     │
│   ▢  ▢  ▢     ▢  ▢  ▢     │  ← 棋盘 55~62%
│   ▢  ▢  ▢  ▢  ▢  ▢        │    6 列，纵向重叠
│   ▢  ▢  ▢  ▢  ▢  ▢        │
├────────────────────────────┤
│  □ □ □ □ □ □ □             │  ← 7 格暂存槽，约 10%
├────────────────────────────┤
│      [打乱 3]  [撤回]       │  ← 道具区 12%
└────────────────────────────┘
```

**暂存槽是本作最重要的信息区**：始终可见不被遮挡、空/满状态一眼可辨、接近满（6/7）时整体轻微呼吸发光作为危险预警。

---

# 18. 空缺（原 V0.2 §18 已并入 §17.2）

---

# 19. 棋盘自适应布局

## 19.1 横向

```ts
const TILE_SIZE_MIN = 48;   // CSS px
const TILE_SIZE_MAX = 92;

tileSize = clamp(
  (boardWidth - (columnCount - 1) * gap) / columnCount,
  TILE_SIZE_MIN, TILE_SIZE_MAX
);
```

实测（padding 16×2，gap 6）：

| 屏宽 | 6 列 tileSize | 8 列 tileSize |
|---:|---:|---:|
| 360px | **49.7** | 37.5 ❌ |
| 375px | **52.2** | 39.4 ❌ |
| 390px | **54.7** | 41.2 ❌ |
| 430px | **61.3** | 46.2 ❌ |

**8 列在所有目标机型上都低于 48px 下限，因此 MVP 固定 6 列，且不做 6/8 动态切换**（动态列数意味着同一关需要两套数据分布，收益低复杂度高）。

> ⚠️ **宽屏方向的约束见 §45**：`TILE_SIZE_MAX = 92` 只限制单个 Tile，
> 不足以防止整体布局在 1920px 宽屏上散开。**必须同时有内容区限宽 `MAX_CONTENT_WIDTH = 480`**。
> garden 曾因只有下限没有上限，在 1920×1080 上棋子长到 150pt、HUD 被挤成 0 高度。

## 19.2 纵向：必须支持重叠

参考原型图中卡片是**部分重叠**堆叠的。**这个重叠是本品类的视觉语言**——玩家不仅要看到当前顶牌，还要知道「下面大概还有多少层」。做成不重叠 Grid 会大幅削弱规划体验。

```ts
const OVERLAP_RATIO = 0.85;              // 默认值，M0 验证后可调
rowStep = tileSize * OVERLAP_RATIO;
columnHeight = tileSize + (depth - 1) * rowStep;
```

## 19.3 深度 10 的可行性校验（已实算）

```text
375×812：tileSize 52.2，columnHeight = 52.2 + 9×44.4 = 452px
         可用高度 ≈ 812 × 0.58 = 471px    ✅ 余量 19px

360×800：tileSize 49.7，columnHeight = 49.7 + 9×42.2 = 430px
         可用高度 ≈ 800 × 0.58 = 464px    ✅ 余量 34px
```

**因此最大列深锁定 10。**

## 19.4 M0 重叠比例对比 ★ P2-4

| OVERLAP_RATIO | columnHeight(375屏,depth10) | 余量 | 评价 |
|---:|---:|---:|---|
| 0.80 | 428px | 43px | 安全，但下层露出少 |
| 0.83 | 442px | 29px | 候选 |
| **0.85** | **452px** | **19px** | 默认推荐 |
| ~~0.88~~ | ~~466px~~ | ~~5px~~ | ❌ **不测**，余量太小 |

**0.88 已从对比中移除。** 余量仅 5px，遇到 Safari 地址栏、safe-area、字号变化、工具条尺寸变化时极易溢出。

**M0 出 0.80 / 0.83 / 0.85 三档截图对比后人工定夺。**

## 19.5 空间不足时的降级顺序

```text
1. 缩小 tileSize（至 TILE_SIZE_MIN = 48）
2. 减小 OVERLAP_RATIO（至 0.78）
3. 缩小 gap（至 4px）
4. 仍不够 → 关卡数据超规格，validate-levels 应提前拦截
```

**绝不允许棋盘被暂存槽或工具栏遮挡。**

---

# 20. Tile 视觉规范

```text
正方形，圆角 10~12%
暖白 / 奶油色底，细棕色描边 1.5~2px @1x
轻微内阴影 + 轻微外投影
图案占 Tile：62~72%
```

## 20.1 「简形化」硬性要求

最小 tileSize 48px（图案区约 32×32），美术必须遵守：

- ✅ **轮廓差异优先于细节差异**：猫爪 vs 骨头 ✅；小鱼 vs 鲸鱼 ❌
- ✅ 单个图案可辨识元素 <= 3 个
- ✅ 描边加粗，不依赖内部细节
- ✅ **不只依赖颜色区分**（色盲可访问性）
- ❌ 不用渐变细节、< 3px 线条、复杂纹理

**验收：** 8 个图案渲染成 32×32 PNG 排成一行，**眯眼状态下能否 1 秒内区分**。做不到就重做。

---

# 21~22. 美术 ★ 详见独立工单

> 📄 **完整美术规范见 [StackPop 美术素材工单 V1](./StackPop_美术素材工单_V1.md)**
> 含 Style Guide、色板、8 个图案的轮廓分组、Prompt 模板、批次计划、验收标准。
> **Codex Sol 用 Image Gen 产出美术时，以该工单为准。**

本节只保留与代码实现相关的约束。

## 21.1 主题与总量

原创主题「**萌宠花园**」，**共 23 张素材**，分 3 批产出。

Tile（8 种）：猫爪、小草、浇水壶、铃铛、小鱼、毛线球、骨头、花盆

后续主题只换资源不改玩法：甜品屋 / 海底世界 / 森林伙伴 / 水果乐园 / 太空萌宠

## 21.2 关键设计决定：图案与底框分离

```text
tiles/*.webp        ← 只含图案本身，透明背景，256×256
ui/tile_frame.webp  ← 奶油底 + 棕描边 + 阴影的空白底框
```

**代码负责把图案叠加到底框上。** 好处：换主题只换 8 张图案；图案可单独做缩放动画。

## 21.3 辨识度模型（与色块三消不同）★ 重要

```text
色块三消：颜色是唯一区分维度 → 要求任意两色灰度可分
StackPop：轮廓是主要区分维度 → 要求任意两图案轮廓可分
          颜色是辅助维度     → 只要求「轮廓相似的那几对」颜色必须拉开
```

8 个图案按轮廓归为 6 类，其中两类各有 2 个成员，靠颜色强制拉开：

| 轮廓类别 | 成员 | 灰度差 | 状态 |
|---|---|---:|---|
| 梯形 | `bell`（亮黄） + `flowerpot`（暗棕） | 66.3 | ✅ |
| 水平延展 | `fish`（橙） + `bone`（近白） | 59.5 | ✅ |
| 放射状 / 尖锐 / 突出物 / 正圆 | 各 1 个 | — | ✅ 轮廓唯一 |

> 关卡 1~5 只用前 4 种（`paw`/`grass`/`watering`/`bell`），
> 它们分属 4 个不同轮廓类别，**零冲突**——这是新手期辨识度最好的组合。

## 21.4 资源路径

```text
stack/web/public/assets/
  tiles/  paw grass watering bell fish yarn bone flowerpot .webp   (256×256)
  ui/     tile_frame tray_slot tray_slot_warn
          btn_shuffle btn_undo btn_settings btn_hint
          panel_win panel_fail .webp
  bg/     game_bg.webp  home_bg.webp                               (1125×2436)
  fx/     sparkle_01 sparkle_02 star .webp
```

**素材路径只走 Asset Manifest（`config/assets.ts`），不在代码里硬编码字符串。**
改图换名时只改这一个文件。

> 已移除 V0.2 中的广告相关 UI 资源（P0-5）。

---

# 23. 动画规范

```text
23.1 点击        80ms scale 1.00→0.94，90ms scale 0.94→1.05
23.2 跳跃入槽    220~320ms 二次贝塞尔，上抛 30~60px，rotation ±3°，scale 1→1.06→1
23.3 Tray 挤开   100~140ms ease-out
23.4 三消        scale 1→1.12 → pause 40ms → scale 0 + alpha 0；粒子 6~10
                 剩余左移紧凑 120ms
23.5 暴露新卡    scale 0.96→1，brightness +8%→normal
23.6 Tray 预警   6/7 时呼吸发光周期 1.2s；满时点击摇晃 ±4px / 80ms
23.7 洗牌        约 500ms，用于遮蔽 Worker 计算时间（§7.5）
```

---

# 24. 音效

```text
tap  jump  match  win  fail  undo  shuffle  button  tray_full   (.mp3)
```

特点：软、短、明亮、不刺耳。背景音乐可后补。

> 🔴 **全局只允许一个 AudioContext，且必须是 Phaser 那一个。**
>
> Phaser 在 `new Phaser.Game()` 时就自建了一个 AudioContext，并在 `document.body` 上
> 挂了解锁 handler。**iOS 的 WebAudio 解锁是按 context 逐个授权的** ——
> 用户那一下手势会被 Phaser 的 handler 消费，你自建的第二个 context 永远不会被解锁，
> 表现为 **iPhone 上完全静音**。
>
> **正确做法**：接管 Phaser 的 context，不要自建：
>
> ```ts
> audioSystem.adoptContext(this.sound.context);
> ```
>
> ⚠️ **这个 bug 在桌面 Chrome / Android 上根本无法复现** —— 那两个平台的 context
> 建出来就是 `running`，没有"解锁"这回事。garden 为此归因错了三次。
>
> **因此：音频层改动必须真机复验，单测不作数。**

---

# 25. 震动

```text
点击 10ms ／ 消除 [15,20,15] ／ 胜利 [30,40,30] ／ tray 满 [20]
```

`navigator.vibrate()` 支持时才调用，允许在设置中关闭。

---

# 26. 技术栈

```text
Vite + TypeScript + Phaser 3 + ESLint + Vitest + Playwright
```

UI 在 Phaser 内完成，**不引入 React + Phaser 双状态系统**。

## 26.1 直接复用 garden 的工程骨架

**本仓库 `garden/` 子项目技术栈完全相同且已上线**（https://g.ismayday.mobi/garden/ ）。
M0 建议直接复制以下文件后改项目名，可节省整个 M0 阶段：

| 文件 | 复用方式 |
|---|---|
| `web/package.json` | 复制脚本定义，**新增 `simulate`**（StackPop 特有） |
| `web/eslint.config.js` | 复制，改 `core/` 禁 phaser 的路径 |
| `web/tsconfig.json` | 直接复制（`strict: true`，不写 `any`） |
| `web/vite.config.ts` | 复制，`base` 改 `/stack/` |
| `web/vitest.config.ts` | 直接复制 |
| `deploy.sh` | 复制后改路径与项目名，**保留边界断言**（§54.5.4） |

```json
// package.json scripts（garden 基础 + StackPop 新增）
{
  "dev": "vite --host 127.0.0.1",
  "build": "tsc && vite build",
  "preview": "vite preview --host 127.0.0.1",
  "test": "vitest run",
  "lint": "eslint src tests tools --max-warnings 0",
  "validate-levels": "tsx tools/validateLevels.ts",
  "simulate": "tsx tools/simulate.ts"
}
```

## 26.2 从 garden 直接继承的四条硬约束

这些是 garden 在真实开发中**踩坑换来的**，StackPop 直接采用，不重新试错：

1. **`core/` 零引擎依赖** —— lint 规则强制，`import Phaser` 直接报错（§29.1）
2. **一切数值进配置** —— 关卡数据、动画时长、布局常量一律进 `config/`，逻辑代码不写死数值
3. **可复现随机** —— 统一走 `SeededRandom`，禁止散用 `Math.random()`（§33）
4. **严格类型** —— `strict: true`，**不写 `any`**

## 26.3 部署

见 §54.5。**红线**：只同步到 `$REMOTE_APP_DIR`（`stack/` 子目录），
**绝不对站点根执行 rsync --delete**。

---

# 27. 项目结构

```text
stack/
├── web/
│   ├── public/assets/
│   ├── src/
│   │   ├── main.ts
│   │   └── game/
│   │       ├── config.ts  constants.ts
│   │       ├── scenes/    BootScene PreloadScene HomeScene LevelSelectScene GameScene
│   │       ├── core/
│   │       │   ├── rules/          ★ 单一真源，见 §29.2
│   │       │   │   ├── applyPick.ts
│   │       │   │   ├── resolveMatches.ts
│   │       │   │   ├── canPick.ts
│   │       │   │   └── checkStatus.ts
│   │       │   ├── GameModel.ts  RuleEngine.ts
│   │       │   ├── LevelLoader.ts  LevelGenerator.ts
│   │       │   ├── Solver.ts  UndoManager.ts  SeededRandom.ts
│   │       │   └── Shuffle.ts
│   │       ├── workers/   SolverWorker.ts               ★ P1-2
│   │       ├── objects/   TileView ColumnView TrayView ToolButton
│   │       ├── systems/   AnimationSystem AudioSystem SaveSystem
│   │       │              HapticSystem Analytics InputQueue
│   │       └── types/     level.ts game.ts tile.ts
│   ├── levels/            level001.json … level020.json
│   ├── platform/          PlatformAdapter.ts  WebAdapter.ts
│   ├── tests/             rules solver undo shuffle levels save layout inputqueue .test.ts
│   ├── tools/             validateLevels.ts  simulate.ts  generateLevels.ts
│   └── index.html  package.json  tsconfig.json  vite.config.ts  vitest.config.ts
├── docs/
├── deploy.sh              ★ 以 garden/deploy.sh 为模板，见 §54.5.4
└── CLAUDE.md              ★ 子项目约束规范，M0 时创建
```

> 已删除 `platform/RewardedAdProvider.ts`（P0-5）。
> 新增 `core/rules/`（P1-4）、`workers/`（P1-2）、`config/`（数值集中，见 §26.2）。

**`config/` 目录**（从 garden 继承的约定：一切数值进配置）：

```text
config/
  layout.ts      TILE_SIZE_MIN/MAX、OVERLAP_RATIO、MAX_CONTENT_WIDTH、断点
  tuning.ts      动画时长、traySize、undoLimit、shuffleLimit
  levels.ts      关卡索引与 LevelConfig
```

**逻辑代码里不写死数值。** 策划调参应当只改 `config/`，不改代码。

---

# 28. 核心数据模型

```ts
export type TileType =
  | 'paw' | 'grass' | 'watering' | 'bell'
  | 'fish' | 'yarn' | 'bone' | 'flowerpot';

export interface TileData {
  id: string;          // 唯一，撤回 / 动画追踪用
  type: TileType;
}

export interface GameState {
  levelId: number;
  levelRevision: number;
  columns: TileData[][];      // bottom → top
  tray: TileData[];           // 按 type 分组，长度 <= traySize
  traySize: number;           // 固定 7
  moveCount: number;
  combo: number;
  undoUsed: number;
  shuffleUsed: number;
  rngState: number;
  status: 'playing' | 'animating' | 'won' | 'failed';
}
```

---

# 29. 分层与规则单一真源

## 29.1 GameModel 与 View 分离

```text
GameModel = 唯一真实状态
View       = 根据 GameModel 渲染
```

**硬性约束：`core/` 目录下任何文件不得 import phaser。** ESLint 强制：

```js
// eslint.config.js
{
  files: ['src/game/core/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: ['phaser', 'phaser/*'] }]
  }
}
```

这保证 Solver / Simulator 能在 Node 环境下被 `tools/*.ts` 直接调用——**这是第 2 层防线（§13.2）能够存在的前提**。

## 29.2 Solver / Simulator / Game 必须共享同一套纯规则 ★ P1-4

**最危险的工程情况：游戏 RuleEngine 一套逻辑，Solver 自己又写一套。** 长期必然发生：

```text
Game 可以这么走，Solver 认为不能    → 关卡被误判不可解
Solver 认为能，Game 实际不能        → 玩家遇到无解关卡
```

**解决方案：`core/rules/` 是唯一真源。**

```ts
// core/rules/applyPick.ts —— 纯函数，无副作用
export function applyPickToState(
  state: GameState,
  columnIndex: number
): PickResult;

// core/rules/resolveMatches.ts
export function resolveMatches(state: GameState): MatchResult[];

// core/rules/canPick.ts
export function canPick(state: GameState, columnIndex: number): boolean;
```

以下三者**全部调用同一套函数**，不得各自实现：

```text
GameModel / RuleEngine   （真人玩法）
Solver                   （构建期求解 + Worker 内 Shuffle 校验）
Simulator                （三种 Bot）
```

## 29.3 RuleEngine 必须纯函数化

`pick(state, columnIndex)` **不得**：内部播放动画、内部存档、内部调用 Sound、内部改 Phaser Sprite。

只返回结果数据：

```ts
interface PickResult {
  nextState: GameState;
  pickedTile: TileData;
  sourceColumnIndex: number;
  insertedTrayIndex: number;
  shiftedTileIds: string[];
  matches: MatchResult[];
}
```

然后由 `GameScene / AnimationSystem` 根据 Result 做表现。

---

# 30. RuleEngine 接口

```ts
class RuleEngine {
  canPick(state: GameState, columnIndex: number): boolean;
  pick(state: GameState, columnIndex: number): PickResult;   // 纯函数，见 §29.3
  isWin(state: GameState): boolean;
  isFail(state: GameState): boolean;
  getHint(state: GameState): HintResult | null;              // §8.2 四级启发式
}
```

**UI 层不得自行判断规则。**

---

# 31. 点击逻辑

```ts
async function onColumnTap(columnIndex: number) {
  if (model.status === 'won' || model.status === 'failed') return;

  if (!rules.canPick(model.state, columnIndex)) {
    if (model.state.tray.length >= model.state.traySize) {
      animation.shakeTray();
      haptic.vibrate([20]);
    }
    return;
  }

  undoManager.push(model.snapshot());
  model.status = 'animating';

  const result = rules.pick(model.state, columnIndex);     // 纯函数
  model.apply(result.nextState);

  await animation.moveTileToTray(result.pickedTile, result.insertedTrayIndex);
  await animation.shiftTrayTiles(result.shiftedTileIds);

  for (const m of result.matches) {
    await animation.playMatch(m.tiles);
    await animation.compactTray(m.remaining);
  }

  if (rules.isWin(model.state))  { model.status='won';    inputQueue.clear(); return showWin(); }
  if (rules.isFail(model.state)) { model.status='failed'; inputQueue.clear(); return showFail(); }

  if (model.state.tray.length === model.state.traySize - 1) animation.startTrayWarning();

  model.status = 'playing';
  saveSystem.saveRun();
}
```

---

# 32. 状态机与输入

```text
BOOT → PRELOAD → HOME → LEVEL_SELECT → PLAYING ⇄ ANIMATING
                                          ↓
                                     WON / FAILED
```

## 32.1 InputQueue：入队而非锁死

「动画期间禁止一切输入」会让连续三消手感发滞——玩家看到三张同类想连点三下，第二下被吞掉。

```ts
class InputQueue {
  private queue: number[] = [];
  private processing = false;
  private static readonly MAX_QUEUE = 2;

  enqueue(columnIndex: number) {
    if (this.queue.length >= InputQueue.MAX_QUEUE) return;
    this.queue.push(columnIndex);
    void this.drain();
  }

  clear() { this.queue.length = 0; }        // ★ P1-3

  private async drain() {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const idx = this.queue.shift()!;
      await onColumnTap(idx);      // ★ 出队时重新执行 canPick，state 可能已变
    }
    this.processing = false;
  }
}
```

**关键：出队时必须重新执行规则判定**（列可能已空 / tray 可能已满 / 顶部 Tile 已换）。

## 32.2 必须 clear queue 的时机 ★ P1-3

```text
status = 'won'
status = 'failed'
restart
undo
shuffle
scene shutdown
```

否则会出现「胜利弹窗已弹出，队列里还有一个旧点击」这类极难排查的 bug。

---

# 33. 随机数

```ts
class SeededRandom {
  constructor(seed: number);
  next(): number;
  getState(): number;     // 进 GameSnapshot
  setState(s: number): void;
}
```

```text
关卡生成 seed = levelId * 1000 + variant
运行时 seed  = levelId + retryCount
```

**不得直接使用 `Math.random()`。**

---

# 34. 存档 ★ P2-1

## 34.1 双版本号

```json
{
  "saveSchemaVersion": 1,
  "maxUnlockedLevel": 12,
  "stars": { "1": 3, "2": 3, "3": 2 },
  "settings": { "music": true, "sound": true, "vibration": true },
  "currentRun": {
    "levelId": 8,
    "levelRevision": 3,
    "columns": [],
    "tray": [],
    "moveCount": 23,
    "undoUsed": 2,
    "shuffleUsed": 1,
    "undoStack": [],
    "rngState": 123456
  }
}
```

```text
Key: stackpop-save-v1
```

## 34.2 为什么要区分两个版本号

- `saveSchemaVersion`：存档**结构**变化 → 走 migration 或安全重置
- `levelRevision`：**某一关的数据**变化 → 只丢弃该关的 `currentRun`

若未来修改 Level 8 的 JSON，而玩家 localStorage 里还存着旧版的 `columns/tray`，会产生 incompatible state。

**处理规则：**

```text
currentRun.levelRevision !== 当前关卡 JSON 的 levelRevision
  → 丢弃 currentRun，该关重新开始
  → 但 maxUnlockedLevel / stars 等长期进度保留
```

## 34.3 中途恢复

每次合法操作完成后保存 `currentRun`，含**最近 5 步 undoStack**（约 10KB）。刷新后玩家仍能撤回，避免「刷新后按钮失效」的困惑。

---

# 35~38. 首页 / 关卡选择 / 设置

**首页**

```text
StackPop
[继续游戏]  [选择关卡]
🔊 音效   ⚙ 设置
```

**关卡选择**：4 列网格，状态为「已通关（显示星级）/ 当前可玩 / 未解锁」。不做复杂地图。

**设置**：音乐开关、音效开关、震动开关、重新开始当前关、返回首页。

---

# 39. 商业化：本阶段完全不做 ★ P0-5

```text
❌ RewardedAdProvider / MockRewardedAdProvider / RewardReason
❌ extra_slot（7→8 广告槽位）
❌ 广告复活 / 广告增加 Undo / 广告增加 Shuffle
❌ reward_ad_click / reward_ad_success 埋点
❌ 插屏广告
❌ 任何广告 SDK 或平台抽象
```

**理由：**

1. 增加不必要的平台抽象
2. 影响 Fail UI 设计（§5.3）
3. 让 Codex 为未来需求提前实现无实际价值的接口
4. 当前验证目标是**玩法、关卡、留存体验**，不是变现
5. 未来真要接微信/抖音广告时，再增加 Adapter 成本非常低

> **特别提醒 Codex：不要"为未来预留"广告接口。** 这不是节省未来工作，而是现在就引入无法验证的复杂度。

**固定槽位的额外收益：** 所有关卡都是 7 格，失败率 / `maxTrayOccupancy` / 撤回次数等指标可直接横向比较，不会出现「有人 7 格有人 8 格」导致数据无法对齐。

---

# 41. 数据埋点

```text
game_start  level_start  tile_pick  triple_match  tray_full
undo_use  shuffle_use  hint_use
level_fail  level_restart  level_win
```

重要参数：

```text
level_id  level_revision  move_count  duration
undo_count  shuffle_count  max_tray_occupancy  distinct_tray_types
fail_reason
```

> 已删除所有 `reward_ad_*` 事件（P0-5）。

`max_tray_occupancy` 是本作最有价值的单一指标——量化「玩家在这一关有多接近死局」，可直接与 §13.4 的模拟数据对照验证。

---

# 42. 关键指标

```text
Level 1 / 3 / 5 completion
单关失败率           → 目标 < 35%（对齐 §13.2 阈值）
重试率 / 平均局长     → 局长对齐 §10 目标时长
撤回使用率 / 打乱使用率
max_tray_occupancy 分布
关卡流失点
```

上线后真实失败率应与 `simulate` 的 Greedy 死局率**同向**；若严重背离，说明 Bot 策略需调整。

---

# 43. 性能

```text
目标 60 FPS，低端机 >= 45 FPS
核心包 < 3MB，首屏全部资源 < 5MB
```

手段：WebP、图集 atlas、音频压缩、非首屏延迟加载、粒子数量限制。

> 📌 **garden 的教训（直接适用）**：garden 首屏一度 4276KB，优化到 206KB（降 95%）。
> 最大的一笔浪费是 **6 张「load 了但从没被画过」的贴图**，占当时首屏 54%。
> 这类浪费**没有任何症状**，靠人 review 抓不到。
>
> **因此 StackPop 从 M4 起就要加防回归测试：`PreloadScene` 里 load 的每个纹理 key，
> 必须在渲染层被引用**，否则测试失败。成本极低，收益极高。

---

# 44. 多端适配总纲 ★ V0.3 新增

**优先级明确：**

```text
1️⃣ iPhone Safari / Android Chrome  —— 主战场，所有决策以此为准
2️⃣ PC 浏览器                       —— 必须可用、不能难看，但不为它牺牲手机体验
3️⃣ 平板                            —— 按「大手机」处理，走 PC 分支的限宽逻辑
```

## 44.1 三档布局

| 档位 | 判定条件 | 表现 |
|---|---|---|
| **手机竖屏** | 默认 | 全屏铺满，§19 的布局公式 |
| **手机横屏** | `orientation: landscape` 且非桌面 | 半透明提示转竖屏（§44.4） |
| **桌面 / 平板** | `min-width` + `min-height` + `pointer: fine` **三条件同时满足** | 居中容器 + 限宽 + 可见边界（§45） |

## 44.2 为什么必须是三条件，不能只判宽度 ★ garden 实测教训

```text
❌ 只判 min-width：
   横过来的手机（896×414）会被当成"电脑"
   → 套上桌面边框后高度更不够 → 布局直接崩

✅ min-width + min-height + pointer: fine
   pointer: fine 排除触摸设备
   min-height 排除横屏手机
```

```css
@media (min-width: 900px) and (min-height: 700px) and (pointer: fine) {
  /* 桌面样式 */
}
```

> 这条是 garden 在 UI 美化阶段踩出来的，**直接采用，不要重新试错**。

---

# 45. PC 浏览器适配 ★ V0.3 新增

## 45.1 问题：不限宽会直接崩

garden 在 1920×1080 实测：棋子从手机上的 49pt 长到 **150pt**，棋盘吃掉 1048px，
HUD 与控件被挤成 **0 高度**。

**根因：布局只有 tile 尺寸的下限，没有上限，也没有内容区限宽。**

StackPop 有完全相同的风险——§19.1 的公式只有 `TILE_SIZE_MIN`，
`TILE_SIZE_MAX = 92` 虽然存在，但 7 格 Tray 与工具栏仍会在宽屏上散开。

## 45.2 解法：限宽 + 居中 + 可见边界

```ts
// game/config.ts
export const LAYOUT = {
  TILE_SIZE_MIN: 48,
  TILE_SIZE_MAX: 92,
  MAX_CONTENT_WIDTH: 480,     // ★ 内容区限宽（CSS px），桌面上左右留白
  DESKTOP_MIN_WIDTH: 900,
  DESKTOP_MIN_HEIGHT: 700,    // ★ 实测临界值，见 §45.4
} as const;
```

**关键约束：棋盘、Tray、工具栏、标题栏四个区块必须共用同一个左边界。**

> garden 的教训：只居中棋盘会让 HUD 与它错位。StackPop 的对应风险是
> **7 格 Tray 与 6 列棋盘宽度不同**，若各自居中会出现视觉错位。
> 正确做法是先算出统一的 `contentLeft` 与 `contentWidth`，四个区块都基于它布局。

## 45.3 可见边界（纯 CSS，零素材）

参考 soulmate / garden 的做法，写在 `index.html`，不占用任何美术资源：

```css
@media (min-width: 900px) and (min-height: 700px) and (pointer: fine) {
  body {
    display: flex;                    /* ★ 用 flex 居中 */
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    background: linear-gradient(160deg, #cfe9ff 0%, #eaf4ff 55%, #f7fbff 100%);
  }
  #game {
    width: min(480px, 100vw);
    height: clamp(700px, 100dvh - 64px, 920px);
    border-radius: 24px;
    box-shadow: 0 18px 48px rgba(60, 110, 170, .22);
    overflow: hidden;
  }
}
```

**两个必须遵守的细节（garden 已验证）：**

1. **用 flex 居中，不要用 `translate(-50%, -50%)`**
   框比窗口高时，`translate` 会把**顶部标题栏切掉**。StackPop 的标题栏含关卡号，切掉就无法判断当前关卡。

2. **`height` 用 `clamp(700px, 100dvh - 64px, 920px)`，且下限就是 700**
   garden 实测：1280×700 窗口下某些区块会被压到不达标高度并与按钮重叠；
   逐档量下来 680px 仍不够，**700px 才够**。StackPop 的 Tray 是最不能被压缩的区块（§17.2），
   M0 布局验证时必须专门量一次桌面最小高度并回写本节。

> ✅ **StackPop M0 实测确认（2026-08-23）**：1280×700 下游戏容器为 480×700，
> 深度 10 时 `tileSize = 49.51px`、棋盘底部 `y = 520.29px`、Tray 标题起点
> `y = 534.29px`，保留 14px 间距；Tray 7 格与工具栏完整可见。因此桌面最小可用高度
> 正式锁定为 **700px**。

## 45.4 桌面输入适配

MVP 只需三条，成本很低：

```text
✅ hover 态：鼠标悬停在可点击 Tile 上时轻微上浮（复用 §23.1 的 scale 1.05）
✅ cursor: pointer（可点击 Tile / 按钮）
✅ 禁用移动端专属反馈：桌面不调 navigator.vibrate()
```

**不做**：键盘操作、右键菜单、拖拽。这个玩法纯点击，键盘映射价值低。

## 45.5 桌面不改变玩法

```text
❌ 桌面不放大棋盘列数（仍是 6 列）
❌ 桌面不增加 Tray 格数（仍是 7 格）
❌ 桌面不改难度
```

**理由**：§4.1 已锁定「所有关卡固定 7 格」以保证数据可横向比较。
若桌面改成 8 列/8 格，`simulate` 的死局率、`max_tray_occupancy` 等指标将无法与手机端对齐。
**桌面只是把同一份手机体验装进一个漂亮的框里。**

---

# 46. 横竖屏

只支持竖屏。

```text
手机横屏 → 半透明遮罩 + 「请旋转手机，竖屏体验更好」
不强制破坏浏览器布局，不锁定 orientation API
```

⚠️ **判定必须排除桌面**：桌面浏览器窗口天然是横向的，若只判 `width > height` 会让
所有 PC 用户看到「请旋转手机」。

```ts
const isLandscapePhone =
  window.innerWidth > window.innerHeight &&
  !window.matchMedia('(pointer: fine)').matches;
```

---

# 46.1 防误触

```text
Tile 有效点击区 = 视觉尺寸 + 4~8px
按钮最小 44 × 44 CSS px
```

> ⚠️ 由于 §19.2 的纵向重叠，**相邻 Tile 点击区会重叠**。
> 判定规则：**从最顶层开始命中测试**（渲染顺序的反向），
> 保证玩家点到的永远是可操作的那张。M1 必须写单测。

# 46.2 可访问性

图案不只依赖颜色（§20.1）；轮廓差异明显；可关闭震动；不使用过快闪光；粒子亮度受控。

---

# 47. 开发阶段

## M0：骨架 + 布局可行性验证

```text
Vite + TS + Phaser + 竖屏 Scale
BootScene / PreloadScene / HomeScene / GameScene
Git + README + ESLint（含 core/ 禁 phaser 规则）
```

**★ M0 必须额外完成：布局可行性验证（手机 + 桌面）**

```text
手机：用色块渲染 6 列 × 深度 10 的棋盘，在四个 viewport 截图确认不溢出
      375×812 / 390×844 / 430×932 / 360×800
      同时出 OVERLAP_RATIO = 0.80 / 0.83 / 0.85 三档对比图      ← P2-4

桌面：1920×1080 / 1440×900 / 1280×700 三档截图                 ← V0.3 新增
      确认限宽 + 居中 + 边界生效，四个区块左边界对齐（§45.2）
      ★ 专门量一次「桌面最小可用高度」并回写 §45.3
        （garden 实测为 700px，StackPop 的 Tray 不可压缩，需自行确认）

横屏手机：896×414 确认走的是「请旋转」提示，不是桌面分支（§44.2）
```

**这条前置到 M0，是为了避免 M4 才发现排不下。**

验收：`npm install / dev / build / test / lint` 全部通过。

## M1：纯规则原型（色块 + 字母）

```text
core/rules/ 四个纯函数（applyPick / resolveMatches / canPick / checkStatus）
columns、top tile、7 格 tray（分组插入）
pick、随时三同即消、win、fail、tray 满锁输入、restart
重叠区命中测试
```

用 §64 的 12 张牌关卡验证整条状态链路（**含 Path B**）。

**这一阶段先保证玩法正确，不做美术、不做 Solver。**

## M2：撤回 + 打乱 + Solver + Simulator

```text
UndoManager（Snapshot）、SeededRandom
Shuffle（带 tray 校验，走 SolverWorker）
Solver（tray 进状态 + canonical hash + 完整列去重）
validate-levels（含 solution 逐步重放校验）
simulate（Random / Greedy / Cautious 三种 Bot）
§53 全部单测
```

## M3：JSON LevelLoader + 20 关

```text
LevelLoader、20 关数据（1~5 手工，6~20 生成器）
全部通过 validate-levels + simulate 分级
```

## M4：正式 UI + 手感 + 多端适配

```text
蓝天背景、奶油卡牌、原创图案、7 格 Tray（含预警态）
纵向重叠布局、Tile 跳跃、Tray 挤开与紧凑
三消动画、粒子、tray 满警告、胜负弹窗
音效（adoptContext）、震动、InputQueue（含 clear 时机）

★ 桌面适配（§45）：限宽居中、可见边界、hover 态、cursor
★ 横屏提示（§46），且必须排除桌面
★ 首屏纹理防回归测试（§43）：load 的每个 key 必须被渲染层引用
```

> 🔴 音效接入后**必须真机复验 iPhone**（§24）。桌面与 Android 复现不了静音问题。

## M5：关卡选择 + 存档

```text
关卡选择、解锁、localStorage（双版本号）
刷新恢复（含撤回栈）、Settings、星级
```

## M6：部署上线 ★ V0.3 新增

```text
1. 写 deploy.sh（以 garden/deploy.sh 为模板，保留边界断言）
2. vite base 设为 /stack/，用 npm run preview 验证子目录路径不 404
3. DRY_RUN=1 ./deploy.sh 确认影响范围
4. DRY_RUN=0 ./deploy.sh 实际发布
5. 核对 md5 + curl 200（脚本自动）
6. ★ 真机复验：iPhone Safari + Android Chrome + PC Chrome 各一次
7. 首页入口卡片 —— 需用户确认后再做（§54.5.7）
```

验收：https://g.ismayday.mobi/stack/ 返回 200 且可正常游玩。

---

# 53. 自动测试清单

## Rule tests

```text
✓ 只能取每列顶部
✓ 空列不可取
✓ 取牌后列长度 -1
✓ tray 未满时可取不同类的牌
✓ tray 中任意 type 达 3 立即消除
✓ 消除后剩余 Tile 左移紧凑
✓ 新 Tile 按 type 分组插入
✓ tray 满时 canPick 返回 false
✓ tray 满且无三同 → isFail
✓ 清空所有列且 tray 空 → isWin
✓ columns 空但 tray 非空 → 抛错
✓ applyPickToState 是纯函数（不修改入参 state）        ★ P1-4
```

## Solver tests ★ P0-1 重点

```text
✓ 空状态 → canSolve = true
✓ §64 的 12 张牌关卡 → canSolve = true
✓ 需要「先铺垫再收割」的关卡 → canSolve = true
✓ tray 已满的状态 → canSolve = false
✓ 某 type 总数 % 3 != 0 → canSolve = false
✓ canonical hash：列顺序交换后 hash 相同
✓ canonical hash：tray 顺序交换后 hash 相同
✓ 超出节点预算 → 抛 SolverBudgetExceeded

★ P0-1 专项回归测试（必须写）：
✓ getDistinctPickColumns 对 [BELL,PAW] 与 [FISH,PAW] 返回两个索引
  （顶部同为 PAW 但完整列不同，不得去重）
✓ getDistinctPickColumns 对两个完全相同的列只返回一个索引
✓ 随机对拍：200 个随机局面，
  「完整列去重」结果 === 「不剪枝」结果
  （防止未来有人把 signature 改回 top type）

✓ Solver 使用的 applyPick 与 RuleEngine 使用的是同一个函数   ★ P1-4
```

## Undo tests

```text
✓ 点击后可恢复 columns / tray / moveCount / rngState
✓ 打乱后可恢复
✓ 消除后撤回，被消除的 3 张回到 tray
✓ 撤回到起点后按钮置灰
✓ 刷新后仍可撤回（undoStack 已持久化）
```

## Shuffle tests

```text
✓ Tile 总数不变 / 每种数量不变 / 每列高度不变 / tray 不变
✓ 打乱结果满足「含当前 tray 的可解性」
✓ 50 次仍失败时走 generateSafeState 兜底
✓ Worker 超时时走兜底而非卡死                        ★ P1-2
```

## InputQueue tests ★ P1-3

```text
✓ 同一 column 连续入队两次，第二步拿到的是更新后的新顶部
  不会重复拿同一个 Tile ID
✓ 队列长度上限为 2，第三次入队被丢弃
✓ win / fail / restart / undo / shuffle / shutdown 时队列被 clear
✓ 胜利后队列中的旧点击不会被执行
```

## Level tests

```text
✓ Tile 总数 % 3 == 0 / 每类数量 % 3 == 0
✓ 列深 <= 10 / columnCount === 6
✓ Solver 可以完成
✓ solution 逐步重放：每步 expectedTileType 与实际顶部一致  ★ P0-2
✓ solution 重放到最后 columns 与 tray 均为空
✓ Level 1~5 的 Greedy 失败率 < 5%
✓ Level 6~20 的 Greedy 失败率 <= 70%
```

## Layout tests

```text
✓ 4 个目标 viewport 下 6 列不溢出
✓ 深度 10 的列高度 <= 棋盘可用高度
✓ tileSize 落在 [48, 92]
✓ 重叠区域的命中测试返回最顶层 Tile

★ 桌面适配（V0.3 新增）：
✓ 1920×1080 下 tileSize 不超过 TILE_SIZE_MAX
✓ 1920×1080 下内容区宽度 <= MAX_CONTENT_WIDTH
✓ 棋盘 / Tray / 工具栏 / 标题栏四个区块左边界一致      ← §45.2
✓ 896×414（横屏手机）判定为「手机横屏」而非「桌面」    ← §44.2
✓ 1280×700 下 Tray 高度不小于其最小可用高度
```

## Asset tests ★ V0.3 新增（防回归，见 §43）

```text
✓ PreloadScene 中 load 的每个纹理 key，都能在渲染层找到引用
  （防止「下载了但从没被画过」的首屏浪费——这类浪费无任何症状）
```

---

# 54. E2E 测试（Playwright）

```text
✓ 首页 → 开始游戏
✓ 点击三个相同 Tile → 消除
✓ 点击三个不同 Tile → 不消除，tray 保留 3 张
✓ §64 Path B 完整走通（核心固定用例）           ★ P0-4
✓ 填满 tray → 失败弹窗（含 撤回/打乱/重新开始 三个按钮，无广告入口）
✓ 失败 → 撤回 → 可继续
✓ 通关 → 下一关
✓ 刷新 → 进度仍存在，且可撤回
✓ iPhone 竖屏 viewport 正常
```

Viewport：`375×812  390×844  430×932  360×800`

---

# 54.5 部署 ★ V0.3 新增

## 54.5.1 发布地址

```text
https://g.ismayday.mobi/stack/
```

与仓库其它项目（garden / journey / tavern / soulmate / star_fighter）同域名、同站点根，
各占一个子目录。

## 54.5.2 部署边界 —— 全局红线

各游戏**共用同一台服务器的同一个站点根**：

```text
/www/wwwroot/g.ismayday.mobi/     ← 站点根（Codex Games 首页）
├── star_fighter/   ├── soulmate/   ├── tavern/
├── journey/        ├── garden/     ├── h3/
├── stack/          ← StackPop，首次发布时创建
├── images/  version/  404.html
└── mimo/  mystock/  ← ⚠️ 非本仓库项目，任何情况下不动
```

**硬性规则（根 `CLAUDE.md` §1.1）：**

```text
✅ 只同步到 $REMOTE_APP_DIR（= $REMOTE_ROOT/stack）
❌ 绝不把任何文件 rsync 到站点根 $REMOTE_ROOT
❌ 绝不对站点根执行 rsync --delete
   —— 会连带删除首页、其它所有游戏，以及非本仓库的 mimo / mystock
```

`deploy.sh` 必须带**硬性断言**拦截误配置，触发即中止（见 §54.5.4）。

若某次部署看起来需要动站点根，**停下来问用户**。

## 54.5.3 服务器信息

```text
主机：ubuntu@211.159.177.55      （本机已配 SSH 免密，可直接登录）
sudo 免密，rsync 已安装
nginx root = /www/wwwroot/g.ismayday.mobi
文件属主统一 www:www，权限 644
静态图片 expires 30d
```

> 🔴 **改图必须换文件名**，否则用户 30 天内看到旧图。
> garden 已踩过这个坑（特殊棋子美术重做时必须改名到 `-v3`）。
> StackPop 的 8 个 Tile 图案若在 M4 后有重做，**一律走 `paw-v2.webp` 这类命名**。

密钥（若未来有）只存在于服务器 `.env`，**不入库、不打印、不写进文档**。

## 54.5.4 deploy.sh 规范

**直接以 `garden/deploy.sh` 为模板改写**，仅替换项目名与路径。必须保留的结构：

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="${REMOTE_HOST:-ubuntu@211.159.177.55}"
REMOTE_ROOT="${REMOTE_ROOT:-/www/wwwroot/g.ismayday.mobi}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-$REMOTE_ROOT/stack}"
REMOTE_USER="${REMOTE_USER:-www}"
BASE_PATH="${VITE_BASE_PATH:-/stack/}"
SITE_URL="${SITE_URL:-https://g.ismayday.mobi/stack/}"
DRY_RUN="${DRY_RUN:-1}"          # ★ 默认 dry-run

# ———— 部署边界断言 ★ 不要删 ————
norm() { printf '%s' "${1%/}"; }

if [[ "$(norm "$REMOTE_APP_DIR")" == "$(norm "$REMOTE_ROOT")" ]]; then
  echo "❌ 中止：REMOTE_APP_DIR 等于站点根" >&2; exit 1
fi
if [[ "$(norm "$REMOTE_APP_DIR")" != "$(norm "$REMOTE_ROOT")/stack" ]]; then
  echo "❌ 中止：REMOTE_APP_DIR 必须是 \$REMOTE_ROOT/stack" >&2; exit 1
fi

# ———— 构建前校验（全绿才允许发布）————
cd "$LOCAL_DIR/web"
npm install
npm test
npm run validate-levels
npm run simulate            # ★ StackPop 特有，见 §13.2
npm run lint
VITE_BASE_PATH="$BASE_PATH" NODE_ENV=production npm run build

[[ -f "$LOCAL_DIR/web/dist/index.html" ]] || { echo "❌ 构建失败" >&2; exit 1; }

# ———— 同步 ————
RSYNC_FLAGS=(-avz --delete
  --rsync-path="sudo rsync"
  --no-owner --no-group --no-times --no-perms
  --chmod=D755,F644
  --exclude ".DS_Store")

# DRY_RUN=1 时只打印将要发生的改动并退出

# ———— 发布后核对 ————
# 1. 本地与远端 index.html md5 必须一致
# 2. curl $SITE_URL 必须返回 200
```

**与 garden 的唯一差异：多一条 `npm run simulate`。**
StackPop 的关卡可解性依赖 Simulator 分级（§13.2），
不跑就发布等于跳过第 2 层防线。

## 54.5.5 base path 必须正确

```ts
// vite.config.ts
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/stack/',
  // ...
});
```

⚠️ 部署在子目录下，`base` 配错会导致**所有资源 404、页面白屏**。
本地 `npm run dev` 用 `/` 不会暴露这个问题，**必须用 `npm run preview` 验证一次**。

## 54.5.6 发布纪律

```text
1. 先 DRY_RUN=1 ./deploy.sh 确认影响范围
2. 确认无误后 DRY_RUN=0 ./deploy.sh
3. 发布后核对 md5 + curl 200（脚本已自动做）
4. 真机复验：iPhone Safari + Android Chrome 各开一次
5. 只发布用户要求的内容；涉及站点根的改动先问用户
```

> 🔴 **音频层改动必须真机复验，单测不作数。**
> garden 的 iPhone 静音 bug 在桌面 Chrome / Android 上**根本无法复现**
> （那两个平台的 AudioContext 建出来就是 `running`，没有解锁这回事）。
> 详见 §24 与 §54.5.7。

## 54.5.7 首页入口（需用户确认后再做）

站点根 `index.html` **没有部署脚本**，需手动 rsync，且属于站点根写操作。

```bash
rsync -avz --rsync-path="sudo rsync" --no-owner --no-group --chmod=F644 \
  index.html ubuntu@211.159.177.55:/www/wwwroot/g.ismayday.mobi/
```

**当前状态：首页尚未包含 garden 与 stack 的入口卡片。**

StackPop 上线后是否加入首页，**由用户决定，Codex 不擅自修改站点根 `index.html`**。

---

# 55. Debug 模式

```text
?debug=1
```

开启：Tile ID、列号、FPS、当前 seed、当前 state hash、tray 占用率、一键胜利、一键失败、**显示当前状态的 Hint 建议**（§8.2，非预存 solution）。

> 建议第一天就做，调关卡时能省几十小时。

---

# 56. 关卡编辑工具（M3 后）

`/editor` 页面：选择 Tile 类型、点击列添加/删除 Tile、增删列、Run Solver、Run Simulate、Play Test、Export JSON。

无需复杂编辑器，能生成 JSON 即可。

---

# 57~59. 后续扩展（MVP 后，本阶段不做）

```text
57.1 冰冻 Tile     57.2 问号 Tile     57.3 锁链
57.4 万能 Tile     57.5 金色 Tile
58   宠物系统（陪伴/表情/庆祝/安慰，不影响规则、不加数值）
59   视觉识别「花园晨光」
```

---

# 60. MVP 成功标准

## 功能

- [ ] 可从首页进入关卡，完整玩完 20 关
- [ ] 点击规则无 Bug
- [ ] **7 格 tray 分组插入与随时三同消除无 Bug**
- [ ] **tray 满时正确锁输入并给出提示**
- [ ] 撤回稳定（含刷新后）
- [ ] **打乱后局面确实可解（含当前 tray），且不卡主线程**
- [ ] 所有关卡经 Solver 验证可解
- [ ] **所有关卡 solution 逐步重放校验通过**
- [ ] **Level 1~5 Greedy 失败率 < 5%；Level 6~20 <= 70%**
- [ ] 胜利 / 失败流程完整，**失败页无任何广告入口**
- [ ] 刷新页面不丢失长期进度

## 体验

- [ ] 首关不读说明即可上手
- [ ] **第 3 关能让玩家理解「槽位可暂存不同类」**
- [ ] Tile 点击延迟 < 100ms（含连点）
- [ ] 动画不阻塞超过 500ms
- [ ] **4 个目标 viewport 下 6 列均不溢出**
- [ ] **PC 浏览器（1920×1080）下布局不散，四区块左边界对齐**
- [ ] **横屏手机看到「请旋转」提示，PC 不会看到**
- [ ] 按钮不误触；重叠区命中测试正确
- [ ] **8 个图案在 32×32px 下仍能 1 秒内区分**
- [ ] **iPhone Safari 真机有声**（单测不作数，§24）

## 工程

- [ ] `npm run build / test / lint` 全部通过
- [ ] `npm run validate-levels` 通过
- [ ] `npm run simulate` 通过（无关卡超阈值）
- [ ] TypeScript 无 error
- [ ] **`core/` 无任何 Phaser 依赖（ESLint 强制）**
- [ ] **Solver / Simulator / Game 确实共用 `core/rules/`（有测试证明）**
- [ ] 关卡通过 JSON 配置；数值集中在 `config/`，逻辑代码不写死数值
- [ ] **代码中无任何广告 / 商业化残留**
- [ ] **首屏 load 的纹理全部被引用（防回归测试通过）**

## 部署

- [ ] `vite base = /stack/`，`npm run preview` 子目录路径不 404
- [ ] `deploy.sh` 含边界断言，默认 DRY_RUN=1
- [ ] `deploy.sh` 构建前跑 test / validate-levels / **simulate** / lint
- [ ] https://g.ismayday.mobi/stack/ 返回 200 且可正常游玩
- [ ] **站点根未被任何写操作触及**（mimo / mystock / 其它游戏完好）

---

# 61. 执行原则

1. **先做规则，再做美术。**
2. **GameModel 与 View 完全分离；`core/` 不得 import phaser。**
3. **`core/rules/` 是规则的唯一真源；Solver / Simulator / Game 共用，不得各写一套。** ★
4. **所有关卡数据配置化，不硬编码在 Scene。**
5. **撤回使用 snapshot，不写反向补丁逻辑。**
6. **所有随机行为使用 seeded RNG。**
7. **Solver 对称去重必须用完整列内容，不得用顶部 type。** ★
8. **Hint 只基于当前状态，绝不读取预存 solution。** ★
9. **Solver 只在构建期跑；运行时唯一例外是 Shuffle 校验，且必须走 Worker。** ★
10. **动画期间输入入队，不丢弃；Win/Fail/Restart/Undo/Shuffle/Shutdown 时必须 clear。** ★
11. **本阶段完全不做商业化，也不为商业化预留接口。** ★
12. **不引入后端、不做账号系统。**
13. **优先保证移动端 Safari / Chrome。**
14. **全局只允许一个 AudioContext。**
15. **布局可行性必须在 M0 验证（含桌面档），不留到 M4。**
16. **不复制参考截图中受版权保护的素材。**
17. **一切数值进 `config/`，逻辑代码不写死数值。** ★ 继承自 garden
18. **`strict: true`，不写 `any`。** ★ 继承自 garden
19. **部署只写 `$REMOTE_ROOT/stack`，绝不碰站点根。** ★ 全局红线
20. **音频层改动必须真机复验 iPhone，单测不作数。** ★ garden 踩坑教训
21. **改图必须换文件名**（服务器图片缓存 30 天）。 ★ garden 踩坑教训

---

# 62. 交给 Codex 的启动 Prompt

> ⚠️ V0.1 §62 与 V0.2 §62 的 Prompt 均已作废（内含错误规则）。以下为 V0.3 版本。

```text
请阅读仓库中的两份文档：
  1《H5_StackPop_游戏策划和执行方案_V0.3.md》  ← 玩法与工程规范
  2《StackPop_美术素材工单_V1.md》              ← 美术规范（你用 Image Gen 产出）
V0.1 与 V0.2 均已作废，一切以 V0.3 为准。

目标：实现一款移动端竖屏 H5 轻度益智游戏（Triple-Match 品类），
项目名 StackPop，目录 stack/，发布到 https://g.ismayday.mobi/stack/

你的角色：执行方，负责全部代码实现 + 用 Image Gen 产出 23 张美术素材。
方案由 Claude Opus 设计，若你认为方案有问题，请先提出再改，不要自行偏离。
开发完成后由 Kevin 与 Claude 按文档 §66 验收。

技术栈：Vite + TypeScript + Phaser 3 + Vitest + Playwright
可直接复用同仓库 garden/web 的工程骨架（相同技术栈，已上线）。
部署红线见仓库根 CLAUDE.md §1.1。

【核心玩法规则 —— 务必按此实现，勿凭品类直觉】
1. columns 数组顺序统一为 bottom → top，最后一个元素为当前可点击 Tile。
2. 玩家每次只能点击一列最上方 Tile。
3. Tray 为 7 格，所有关卡固定，不做任何动态变化。
4. Tray 允许暂存不同类的 Tile，这是玩法核心，不是失败条件。
5. 每次插入后立即检查：tray 中任意 type 计数 >= 3 → 立即消除该 3 枚，
   其余左移紧凑。用 while 循环处理连锁。
6. 新 Tile 按 type 分组插入（同类相邻），不是纯点击顺序。
7. 失败条件：tray 满 7 格。tray 满时应锁输入并提示，
   不允许"点了之后才宣判失败"。
8. 胜利条件：所有 columns 为空且 tray 为空。

【本阶段产品约束 —— 硬边界】
9. 完全不做商业化：无广告、无激励视频、无广告解锁槽位、无广告复活。
   不要创建 RewardedAdProvider 或任何广告抽象层，也不要"为未来预留"。
   失败页只有 [撤回一步] [打乱] [重新开始] 三个按钮。

【工程要求 —— 违反即返工】
10. core/rules/ 是规则的唯一真源，导出纯函数
    applyPickToState / resolveMatches / canPick / checkStatus。
    GameModel、Solver、Simulator 三者必须调用同一套函数，
    严禁 Solver 自己重写一套规则。要有测试证明它们共用。
11. core/ 目录不得 import phaser，用 ESLint no-restricted-imports 强制。
12. RuleEngine 纯函数化：pick() 只返回 PickResult 数据，
    不播放动画、不存档、不发声、不碰 Phaser Sprite。
13. Solver 状态必须包含 tray，动作是「取单张」而非「弹三张」。
14. ★ Solver 对称去重必须用「完整列内容」作为 signature：
      const signature = column.join(',');
    绝对不能用 column[column.length-1]（顶部 type）。
    因为 [BELL,PAW] 与 [FISH,PAW] 顶部同为 PAW，但取后暴露的是
    BELL 和 FISH 两个不同状态，按顶部去重会导致可解关卡被误判不可解。
    这是假阴性 bug，不会报错，只会表现为生成器效率莫名很低。
    必须写随机对拍测试防止回归（见文档 §53）。
15. canonical hash 必须同时对「列」和「tray」排序，否则会搜索爆炸。
16. Solver 只在构建期跑。运行时唯一例外是 Shuffle 可解性校验，
    必须放在 Web Worker（SolverWorker.ts），用洗牌动画遮蔽计算时间，
    不得阻塞 Phaser 主线程。超时走 generateSafeState 兜底。
17. ★ 关卡 solution 必须是逐步操作序列 SolutionStep[]
    （{ columnIndex, expectedTileType }），不是 number[][] 的三张一组。
    validate-levels 要逐步重放并校验 expectedTileType 与实际顶部一致。
18. ★ Hint 只能基于当前状态做四级启发式（文档 §8.2），
    绝对不能读取预存 solution 的下一步——玩家一旦偏离路径，
    那一步可能指向空列，甚至加速进入死局。
19. Undo 无限免费（但影响星级），Shuffle 每关 3 次。
    Undo 用 GameSnapshot（含 rngState），不写反向补丁。
20. Shuffle 保持 Tile 数量/类型数量/各列高度/tray 不变，
    且必须校验「以玩家当前 tray 为起点仍然可解」。
21. 动画期间输入入队（上限 2），出队时重新执行 canPick。
    win / fail / restart / undo / shuffle / shutdown 时必须 inputQueue.clear()。
22. 所有随机逻辑使用 seeded RNG，不用 Math.random()。
23. 所有关卡使用 JSON，不硬编码在 Scene。
24. MVP 棋盘固定 6 列（不是 8 列），最大列深 10，tileSize 范围 [48,92]。
    纵向必须重叠：rowStep = tileSize * OVERLAP_RATIO（默认 0.85）。
    重叠区命中测试从最顶层开始。
25. 存档区分 saveSchemaVersion 与 levelRevision。
    levelRevision 变化时丢弃该关 currentRun，但保留长期进度。
    localStorage key 用 stackpop-save-v1。
26. 必须适配 375×812、390×844、430×932、360×800 四种手机尺寸。
27. ★ 全局只允许一个 AudioContext，且必须是 Phaser 那一个：
    用 audioSystem.adoptContext(this.sound.context) 接管，不要自己 new。
    iOS 的 WebAudio 按 context 逐个解锁，自建的第二个永远不会被解锁，
    表现为 iPhone 完全静音。这个 bug 在桌面 Chrome / Android 上无法复现，
    同仓库 garden 项目为此归因错了三次。音频改动必须真机复验。

【多端适配 —— 优先级 iPhone/Android > PC > 平板】
28. PC 浏览器必须可用且不难看，但不为它牺牲手机体验。
    桌面判定必须用三条件：min-width:900 + min-height:700 + pointer:fine。
    ★ 只判宽度会把横过来的手机（896×414）当成电脑，套上桌面边框后高度更不够。
29. 桌面需限宽居中：MAX_CONTENT_WIDTH = 480，并加纯 CSS 可见边界（零素材）。
    ★ 棋盘 / Tray / 工具栏 / 标题栏四个区块必须共用同一个左边界，
      只居中棋盘会让它们错位（StackPop 的 7 格 Tray 与 6 列棋盘宽度不同）。
    ★ 用 flex 居中，不要用 translate(-50%,-50%)——框比窗口高时会切掉顶部标题栏。
30. 桌面不改变玩法：仍是 6 列、7 格 Tray、同样难度。
    桌面只是把同一份手机体验装进一个漂亮的框里。
31. 横屏提示必须排除桌面，否则所有 PC 用户会看到「请旋转手机」。
32. 桌面输入只做三条：hover 上浮、cursor:pointer、不调 vibrate。
    不做键盘操作 / 右键 / 拖拽。

【工程约定 —— 继承自同仓库 garden 项目】
33. 直接复用 garden/web 的骨架文件（package.json / eslint / tsconfig /
    vite.config / vitest.config / deploy.sh），改项目名与路径即可。
34. 一切数值进 config/（layout.ts / tuning.ts / levels.ts），
    逻辑代码里不写死数值。
35. strict: true，不写 any。
36. 首屏防回归测试：PreloadScene 里 load 的每个纹理 key 必须被渲染层引用。
    garden 曾有 6 张「下载了但从没被画过」的贴图，占首屏 54%，
    这类浪费没有任何症状，靠 review 抓不到。

【部署】
37. 发布地址 https://g.ismayday.mobi/stack/
38. vite base 必须设为 /stack/，否则子目录下资源全 404、页面白屏。
    npm run dev 用 / 不会暴露这个问题，必须用 npm run preview 验证一次。
39. ★★ 部署红线：只同步到 $REMOTE_ROOT/stack，
    绝不对站点根 /www/wwwroot/g.ismayday.mobi 执行任何写操作或 rsync --delete。
    站点根还有首页、其它 6 个游戏，以及非本仓库的 mimo / mystock。
    deploy.sh 必须带硬性断言拦截误配置，触发即中止。
    若某次部署看起来需要动站点根，停下来问用户。
40. deploy.sh 默认 DRY_RUN=1；构建前必须跑
    test / validate-levels / simulate / lint，全绿才允许发布。
41. 不擅自修改站点根 index.html（首页入口卡片需用户确认）。
42. 改图必须换文件名（服务器静态图片 expires 30d，否则用户 30 天看到旧图）。

【开发顺序】不要一次完成全部功能。每阶段完成后运行 lint / test / build，
并总结已完成内容、文件变化和下一阶段计划，等确认后再进入下一阶段。

M0：项目骨架（复用 garden/web）+ Boot/Preload/Home/GameScene
    + 竖屏自适应 + ESLint 规则（core/ 禁 phaser）。
    ★ 额外必做，布局可行性验证，不能推迟到 M4：
      - 手机：色块渲染 6 列 × 深度 10，在 4 个目标 viewport 截图确认不溢出
      - 出 OVERLAP_RATIO = 0.80 / 0.83 / 0.85 三档对比图供人工定夺
      - 桌面：1920×1080 / 1440×900 / 1280×700 三档截图，确认限宽居中生效、
        四区块左边界对齐；并量出「桌面最小可用高度」回写文档 §45.3
      - 横屏手机 896×414 确认走「请旋转」而非桌面分支

M1：只用色块 + 字母实现完整核心玩法。
    先写 core/rules/ 四个纯函数，再接 View。
    Column、Tile、7 格 Tray（分组插入）、Pick、随时三同即消、
    Win、Fail、tray 满锁输入、Restart、重叠区命中测试。
    用文档 §64 的 12 张牌关卡验证整条状态链路，
    特别是 Path B（col0,1,2 → col3,4,5 → col1）。

M2：GameSnapshot、UndoManager、SeededRandom、
    Shuffle（带 tray 校验，走 SolverWorker）、
    Solver（tray 进状态 + canonical hash + 完整列去重）、
    validate-levels（含 solution 逐步重放）、
    simulate（Random / Greedy / Cautious 三种 Bot），
    并补齐文档 §53 的全部单测（尤其 P0-1 的随机对拍测试）。

M3：JSON LevelLoader，制作并验证 20 关（难度曲线见文档 §10）。
    Level 1~5 手工设计，6~20 用 Generator + Solver + Simulator 分级。

M4：正式 UI、纵向重叠布局、Tile 动画、Tray 挤开与紧凑、三消动画、
    tray 满预警、胜负弹窗、音效、震动、InputQueue。

M5：关卡选择、本地存档（双版本号）、刷新恢复（含撤回栈）、Settings、星级。

MA：美术产出（可与 M2/M3 并行，但必须在 M4 前完成）。
    按《StackPop_美术素材工单_V1.md》分 4 批用 Image Gen 产出 23 张素材。
    ★ 第 0 批 Master Reference 先做，风格确认后再画第 1 批，不要一次全画。
    ★ 每批做完先自检 32px 眯眼测试，通过再进下一批。
    ★ 素材走 config/assets.ts 的 Asset Manifest，不在代码里硬编码路径。

M6：部署上线。写 deploy.sh（以 garden/deploy.sh 为模板，保留边界断言），
    先 DRY_RUN=1 确认影响范围，再实际发布，
    最后真机复验 iPhone Safari + Android Chrome + PC Chrome。

若文档存在实现细节冲突，优先级为：
玩法正确 > Solver 与真实规则一致 > 关卡理论可解 >
Simulator 证明普通策略可玩 > 移动端布局稳定 > 手感 > 美术 > 扩展。

【每阶段交付要求】
每个阶段完成后，提供：
  1. 跑过的命令与输出（lint / test / build，以及对应阶段的 validate-levels / simulate）
  2. 变更的文件清单
  3. 本阶段的已知问题与未做项
  4. 下一阶段计划
然后等确认，再进入下一阶段。不要一口气做完所有阶段。

【不要做的事】
- 不要擅自扩大范围（文档 §2.2 是硬边界）
- 不要为商业化预留任何接口
- 不要修改站点根 index.html
- 不要 git push（除非 Kevin 明确要求）
```

---

# 63. 第一轮目标

**不要第一轮就做 20 关和全套美术。**

最佳第一轮（M0 + M1）：

```text
能在浏览器打开
+ 6 列棋盘（色块）
+ 点击顶部 Tile
+ Tile 进入 7 格 Tray，按 type 分组
+ 任意三同类立即消除
+ Tray 满 7 格 → 失败
+ 清空 → 胜利
+ 重新开始
```

**只要这个原型的操作手感成立，再继续做：** 撤回 → 打乱 → Solver → Simulator → 关卡 → 美术。

这样返工风险最低。

---

# 64. Demo 验收关卡 ★ P0-4 数据已修正

```text
Column 0: [BELL, PAW]
Column 1: [GRASS, PAW]
Column 2: [CAN, PAW]
Column 3: [BELL, GRASS]
Column 4: [CAN, GRASS]
Column 5: [BELL, CAN]
```

（数组顺序 bottom → top，末位为顶部）

## 64.1 初始顶部（V0.2 此处写错，已修正）

```text
col0 = PAW      col3 = GRASS
col1 = PAW      col4 = GRASS
col2 = PAW      col5 = CAN
```

即：`PAW × 3、GRASS × 2、CAN × 1`

> **V0.2 原文误写为「PAW PAW PAW GRASS GRASS GRASS」，第 6 张实为 CAN。**
> col5 = `[BELL, CAN]`，顶部是 CAN 不是 GRASS。已实证核对。

类型计数：`BELL×3, PAW×3, GRASS×3, CAN×3`，总计 12 张 ✅

## 64.2 Path A —— 基础链路

```text
点 col0, col1, col2  → tray = [PAW,PAW,PAW] → 立即消除 → tray = []

此时暴露：col0=BELL, col1=GRASS, col2=CAN
后续按实际暴露状态继续。
```

一条完整通关序列（已实证可清空）：

```text
0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5
```

## 64.3 Path B —— 验证「不同类共存」★ M1 核心固定用例

**这是 V0.3 规则最重要的验收点。**

```text
点 col0, col1, col2
  → tray = [PAW, PAW, PAW] → 消除 → tray = []
  → 暴露 col0=BELL, col1=GRASS, col2=CAN

点 col3, col4, col5
  → tray = [GRASS, GRASS, CAN]        ← 不消除，正常暂存 ✅

点 col1                                ← ★ 是 col1，不是 col3
  → tray = [GRASS, GRASS, GRASS, CAN]
  → GRASS × 3 立即消除
  → tray = [CAN]                       ← 剩余紧凑 ✅
```

> **V0.2 原文写的是「再点 col3」，这是错的。**
> 第一次点掉 col3 顶部 GRASS 后，col3 顶部已变为 BELL。
> 真正能补第三个 GRASS 的是 **col1**（PAW 被消除后 col1 顶部 = GRASS）。已实证核对。

**Path B 一次性验证了四件事：**

```text
✓ 不同类可以共存于 tray
✓ 第三个同类后来进入时立即消除
✓ 消除后剩余 Tile 正确紧凑
✓ 消除的判定不与「第 3 次点击」对齐
```

**建议作为 M1 的 E2E 核心固定用例，长期保留。**

---

# 65. 开发优先级

```text
1. 规则绝对正确
      ↓
2. Solver 与真实规则一致（共用 core/rules/）
      ↓
3. 所有关卡理论可解
      ↓
4. Simulator 证明普通策略可玩
      ↓
5. 移动端布局稳定
      ↓
6. 点击 / 三消 / Tray 动画手感
      ↓
7. 美术品质
      ↓
8. 扩展系统
```

**当前阶段完全不应进入：商业化、广告、复杂养成。**

真正决定这类产品品质的六件事：

1. 顶部信息是否一眼能读懂
2. 每次三消是否有明确而舒服的反馈
3. **暂存槽的「张力—释放」循环是否成立**（本品类的灵魂）
4. 关卡是否真的可解、人类玩得通、难度自然增长
5. 误操作之后是否有合理恢复手段
6. 移动端是否始终流畅、按钮足够大、没有布局跳动

---

# 66. 验收清单 ★ V0.3 新增（Kevin + Claude 共同执行）

> Codex Sol 开发完成后，按本章逐项验收。**每项都要能当场演示或跑出证据，不接受"应该没问题"。**

## 66.1 验收原则

```text
1. 能自动化的一律看命令输出，不看口头汇报
2. 玩法规则类问题优先，美术类问题最后
3. 真机验收不可跳过（iPhone 的问题桌面复现不了）
4. 发现问题记录「现象 + 复现步骤」，不直接给结论
```

## 66.2 第一关：命令行（5 分钟，全绿才继续）

```bash
cd stack/web
npm install && npm run lint && npm test && npm run build
npm run validate-levels
npm run simulate
```

| 检查项 | 期望 |
|---|---|
| `lint` | 0 error 0 warning |
| `test` | 全绿，且**含 §53 的 P0-1 随机对拍测试** |
| `build` | tsc 无 error，dist 产出 |
| `validate-levels` | `20/20 valid / solvable / solution verified` |
| `simulate` | 输出三种 Bot 的失败率；**Level 1~5 Greedy < 5%** |

> ⚠️ 若 `simulate` 只输出一种 Bot，说明 P1-5 没做。

## 66.3 第二关：规则正确性（重点，20 分钟）

**这是最容易出错的部分，逐条手动验。**

| # | 验收动作 | 期望 |
|---|---|---|
| 1 | 点击被压住的 Tile | 无反应 |
| 2 | 连点三个同类 | 立即消除，tray 清空 |
| 3 | **点三个不同类** | **不消除，tray 保留 3 张**（V0.1 规则会判负，此处必须不判负） |
| 4 | **走完 §64 Path B** | `col0,1,2 → col3,4,5 → col1`，最终 tray = `[CAN]` |
| 5 | tray 分组排列 | 点 PAW→GRASS→PAW，显示为 `[PAW][PAW][GRASS]` |
| 6 | 填满 7 格 | 失败弹窗；**tray 满时点 Tile 无反应 + 摇晃提示** |
| 7 | 失败页按钮 | 只有 `[撤回一步] [打乱] [重新开始]`，**无任何广告入口** |
| 8 | 撤回 | 状态完全还原，包括被消除的 3 张回到 tray |
| 9 | 打乱 | 列高不变、tray 不变、**打乱后确实还能继续玩** |
| 10 | 打乱时 | **页面不卡顿**（Worker 生效，§7.5） |
| 11 | 连点三下同一列 | 每次拿到的是**新的顶部**，不重复拿同一 Tile |
| 12 | 胜利后 | 队列中的旧点击不被执行（§32.2） |
| 13 | 刷新页面 | 局面还在，**且撤回按钮仍可用** |

## 66.4 第三关：布局（4 手机 + 3 桌面）

**手机**（Chrome DevTools 或真机）：

```text
375×812  390×844  430×932  360×800
```

| 检查项 | 期望 |
|---|---|
| 6 列不溢出 | 左右无横向滚动 |
| 深度 10 的列 | 不被 Tray 或工具栏遮挡 |
| Tray 7 格 | 完整可见，不被裁切 |
| 重叠区点击 | 点到的永远是最顶层那张 |

**桌面**：

```text
1920×1080   1440×900   1280×700
```

| 检查项 | 期望 |
|---|---|
| 限宽居中 | 内容不散开，有可见边界 |
| **四区块左边界对齐** | 标题栏 / 棋盘 / Tray / 工具栏 |
| 顶部标题栏 | **不被切掉**（含关卡号） |
| hover | 鼠标悬停 Tile 有上浮反馈 |

**横屏手机 896×414**：

| 检查项 | 期望 |
|---|---|
| 提示 | 看到「请旋转手机」 |
| **PC 上** | **绝不能**看到「请旋转手机」 |

## 66.5 第四关：真机（不可跳过）

| 设备 | 检查项 |
|---|---|
| **iPhone Safari** | 🔴 **有声音**（最关键，桌面复现不了）；点击延迟 < 100ms；安全区不被刘海遮挡 |
| **Android Chrome** | 有声音；震动生效；布局正常 |
| **PC Chrome** | 布局不散；无「请旋转」提示；hover 生效 |

## 66.6 第五关：工程质量

> ⚠️ 下面的 grep 需**排除注释行**，否则会误报。
> （在 garden 上试跑时，`Math.random` 就命中了 rng.ts 里"禁止使用"的注释。）

```bash
cd stack/web

# core/ 不得依赖 Phaser
grep -rnE "from ['\"]phaser" src/game/core/ | grep -vE ':[0-9]+:\s*(\*|//)' \
  && echo "❌ 违规" || echo "✅ 通过"

# core/ 不得有 Math.random 实际调用
grep -rn "Math\.random()" src/game/core/ | grep -vE ':[0-9]+:\s*(\*|//)' \
  && echo "❌ 违规" || echo "✅ 通过"

# 不得有商业化残留
grep -rniE "rewardedad|extra_slot|mockrewarded" src/ \
  && echo "❌ 残留" || echo "✅ 干净"

# 不得有 any
grep -rnE ":\s*any\b|as any" src/ | grep -vE ':[0-9]+:\s*(\*|//)' \
  && echo "⚠️ 需人工确认" || echo "✅ 通过"
```

**还要人工确认：**

- [ ] `Solver / Simulator / GameModel` 确实调用**同一套** `core/rules/` 函数（P1-4）
  —— 让 Sol 指出三处调用点，或看测试是否证明了这一点
- [ ] `getDistinctPickColumns` 用的是 `column.join(',')` 而**不是**顶部 type（P0-1）
- [ ] Hint **没有**读取预存 solution（P0-3）
- [ ] `solution` 是 `SolutionStep[]` 而**不是** `number[][]`（P0-2）
- [ ] 数值集中在 `config/`，逻辑代码里没有魔法数字

## 66.7 第六关：美术

- [ ] **32px 眯眼测试**：8 个图案缩到 32px 排开，1 秒内能区分全部 8 个
- [ ] `bell` vs `flowerpot` 一眼分得清（亮黄 vs 暗棕）
- [ ] `fish` vs `bone` 一眼分得清（橙 vs 近白）
- [ ] 灰度图下仍能靠轮廓区分 8 个
- [ ] 8 个 Tile 风格一致（描边、高光、体积感）
- [ ] 全部素材合计 < 2MB
- [ ] 首屏 load 的纹理全部被引用（防回归测试通过）

## 66.8 第七关：部署

```bash
DRY_RUN=1 ./deploy.sh     # 先看影响范围
```

- [ ] dry-run 输出**只涉及 `stack/` 目录**，未触及站点根
- [ ] `deploy.sh` 含边界断言，且断言确实会拦截（可临时改 `REMOTE_APP_DIR` 测一次）
- [ ] 构建前跑了 test / validate-levels / **simulate** / lint
- [ ] 发布后 https://g.ismayday.mobi/stack/ 返回 200
- [ ] md5 本地与远端一致
- [ ] **其它游戏与 mimo / mystock 完好无损**

```bash
# 发布后确认站点根未被破坏
ssh ubuntu@211.159.177.55 "ls /www/wwwroot/g.ismayday.mobi/"
# 期望仍有：garden h3 journey mimo mystock soulmate star_fighter tavern stack index.html
```

## 66.9 验收结论模板

```text
【通过】可以上线
【有条件通过】以下 N 项需修复后复验：…
【不通过】P0 级问题：…
```

---

# 附录 A：P0 修正速查（给已读过 V0.2 的人）

```text
❌ V0.2：Solver 顶部 type 相同的列去重
✅ V0.3：完整列内容相同才去重（signature = column.join(',')）
   实证：4000 随机局面中 5 个被误判为不可解，全是假阴性

❌ V0.2：solution: number[][]（每三张一组）
✅ V0.3：solution: SolutionStep[]（逐步 + expectedTileType 漂移检测）

❌ V0.2：Hint 兜底读取预存 solution 下一步
✅ V0.3：纯当前状态四级启发式，绝不读 solution

❌ V0.2：§64 初始顶部 = PAW PAW PAW GRASS GRASS GRASS
✅ V0.3：实为 PAW PAW PAW GRASS GRASS CAN（col5 顶部是 CAN）
❌ V0.2：Path B 补第三个 GRASS 点 col3
✅ V0.3：应点 col1（col3 顶部已变 BELL）

❌ V0.2：RewardedAdProvider / 7→8 广告槽位 / 广告埋点
✅ V0.3：全部删除，本阶段完全不做商业化，也不预留接口

❌ V0.2：simulate > 45% 直接 build fail
✅ V0.3：分级告警；教学关 <5% 严格，6~20 关 >70% 才 fail

❌ V0.2：Shuffle 校验主线程 80ms
✅ V0.3：Web Worker + 洗牌动画遮蔽，超时走兜底

❌ V0.2：未定义 InputQueue 的 clear 时机
✅ V0.3：win/fail/restart/undo/shuffle/shutdown 必须 clear

❌ V0.2：Solver 与 RuleEngine 可能各写一套规则
✅ V0.3：core/rules/ 唯一真源，三方共用，有测试证明

❌ V0.2：单一 Greedy Bot
✅ V0.3：Random / Greedy / Cautious 三种，含 p95MaxTray 等指标

❌ V0.2：save 单一 version
✅ V0.3：saveSchemaVersion + levelRevision 双版本号

❌ V0.2：M0 对比 0.80/0.85/0.88
✅ V0.3：对比 0.80/0.83/0.85（0.88 余量仅 5px，已剔除）

❌ V0.2：localStorage key = pet-stack-match-save-v1
✅ V0.3：stackpop-save-v1
```

---

---

# 附录 A2：V0.3 迭代补充速查（多端 + 部署）

```text
【多端】
✅ 优先级：iPhone/Android > PC > 平板
✅ 桌面判定三条件：min-width:900 + min-height:700 + pointer:fine
   ❌ 只判宽度 → 横屏手机(896×414)被当成电脑，布局崩
✅ 桌面限宽 MAX_CONTENT_WIDTH=480 + flex 居中 + 纯 CSS 边界（零素材）
   ❌ translate(-50%,-50%) → 框比窗口高时切掉顶部标题栏
✅ 四区块（棋盘/Tray/工具栏/标题栏）共用同一左边界
   ❌ 只居中棋盘 → 7 格 Tray 与 6 列棋盘宽度不同，必然错位
✅ 桌面不改玩法：仍 6 列 / 7 格 / 同难度（保证数据可横向比较）
✅ 横屏提示必须排除桌面

【部署】
✅ 发布地址 https://g.ismayday.mobi/stack/
✅ vite base = /stack/，必须用 npm run preview 验证（dev 用 / 不暴露问题）
✅ deploy.sh 以 garden/deploy.sh 为模板，保留边界断言，默认 DRY_RUN=1
✅ 构建前跑 test / validate-levels / simulate / lint
❌❌ 绝不对站点根写入或 rsync --delete（会删掉首页+6 个游戏+mimo/mystock）
❌ 不擅自改站点根 index.html（首页入口需用户确认）
✅ 改图必须换文件名（图片 expires 30d）

【garden 踩坑教训，直接继承不重新试错】
🔴 AudioContext 必须 adoptContext(this.sound.context)，不能自建
   否则 iPhone 静音；且桌面/Android 复现不了 → 音频改动必须真机复验
🔴 首屏「load 了但没被画过」的纹理无任何症状 → 需防回归测试
🔴 一切数值进 config/，strict:true 不写 any
```

---

# 附录 B：本版仍未定、需在实现中确认的事项

以下不阻塞开工，但建议在对应阶段确认后回写本文档：

| # | 事项 | 确认时机 | 说明 |
|---|---|---|---|
| B1 | OVERLAP_RATIO 最终取值 | M0 | 0.80 / 0.83 / 0.85 三档截图后人工定夺 |
| B2 | Level 1~3 的列数 | M3 | §10 表中为 4/5/5 列，与「MVP 固定 6 列」不冲突（教学关可少于 6，但不得多于 6）；实现时确认视觉是否需要居中留白 |
| B3 | Simulator 的 Cautious 策略细节 | M2 | 「尽量避免引入新 type」的具体权重需实测调参 |
| B4 | generateSafeState 的兜底质量 | M2 | 退化路径「按 type 排序顺序回填」必定可解但局面很丑，需确认触发频率是否足够低 |
| B5 | 20 关是否需要 variant | M3 | 若 Generator 产出的关卡人工试玩不满意，是否允许同一 config 换 seed 重生成 |
| B6 | 桌面最小可用高度 | M0 | ✅ 已确认 700px；StackPop M0 在 1280×700 下实测通过，详见 §45.3 |
| B7 | 是否加入站点首页入口 | M6 | 站点根 `index.html` 目前不含 garden 与 stack 卡片。**属站点根写操作，须用户确认** |
