# Codex Review：StackPop V0.2 策划与执行方案评审意见

> **评审对象**：`H5_萌宠叠叠消_游戏策划和执行方案_V0.2.md`  
> **建议项目名**：StackPop  
> **评审目的**：在进入 Codex / Claude Code 正式开发前，对 V0.2 的玩法规则、Solver、关卡系统、输入系统、移动端布局和工程边界做一次技术复核。  
> **本次新增产品约束**：**当前阶段完全不考虑商业化，不做广告、不做广告解锁、不做激励视频、不做额外槽位广告入口。**  
> **结论**：V0.2 的整体方向正确，明显优于 V0.1，可以继续作为主版本推进；但建议在编码前完成一次 **V0.3 技术修订**，重点修复 Solver、solution、Hint、Demo 验收关卡和商业化残留。

---

# 1. 总体结论

V0.2 最重要的价值，是把 V0.1 中过于僵硬的“三格连续同类”规则修正为真正成立的 Triple-Match 暂存槽玩法：

```text
点击顶部 Tile
→ 进入 7 格 Tray
→ 不同类型可以共存
→ 任意同类达到 3 枚立即消除
→ 清出槽位
→ 继续挖开下层
```

这使玩法真正形成：

```text
槽位压力累积
→ 接近满槽
→ 凑成三同
→ 压力释放
→ 再进入下一轮判断
```

这条“张力—释放”循环应该继续保留，是整个产品最重要的核心体验。

同时，V0.2 对以下方向的修正是正确的：

- MVP 由 8 列改为 6 列；
- 纵向 Tile 采用部分重叠布局；
- Solver 状态加入 Tray；
- Solver 动作改为逐张 Pick；
- 难度主要由图案种类数、槽位压力、深度离散度决定；
- Tile 总数主要控制局长；
- 增加随机玩家模拟器；
- GameModel / RuleEngine 与 Phaser View 分离；
- `core/` 禁止依赖 Phaser；
- 撤回使用 Snapshot；
- 使用 Seeded RNG；
- 动画期间输入采用 InputQueue；
- 移动端布局在 M0 阶段就进行真实 viewport 验证。

**以上方向均建议继续保留，不回退到 V0.1。**

---

# 2. 本轮新增产品决策：完全移除商业化

当前阶段目标应该是：

> **先把玩法做对、关卡做通、手感做好。**

因此，现阶段不考虑：

```text
Rewarded Video
广告复活
广告增加撤回
广告增加打乱
广告增加槽位
插屏广告
广告 SDK
广告埋点
商业化入口
```

V0.2 中所有这类内容都建议删除，而不是暂时隐藏。

---

## 2.1 删除 RewardedAdProvider

V0.2 中：

```ts
interface RewardedAdProvider {
  isAvailable(): boolean;
  show(reason: RewardReason): Promise<boolean>;
}
```

当前阶段没有必要保留。

理由：

1. 会增加不必要的平台抽象；
2. 会影响 Fail UI 设计；
3. 会让 Codex 为未来需求提前实现无实际价值的接口；
4. 当前验证目标不是变现，而是玩法、关卡和留存体验；
5. 后续真要接微信/抖音广告时，再增加 Adapter 成本非常低。

因此 V0.3 建议：

```text
删除：
RewardedAdProvider.ts
MockRewardedAdProvider
RewardReason
extra_slot
revive ad
reward_ad_click
reward_ad_success
```

---

## 2.2 删除“7 → 8 广告额外槽位”

不做：

```text
7 格 Tray
+
观看广告
→ 8 格 Tray
```

MVP Tray 应保持非常清晰：

```ts
traySize = 7
```

并且：

```text
整个 MVP 所有关卡固定 7 格
```

这样有两个好处：

### 玩法数据更干净

不会出现：

```text
同一关有人 7 格
有人 8 格
```

导致失败率、最大槽位占用、撤回次数等指标无法直接比较。

### 难度设计更稳定

所有关卡的难度模型都基于：

```text
traySize = 7
```

Solver、模拟器、Generator 不需要额外考虑动态槽位。

---

## 2.3 Fail 页面简化

V0.2 Fail 页面原本存在商业化相关入口。

建议 MVP 失败后只保留：

```text
这一步卡住啦！

[撤回一步]
[打乱]
[重新开始]
```

如果：

```text
Undo 无限
Shuffle 还有剩余次数
```

玩家始终有明确的恢复路径。

完全不需要：

```text
看视频继续
复活
额外槽位
```

---

