# Garden Match 框架与美术审核反馈（Codex）V1

> 审核方：**Codex / ChatGPT**
> 日期：2026-08-07
> 审核对象：
> - `Garden Match 游戏框架设计 V1.md`
> - `Garden Match 美术素材工单 V1.md`
> - `Garden Match V0.2 策划评审意见（Claude）.md`
> 项目开发代号：**Garden Match**
> GitHub 项目路径：`garden`
> 审核结论：**整体有条件通过，建议修订为框架 V1.1 / 美术工单 V1.1 后冻结并进入 Stage 0 开发**

---

# 0. 总体结论

Claude 当前给出的技术框架整体方向正确，而且已经从“策划讨论”进入真正可执行的工程设计阶段。

以下关键决策建议直接保留，不再反复讨论：

1. **`core/` 零 Phaser 依赖**
2. **完整 `GameEvent[]` 事件序列驱动表现**
3. **Seeded RNG**
4. **关卡数据驱动**
5. **Playable Core 收缩到 8 关**
6. **宠物轻 / 重反应分层**
7. **动态辅助只发生在生成阶段，不做运行时作弊**
8. **Low-Stress ≠ Easy**
9. **宠物 Hint 优先于宠物技能验证**
10. **四季、商业化、多宠物全部后移**

以上方向已经足够支持开工。

但当前《游戏框架设计 V1》和《美术素材工单 V1》中仍存在几个会造成后续返工的接口问题。

建议在正式大量 Coding 和批量美术生产前，先完成本审核文档中的 **4 项必须修改**。

---

# 1. 审核评级

## 1.1 《Garden Match V0.2 策划评审意见（Claude）》

**结论：通过。**

这是高质量评审，已经正确识别出：

- 宠物与 Cascade 的节奏冲突
- 双用户群需要机制落地，而不是口号
- MVP 范围过大
- 动态辅助应提前但收缩范围
- Core 与 Phaser 解耦的重要性

这些意见已经有效推动项目从 V0.2 进入 V0.3 / Stage 0。

不建议再回退讨论大方向。

---

## 1.2 《Garden Match 游戏框架设计 V1》

**结论：有条件通过。**

架构主线正确，可以继续沿用。

建议修订为：

> **Garden Match 游戏框架设计 V1.1**

完成 §2～§5 的必须修改后，即可冻结 Stage 0 架构。

---

## 1.3 《Garden Match 美术素材工单 V1》

**结论：方向通过，但不建议直接按当前版本批量执行。**

主要问题不是 Style Guide，而是：

> 当前“单张完整 PNG 状态图”的资产结构，与框架中规划的“高频 Idle 微动画”不匹配。

建议修订为：

> **Garden Match 美术素材工单 V1.1**

先明确旺财 Master Reference、分层 Puppet 结构以及 Stage 0 最小资产清单，再开始批量生成。

---

# 2. 【必须修改 1】重新定义 Turn 结束顺序

当前框架中的结算顺序大致为：

```text
Cascade 完成
↓
Dead Board / Shuffle
↓
settled
↓
levelWin / levelLose
```

同时宠物逻辑又规定：

```text
settled
↓
播放 Heavy Reaction
↓
如果 energyFull → fireSkill()
```

这里存在冲突。

---

## 2.1 风险场景

例如：

```text
玩家使用最后一步
↓
发生 Cascade
↓
目标已经全部完成
↓
settled
↓
旺财能量满
↓
旺财释放技能
↓
levelWin
```

这会产生：

> 玩家已经完成关卡，但宠物仍然额外操作一次棋盘。

这与此前已经确立的优先级：

```text
Victory
>
Pet Skill
>
Big Combo
>
Hint
```

不一致。

---

## 2.2 建议修改：引入 `TurnResolved`

不要让宠物直接根据裸 `settled` 判断重反馈 / 技能。

建议流程修改为：

```text
玩家输入
↓
Match / Cascade
↓
棋盘稳定
↓
Objective 结算
↓
Win / Lose 判定
↓
生成 TurnSummary
↓
TURN_RESOLVED
↓
Pet Reaction Resolver
```

建议数据结构：

```ts
interface TurnSummary {
  maxCascade: number;
  totalCleared: number;
  specialCreated: SpecialKind[];
  result: 'continue' | 'win' | 'lose';
  petSkillReady: boolean;
}
```

Pet Resolver：

```text
if result === win
    Victory
else if result === lose
    Encourage
else if petSkillReady
    Pet Skill
else if bigCombo
    Heavy Celebrate
else
    Light / Idle
```

---

