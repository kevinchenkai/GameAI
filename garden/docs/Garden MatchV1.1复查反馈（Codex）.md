# Garden Match V1.1 复查反馈（Codex）

> 审核方：**Codex / ChatGPT**  
> 日期：2026-08-07  
> 审核对象：
> - `Garden Match 游戏框架设计 V1.1.md`
> - `美术素材工单 V1.1（Codex image-2）.md`
> 项目开发代号：**Garden Match**
> GitHub 项目路径：`garden`
> 复查结论：**基本通过。建议补一个小型 Patch 后冻结接口，并正式进入 Stage 0 / M0 开发。**

---

# 0. 总体结论

V1.1 的修改质量明显高于 V1。

上一轮 Codex 提出的核心问题已经基本被正确吸收，包括：

- `settled` 与 `turnResolved` 拆分
- 技能窗口移动到 `turnResolved && continue` 后
- Core Event / Pet Event 解耦
- Progress Star / Mastery Star 拆分
- 输入 Buffer 收紧
- 布局算法化
- 后台性能降级
- Level Schema Validation
- 旺财 Master Reference
- Puppet 分层
- Stage 0 美术范围收缩
- Asset Manifest / Cache 规则

这些方向建议继续保留，不需要再次推翻。

当前只剩：

> **2 个接口级问题必须修正。**

以及：

> **3 个美术规格小修正。**

修完后，核心架构可以真正冻结。

---

# 1. 【必须修改 1】从 `CoreTurnSummary` 中彻底删除 `petSkillReady`

当前 V1.1 已经明确：

> `core/` 不认识 Phaser，也不认识旺财。

这个原则正确。

但当前：

```ts
export interface TurnSummary {
  maxCascade: number;
  totalCleared: number;
  specialCreated: SpecialKind[];
  result: 'continue' | 'win' | 'lose';
  petSkillReady: boolean;
}
```

仍然包含：

```ts
petSkillReady
```

这意味着：

> Core 依然知道“宠物技能是否准备完成”。

与“Core 不认识旺财”这一冻结原则存在直接矛盾。

---

## 1.1 建议修改

Core 只输出纯棋盘 / 关卡信息：

```ts
export interface CoreTurnSummary {
  maxCascade: number;
  totalCleared: number;
  specialCreated: SpecialKind[];
  result: 'continue' | 'win' | 'lose';
}
```

Pet 层拥有自己的 Runtime State：

```ts
export interface PetRuntimeState {
  energy: number;
  maxEnergy: number;
  skillReady: boolean;
  state: PetState;
}
```

最终：

```ts
resolvePetDecision(
  turn: CoreTurnSummary,
  pet: PetRuntimeState
)
```

数据关系：

```text
CoreTurnSummary
      +
PetRuntimeState
      ↓
PetReactionResolver
      ↓
Pet Decision
```

---

## 1.2 推荐决策逻辑

不要再让：

```ts
resolveReaction(summary)
```

只依赖 Core Summary。

建议：

```ts
function resolvePetDecision(
  turn: CoreTurnSummary,
  pet: PetRuntimeState
): PetDecision {
  if (turn.result === 'win') {
    return { type: 'reaction', state: 'victory' };
  }

  if (turn.result === 'lose') {
    return { type: 'reaction', state: 'encourage' };
  }

  if (pet.skillReady) {
    return { type: 'skillOffer' };
  }

  if (turn.maxCascade >= COMBO_EXCITED_THRESHOLD) {
    return { type: 'reaction', state: 'excited' };
  }

  return { type: 'reaction', state: 'idle' };
}
```

---

## 1.3 `Skill Offer` 与 `Skill Animation` 不应是同一个状态

建议进一步区分：

```text
skillOffer
```

和：

```text
skill
```

### `skillOffer`

代表：

> 1.5 秒可点击窗口。

### `skill`

代表：

> 真正的宠物技能动画 / Gameplay Action 已经开始。

这是两个不同阶段。

推荐：

```text
TurnResolved
↓
Pet Decision = SkillOffer
↓
1.5 秒窗口
↓
Pet Skill Requested
↓
PetActionCommand
↓
Core applyPetAction()
↓
Pet State = Skill
```

这样状态机更加准确。

---

# 2. 【必须修改 2】`settled` 不应该解锁玩家输入

V1.1 对事件语义已经定义得很好：

```text
settled
=
棋盘物理稳定

turnResolved
=
棋盘稳定 + Objective + Win/Lose 全部完成
```

但当前文档仍写：

> `settled` 由渲染层消费，用于“解锁输入、停止动画”。

这里仍存在潜在 Race Condition。

---

## 2.1 风险场景

理论流程：

```text
Cascade
↓
settled
↓
Input Unlock
↓
levelWin
↓
turnResolved
```

在：

```text
settled → levelWin
```

之间存在很短的窗口。

如果玩家操作足够快：

