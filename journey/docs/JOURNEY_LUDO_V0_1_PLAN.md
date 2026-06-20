# 《西游记飞行棋 Journey Ludo》V0.1 游戏策划与实现方案

> 版本：V0.1（已审核修订，含 §3.4 规则裁决表与 §5.1 事件总表）  
> 风格：Q 版 2D 休闲桌游  
> 引擎：Godot 4.x  
> **编码**：Claude Code + Godot（代码 / 逻辑 / 数据 / 场景）  
> **美术资产**：Codex + imagegen（提示词 / 素材生成，详见 §13.1 分工边界）  
> 首版目标：完成一局可玩的 72 格西游主题飞行棋 Demo

---

## 1. 项目目标

《西游记飞行棋 Journey Ludo》是一款以《西游记》取经路线为主题的 Q 版 2D 飞行棋游戏。

玩家可以从以下四个角色中选择 1 个：

- 孙悟空
- 猪八戒
- 唐僧
- 沙僧

玩家选择其中一名角色后，其他三个角色由 AI 控制。四名角色从花果山出发，沿着西游取经路线前进，经过多个经典场景与事件，最终抵达西天灵山。第一个到达终点的角色获胜。

首版重点不是复杂商业系统，而是完成一个稳定、可玩、可展示的核心闭环。

---

## 2. 首版范围

### 2.1 V0.1 必须实现

- 4 个可选角色
- 玩家选择 1 个角色
- 其他 3 个角色由 AI 控制
- 72 格单线路西游地图
- 回合制掷骰
- 棋子按骰子点数移动
- 特殊格事件系统
- 角色被动技能
- 简单 AI 自动行动
- 到达西天后结算胜负
- Q 版 2D 地图与角色素材接入
- 可在 Godot 中运行完整 Demo

### 2.2 V0.1 暂不实现

- 联机对战
- 多棋子传统飞行棋模式
- 主动技能系统
- 复杂剧情分支
- 商城、抽卡、成长系统
- 存档系统
- 多难度 AI
- 复杂动画演出
- 复杂音频系统（`AudioManager.gd` 首版仅作**空接口占位**，预留方法签名，不接入音频资源）

---

## 3. 核心玩法

### 3.1 基础规则

1. 游戏开始时，玩家选择一个角色。
2. 四名角色从起点“花果山”出发。
3. 每名角色按顺序进行回合。
4. 当前角色掷骰子，获得 1 到 6 点。
5. 角色沿地图路线前进对应格数。
6. 到达特殊格时触发西游主题事件。
7. 如果落到其他角色所在格，可触发击退效果。
8. 第一个到达第 72 格“西天灵山”的角色获胜。

### 3.2 回合流程

```text
当前角色回合开始
    ↓
掷骰子
    ↓
棋子移动
    ↓
触发格子事件
    ↓
处理角色碰撞 / 击退
    ↓
检查是否到达终点
    ↓
切换到下一个角色
```

### 3.3 终点规则

首版采用轻量规则：

- 到达或超过第 72 格，均视为抵达西天。
- 不使用“必须刚好点数到达”的规则。

这样可以减少后期反复卡终点的挫败感，让单局节奏更快。

### 3.4 规则裁决表（实现必须遵守）

> 以下规则用于消除实现歧义。所有 Manager 与 AI 必须按此裁决，禁止各自约定。

#### 3.4.1 事件链与二次触发

- 由**骰子移动**落地的格子，触发该格事件。
- 由**事件本身引发的移动**（前进 / 后退 / 传送 / 交换 / 重排序），落地后**不再二次触发**格子事件。
- 唯一例外：`re_roll`（再掷一次）是显式的二次掷骰入口，再掷后的骰子移动按正常流程触发事件。
- 该规则同时杜绝"A 把你送到 B、B 又把你送回"的死循环。

#### 3.4.2 再掷一次（re_roll）

- 单个回合内**最多再掷 1 次**（`re_roll_used` 标记，回合结束清零）。
- 再掷得到的点数，**孙悟空筋斗云照常生效**（掷 6 仍 +2）。
- 处于"停留"状态时，整个回合跳过，**不结算任何事件，包括 re_roll**。

#### 3.4.3 胜利判定时机

- 每次**位置发生变更后**（含骰子移动与事件移动）立即判定：`index >= 72` 即抵达西天。
- 一旦判定胜利，**立即中止本回合后续所有结算**（不再触发事件、不结算碰撞、不再掷）。
- 第 71 格 `re_roll` 与第 65 格前进 3 等可能"冲过"72，均按此规则即时结算胜利。

#### 3.4.4 碰撞与击退

- **击退距离**：被踩中的角色后退 **3 格**（不低于第 1 格）。
- **起点豁免**：第 1 格（起点）不触发任何碰撞 / 击退，开局四子同格安全。
- **终点豁免**：已抵达西天（`index >= 72`）的角色不参与碰撞、交换、重排序。
- **同格渲染**：允许多子同格，棋子按固定微小偏移并排显示（左上 / 右上 / 左下 / 右下）。
- 八戒"皮糙肉厚"判定失败（即未触发免疫）时，正常被击退后退 3 格。

#### 3.4.5 护盾与负面语义

- 每个事件在 `events.json` 中带 `negative: true/false` 标签。
- 护盾**仅抵消**满足以下两个条件的效果：`negative == true` **且** 该效果**直接作用于自己**（如踩到惩罚格、被击退）。
- "交换位置 / 重新排序"定义为**中性位置事件**，`negative: false`，**不可被护盾抵消**（避免护盾语义递归与互弹）。
- **护盾上限：2 层**（唐僧过驿站叠加封顶 2，超出不再增加）。
- **反击护盾**：被击退时改为让攻击者后退 3 格；若攻击者也持反击护盾，**不再二次反弹**（反击只结算一层，避免互弹死循环）。