## 2.3 建议保留 `settled`

`settled` 仍然有价值。

它代表：

> 棋盘物理 / 逻辑状态已经稳定。

但：

> **`settled` 不等于完整玩家 Turn 已经结算完。**

建议明确：

```text
settled
=
Board Stable

turnResolved
=
Board Stable + Objective + Win/Lose 已完成
```

这样语义会更加准确。

---

# 3. 【必须修改 2】修正“技能 1.5 秒提前点击”与 Cascade 规则的冲突

当前方案：

```text
能量满
↓
旺财发光
↓
1.5 秒窗口
├── 玩家点击 → 立即释放
└── 没点击 → 自动释放
```

想法本身很好，可以同时服务两个用户群：

- 50+：不用操作，自动触发
- 8～15：可以主动控制

建议保留。

但“立即释放”必须重新定义。

---

## 3.1 问题

如果旺财能量是在 Cascade 中途变满：

```text
Cascade Level 2
↓
energyFull
↓
玩家点击
```

此时绝不能真的“立即释放”。

否则违反已经确定的核心规则：

> **宠物 Gameplay Action 永远不得插入 Cascade。**

---

## 3.2 推荐方案

最简单、最稳的规则：

> **1.5 秒技能操作窗口只在 `TurnResolved` 且 `result === continue` 后开启。**

流程：

```text
Cascade
↓
Board Settled
↓
Objective / WinLose
↓
TurnResolved(result=continue)
↓
Skill Ready UI
↓
1.5 秒窗口
├── 点击 → 释放
└── 不点 → 自动释放
```

如果：

```text
result = win
```

则：

> 直接 Victory，不开启技能窗口。

如果：

```text
result = lose
```

则：

> 直接 Encourage / Lose Flow，不开启技能。

---

## 3.3 不推荐的方案

不建议：

```text
Cascade 中允许玩家点击
↓
先缓存 skillRequested
↓
之后再执行
```

虽然可以实现，但：

- 状态更多
- UI 容易让玩家误以为“我点了但怎么没发生”
- 测试复杂度增加

Stage 0 / V1 更推荐：

> **Turn 结束后再开放 1.5 秒控制窗口。**

---

# 4. 【必须修改 3】Core Event 与 Pet Event 再解耦

当前 `GameEvent` 中同时存在：

### Core 行为

```text
swap
match
specialSpawn
specialFire
obstacleHit
fall
spawn
shuffle
levelWin
levelLose
```

以及：

### Pet 行为

```text
petEnergy
petSkillReady
petSkillFire
```

建议再解耦一层。

---

## 4.1 架构原则

既然已经规定：

> `core/` 不认识 Phaser。

建议进一步规定：

> **`core/` 也不认识旺财，不认识 Pet UI，不认识宠物等级。**

Core 只负责：

> 棋盘规则和关卡规则。

---

## 4.2 推荐结构

```ts
type CoreGameEvent =
  | SwapEvent
  | MatchEvent
  | ClearEvent
  | SpecialEvent
  | ObstacleEvent
  | FallEvent
  | SpawnEvent
  | ObjectiveEvent
  | SettledEvent
  | LevelWinEvent
  | LevelLoseEvent;
```

另外建立：

```ts
type PetEvent =
  | PetEnergyChanged
  | PetReactionRequested
  | PetSkillReady
  | PetSkillRequested
  | PetStateChanged;
```

---

## 4.3 宠物改变棋盘时的正确方向

未来宠物技能不要直接修改 Board。

建议：

```text
Pet System
↓
PetActionCommand
↓
Core
↓
CoreGameEvent[]
↓
Render
```

例如：

```ts
interface PetActionCommand {
  type: 'clearPositions';
  positions: Pos[];
}
```

然后：

```ts
applyPetAction(state, command)
```

由 Core 返回新的：

```text
clear
fall
spawn
cascade
settled
...
```

这样：

> 宠物负责“决定做什么”。

> Core 负责“棋盘发生什么”。

边界非常干净。

---

# 5. 【必须修改 4】主线花园进度不要直接消费 1 / 2 / 3 星总数

当前设计：

```text
1 星玩家
3 关 → 3 星 → 建设一次

3 星玩家
1 关 → 3 星 → 建设一次
```

这会产生一个问题：

> 高水平玩家主线花园推进速度是普通玩家的约 3 倍。

但我们 Stage 0 想验证的是：

> “再玩两关，我就能把院门修好了。”

如果玩家第一关直接拿三星：

> 立即建设。

那么其实没有验证到这个留存心理。

---

## 5.1 建议拆成两个奖励维度