> 可能在系统正式进入 Victory Flow 之前发起下一步输入。

即使实际实现中概率很低，也不应该让架构允许这种状态存在。

---

## 2.2 正确语义

建议明确：

```text
settled
=
Board Stable
=
棋盘动画可以结束
```

但：

```text
settled
≠
Input Enabled
```

---

## 2.3 增加 Turn Controller / Input Gate

推荐状态：

```ts
export type TurnPhase =
  | 'ready'
  | 'playerInput'
  | 'resolving'
  | 'boardSettled'
  | 'turnResolved'
  | 'petPresentation'
  | 'resultPresentation';
```

或者更简化：

```text
READY_FOR_INPUT
↓
RESOLVING
↓
BOARD_SETTLED
↓
TURN_RESOLVED
↓
PRESENTATION
↓
READY_FOR_INPUT
```

---

## 2.4 只有满足以下条件才能再次输入

```text
turn.result === 'continue'
AND
没有阻塞式 Pet Reaction
AND
没有 Skill Offer
AND
没有 Pet Skill 正在执行
AND
没有 Result Popup
```

才：

```text
READY_FOR_INPUT
```

---

## 2.5 输入 Buffer 也必须挂在 `READY_FOR_INPUT`

当前最后 120ms Buffer 方案可以保留。

但执行时：

```text
TurnResolved
↓
Presentation 完成
↓
READY_FOR_INPUT
↓
重新验证 Buffered Move
```

而不是：

```text
settled
↓
立即执行 Buffer
```

这样未来 Stage 0.5 加宠物技能也不需要重新改输入架构。

---

# 3. 【美术小修 1】Stage 0 资产数量统计错误

当前美术工单第 3 批列的是：

```text
3 个特殊叠加层
+
2 个冰块
+
5 个 UI
+
2 个背景
+
4 个院门
```

实际：

```text
3 + 2 + 5 + 2 + 4 = 16
```

不是文档中的：

```text
13
```

---

## 3.1 Stage 0 实际总量

```text
第 0 批：1  Master
第 1 批：6  Pieces
第 2 批：7  Wangcai
第 3 批：16 Other Assets
--------------------------
总计：30
```

因此：

> **Stage 0 = 30 个 Asset**

其中：

- 1 个 Master Reference 不进游戏
- 29 个实际开发 / 美术资产

建议只修数字即可。

---

# 4. 【美术小修 2】PNG 本身不保存 Pivot，需要单独的 Rig 配置

当前 Puppet 工单要求：

```text
tail.png
旋转锚点在尾巴根部

ears.png
旋转锚点在耳朵根部
```

设计意图正确。

但：

> PNG 文件本身并不能保存 Phaser Pivot / Origin / Attachment 坐标。

因此不能只靠美术文件约定。

---

## 4.1 推荐增加 Rig Data

例如：

```ts
// config/pet-rig.ts

export const WANGCAI_RIG = {
  body: {
    x: 0,
    y: 0,
    originX: 0.5,
    originY: 0.5,
  },

  tail: {
    x: 382,
    y: 342,
    originX: 0.12,
    originY: 0.50,
  },

  ears: {
    x: 256,
    y: 135,
    originX: 0.50,
    originY: 0.85,
  },

  eyesOpen: {
    x: 256,
    y: 185,
    originX: 0.50,
    originY: 0.50,
  },

  eyesBlink: {
    x: 256,
    y: 185,
    originX: 0.50,
    originY: 0.50,
  },
};
```

最终数值以实际 Master / Puppet 图为准。

---

## 4.2 推荐交付格式

美术交付：

```text
wangcai/
├── body.png
├── tail.png
├── ears.png
├── eyes-open.png
├── eyes-blink.png
└── preview-composite.png
```

代码：

```text
pet-rig.ts
```

负责：

- Position
- Origin
- Pivot
- Scale

---

## 4.3 原则

> **美术定义“哪里应该转”。**

> **代码 / Rig Data 定义“准确从哪个坐标转”。**

避免把技术信息塞进 PNG 规范本身。

---

# 5. 【美术小修 3】Stage 0 不需要拆 Head，`glanceAtPlayer` 先通过 Eyes 实现

框架希望旺财：

> 偶尔抬头 / 看向玩家。

当前 Puppet 最小结构中：

```text
body = 躯干 + 四肢 + 头
```

没有独立 Head。

这是可以接受的。

Stage 0 不建议为了一个微动作进一步拆：

```text
head.png
```

否则资产和 Rig 复杂度继续扩大。

---

## 5.1 Stage 0 推荐

`glanceAtPlayer` 只做：

```text
eyes offset
```

例如：

```text
eyesContainer.x += 2
eyesContainer.y -= 1
```

配合：

- 一次 blink
- 耳朵轻抖
- body 微呼吸

已经足够产生：

> “旺财好像看了我一眼”

的感觉。

---