# 3. P0：Solver 的“同顶部类型列去重”必须修正

这是 V0.2 当前最关键的算法问题。

V0.2 提出：

```text
若多个 Column 的顶部 TileType 一样，只搜索其中一列。
```

这个剪枝不成立。

例如：

```text
Column A = [BELL, PAW]
Column B = [FISH, PAW]
```

虽然顶部都是：

```text
PAW
```

但两种操作：

```text
Pick A
→ 暴露 BELL

Pick B
→ 暴露 FISH
```

得到的是两个不同状态。

因此：

```text
topTileType 相同
≠
Column 状态等价
```

如果按 V0.2 当前规则剪枝，会出现：

```text
假阴性
```

即：

```text
一个本来可解的关卡
→ Solver 搜不到正确路径
→ 被误判不可解
→ Generator 丢弃
```

---

## 3.1 正确剪枝方法

只有：

```text
完整 Column 内容完全一致
```

才可以认为两列在当前状态下是对称的。

例如：

```text
[BELL, GRASS, PAW]
[BELL, GRASS, PAW]
```

这种情况下：

```text
Pick 第一列
Pick 第二列
```

得到的 canonical state 等价。

---

## 3.2 建议实现

```ts
function getDistinctPickColumns(state: SolverState): number[] {
  const seen = new Set<string>();
  const result: number[] = [];

  for (let i = 0; i < state.columns.length; i++) {
    const column = state.columns[i];

    if (column.length === 0) {
      continue;
    }

    const signature = column.join(',');

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    result.push(i);
  }

  return result;
}
```

建议把 V0.2 中：

```text
同顶部类型的列去重
```

改为：

```text
完整列状态完全相同时才做对称去重
```

**优先级：P0。**

---

# 4. P0：solution 数据结构需要从“按组三张”改为逐步操作

V0.2 已经将 Solver 改为：

```text
一次动作 = Pick 一个 Column 顶部 Tile
```

这是正确的。

但关卡 JSON 仍使用：

```json
"solution": [
  [0, 2, 4],
  [1, 3, 5]
]
```

这种结构隐含：

```text
每三步为固定一组
```

这和 7 格 Tray 玩法已经不一致。

真实解法完全可能是：

```text
PAW
GRASS
CAN
PAW
BELL
PAW
→ PAW 消除
```

也就是说：

```text
不同 Tile 可以先进入 Tray
```

因此 solution 必须是逐步的操作序列。

---

## 4.1 建议 V0.3 改为

最简单：

```ts
solutionMoves: number[];
```

例如：

```json
"solutionMoves": [
  0,
  2,
  4,
  1,
  5,
  0,
  3
]
```

每个数字表示：

```text
当前状态点击哪个 columnIndex
```

---

## 4.2 更推荐 Debug 版本

```ts
interface SolutionStep {
  columnIndex: number;
  expectedTileType: TileType;
}
```

JSON：

```json
"solution": [
  {
    "columnIndex": 0,
    "expectedTileType": "paw"
  },
  {
    "columnIndex": 2,
    "expectedTileType": "grass"
  }
]
```

这样 Debug / validate 时可以检查：

```text
关卡数据是否被修改
Solver solution 是否仍然有效
```

如果某步：

```text
expectedTileType != 当前顶部
```

可以立即发现关卡版本漂移。

---

# 5. P0：Hint 不应直接使用“初始 Solver 路径的下一步”

V0.2 Hint 的兜底逻辑中包含：

```text
读取关卡 JSON 里的 solution
→ 提示下一步
```

这个设计有逻辑问题。

Solver 的 solution：

```text
只保证从初始状态
沿着该路径走
可以通关
```

一旦玩家已经走了不同路径：

```text
Current State != Solution Path State
```

那么：

```text
solution[n]
```

已经没有意义。

---

## 5.1 示例

预计算解法：

```text
0 → 2 → 5 → 1 → 4
```

但玩家实际操作：

```text
3 → 0 → 5
```

此时棋盘和 Tray 状态都已经改变。

如果 Hint 直接告诉玩家：

```text
2
```

可能出现：

- Column 2 顶部已经不是原 Tile；
- Column 2 已经空；
- 这个动作在当前状态并不安全；
- 甚至会加速进入死局。

---

## 5.2 MVP 推荐 Hint 规则

Hint 建议完全改成当前状态启发式，不依赖旧 solution。

### Priority 1

如果：

```text
Tray 某 type 已有 2 张
+
棋盘顶部存在同 type
```

则提示：