### A. 主线 Progress

每次成功通关固定：

```text
+1 Progress Star
```

无论关卡评价是：

- 1 星
- 2 星
- 3 星

主线都：

```text
完成一关 = +1
```

例如：

```text
3 Progress Stars
↓
建设院门下一阶段
```

这样所有玩家花园节奏一致。

---

### B. Mastery Stars

关卡评价：

```text
1 / 2 / 3 Star Rating
```

额外星级用于：

- 装饰
- 图鉴
- Achievement
- 宠物外观
- 收藏
- Bonus

不影响：

> 主线花园推进速度。

---

## 5.2 双用户群因此真正成立

50+：

```text
通关
↓
花园一定推进
```

8～15：

```text
通关
+
追三星
↓
获得额外 Mastery 奖励
```

这样比“3 星玩家建设更快”更稳定。

---

# 6. 【美术必须修改】旺财当前 PNG 资产结构无法支持 Idle 微动画

框架希望旺财在 Idle 层表现：

- 尾巴持续摆动
- 偶尔眨眼
- 耳朵抖动
- 重心轻微移动
- 偶尔看向玩家

而当前美术工单主要输出：

```text
pet-wangcai-idle.png
pet-wangcai-happy.png
pet-wangcai-hint.png
...
```

也就是：

> 每个状态一张完整 512×512 PNG。

这无法高质量实现上述局部 Idle 微动画。

---

# 7. 建议旺财采用轻量分层 Puppet

Stage 0 不需要 Spine。

推荐使用 Phaser Container + 分层 PNG。

例如：

```text
assets/pet/wangcai/
├── body.png
├── head.png
├── tail.png
├── ear-left.png
├── ear-right.png
├── eyes-open.png
├── eyes-blink.png
├── paw-front.png
└── shadow.png
```

甚至第一版还可以更少。

例如：

```text
body.png
tail.png
ears.png
eyes-open.png
eyes-blink.png
```

---

## 7.1 可获得的效果

### Tail Wag

```text
tail.rotation
```

### Blink

```text
eyes-open → eyes-blink
```

### Ear Twitch

```text
ears.rotation
```

### Breathing

```text
body.scaleY
```

### Look at Player

```text
head.rotation / eyes offset
```

这些都是非常低成本 Phaser Tween。

---

## 7.2 为什么更符合项目定位

旺财的“活泼”不应该靠：

> 不停播放大型庆祝动画。

而应该靠：

> **玩家不操作时，它也一直像一个活着的小伙伴。**

因此：

> Idle Puppet 的价值大于增加 10 个完整状态 PNG。

---

# 8. 【美术必须修改】先做旺财 Master Reference，再做状态

当前工单建议：

> 保持 Prompt 前半段一致，以保证所有状态是同一只旺财。

这不够稳定。

即便 Prompt 完全一致，独立 Text-to-Image 仍可能出现：

- 耳朵长度变化
- 眼距变化
- 毛色变化
- 头型变化
- 尾巴变化
- 身材比例变化

---

## 8.1 推荐流程

### Step 1 — Master

先生成：

```text
pet-wangcai-master
```

内容：

- 正面 / 3/4
- 完整身体
- 标准比例
- 标准毛色
- 标准耳朵
- 标准尾巴
- 标准眼睛

---

### Step 2 — Lock

人工确认：

> **“这就是旺财。”**

此图成为 Character Reference。

---

### Step 3 — Variant

后续：

- Happy
- Hint
- Encourage
- Victory
- Puppet 分层

全部基于 Master Reference 编辑 / 变体。

而不是重新从纯 Prompt 生成。

---

# 9. 【美术必须修改】Playable Core 美术范围继续缩小

当前工单写：

> Playable Core 需要前 3 批，共约 35 张资产。

但技术框架的 Playable Core 实际只需要：

- 无彩虹球
- 无完整能量系统
- 无完整宠物状态机
- 只有冰块
- 只有一个花园节点

因此 35 张仍然略大。

---

## 9.1 推荐 Stage 0 美术清单

### 普通棋子

6 个：

```text
piece-red
piece-orange
piece-yellow
piece-green
piece-blue
piece-purple
```

### Special Overlay

3 个：

```text
overlay-rocket-h
overlay-rocket-v
overlay-bomb
```

### 障碍

1～2 个：

```text
obstacle-ice-1
obstacle-ice-2
```

### 旺财

优先：

```text
pet-wangcai-master
pet-wangcai-puppet/*
pet-wangcai-happy
pet-wangcai-hint
```

### UI

只保留：

```text
objective-slot
moves-badge
primary-button
pause
panel
```