#### 3.4.6 交换位置边界

- 第 29 格"随机角色"、第 41 格"前方最近角色"：交换对象**不含已抵达终点的角色**。
- 第 41 格若前方无可交换角色，事件**无效**，弹窗提示"前方无人"。
- 交换 / 重排序后落地格**不再触发事件**（见 3.4.1）。

#### 3.4.7 行动顺序与先手

- 固定行动顺序：孙悟空 → 猪八戒 → 唐僧 → 沙僧 → 循环。
- **玩家所选角色固定为本局首发**（插到顺序首位），其余角色按上述相对顺序跟随，保证玩家不会因选了沙僧而永远最后手。

#### 3.4.8 随机数可复现

- 全局统一使用单一 `RandomNumberGenerator` 实例（骰子、随机交换、随机负面、重排序）。
- 开发期支持通过 `balance.json` 的 `debug_seed` 字段固定种子，便于复现 bug；为 `null` 时使用随机种子。

---

## 4. 72 格地图设计

### 4.1 地图结构

地图总共 72 格，分为 8 个西游区域，每个区域 9 格。

```text
1 - 9      花果山
10 - 18    高老庄
19 - 27    流沙河
28 - 36    白骨岭
37 - 45    女儿国
46 - 54    火焰山
55 - 63    小雷音寺
64 - 72    西天灵山
```

### 4.2 地图区域表

| 格子范围 | 区域 | 主题定位 | 玩法作用 |
|---|---|---|---|
| 1 - 9 | 花果山 | 新手起点、轻松奖励 | 教学与启动节奏 |
| 10 - 18 | 高老庄 | 搞笑、猪八戒主题 | 引入角色专属事件 |
| 19 - 27 | 流沙河 | 水路阻碍、沙僧主题 | 引入停留和陷落 |
| 28 - 36 | 白骨岭 | 陷阱、幻象、白骨精 | 中盘反转 |
| 37 - 45 | 女儿国 | 迷惑、交换、选择 | 位置变化 |
| 46 - 54 | 火焰山 | 高风险高收益 | 后期大幅波动 |
| 55 - 63 | 小雷音寺 | 幻境、Boss、混乱 | 终点前反转 |
| 64 - 72 | 西天灵山 | 最终冲刺 | 胜负结算 |

---

## 5. 72 格具体配置建议

> 首版可以先使用固定配置，后续再做随机地图或 Roguelike 事件。

| 格子 | 区域 | 类型 | 事件 |
|---:|---|---|---|
| 1 | 花果山 | 起点 | 所有角色从这里出发 |
| 2 | 花果山 | 普通 | 无 |
| 3 | 花果山 | 奖励 | 仙桃：前进 2 格 |
| 4 | 花果山 | 普通 | 无 |
| 5 | 花果山 | 普通 | 无 |
| 6 | 花果山 | 奖励 | 猴群助威：再掷一次 |
| 7 | 花果山 | 惩罚 | 顽猴捣乱：后退 1 格 |
| 8 | 花果山 | 传送 | 水帘洞捷径：前进到第 9 格 |
| 9 | 花果山 | 驿站 | 花果山驿站 |
| 10 | 高老庄 | 普通 | 无 |
| 11 | 高老庄 | 奖励 | 喜宴：获得护盾 |
| 12 | 高老庄 | 普通 | 无 |
| 13 | 高老庄 | 惩罚 | 偷吃贡品：后退 2 格 |
| 14 | 高老庄 | 普通 | 无 |
| 15 | 高老庄 | 奖励 | 八戒帮忙：前进 2 格 |
| 16 | 高老庄 | 普通 | 无 |
| 17 | 高老庄 | 特殊 | 庄主留客：停留一回合但获得护盾 |
| 18 | 高老庄 | 驿站 | 高老庄驿站 |
| 19 | 流沙河 | 普通 | 无 |
| 20 | 流沙河 | 惩罚 | 流沙陷落：停留一回合 |
| 21 | 流沙河 | 奖励 | 木筏渡河：前进 3 格 |
| 22 | 流沙河 | 普通 | 无 |
| 23 | 流沙河 | 特殊 | 河水上涨：下回合骰子 -1 |
| 24 | 流沙河 | 普通 | 无 |
| 25 | 流沙河 | 奖励 | 沙僧引路：获得一次免疫负面事件 |
| 26 | 流沙河 | 普通 | 无 |
| 27 | 流沙河 | 驿站 | 流沙河驿站 |
| 28 | 白骨岭 | 普通 | 无 |
| 29 | 白骨岭 | 惩罚 | 白骨幻象：与随机角色交换位置 |
| 30 | 白骨岭 | 普通 | 无 |
| 31 | 白骨岭 | 奖励 | 火眼金睛：清除负面状态 |
| 32 | 白骨岭 | 普通 | 无 |
| 33 | 白骨岭 | 特殊 | 三打白骨精：掷骰大于 3 前进 3 格，否则后退 3 格 |
| 34 | 白骨岭 | 惩罚 | 妖气缠身：下回合骰子 -1 |
| 35 | 白骨岭 | 普通 | 无 |
| 36 | 白骨岭 | 驿站 | 白骨岭驿站 |
| 37 | 女儿国 | 普通 | 无 |
| 38 | 女儿国 | 奖励 | 花桥捷径：前进 3 格 |
| 39 | 女儿国 | 普通 | 无 |
| 40 | 女儿国 | 特殊 | 女王邀请：停留一回合但获得护盾 |
| 41 | 女儿国 | 惩罚 | 迷香：与前方最近角色交换位置 |
| 42 | 女儿国 | 普通 | 无 |
| 43 | 女儿国 | 奖励 | 子母河清泉：清除负面状态 |
| 44 | 女儿国 | 普通 | 无 |
| 45 | 女儿国 | 驿站 | 女儿国驿站 |
| 46 | 火焰山 | 普通 | 无 |
| 47 | 火焰山 | 惩罚 | 火焰灼烧：后退 3 格 |
| 48 | 火焰山 | 奖励 | 芭蕉扇：前进 5 格 |
| 49 | 火焰山 | 普通 | 无 |
| 50 | 火焰山 | 特殊 | 牛魔王拦路：掷骰小于 4 则停留一回合 |
| 51 | 火焰山 | 普通 | 无 |
| 52 | 火焰山 | 奖励 | 铁扇公主相助：获得反击护盾 |
| 53 | 火焰山 | 惩罚 | 烈焰迷路：回到第 46 格 |
| 54 | 火焰山 | 驿站 | 火焰山驿站 |
| 55 | 小雷音寺 | 普通 | 无 |
| 56 | 小雷音寺 | 惩罚 | 假佛现身：随机负面事件 |
| 57 | 小雷音寺 | 奖励 | 弥勒相助：清除负面状态并前进 2 格 |
| 58 | 小雷音寺 | 普通 | 无 |
| 59 | 小雷音寺 | 特殊 | 黄眉怪布袋：所有角色重新排序 |
| 60 | 小雷音寺 | 普通 | 无 |
| 61 | 小雷音寺 | 惩罚 | 金铙困身：停留一回合 |
| 62 | 小雷音寺 | 奖励 | 佛光初现：获得护盾 |
| 63 | 小雷音寺 | 驿站 | 小雷音寺驿站 |
| 64 | 西天灵山 | 普通 | 无 |
| 65 | 西天灵山 | 奖励 | 祥云托举：前进 3 格 |
| 66 | 西天灵山 | 普通 | 无 |
| 67 | 西天灵山 | 惩罚 | 最后一难：后退 2 格 |
| 68 | 西天灵山 | 普通 | 无 |
| 69 | 西天灵山 | 奖励 | 莲花台：获得护盾 |
| 70 | 西天灵山 | 普通 | 无 |
| 71 | 西天灵山 | 特殊 | 经书在前：再掷一次 |
| 72 | 西天灵山 | 终点 | 抵达西天，游戏胜利 |