```text
第 3 张
```

这是最安全、最容易理解的 Hint。

---

### Priority 2

如果：

```text
Tray 某 type 已有 1 张
+
棋盘顶部至少有 2 张同 type
```

提示其中一个。

---

### Priority 3

如果：

```text
棋盘当前顶部某 type >= 3
```

高亮其中 3 个。

---

### Priority 4

如果都不存在：

```text
不强行提示某一步
```

可以：

```text
轻微高亮撤回 / 打乱
```

或者不做任何 Hint。

---

## 5.3 当前版本不建议运行时 Solver Hint

虽然可以设计：

```text
对当前 State 运行 Solver
→ 找一条可解路径
→ 返回第一步
```

但 MVP 没必要。

因为：

- 增加运行时 CPU 压力；
- 需要 Worker；
- Hint 不是核心功能；
- 玩家有无限 Undo + Shuffle。

建议：

```text
先做简单、安全、可解释的 Hint
```

---

# 6. P0：§64 Demo 验收关卡存在明确数据错误

V0.2 Demo：

```text
Column 0: BELL, PAW
Column 1: GRASS, PAW
Column 2: CAN, PAW
Column 3: BELL, GRASS
Column 4: CAN, GRASS
Column 5: BELL, CAN
```

因为数组顺序定义为：

```text
bottom → top
```

所以初始顶部实际上是：

```text
PAW
PAW
PAW
GRASS
GRASS
CAN
```

不是：

```text
PAW
PAW
PAW
GRASS
GRASS
GRASS
```

---

## 6.1 正确验收路径 A

初始：

```text
col0 = PAW
col1 = PAW
col2 = PAW
col3 = GRASS
col4 = GRASS
col5 = CAN
```

操作：

```text
col0
col1
col2
→ PAW × 3 消除
```

此时：

```text
col0 顶部 = BELL
col1 顶部 = GRASS
col2 顶部 = CAN
```

后续可以继续按照实际暴露状态验证。

---

## 6.2 Path B 也需要修正

V0.2 原文中：

```text
col3, col4, col5
→ [GRASS, GRASS, CAN]

再点 col3
→ 第三个 GRASS
```

这是错误的。

第一次点掉 col3 顶部 GRASS 后：

```text
col3 顶部变为 BELL
```

真正应该补第三个 GRASS 的是：

```text
col1
```

因为 PAW 被消除后：

```text
col1 顶部 = GRASS
```

正确 Path B：

```text
col0, col1, col2
→ PAW × 3
→ 消除

col3, col4, col5
→ Tray = [GRASS, GRASS, CAN]

col1
→ Tray = [GRASS, GRASS, GRASS, CAN]
→ GRASS × 3 消除
→ Tray = [CAN]
```

这条测试非常适合验证：

```text
不同类可以共存
+
第三个同类后来进入
+
立即消除
+
剩余 Tile 紧凑
```

建议作为 M1 E2E 的核心固定用例。

---

# 7. P1：simulate 很有价值，但当前 Build Fail 阈值过于激进

V0.2 新增：

```bash
npm run simulate
```

对每关运行：

```text
1000 次
贪心 + 随机
```

这是非常好的设计。

它能帮助我们在上线之前发现：

```text
理论可解
但普通策略很容易死
```

的关卡。

这一模块建议保留。

---

## 7.1 但模拟死局率 ≠ 真人失败率

目前的模拟器只是一个：

```text
Greedy Random Bot
```

因此：

```text
simDeadlockRate
```

代表的是：

```text
当前 bot 策略在该关卡上的失败率
```

不是：

```text
真实用户失败率
```

如果直接：

```text
simDeadlockRate > 45%
→ build fail
```

很容易出现错误优化目标：

```text
Generator 开始专门适应 Bot
而不是适应真人
```

---

## 7.2 建议 MVP 阈值

### Level 1~5

```text
允许 < 5%
```

教学关应该接近零压力。

---

### Level 6~20

建议：

```text
0% ~ 35%
→ PASS

35% ~ 55%
→ WARNING + 人工试玩

55% ~ 70%
→ HIGH WARNING，默认建议重做

> 70%
→ BUILD FAIL
```

等未来拿到真人数据后，再做：

```text
humanFailRate
vs
simDeadlockRate
```

相关性分析。

如果两者高度相关，再逐步收紧自动阈值。

---

# 8. P1：运行时 Shuffle Solver 不应阻塞 Phaser 主线程

V0.2 规定：

```text
Shuffle 时
Solver 运行预算 80ms
```