### Background

```text
level-bg
garden-bg
```

### Garden Node

```text
gate-0
gate-1
gate-2
gate-3
```

整体：

> **约 20～25 个有效 Asset 已足够 Stage 0。**

---

# 10. 色板审核：继续保留灰度测试，不要认为“六等分色相”自动安全

当前六个主色方向总体正确：

- Red
- Orange
- Yellow
- Green
- Blue
- Purple

但：

> 色相差异大，并不等于灰度明度差异一定足够大。

例如 Red / Purple 转灰度后可能非常接近。

因此不要把：

> “色相环六等分”

等同于：

> “灰度可读性已解决”。

---

## 10.1 正确原则

> **Shape First，Color Second。**

棋子辨识至少依赖：

1. Silhouette
2. Color
3. Internal Texture

三层编码。

---

## 10.2 灰度测试必须继续作为硬验收

将 6 枚棋子：

```text
缩小至 40×40
+
转灰度
```

必须仍可快速分辨。

这条建议保留。

---

# 11. Asset Cache 策略需要统一

当前美术工单存在两个同时成立但互相冲突的原则：

### 原则 A

> 占位图和正式图同名覆盖，代码零修改。

### 原则 B

> 已部署静态图不能同名修改，应使用 `-v2` 避免缓存。

建议区分开发阶段与发布阶段。

---

## 11.1 Development

允许：

```text
piece-red.png
```

直接覆盖。

---

## 11.2 Deployed / Production

采用版本文件：

```text
piece-red-v2.png
```

并通过统一：

```ts
AssetManifest
```

管理路径。

例如：

```ts
export const ASSETS = {
  pieces: {
    red: '/assets/pieces/piece-red-v2.png',
  },
};
```

或者 Manifest JSON。

---

## 11.3 原则

Gameplay / Scene 中：

> 不允许散落硬编码素材文件名。

换图：

> 只改 Asset Manifest。

---

# 12. 【建议优化】输入 Buffer 需要收紧

当前框架提出：

> Cascade 播放期间可以缓存玩家下一步输入。

方向合理，但需谨慎。

玩家在 Cascade 中途看到的棋盘位置：

> 很可能不是最终棋盘位置。

如果允许全程输入：

> 坐标语义会变。

---

## 推荐

只在最终动画即将结束：

> 大约最后 100～150ms

开放 Input Buffer。

然后：

```text
TurnResolved
↓
重新验证该 Move 当前是否合法
↓
合法 → 执行
不合法 → 丢弃
```

这样可以服务年轻玩家连续操作，又不会制造状态混乱。

---

# 13. 【建议优化】布局比例不要硬编码

当前：

```text
HUD      12%
Board    58%
Pet      20%
Controls 10%
```

可以作为设计参考。

但不建议作为固定实现。

---

## 推荐布局算法

```text
读取 Safe Area
↓
确定水平可用宽度
↓
计算最大 Board Square
↓
保证棋子 Touch / Visual Size
↓
剩余高度分配给 HUD / Pet / Controls
```

如果小屏真机不满足尺寸：

> 优先 8×8 → 7×7

而不是：

> 无限缩小棋子。

---

# 14. 【建议优化】性能检测不要阻塞启动

当前建议启动时测试 3 秒平均 FPS。

不建议让用户感觉：

> 游戏启动后先 Benchmark 3 秒。

---

## 推荐

正常开始游戏，同时后台采样：

```text
前几秒 FPS
+
掉帧比例
```

然后动态：

```text
High FX
↓
Medium FX
↓
Low FX
```

玩家无感。

---

# 15. 【建议优化】关卡配置增加 Schema Validation

当前数据驱动方向正确。

但未来 AI 会批量生成：

```text
level-001
level-002
...
level-030
```

仅靠 TypeScript 类型不够。

建议实现：

```ts
validateLevelConfig(level)
```

至少检查：

- Board Size 合法
- Pos 不越界
- Blocked Cell 不重复
- Obstacle 不在非法位置
- Objective 可被配置满足
- Stars Threshold 合法
- Colors 数量合法
- Tutorial 引用合法
- 开局不自动 Match
- 开局存在合法 Move

并纳入：

```bash
npm test
```

或：

```bash
npm run validate-levels
```

---

# 16. 关于特殊棋子方向

当前 Claude 提出：

> 横向 4 连生成纵向 Rocket，纵向 4 连生成横向 Rocket。

这不是必须修改项，但建议在实现前再做一次手感验证。

原因：

不同三消游戏对：

> 匹配方向 → Rocket 清除方向