### 5.1 完整 event_id 总表（数据契约）

> `BoardManager` 加载 `board_72.json` 时必须校验：每个非空 `event_id` 都能在此表中找到，否则报错中止（禁止运行时静默失败）。
> `negative` 列决定护盾是否可抵消（见 §3.4.5）；同一 `effect_type` 可被多格复用，只换 `name` 文案。

| 格子 | event_id | name | effect_type | value | negative | 备注 |
|---:|---|---|---|---:|:---:|---|
| 3 | `peach_forward_2` | 仙桃 | move_forward | 2 | false | 沙僧 +1 |
| 6 | `monkey_reroll` | 猴群助威 | re_roll | - | false | 单回合限 1 次 |
| 7 | `monkey_back_1` | 顽猴捣乱 | move_backward | 1 | true | |
| 8 | `waterfall_warp_9` | 水帘洞捷径 | warp_to | 9 | false | 传送至第 9 格 |
| 11 | `feast_shield` | 喜宴 | gain_status | 1 | false | status=shield |
| 13 | `steal_back_2` | 偷吃贡品 | move_backward | 2 | true | |
| 15 | `bajie_forward_2` | 八戒帮忙 | move_forward | 2 | false | 沙僧 +1 |
| 17 | `host_stay_shield` | 庄主留客 | stay_and_shield | 1 | false | 停留 1 回合 + 护盾 |
| 20 | `quicksand_stay` | 流沙陷落 | stay | 1 | true | |
| 21 | `raft_forward_3` | 木筏渡河 | move_forward | 3 | false | 沙僧 +1 |
| 23 | `flood_dice_minus` | 河水上涨 | gain_status | -1 | true | status=dice_minus |
| 25 | `shaseng_immune` | 沙僧引路 | gain_status | 1 | false | status=negate_negative |
| 29 | `bone_swap_random` | 白骨幻象 | swap_random | - | false | 中性位置事件，护盾不挡 |
| 31 | `fiery_eyes_clear` | 火眼金睛 | clear_negative | - | false | |
| 33 | `bone_gamble` | 三打白骨精 | dice_gate | 3 | false | >3 前进 3，否则后退 3 |
| 34 | `demon_dice_minus` | 妖气缠身 | gain_status | -1 | true | status=dice_minus |
| 38 | `bridge_forward_3` | 花桥捷径 | move_forward | 3 | false | 沙僧 +1 |
| 40 | `queen_stay_shield` | 女王邀请 | stay_and_shield | 1 | false | 停留 1 回合 + 护盾 |
| 41 | `charm_swap_front` | 迷香 | swap_front | - | false | 中性位置事件；前方无人则无效 |
| 43 | `child_river_clear` | 子母河清泉 | clear_negative | - | false | |
| 47 | `flame_back_3` | 火焰灼烧 | move_backward | 3 | true | |
| 48 | `fan_forward_5` | 芭蕉扇 | move_forward | 5 | false | 沙僧 +1 |
| 50 | `niu_block` | 牛魔王拦路 | dice_gate_stay | 4 | true | 掷骰 <4 则停留 1 回合 |
| 52 | `iron_fan_counter` | 铁扇公主相助 | gain_status | 1 | false | status=counter_shield |
| 53 | `flame_lost_warp_46` | 烈焰迷路 | warp_to | 46 | true | 回到第 46 格 |
| 56 | `fake_buddha_random` | 假佛现身 | random_negative | - | true | 随机抽一个负面效果 |
| 57 | `maitreya_clear_forward` | 弥勒相助 | clear_then_forward | 2 | false | 清负面 + 前进 2，沙僧 +1 |
| 59 | `reorder_all` | 黄眉怪布袋 | reorder_all | - | false | 中性位置事件，护盾不挡 |
| 61 | `cymbal_stay` | 金铙困身 | stay | 1 | true | |
| 62 | `buddha_light_shield` | 佛光初现 | gain_status | 1 | false | status=shield |
| 65 | `cloud_forward_3` | 祥云托举 | move_forward | 3 | false | 沙僧 +1 |
| 67 | `last_trial_back_2` | 最后一难 | move_backward | 2 | true | |
| 69 | `lotus_shield` | 莲花台 | gain_status | 1 | false | status=shield |
| 71 | `scripture_reroll` | 经书在前 | re_roll | - | false | 单回合限 1 次 |
| 72 | `game_finish` | 抵达西天 | finish | - | false | 触发胜利结算 |