这个目标本身合理。

但是：

```text
80ms
≈ 5 个 60FPS Frame
```

如果直接运行在主线程，玩家会感觉明显卡住。

---

## 8.1 推荐方案

使用：

```text
Web Worker
```

流程：

```text
点击打乱
↓
push Snapshot
↓
播放 Shuffle 动画
↓
后台 Worker：
  shuffle
  solver.canSolve(currentTray)
↓
找到安全局面
↓
动画结束
↓
提交新棋盘
```

用户看到的是：

```text
“正在洗牌”
```

而不是：

```text
“页面冻结”
```

---

## 8.2 MVP 也可以采用更简单方案

如果不希望 M2 就引入 Worker：

```text
Shuffle 先在 requestIdleCallback / setTimeout 后分片执行
```

但从长期维护来看：

```text
SolverWorker.ts
```

会更干净。

因为未来：

```text
Editor
Generator
Runtime Shuffle
```

都可能复用 Solver。

---

# 9. 对 7 格 Tray 的评价：继续保留

我赞同 V0.2：

```ts
traySize = 7
```

首版不建议再讨论 6 格。

理由：

```text
3 种图案：
每种最多暂存 2 个不消除
→ 最大 6 张
→ 7 格不会满
```

因此：

```text
Level 1~2
使用 3 种图案
```

可以形成数学意义上的安全教学区。

这是很好的设计。

建议 MVP：

```text
所有关卡固定 7 格
```

不要动态改变。

---

# 10. 对 6 列布局的评价：继续保留

MVP：

```text
6 columns
```

是正确选择。

原因：

### 375px 小屏

如果 8 列：

```text
Tile ≈ 39px
```

过小。

6 列：

```text
Tile ≈ 50px+
```

明显更适合：

- iPhone；
- Android；
- 小朋友；
- 老年用户；
- 单手操作。

同时 6 列仍然提供足够策略空间。

建议：

```text
MVP 不做 6 / 8 动态切换
```

因为动态列数意味着：

```text
同一关需要重新分布数据
```

收益低、复杂度高。

---

# 11. 对纵向重叠布局的评价：继续保留

建议：

```ts
OVERLAP_RATIO = 0.85
```

保留。

这是玩法视觉语言的一部分。

玩家不仅需要看到：

```text
当前最顶牌
```

还需要知道：

```text
下面大概还有多少层
```

因此不能做成普通不重叠 Grid。

---

## 11.1 建议 M0 做三档截图

直接比较：

```text
0.80
0.83
0.85
```

我反而建议暂时不测 0.88。

因为：

```text
0.88 余量太小
```

一旦遇到：

- Safari address bar；
- safe-area；
- 字号变化；
- 横向工具条尺寸变化；

很容易溢出。

MVP 最好选择更稳的：

```text
0.83 ~ 0.85
```

---

# 12. InputQueue 方向正确，但建议补两个规则

V0.2 将：

```text
动画期间所有点击直接锁掉
```

改成：

```text
最多缓存 2 次输入
```

我赞同。

连续点击三张同类时：

```text
Tap
Tap
Tap
```

如果后两次被吞掉，会非常不爽。

---

## 12.1 需要增加：同列快速连点防重复

例如：

```text
用户连续点击 col2 两次
```

第一次点击后：

```text
原顶部 Tile 已经移走
```

第二个队列操作出队时：

```text
必须重新 canPick()
```

V0.2 已经提到重新判定，这点正确。

建议补一个测试：

```text
✓ 同一 column 连续入队两次
  第二步拿到的是更新后的新顶部
  不会重复拿同一个 Tile ID
```

---

## 12.2 Fail / Win 后清空 Queue

必须明确：

```ts
inputQueue.clear()
```

触发时机：

```text
status = won
status = failed
restart
undo
shuffle
scene shutdown
```

否则存在：

```text
胜利弹窗已经出现
队列里还有一个旧点击
```

这类很难查的 Bug。

---

# 13. RuleEngine 需要进一步明确“纯函数边界”

V0.2 的方向：

```text
GameModel
RuleEngine
View
分离
```

很好。

建议再明确一条：

> **RuleEngine 尽可能纯函数化。**

例如：

```ts
pick(state, columnIndex)
```

不要：

```text
内部播放动画
内部存档
内部调用 Sound
内部改 Phaser Sprite
```

只应该返回：

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

然后：

```text
GameScene / AnimationSystem
```

根据 Result 做表现。

这样 Solver 与真人玩法使用的：

