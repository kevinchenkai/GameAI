# Garden Match 代码审查与优化反馈（Codex）

> 反馈方：**Codex / ChatGPT**
> 日期：2026-08-19
> 接收方：**Claude（实现方）**
> 审查范围：`garden/web/src/**`、`garden/web/tests/**`、构建与关卡工具
> 当前阶段：Stage 0 功能完成，M8 真人测试前
> 总体结论：**工程基础健康，但有 2 项会影响胜负/进度的高优先级问题，以及 2 项明确的交互缺陷。建议先修逻辑，再重新跑关卡模拟。**

---

# 0. 执行摘要

本次审查确认以下基础能力正常：

- TypeScript 严格模式与 ESLint 契约检查通过
- 40 个测试文件、680 项测试通过
- Vite 生产构建通过
- 8 个关卡 Schema 校验通过
- `core/` 与 Phaser / Pet 的依赖边界保持正确
- RNG、事件序列、存档防御性读取等基础设计质量较高

但现有测试主要覆盖“单个函数是否正确”，缺少“场景把这些函数按什么顺序调用”的验证，因此仍漏掉了真实流程问题。

建议按以下顺序处理：

1. **P1：修正收集目标的实际清除口径**
2. **P1：修正启动 / 花园返回的关卡续玩逻辑**
3. **P2：修正输入 Buffer 的兑现顺序**
4. **P2：去掉重复胜负音效**
5. 补端到端回归测试
6. 重新跑关卡模拟，再决定是否调第 8 关数值

> ⚠️ 第 1 项可能涉及 `CoreGameEvent` 契约扩展。根据 `garden/CLAUDE.md` §3，Claude 不要直接改冻结契约；应先向用户说明原因与推荐事件结构，获得确认后再实现。

---

# 1. 【P1 必须修改】收集目标没有按“实际清除”结算

## 1.1 现状

当前 `core/objective.ts` 只在收到 `match` 时累计颜色目标：

```ts
case 'match':
  bump(`collect:${e.color}`, e.positions.length);
  break;
```

这把“形成匹配”错误地等同于“棋子实际离开棋盘”。

实际结算中，这两者并不相同：

- 火箭、炸弹和特殊组合会清除大量不属于 `match.positions` 的棋子
- 多层冰仍有 HP 时，匹配中的棋子会被 `clearPieces()` 留在原位
- Match-4 / T / L 生成特殊棋子的 origin 会从清除集合中移除并保留
- 特殊棋子连锁影响范围可能互相重叠，必须去重后计数

因此当前会同时出现两种错误：

1. **漏算**：特殊棋子清掉的目标色不计入收集目标
2. **多算**：被冰保护、实际未清走的棋子提前计入目标

Stage 0 的 8 关中有 7 关包含 `collect` 目标，因此该问题会直接影响：

- 胜负判定
- 失败时的 remaining 文案
- 关卡通过率与星级分布
- 当前模拟器给出的调优结论

## 1.2 推荐修复方向

推荐由 resolver 在障碍受伤结算后、真正清除棋子前，得到唯一的“本轮实际移除棋子集合”，并为每个实际移除的棋子产生明确事件，例如：

```ts
type CoreGameEvent =
  | {
      readonly t: 'pieceCleared';
      readonly pos: Pos;
      readonly id: number;
      readonly color: PieceColor;
    }
  // ...existing events
```

目标累计改为只消费 `pieceCleared`：

```ts
case 'pieceCleared':
  bump(`collect:${e.color}`, 1);
  break;
```

不要继续从以下事件推测收集数量：

- `match`
- `specialFire`
- `comboBlast`

这些事件表达的是“效果发生了什么”，不保证其中每个位置最终真的移除了棋子。

## 1.3 必补测试

至少补以下端到端测试：

1. 普通三消实际清 3 个目标色，进度 `+3`
2. 火箭额外清掉 2 个目标色，额外进度 `+2`
3. 炸弹 / Combo 清除目标色时正常累计
4. 同一格被两次特殊效果覆盖，只累计一次
5. 2HP 冰第一次受击后棋子仍在，不累计该棋子
6. 1HP 冰被打破且棋子实际离场，累计一次
7. Match-4 保留下来的特殊棋子 origin 不计为已收集
8. 修复后仍满足 `events → settled → movesChanged → levelWin/levelLose → turnResolved` 的冻结顺序

## 1.4 验收标准

- 收集进度等于该回合实际从棋盘移除的目标色棋子数
- 普通消除、特殊消除、Combo、冰层保护使用同一套计数口径
- 不通过前后棋盘 diff 在 `objective.ts` 内自行推测
- 不让渲染层或音频层维护第二份棋盘真相

---

# 2. 【P1 必须修改】存档进度没有用于续玩关卡

## 2.1 现状

`LevelScene.create()` 的关卡来源是：

```ts
const id = this.pendingLevelId ?? this.devLevelId() ?? 1;
```

`GardenScene` 的“继续玩”按钮则直接：

```ts
this.scene.start('Level');
```

结果是：