**驿站格（9/18/27/36/45/54/63）**：`tile_type = post_station`，`event_id = null`。驿站本身无事件，仅作为唐僧"佛光护体"叠加护盾的判定点（经过即 +1，上限 2）。

**effect_type 枚举**（EventManager 需全部支持）：
`move_forward` / `move_backward` / `warp_to` / `stay` / `stay_and_shield` / `gain_status` / `clear_negative` / `clear_then_forward` / `re_roll` / `dice_gate` / `dice_gate_stay` / `swap_random` / `swap_front` / `reorder_all` / `random_negative` / `finish`。

**status 枚举**：`shield` / `stay` / `dice_plus` / `dice_minus` / `negate_negative` / `counter_shield`（对应 §7）。

---

## 6. 角色设计

### 6.1 孙悟空

**定位：高速突进型**

被动技能：筋斗云

- 掷出 6 点时，额外前进 2 格。

首版表现：

- 移动速度略快。
- 触发奖励时出现“筋斗云”小特效。

---

### 6.2 猪八戒

**定位：防御抗打型**

被动技能：皮糙肉厚

- 被其他角色踩中时，有 50% 概率不被击退。

首版表现：

- 被击退失败时弹出气泡：“嘿嘿，俺老猪站得稳！”

---

### 6.3 唐僧

**定位：稳定保护型**

被动技能：佛光护体

- 每经过一个驿站，获得 1 层护盾。
- 护盾可以抵消一次负面事件或击退效果。

首版表现：

- 获得护盾时角色周围显示淡金色光圈。

---

### 6.4 沙僧

**定位：均衡收益型**

被动技能：踏实前行

- 踩到**移动类奖励格**时，前进效果 +1 格（如“前进 2 格”→“前进 3 格”）。
- **后退类惩罚**时，后退效果 -1 格（如“后退 3 格”→“后退 2 格”，最少后退 1 格）。
- 该被动同时覆盖奖励与惩罚，使“均衡”定位真正成立，避免实际收益过低（见 §16.4 平衡说明）。

首版表现：

- 触发时显示“稳稳向前”。

---

## 7. 特殊状态设计

首版只保留少量状态，避免系统过重。

| 状态 | id | 说明 |
|---|---|---|
| 护盾 | `shield` | 抵消一次直接作用于自己的负面事件或击退；**上限 2 层**（见 §3.4.5） |
| 停留 | `stay` | 下回合跳过整个行动，不结算任何事件 |
| 骰子 +1 | `dice_plus` | 下次掷骰结果 +1，最大不超过 6 |
| 骰子 -1 | `dice_minus` | 下次掷骰结果 -1，最小不低于 1 |
| 免疫负面 | `negate_negative` | 下一次踩到负面格时无效（消耗 1 次） |
| 反击护盾 | `counter_shield` | 被击退时改为让攻击者后退 3 格；双方都有时只结算一层，不互弹（见 §3.4.5） |

> 护盾与“免疫负面”均为可叠加计数的状态：被一次负面消耗 1 点。结算优先级：**免疫负面 > 护盾**（先用一次性免疫，再用护盾）。

---

## 8. AI 设计

### 8.1 V0.1 AI 目标

首版 AI 只需要表现为“能正常陪玩”。

AI 必须实现：

- 自动掷骰
- 自动移动
- 自动触发事件
- 自动进入下一回合
- 不需要主动技能决策

### 8.2 AI 行为规则

V0.1 使用简单 AI：

```text
轮到 AI
    ↓
等待 0.5 秒
    ↓
自动掷骰
    ↓
等待骰子动画结束
    ↓
自动移动
    ↓
触发事件
    ↓
等待 0.5 秒
    ↓
结束回合
```

### 8.3 后续 AI 可扩展

V0.2 可以加入简单策略：

- 如果可以踩中前方角色，优先攻击。
- 如果落后，奖励格权重更高。
- 如果领先，护盾价值更高。
- 不同角色有不同性格倾向。

---

## 9. Godot 实现方案

### 9.1 推荐引擎版本

建议使用：

```text
Godot 4.2 或 Godot 4.3+
```

项目类型：

```text
2D Project
```

渲染方式：

```text
Compatibility 或 Forward+
```