```text
applyPick
```

可以共用同一套核心规则。

---

# 14. Solver 与 RuleEngine 最好共享同一套规则实现

这是建议 V0.3 强化的一点。

最危险的工程情况是：

```text
游戏玩法 RuleEngine 有一套逻辑
Solver 又自己重新写一套逻辑
```

长期一定会发生：

```text
Game 可以这么走
Solver 认为不能

或者

Solver 认为能
游戏实际不能
```

建议：

```text
core/rules/
  applyPick.ts
  resolveMatches.ts
  canPick.ts
```

然后：

```text
GameModel
Solver
Simulator
```

都使用这一套函数。

可以是：

```ts
applyPickToState(state, columnIndex)
```

返回：

```text
纯数据 nextState
```

这是保证：

```text
Solver == 实际游戏规则
```

最可靠的方法。

---

# 15. Simulator 建议增加三个玩家策略，而不是只有一个

如果开发成本允许，`simulate.ts` 不要只运行一种 Bot。

可以运行：

---

## Bot A：Random

```text
当前所有合法顶部随机点
```

代表：

```text
完全不思考玩家
```

---

## Bot B：Greedy

优先：

```text
Tray 已有 2 → 补第 3
Tray 已有 1 → 找同类
顶部三同 → 收集
否则随机
```

代表：

```text
普通玩家
```

---

## Bot C：Cautious

在 Greedy 基础上：

```text
尽量避免引入新 type
尽量降低 tray distinctTypeCount
```

代表：

```text
有经验玩家
```

最终输出：

```text
Level 10

Random:   72% fail
Greedy:   31% fail
Cautious: 12% fail
```

这个数据比单一：

```text
31%
```

有意义得多。

后面做关卡曲线时，可以看到：

```text
是不是只有“聪明玩家”才能过
```

---

# 16. 建议重新定义难度指标

V0.2 的：

```text
simDeadlockRate
```

建议继续保留。

同时增加：

```text
avgMaxTrayOccupancy
p95MaxTrayOccupancy
avgDistinctTrayTypes
avgUndoNeeded
```

例如：

```json
"meta": {
  "sim": {
    "randomFailRate": 0.68,
    "greedyFailRate": 0.24,
    "cautiousFailRate": 0.09,
    "avgMaxTray": 5.8,
    "p95MaxTray": 7
  }
}
```

这样可以区分：

```text
关卡很难
```

到底是因为：

```text
槽位压力大
```

还是：

```text
需要特定路线
```

---

# 17. 撤回：MVP 无限免费继续保留

我赞同 V0.2：

```ts
undoLimit = -1
```

因为现在的目标是：

```text
验证玩法
```

不是制造失败。

同时：

```text
Undo 次数
```

本身就是非常重要的关卡数据。

建议：

```text
无限 Undo
+
影响星级
```

即可。

例如：

```text
0 次 Undo / Shuffle
★★★

1~2 次
★★

通关
★
```

这样：

```text
新人可以自由尝试
高手仍然有挑战目标
```

---

# 18. Shuffle：建议保持 3 次，但不做商业化恢复

建议：

```ts
shuffleLimit = 3
```

继续保留。

理由：

```text
Undo 是回退行为
Shuffle 是直接改变未来局面
```

Shuffle 比 Undo 强很多，因此不建议无限。

但是当前阶段：

```text
用完就是用完
```

不需要：

```text
看广告增加次数
```

失败后仍可以：

```text
Undo
Restart
```

---

# 19. SaveSystem 建议把“版本”分成两类

V0.2 已经有：

```text
save version
```

建议进一步区分：

```ts
saveSchemaVersion
levelSchemaVersion
```

例如：

```json
{
  "saveSchemaVersion": 1,
  "currentRun": {
    "levelId": 8,
    "levelSchemaVersion": 2
  }
}
```

原因：

如果未来修改：

```text
Level 8 JSON
```

而玩家 localStorage 里还保存了旧版：

```text
columns
tray
```

可能出现 incompatible state。

建议同时保存：

```text
levelRevision
```

例如：

```json
{
  "levelId": 8,
  "levelRevision": 3
}
```

如果当前关卡 revision 已变化：

```text
放弃旧 currentRun
重新开始本关
```

但：

```text
长期通关进度保留
```

---

# 20. 项目名建议统一改为 StackPop

既然项目英文名已经考虑采用：

```text
StackPop
```

建议 V0.3 开始统一。

推荐：