- 刷新页面后固定进入第 1 关
- 通关后去花园建设，再点“继续玩”也固定进入第 1 关
- 已实现且已有测试的 `highestClearedLevel()` 没有被生产流程使用

这会打断“通关 → 建设 → 继续下一关”的核心留存闭环。

## 2.2 推荐修复方向

集中实现一个纯函数，不要分别在两个 Scene 里复制判断：

```ts
function resumeLevelId(save: SaveData): number {
  const highest = highestClearedLevel(save);
  const next = highest + 1;
  return getLevel(next) ? next : STAGE0_LEVEL_COUNT;
}
```

使用规则：

- 从 Boot 首次进入 Level：按存档续玩
- 从 Garden 点“继续玩”：按存档续玩
- ResultPanel 点“下一关”：继续使用明确的 `pendingLevelId`
- “再玩一次”：继续使用当前关卡 ID
- 全 8 关通关后：默认停在第 8 关，不请求不存在的第 9 关

如果未来关卡 ID 允许不连续，应从 `LEVELS` 注册表选择下一项，而不是直接 `+1`。

## 2.3 必补测试

1. 空存档进入第 1 关
2. 已通关第 1 关，重新加载进入第 2 关
3. 已通关第 3 关，从花园返回进入第 4 关
4. 已通关全部关卡，从花园返回进入最后一关
5. ResultPanel 的 Replay 仍重开当前关
6. ResultPanel 的 Next 仍进入明确的下一关，不被存档 fallback 覆盖

## 2.4 验收标准

- 刷新和花园返回不会无故回到第 1 关
- 所有关卡选择规则集中在一个可单测函数中
- 不新增独立于 `SaveData.levels` 的“当前关卡”第二真相源

---

# 3. 【P2 必须修改】输入 Buffer 在读取前已被清空

## 3.1 现状

`LevelScene.runTurn()` 当前顺序是：

```ts
this.turn = advance(this.turn, 'READY_FOR_INPUT');

const taken = takeBufferedMove(this.turn);
```

而 `advance(..., 'READY_FOR_INPUT')` 会清空 `bufferedMove`：

```ts
if (phase === 'READY_FOR_INPUT') {
  return { ...state, phase, bufferedMove: null };
}
```

所以 `takeBufferedMove()` 永远只能得到 `null`。

现有 TurnController 单测分别验证了：

- Buffer 能存进去
- `takeBufferedMove()` 能取出来
- 进入 READY 时会清空

但没有测试 LevelScene 把这三步组合起来后的真实顺序。

## 3.2 推荐修复

优先使用最小改动：先取、再迁移、最后执行。

```ts
const taken = takeBufferedMove(this.turn);
this.turn = taken.state;
this.turn = advance(this.turn, 'READY_FOR_INPUT');

if (taken.move && this.isStillLegal(taken.move)) {
  void this.runTurn(taken.move);
}
```

不建议为了修此问题取消 TurnController 的非法迁移检查。

## 3.3 必补测试

新增一条覆盖完整顺序的测试：

```text
RESOLVING
→ 缓存 Move
→ BOARD_SETTLED
→ TURN_RESOLVED
→ 取出 Move
→ READY_FOR_INPUT
→ 合法 Move 恰好执行一次
```

并覆盖：

- 缓存 Move 在新棋盘上不再合法时静默丢弃
- 同一缓存不会执行两次
- Win / Lose / Result Popup 路径不兑现缓存
- 阻塞式宠物反应期间不抢跑

## 3.4 验收标准

- 动画最后窗口内的滑动能在新回合立即响应
- 缓存只兑现一次
- `settled` 与 `turnResolved` 仍不能直接解锁输入

---

# 4. 【P2 必须修改】胜负音效被播放两次

## 4.1 现状

回合开始时已经调用：

```ts
this.audio.consume(result.events);
```

而 `sfxPlan.ts` 会为 `levelWin` / `levelLose` 安排胜负音。

动画结束后 `showResult()` 又调用：

```ts
this.audio.play('win');
// 或
this.audio.play('lose');
```

因此一次胜负会有两条音效路径，可能形成约 120ms 间隔的双响或回声。

## 4.2 推荐修复

保留事件驱动路径：

```text
CoreGameEvent[]
→ audio.consume()
→ sfxPlan(levelWin / levelLose)
```

删除 `showResult()` 中的直接 `audio.play('win' | 'lose')`。

理由：

- 符合“渲染 / 宠物 / 音频消费同一事件序列”的冻结契约
- 保持与画面时间轴对齐
- 避免未来两处分别调整音效时序

## 4.3 必补测试

- 一段含 `levelWin` 的事件只产生一个 `win` cue
- 一段含 `levelLose` 的事件只产生一个 `lose` cue
- Scene 不再绕过事件额外播放同名音效

---

# 5. 【P3 建议修改】存档统计字段语义不正确

当前 `applyLevelResult()` 中：

```ts
stats: {
  totalPlays: save.stats.totalPlays + 1,
  lastPlayedAt: save.stats.lastPlayedAt,
}
```

但 `applyLevelResult()` 只在胜利路径调用，因此：