首版 2D 游戏不依赖复杂 3D 特性。

---

### 9.2 项目目录结构

```text
journey/
├── project.godot
├── scenes/
│   ├── Main.tscn
│   ├── StartMenu.tscn
│   ├── CharacterSelect.tscn
│   ├── GameScene.tscn
│   ├── ResultScene.tscn
│   ├── board/
│   │   ├── Board.tscn
│   │   └── Tile.tscn
│   ├── pieces/
│   │   └── CharacterPiece.tscn
│   └── ui/
│       ├── DicePanel.tscn
│       ├── EventPopup.tscn
│       ├── TurnPanel.tscn
│       └── RankingPanel.tscn
├── scripts/
│   ├── GameManager.gd
│   ├── TurnManager.gd
│   ├── BoardManager.gd
│   ├── DiceController.gd
│   ├── CharacterPiece.gd
│   ├── EventManager.gd
│   ├── SkillManager.gd
│   ├── AIController.gd
│   ├── UIManager.gd
│   └── AudioManager.gd
├── data/
│   ├── characters.json
│   ├── board_72.json
│   ├── events.json
│   └── balance.json
├── assets/
│   ├── raw/
│   ├── sprites/
│   │   ├── characters/
│   │   ├── tiles/
│   │   ├── ui/
│   │   └── effects/
│   ├── backgrounds/
│   └── audio/
├── prompts/
│   └── imagegen/
│       ├── character_prompts.md
│       ├── board_prompts.md
│       ├── tile_icon_prompts.md
│       └── ui_prompts.md
├── docs/
│   ├── JOURNEY_LUDO_V0_1_PLAN.md
│   ├── CLAUDE_TASKS.md
│   └── ART_ASSET_LIST.md
└── README.md
```

---

## 10. Godot 核心模块

### 10.1 GameManager.gd

职责：

- 管理游戏主状态
- 初始化角色和棋盘
- 启动新游戏
- 判断游戏结束
- 进入结算界面

核心状态与转移（带条件回边，非线性）：

```text
INIT → CHARACTER_SELECT → GAME_START → TURN_START

TURN_START
    ├─(有 stay 状态)→ 消耗 stay → NEXT_TURN        # 停留：整回合跳过，不结算事件
    └─(正常)─────────→ ROLL_DICE

ROLL_DICE → MOVE_PIECE                              # 应用 dice±1、孙悟空筋斗云

MOVE_PIECE → CHECK_WIN
    ├─(index>=72)→ GAME_OVER                        # 每次移动后即时判定胜利
    └─(未到)────→ RESOLVE_TILE_EVENT

RESOLVE_TILE_EVENT                                  # 仅“骰子移动”落地才进入；事件移动落地不再触发
    ├─(re_roll 且本回合未再掷)→ ROLL_DICE           # 再掷一次，限 1 次
    ├─(事件含移动/传送/交换)──→ MOVE_PIECE(flag:事件移动) → CHECK_WIN
    └─(无后续移动)───────────→ RESOLVE_COLLISION

RESOLVE_COLLISION                                   # 起点/终点豁免；击退后退 3 格
    └─→ CHECK_WIN
            ├─(index>=72)→ GAME_OVER
            └─(未到)────→ NEXT_TURN

NEXT_TURN → TURN_START                              # 清回合标记（re_roll_used 等）
```

> 关键点：`re_roll` 回到 `ROLL_DICE`；事件移动回到 `MOVE_PIECE` 但带 `事件移动` flag，使 `RESOLVE_TILE_EVENT` 知道**不再二次触发**（见 §3.4.1）；`CHECK_WIN` 在每次移动后都执行（见 §3.4.3）。

---

### 10.2 TurnManager.gd

职责：

- 管理当前回合角色
- 维护角色顺序
- 判断是否跳过回合
- 切换到下一名角色

首版角色顺序：

```text
孙悟空 → 猪八戒 → 唐僧 → 沙僧 → 循环
```

玩家选择的角色不改变整体顺序。

---

### 10.3 DiceController.gd

职责：

- 控制骰子按钮
- 生成 1 - 6 随机点数
- 处理骰子动画
- 应用骰子 +1 / -1 状态

---

### 10.4 BoardManager.gd

职责：

- 加载 `board_72.json`
- 创建 72 个格子
- 保存每个格子的坐标
- 提供棋子移动路径
- 获取指定格子的事件信息

---

### 10.5 CharacterPiece.gd

职责：

- 表示角色棋子
- 保存当前所在格子
- 执行逐格移动动画
- 显示状态图标
- 显示角色气泡

---

### 10.6 EventManager.gd

职责：

- 根据格子事件执行效果
- 前进 / 后退
- 停留 / 护盾 / 交换位置
- 清除负面状态
- 随机事件

---

### 10.7 SkillManager.gd

职责：

- 处理角色被动技能
- 处理护盾抵消
- 处理击退免疫
- 处理奖励格增益

**架构约定（解耦 Skill 与 Event）**：`EventManager` 只负责算出**原始效果**（raw effect），不直接判断技能与护盾。`SkillManager` 以 hook 形式注册到结算管线，按时机修改效果：

```text
on_before_dice(actor, roll)        → 孙悟空筋斗云（掷 6 额外 +2）；应用 dice±1 状态
on_reward_move(actor, value)       → 沙僧 +1（移动类奖励）
on_negative_move(actor, value)     → 沙僧 -1（后退类惩罚，最少 1）
on_negative_apply(actor, effect)   → 免疫负面 / 护盾抵消（优先级：免疫 > 护盾）
on_knockback(actor, attacker)      → 八戒 50% 免疫；反击护盾让 attacker 后退 3
on_pass_post_station(actor)        → 唐僧 +1 护盾（上限 2）
```