的惯例并不完全一致。

用户最重要的不是“行业惯例”，而是：

> **是否能预测这个特殊棋子接下来会清哪里。**

因此建议：

Playable Core 使用一种规则后：

> 直接真机测试理解率。

如果玩家频繁误判：

> 不要坚持理论，改成视觉最直觉的方案。

---

# 17. 关于 Shuffle 宠物表现

自动 Shuffle 的低压力方向正确。

但建议 Stage 0：

> 不需要额外完整“我帮你整理”重动画。

可以只是：

```text
旺财轻微歪头
↓
棋盘 Shuffle
↓
旺财尾巴摇一下
```

避免 Dead Board 本身变成额外等待。

---

# 18. 关于存档导出 / 导入

Claude 提出的：

> localStorage + 可复制 Progress Code

方向合理。

建议保留。

但它不是 Stage 0 的核心验证点。

优先级建议：

```text
Core Match
>
Pet Hint
>
8 Levels
>
Garden Node
>
Real-device Test
>
Save Export / Import
```

如果开发时间紧：

> Progress Code 可以放在 V1 Full，而不是阻塞 Playable Core。

---

# 19. 关于声音

Claude 提醒：

> 50+ 用户对高频声音可能不敏感，消除音效主体应保留中频能量。

这个建议值得保留。

未来音频工单建议明确：

- Match 主体反馈不能只有“玻璃叮”
- 中频必须有清晰 transient
- 爆炸用低中频增加满足感
- Combo 音高可以上升，但不能完全依赖高频
- SFX 不应刺耳

当前不阻塞 Coding。

---

# 20. Stage 0 推荐冻结范围

建议最终冻结为：

## Gameplay

- 8×8 默认
- 6 普通棋子
- Match-3
- Rocket H / V
- Bomb
- Cascade
- Dead Board
- Auto Shuffle
- Hint
- Steps
- Win / Lose

暂不做：

- Rainbow
- 道具
- 商业化

---

## Obstacle

只做：

> Ice

---

## Levels

只做：

> 8 关

---

## Pet

旺财：

- Idle Puppet
- Happy
- Hint

核心功能：

> Hint

暂不做：

- Energy
- Skill

如果团队希望测试技能控制：

> 放入 Stage 0.5，不进入第一版 Playable Core。

---

## Garden

- 一个页面
- 一个院门节点
- 3 个建设阶段

---

## Art

约：

> 20～25 个 Stage 0 Asset

先小批量验证 Style Guide。

---

# 21. 推荐开发顺序

## Milestone 0

```text
Pure TS Core
+
Seeded RNG
+
Vitest
```

---

## Milestone 1

```text
Swap
Match
Clear
Fall
Spawn
Cascade
```

---

## Milestone 2

```text
Rocket
Bomb
Objectives
Win / Lose
Dead Board
Shuffle
```

---

## Milestone 3

```text
Replay
Level Validation
Simulation
```

---

## Milestone 4

```text
Phaser Event Player
+
Mobile Input
```

---

## Milestone 5

```text
Playable Match-3
+
Tempo
+
Basic SFX
```

---

## Milestone 6

```text
旺财 Puppet
+
Pet Reaction Resolver
+
Hint
```

---

## Milestone 7

```text
8 Levels
+
1 Garden Node
```

---

## Milestone 8

真人测试。

重点回答：

1. 三消爽不爽？
2. 旺财烦不烦？
3. 50+ 不解释会不会玩？
4. 棋子够不够大？
5. 院门建设是否让玩家愿意继续下一关？

---

# 22. 最终建议给 Claude

本轮不建议再扩大策划。

建议下一步：

### 先修改框架 V1 → V1.1

必须解决：

1. `settled / turnResolved / win / pet skill` 顺序
2. 技能 1.5 秒窗口的时机
3. Core Event / Pet Event 解耦
4. Progress Star / Mastery Star 拆分

---

### 再修改美术工单 V1 → V1.1

必须解决：

1. 旺财 Master Reference
2. Puppet 分层资产
3. Stage 0 美术缩到约 20～25 Asset
4. Asset Manifest / Cache 规则

---

### 然后直接进入 Stage 0

不再等待：

- 四季设计
- 完整宠物技能
- 彩虹球
- 30 / 50 关
- 商业化
- 大量正式美术

---

# 23. 一句话审核结论

> **Claude 当前技术方向是对的；下一步不是继续扩设计，而是把 Turn 结算、宠物技能、Core/Pet 边界和旺财资产结构这几个接口契约定死，然后立刻进入 8 关 Playable Core。**