- `totalPlays` 实际统计的是“胜利结算次数”，不是总开局数
- `lastPlayedAt` 从未更新，默认会永久为 0

建议二选一：

### 方案 A：实现真实统计

- 开局时增加 `totalPlays`
- 开局或结束时更新 `lastPlayedAt`
- 时间源通过参数注入，测试不要依赖真实 `Date.now()`

### 方案 B：Stage 0 暂不使用

- 删除这两个字段，避免未来误用错误数据
- 等真正接入留存统计时再设计

不建议保留“字段存在但数据不可信”的中间状态。

---

# 6. 工程优化建议

## 6.1 为 Scene 编排增加可测试边界

`LevelScene.ts` 已约 807 行，同时承担：

- 单局生命周期
- 输入与手势
- Turn 状态迁移
- 动画播放编排
- 宠物与 Hint
- 设置面板
- 胜负结算
- 存档与场景导航

建议先做低风险拆分，不改玩法：

```text
LevelScene
├── LevelFlowCoordinator   回合执行与状态迁移
├── LevelNavigation        Replay / Next / Garden / Resume
├── HintCoordinator        Hint 计时与呼吸动画
└── LevelScene             Phaser 对象装配与生命周期
```

优先抽出纯逻辑协调器，使“完整回合调用顺序”可以在 Node/Vitest 中测试。不要为了拆文件改变冻结接口。

## 6.2 清理与实现矛盾的注释

至少存在以下过期描述：

- `core/board.ts` 仍称冰覆盖棋子不可交换，但 `locksPieceBeneath()` 恒为 `false`
- `core/matcher.ts` 注释仍称冰会打断匹配，但当前实现允许冰下棋子参与匹配
- `core/resolver.ts` 文件头仍写特殊棋子、障碍、目标尚未实现

这些注释与类型检查无关，却很容易让后续实现者把正确行为“修回旧 bug”。建议在逻辑修复同一提交中同步更新。

## 6.3 构建与部署

当前生产构建结果：

```text
dist/assets/index-*.js  约 1,559 KB
gzip                    约 365 KB
```

Vite 有大 Chunk 警告，主要体积预计来自 Phaser。当前不阻塞 M8，但建议：

- 先用 bundle analyzer 确认来源，不要凭警告盲目拆包
- 评估 GardenScene 的代码延迟加载；院门图片已经按需加载，应继续保持
- 不通过简单提高 `chunkSizeWarningLimit` 隐藏问题

部署脚本已有 `package-lock.json`，建议把：

```bash
npm install
```

改为：

```bash
npm ci
```

以获得更快、可复现的干净安装。

---

# 7. 关卡模拟结论与执行纪律

本次以 greedy AI、每关 100 局做快速复核：

| 关卡 | 通过率 | 死局率 | 结论 |
|---|---:|---:|---|
| 1 | 100% | 0% | 新手关正常 |
| 2 | 100% | 0% | 新手关正常 |
| 3 | 100% | 0% | 新手关正常 |
| 4 | 95% | 0% | 新手关正常 |
| 5 | 96% | 0% | 新手关正常 |
| 6 | 77% | 1% | 正常 |
| 7 | 77% | 1% | 正常 |
| 8 | 88% | 0% | 当前规则下略偏高 |

但由于 §1 的收集统计口径存在错误，**现在不要直接按 88% 去调整第 8 关**。

正确顺序是：

1. 修正实际清除事件与收集统计
2. 跑全部单测与 fuzz
3. 每关至少模拟 500 局
4. 对比修复前后通过率、三星率和 remaining
5. 再决定是否调整步数、颜色或目标数量

---

# 8. Claude 实施边界

本轮允许修改：

- `web/src/core/**`
- `web/src/game/**`
- `web/src/meta/**`
- `web/tests/**`
- 必要的配置与开发文档

本轮不要做：

- 不修改任何图片像素或替换美术素材
- 不扩张 Stage 0 功能范围
- 不提前实现宠物技能、彩虹球、商业化或新关卡
- 不在修复收集统计之前调整关卡数值
- 不绕过冻结契约直接让 Pet 或渲染层修改棋盘
- 不部署、不 push，除非用户明确要求

如果 `pieceCleared` 方案被判断为必须扩展冻结事件契约：

> 先把事件结构、产生时机、消费者和迁移测试列给用户确认，再动实现。

---

# 9. 最终验收清单

Claude 完成修复后，应至少执行：

```bash
cd /Users/kk/Work/GameAI/garden/web
npm run lint
npm test
npm run validate-levels
npm run build
npm run simulate -- --all --runs 500
```

交付说明需要包含：

- 每项问题的根因与修复位置
- 新增测试清单
- 修复前后关卡模拟对比
- 生产包体积变化
- 明确说明未修改美术、未部署、未 push

验收通过条件：

- 所有检查零错误
- 特殊消除与冰层下的收集数量符合实际离场棋子
- 刷新 / 花园返回能续玩正确关卡
- 输入 Buffer 能且只能兑现一次
- 胜负音效只播放一次
- 关卡模拟结果重新稳定后，再决定是否调数值