> 这样 `EventManager`、`SkillManager`、`DiceController` 之间不再互相直接调用，避免跨 Manager 耦合；新增技能只需注册新 hook。

---

### 10.8 AIController.gd

职责：

- 判断角色是否 AI
- 自动执行 AI 回合
- 控制 AI 行动间隔
- 后续扩展策略 AI

---

### 10.9 UIManager.gd

职责：

- 当前角色面板
- 骰子按钮状态
- 事件弹窗
- 排名面板
- 结算面板

---

## 11. 数据结构设计

### 11.1 characters.json 示例

```json
[
  {
    "id": "sun_wukong",
    "name": "孙悟空",
    "role": "speed",
    "passive_skill": "cloud_dash",
    "sprite": "res://assets/sprites/characters/sun_wukong.png"
  },
  {
    "id": "zhu_bajie",
    "name": "猪八戒",
    "role": "defense",
    "passive_skill": "thick_skin",
    "sprite": "res://assets/sprites/characters/zhu_bajie.png"
  },
  {
    "id": "tang_seng",
    "name": "唐僧",
    "role": "shield",
    "passive_skill": "buddha_light",
    "sprite": "res://assets/sprites/characters/tang_seng.png"
  },
  {
    "id": "sha_seng",
    "name": "沙僧",
    "role": "balanced",
    "passive_skill": "steady_walk",
    "sprite": "res://assets/sprites/characters/sha_seng.png"
  }
]
```

### 11.2 board_72.json 示例

```json
[
  {
    "index": 1,
    "region": "flower_fruit_mountain",
    "tile_type": "start",
    "event_id": null
  },
  {
    "index": 3,
    "region": "flower_fruit_mountain",
    "tile_type": "reward",
    "event_id": "peach_forward_2"
  },
  {
    "index": 72,
    "region": "western_paradise",
    "tile_type": "finish",
    "event_id": "game_finish"
  }
]
```

### 11.3 events.json 示例

```json
[
  {
    "id": "peach_forward_2",
    "name": "仙桃",
    "description": "前进 2 格",
    "effect_type": "move_forward",
    "value": 2
  },
  {
    "id": "flame_back_3",
    "name": "火焰灼烧",
    "description": "后退 3 格",
    "effect_type": "move_backward",
    "value": 3
  },
  {
    "id": "shield_gain",
    "name": "观音相助",
    "description": "获得护盾",
    "effect_type": "gain_status",
    "status": "shield",
    "value": 1
  }
]
```

---

## 12. 美术生成方案：Codex + imagegen

### 12.1 美术生成原则

所有素材保持统一风格：

```text
Q 版 2D，东方神话，西游主题，圆润可爱，明亮清爽，轻量卡通渲染，适合休闲棋盘游戏。
```

统一要求：

- 不要写实恐怖风
- 不要复杂厚涂
- 不要 3D 渲染感过强
- 不要图片内文字
- 角色需要透明背景 PNG
- 图标需要轮廓清晰，缩小后仍可识别
- 地图背景可以是 16:9 横版
- 棋盘格子和角色建议分层制作，方便 Godot 调整

---

### 12.2 首版美术资产清单

#### 角色素材

| 素材 | 数量 | 规格建议 |
|---|---:|---|
| 孙悟空 Q 版棋子 | 1 | 512x512，透明背景 |
| 猪八戒 Q 版棋子 | 1 | 512x512，透明背景 |
| 唐僧 Q 版棋子 | 1 | 512x512，透明背景 |
| 沙僧 Q 版棋子 | 1 | 512x512，透明背景 |
| 四角色头像 | 4 | 256x256，透明背景 |

#### 地图素材

| 素材 | 数量 | 规格建议 |
|---|---:|---|
| 72 格西游路线地图底图 | 1 | 1920x1080 或 2048x1152 |
| 8 个区域背景装饰 | 8 | 可拆分图层，透明背景 |
| 普通格子 | 1 | 256x256，透明背景 |
| 奖励格子 | 1 | 256x256，透明背景 |
| 惩罚格子 | 1 | 256x256，透明背景 |
| 传送格子 | 1 | 256x256，透明背景 |
| 驿站格子 | 1 | 256x256，透明背景 |
| 终点格子 | 1 | 256x256，透明背景 |

#### 事件图标

| 图标 | 说明 |
|---|---|
| 仙桃 | 前进奖励 |
| 筋斗云 | 加速 |
| 猴群助威 | 再掷一次 |
| 妖怪埋伏 | 后退 |
| 护盾佛光 | 获得保护 |
| 流沙陷落 | 停留 |
| 白骨幻象 | 交换位置 |
| 芭蕉扇 | 大幅前进 |
| 火焰山火焰 | 负面区域 |
| 小雷音寺幻境 | 随机事件 |
| 莲花台 | 终点奖励 |
| 经书 | 胜利目标 |

#### UI 素材

| 素材 | 说明 |
|---|---|
| 骰子 1 - 6 面 | 掷骰动画用 |
| 当前角色面板 | 显示当前回合 |
| 事件弹窗框 | 显示事件结果 |
| 排名面板 | 游戏中排名 |
| 胜利结算面板 | 终局展示 |
| 开始按钮 | 主菜单 |
| 角色选择卡片 | 角色选择界面 |

---

### 12.3 imagegen 提示词模板

#### 角色棋子 Prompt 模板