## 5.2 V1 Full 再决定是否拆 Head

如果真人测试证明：

> “看玩家”对陪伴感特别有效，

V1 Full 再增加：

```text
head.png
```

并支持：

```text
head rotation
```

Stage 0 没必要。

---

# 6. 【V1 Full 前 TODO】Mastery Star 必须按“历史最高评级增量”发放

这个问题不阻塞 Stage 0。

但在正式启用 Mastery Star 前必须定义。

当前结构：

```ts
levels: Record<number, { rating: 1 | 2 | 3 }>;

stars: {
  mastery: {
    earned: number;
    spent: number;
  };
}
```

如果没有额外规则，很容易出现：

> 玩家不断重刷同一个简单关卡，反复获得 Mastery Star。

---

## 6.1 推荐规则

Mastery 奖励只计算：

> **历史最高 Rating 的增量。**

例如：

```text
第一次完成：
rating = 1
旧 rating = 0
奖励 +1

第二次完成：
rating = 3
旧 rating = 1
奖励 +2

第三次完成：
rating = 3
旧 rating = 3
奖励 +0
```

公式：

```ts
masteryGain = Math.max(0, newRating - oldBestRating);
```

---

## 6.2 推荐存档

```ts
levels: Record<number, {
  bestRating: 1 | 2 | 3;
}>;
```

或者：

```ts
bestRating: 0 | 1 | 2 | 3;
```

未通关：

```text
0
```

这样逻辑最自然。

---

# 7. 可以直接冻结、不建议继续修改的内容

以下内容本轮复查通过。

---

## 7.1 `core/` 零 Phaser

继续保留。

---

## 7.2 `Core → GameEvent[] → Render`

继续保留。

---

## 7.3 `settled` 与 `turnResolved` 双事件

继续保留。

只需要修改：

> `settled` 不再负责 Input Unlock。

---

## 7.4 `PetActionCommand → Core`

继续保留。

这是正确边界。

---

## 7.5 Seeded RNG

继续保留。

---

## 7.6 Schema Validation

继续保留。

尤其：

- 开局无自动 Match
- 开局有合法 Move
- Objective Color 存在
- Position 不越界

这些非常有价值。

---

## 7.7 Replay / Simulation 在 Phaser 前完成

继续保留。

M3 在 M4 之前是正确顺序。

---

## 7.8 Stage 0 宠物只做 Hint

继续保留。

不要重新把 Energy / Skill 拉回 Stage 0。

---

## 7.9 旺财 Master → Puppet → Variant

继续保留。

这是正确美术生产链路。

---

## 7.10 Progress Star / Mastery Star 双维度

继续保留。

主线：

```text
通关固定 +1 Progress
```

评级：

```text
Mastery
```

彼此分离。

---

# 8. Stage 0 是否可以开工

结论：

> **可以。**

但建议 Claude 在开始 M0 时同步完成以下两个 Patch：

```text
PATCH A
CoreTurnSummary 删除 petSkillReady

PATCH B
settled 不再 unlock input
```

这两个都是：

> 小改动、低成本、但值得在接口冻结前解决。

不需要等 V1.2 文档大改。

---

# 9. 美术是否可以开工

结论：

> **可以开始第 0 批。**

也就是：

```text
pet-wangcai-master.png
```

流程继续保持：

```text
Master
↓
人工确认
↓
6 Pieces
↓
40px + Grayscale Test
↓
Puppet
↓
其余 Stage 0 Art
```

本轮发现的问题都不阻塞：

> Master Reference 的生成。

---

# 10. 推荐下一步

Claude：

```text
1. 修改上述 2 个接口问题
2. 修正文档中的 3 个美术小问题
3. 不再扩大设计范围
4. 直接进入 M0
```

Codex Image Gen：

```text
1. 先生成 Wangcai Master
2. 确认角色
3. 再开始棋子 Style Guide 验证
```

---

# 11. 最终复查结论

## 游戏框架 V1.1

> **通过，补 2 个接口 Patch 后冻结。**

必须修改：

1. `CoreTurnSummary` 删除 `petSkillReady`
2. `settled` 不再负责 Input Unlock

---

## 美术素材工单 V1.1

> **通过，可以开始第 0 批。**

建议小修：

1. Stage 0 资产总数 `27 → 30`
2. Puppet Pivot 改由 `WANGCAI_RIG` 配置
3. Stage 0 `glanceAtPlayer` 只移动 Eyes，不拆 Head

---

## V1 Full 前 TODO

必须补：

> **Mastery Star 按历史最高 Rating 的增量发放，禁止重复刷同关无限获得。**

---

# 12. 一句话结论

> **V1.1 已经达到可开工质量；把 `CoreTurnSummary` 里的宠物状态彻底移出去，并把输入解锁从 `settled` 延迟到真正的 `READY_FOR_INPUT`，核心接口就可以冻结，Garden Match 可以正式进入 Stage 0。**