```text
中文工作名：
萌宠叠叠消

英文项目名：
StackPop

Git / Folder：
stack/

Package：
stackpop
```

代码中的 localStorage：

```text
stackpop-save-v1
```

而不是继续：

```text
pet-stack-match-save-v1
```

避免后面同时存在：

```text
Pet Stack Match
StackPop
stack
```

三个名字。

---

# 21. V0.3 建议修改清单

## P0 —— 编码前必须修正

```text
P0-1
Solver：
删除“顶部 type 相同的 column 去重”
改为：
“完整 column 内容相同才去重”

P0-2
Level solution：
number[][] → 逐步操作序列 number[]
或 SolutionStep[]

P0-3
Hint：
删除“玩家偏离路径后仍读取预存 solution 下一步”
改为当前状态启发式 Hint

P0-4
§64 Demo：
修正初始顶部数据
修正 Path B 的 col3 → col1

P0-5
商业化：
删除 RewardedAdProvider
删除 extra slot
删除广告复活
删除广告增加 Undo / Shuffle
删除广告埋点与所有广告 UI
```

---

## P1 —— 建议在 M2 前完成

```text
P1-1
simulate：
>45% 不直接 build fail
改为分级 warning
极高失败率才 fail

P1-2
Shuffle Solver：
运行时建议放 Web Worker
不要阻塞 Phaser 主线程

P1-3
InputQueue：
Win / Fail / Restart / Undo / Shuffle 时明确 clear queue

P1-4
Solver / Simulator / Game：
共享同一套纯规则 applyPick / resolveMatches

P1-5
Simulator：
增加 Random / Greedy / Cautious 三种策略
```

---

## P2 —— 后续优化

```text
P2-1
Save 加 levelRevision

P2-2
难度统计增加：
avgMaxTray
p95MaxTray
distinctTrayTypes

P2-3
统一 StackPop 项目命名

P2-4
M0 对 overlapRatio 0.80 / 0.83 / 0.85 截图对比
```

---

# 22. 建议 V0.3 MVP 范围

V0.3 之后，MVP 应明确收敛到：

```text
✅ H5 竖屏
✅ 6 列
✅ 最大列深 10
✅ 7 格 Tray
✅ 不同类可暂存
✅ 任意三同即时消除
✅ Tray type 分组排列
✅ 无限 Undo
✅ 每关 3 次 Shuffle
✅ Win / Fail / Restart
✅ 20 关
✅ Solver
✅ Simulator
✅ LocalStorage
✅ Debug
✅ 音效 / 震动
✅ 移动端适配

❌ 广告
❌ 商业化
❌ 登录
❌ 后端
❌ 排行榜
❌ PvP
❌ 复杂养成
❌ 宠物数值系统
```

这个范围已经足够做出：

```text
高完成度
可试玩
可验证关卡难度
可继续迭代
```

的第一版 StackPop。

---

# 23. 推荐新的开发优先级

建议后续所有开发决策按以下优先级：

```text
1. 规则绝对正确
        ↓
2. Solver 与真实规则一致
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

当前阶段完全不应该进入：

```text
商业化
广告
复杂养成
```

---

# 24. 最终评审意见

对 V0.2 的建议不是推倒重来。

相反：

> **V0.2 的产品方向应该整体接受。**

特别是以下内容应该锁定：

```text
7 格 Tray
6 列 MVP
不同类正常暂存
任意三同立即消除
Tray 分组排列
无限 Undo
3 次 Shuffle
GameModel / View 分离
Solver 状态含 Tray
逐张 Pick
Seeded RNG
Snapshot
InputQueue
纵向重叠
20 关曲线
Simulator
移动端优先
```

真正需要修正的是少数几个会影响工程正确性的地方：

```text
Solver 错误对称剪枝
solution 数据结构
Hint 使用过期 solution
Demo 验收数据
模拟器阈值
运行时 Solver 主线程问题
商业化残留
```

完成这些修改后，建议形成：

```text
《H5 StackPop 游戏策划和执行方案 V0.3》
```

然后正式进入：

```text
M0
→ M1
→ M2
```

开发。

其中 M0 + M1 的目标仍然应该非常克制：

```text
能打开
+
6 列色块棋盘
+
点击顶部
+
进入 7 格 Tray
+
分组
+
三同即时消除
+
满槽失败
+
清空胜利
+
重新开始
```

**这一版手感确认成立以后，再做 Solver、Generator、20 关和正式美术。**

这会是当前 StackPop 项目返工风险最低、验证效率最高的推进方式。