```text
Q版2D游戏角色棋子，西游记主题，{角色名称}，可爱圆润比例，2.5头身，明亮清爽色彩，东方神话卡通风格，适合休闲飞行棋游戏，正面站姿，表情友好，轮廓清晰，干净线条，柔和阴影，透明背景，不包含文字，不包含复杂背景。

角色特征：{角色关键特征}

输出要求：单个完整角色，全身，透明背景 PNG，适合导入 Godot 作为棋子素材。
```

#### 地图底图 Prompt 模板

```text
Q版2D西游记主题飞行棋地图，横版16:9，明亮清爽，童话感东方神话世界，从花果山出发，经过高老庄、流沙河、白骨岭、女儿国、火焰山、小雷音寺，最终到达西天灵山。地图是一条蜿蜒的取经路线，适合放置72个棋盘格，整体可爱、圆润、色彩丰富，休闲桌游风格，不包含文字，不包含真实人物，不要写实恐怖。
```

#### 格子图标 Prompt 模板

```text
Q版2D飞行棋格子图标，西游记主题，{格子类型}，圆形棋盘格，轮廓清晰，颜色明亮，适合缩小显示，透明背景，干净卡通风格，不包含文字。
```

#### 事件图标 Prompt 模板

```text
Q版2D游戏事件图标，西游记主题，{事件名称}，圆润可爱，明亮清晰，适合飞行棋事件弹窗和棋盘格显示，透明背景，图标化设计，不包含文字。
```

---

## 13. 协作工作流与分工边界

### 13.1 分工边界（强约束）

本项目由两个执行体协作，**职责边界严格划分，互不越界**：

| 维度 | 编码：**Claude Code + Godot** | 美术资产：**Codex + imagegen** |
|---|---|---|
| **核心职责** | 一切代码、逻辑、数据、引擎工程 | 一切视觉素材的提示词与生成 |
| **产出物** | `*.gd` 脚本、`*.tscn` 场景、`project.godot`、`*.json` 数据文件 | `assets/sprites/`、`assets/backgrounds/` 下的 PNG 素材 |
| **拥有目录** | `scripts/`、`scenes/`、`data/`、`docs/`、`project.godot`、`README.md` | `prompts/imagegen/`、`assets/raw/`、`assets/sprites/`、`assets/backgrounds/`、`docs/ART_ASSET_LIST.md` |
| **不负责** | 不生成 / 不修改任何图片像素；不写美术提示词 | 不写 / 不改任何 `.gd`、`.tscn`、`.json` 代码与数据 |

**Claude Code + Godot 负责：**

- Godot 项目结构与 `project.godot`（含 autoload 单例配置）
- 全部 GDScript 代码与游戏状态机（§3.4 规则裁决、§10 模块）
- 场景搭建（`.tscn`）
- 数据文件编写与校验（`characters.json` / `board_72.json` / `events.json` / `balance.json`，按 §5.1 数据契约）
- UI 逻辑、AI 逻辑、Bug 修复
- 调试期占位图形（纯色圆形 / 方块），保证逻辑可在无美术下跑通

**Codex + imagegen 负责：**

- 维护 `prompts/imagegen/` 下的提示词文件（§12.3 模板）
- 调用 imagegen 按批次生成：角色棋子、角色头像、地图底图、区域装饰、格子图标、事件图标、UI 面板
- 按 §12.2 资产清单产出 PNG，落位到 `assets/sprites/` 对应子目录
- 维护 `docs/ART_ASSET_LIST.md`（资产状态：待生成 / 已生成 / 已接入）
- 不接触任何代码逻辑

### 13.1.1 交接契约（接口）

两侧通过**文件命名 + 目录约定**解耦，互不阻塞：

- **命名契约**：素材文件名由 Claude Code 在数据文件中先行约定（如 `characters.json` 中 `"sprite": "res://assets/sprites/characters/sun_wukong.png"`），Codex 按该路径产出同名 PNG。
- **规格契约**：尺寸 / 透明背景 / 分层要求由 §12.2 清单固定；任一方变更需先改本方案文档再执行。
- **占位先行**：Claude Code 先用占位图跑通逻辑（Milestone 1–4），Codex 的正式素材在 Milestone 5 替换占位图，二者并行，互不等待。
- **接入归属**：把 PNG 文件**放进目录**属 Codex；在场景 / 数据中**引用并调整显示**属 Claude Code。
- **代码审核**：Codex 可对 Claude Code 的实现做**只读审核并提建议**，但**不直接改代码**，由 Claude Code 落实。

---

### 13.2 推荐 Git 流程

```text
main
└── dev
    ├── feature/core-game-loop
    ├── feature/board-72
    ├── feature/event-system
    ├── feature/ai-player
    ├── feature/ui
    └── feature/art-integration
```

首版可以简化为：

```text
main
└── dev
```

每完成一个模块提交一次 commit。

---

### 13.3 Claude Code 任务拆分

#### Task 1：创建 Godot 项目基础结构

目标：创建空项目、目录结构和基础场景。

交付：

- `Main.tscn`
- `GameScene.tscn`
- `GameManager.gd`
- 基础目录结构

---

#### Task 2：实现 72 格棋盘

目标：通过配置生成 72 个格子。

交付：

- `Board.tscn`
- `Tile.tscn`
- `BoardManager.gd`
- `board_72.json`
- 格子索引显示调试开关

---

#### Task 3：实现角色与移动

目标：4 个角色可以按骰子点数移动。

交付：

- `CharacterPiece.tscn`
- `CharacterPiece.gd`
- `characters.json`
- 逐格移动动画

---

#### Task 4：实现回合与骰子

目标：玩家和 AI 可以轮流掷骰。

交付：

- `TurnManager.gd`
- `DiceController.gd`
- 当前回合 UI
- 玩家按钮与 AI 自动掷骰

---

#### Task 5：实现事件系统

目标：特殊格可以触发事件。

交付：

- `EventManager.gd`
- `events.json`
- 事件弹窗
- 前进、后退、停留、护盾、交换位置、再掷一次

---

#### Task 6：实现角色被动技能

目标：四个角色拥有基础差异。

交付：

- `SkillManager.gd`
- 孙悟空掷 6 加速
- 猪八戒防击退
- 唐僧过驿站得护盾
- 沙僧奖励格收益 +1

---

#### Task 7：实现结算界面

目标：游戏结束后显示排名。

交付：

- `ResultScene.tscn`
- 排名数据
- 胜利角色展示
- 重新开始按钮

---

#### Task 8：接入美术素材

目标：替换调试图形为正式 Q 版素材。

交付：

- 角色棋子图
- 地图底图
- 格子图标
- 事件图标
- UI 面板

---

## 14. 首版开发里程碑

### Milestone 0：项目准备

目标：项目能正常打开和运行。

完成标准：

- Godot 项目创建完成
- Git 仓库初始化
- 目录结构建立
- 可以运行空场景
- **若计划 Web 展示：此阶段先验证空项目可成功导出 Web（HTML5），避免拖到 M5 才发现导出坑**
- autoload 单例确认：`GameManager` / `AudioManager` 等在 `project.godot` 注册

---

### Milestone 1：核心循环

目标：不接入正式美术，也能跑通游戏。

完成标准：

- 4 个角色出现在棋盘上（占位图形）
- 可以掷骰
- 可以移动
- 可以轮流行动
- 可以判断胜负
- **可复现 RNG 就绪：`balance.json` 的 `debug_seed` 可固定随机序列**（见 §3.4.8）

---

### Milestone 2：72 格地图与事件

目标：完成西游主题规则。

完成标准：

- 72 个格子全部可用
- 8 个区域配置完成
- 主要事件可触发
- 事件弹窗能显示结果

---

### Milestone 3：AI 陪玩

目标：玩家可以和 3 个 AI 完整玩一局。

完成标准：

- AI 自动掷骰
- AI 自动移动
- AI 自动触发事件
- AI 不会卡住回合

---

### Milestone 4：角色差异化

目标：4 个角色有基础策略差异。

完成标准：

- 4 个被动技能生效
- 护盾、停留、骰子修正等状态正常
- 角色气泡正常显示

---

### Milestone 5：美术接入与展示版

目标：完成可展示 Demo。

完成标准：

- Q 版角色素材接入
- 西游地图底图接入
- 格子和事件图标接入
- UI 基础美化
- 可以导出 PC 或 Web 版本

---

## 15. 第一版验收标准

V0.1 完成后，必须满足以下标准：

1. 玩家可以选择孙悟空、猪八戒、唐僧、沙僧之一。
2. 未选择的 3 个角色自动成为 AI。
3. 地图共有 72 格。
4. 四名角色可以从第 1 格出发，移动到第 72 格。
5. 每个角色能正常轮流行动。
6. 玩家回合需要点击骰子。
7. AI 回合自动掷骰并行动。
8. 特殊格事件可以正常触发。
9. 护盾、停留、前进、后退、交换位置等核心效果可用。
10. 第一个到达或超过第 72 格的角色获胜。
11. 游戏结束后显示胜利角色和排名。
12. 游戏过程中不出现回合卡死。
13. 游戏可以完整玩完一局。

---

## 16. 风险与控制

### 16.1 地图美术过早复杂化

风险：一开始就做完整精美地图，容易影响代码进度。

建议：

- 先用调试格子跑通逻辑。
- 再替换为正式美术。
- 地图底图和格子节点分离。

---

### 16.2 事件系统过度扩展

风险：事件太多导致 Bug 增多。

建议：

- 首版只做 8 到 12 种核心事件效果。
- 不同格子可以复用同一种效果，只换名字和文案。

---

### 16.3 AI 设计过早复杂

风险：策略 AI 会拖慢 Demo。

建议：

- V0.1 只做自动行动 AI。
- V0.2 再做策略判断。

---

### 16.4 角色技能破坏平衡

风险：某个角色明显过强（已识别：唐僧护盾无上限会过强，沙僧原"奖励+1"过弱）。

已采取的控制：

- 护盾上限封顶 2 层（§3.4.5 / §7）。
- 沙僧被动改为"奖励+1 / 惩罚-1"双向覆盖（§6.4）。
- 首版接受轻微不平衡，先保证角色差异与趣味。

后续数值验证：

- 写一个**纯逻辑模拟脚本**（不渲染），借助 §3.4.8 的可复现 RNG 跑 1000 局自动对局。
- 统计：平均回合数、单局时长方差、四角色胜率分布。
- 据此调整事件密度（避免火焰山/小雷音寺段负面过密拖长牌局）与技能数值。

---

## 17. 推荐下一步

建议下一步先生成以下 3 个文档：

```text
docs/CLAUDE_TASKS.md
用于指导 Claude Code 按任务开发 Godot 项目。

prompts/imagegen/ART_ASSET_PROMPTS.md
用于指导 Codex 调用 imagegen 批量生成美术素材。

AGENTS.md
用于规定 Claude Code 和 Codex 在同一项目目录中的协作边界。
```

首个实现目标建议定为：

```text
先做无美术调试版。
72 个圆形格子 + 4 个彩色棋子 + 掷骰 + 回合制 + 胜利判断。
```

只要这个版本跑通，后续西游事件、美术资产、角色技能都可以逐步替换和增强。
