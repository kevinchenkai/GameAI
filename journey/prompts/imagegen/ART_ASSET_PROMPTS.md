# 《Journey Ludo》美术资产生成手册（Codex + imagegen）

> 配套文档：[`../../docs/JOURNEY_LUDO_V0_1_PLAN.md`](../../docs/JOURNEY_LUDO_V0_1_PLAN.md)（主方案，美术清单见 §12.2，提示词模板见 §12.3）
> 适用对象：**Codex + imagegen**（美术线，详见主方案 §13.1 分工边界）
> 目标：按批次生成统一风格的 Q 版 2D 西游素材，落位到 `assets/` 供 Claude Code 接入。

---

## 0. 总则与边界

1. **职责边界**：Codex 只生成 / 维护**美术素材与提示词**。**不写、不改任何 `.gd` / `.tscn` / `.json` 代码与数据文件**（见主方案 §13.1）。
2. **拥有目录**：`prompts/imagegen/`、`assets/raw/`、`assets/sprites/`、`assets/backgrounds/`、`docs/ART_ASSET_LIST.md`。
3. **命名契约**：文件名 / 路径由 Claude Code 在 `data/*.json` 中先行约定，Codex **按约定路径产出同名 PNG**（见 §3 命名映射）。如需新增 / 改名，先在主方案文档登记再执行。
4. **接入分工**：把 PNG **放进目录**属 Codex；在场景 / 数据中**引用并调整显示**属 Claude Code。
5. **占位并行**：Claude Code 用占位图先跑通逻辑（M1–M4），本手册素材在 **M5** 替换占位，二者并行互不等待。

---

## 1. 统一风格基线（所有提示词必须携带）

```text
Q 版 2D，东方神话，西游主题，圆润可爱，明亮清爽，轻量卡通渲染，
柔和阴影，干净线条，适合休闲棋盘游戏。
```

**统一禁止项（所有素材通用负向约束）**

```text
不要写实恐怖风、不要复杂厚涂、不要 3D 渲染感过强、
不要图片内文字、不要复杂背景（除地图底图外）、不要真实人物照片风。
```

**通用技术要求**
- 角色 / 图标 / 格子 / UI 元素：**透明背景 PNG**。
- 图标：**轮廓清晰，缩小后仍可识别**。
- 地图底图：可为 16:9 横版、带背景。
- 棋盘格子与角色**分层制作**，方便 Godot 调整层级。

---

## 2. 生成批次（建议顺序）

| 批次 | 内容 | 数量 | 优先级 |
|---|---|---:|---|
| B1 | 4 角色棋子 + 4 头像 | 8 | 高（角色选择 + 棋子最先用到） |
| B2 | 地图底图 + 8 区域装饰 | 9 | 高 |
| B3 | 6 类格子图标 | 6 | 中 |
| B4 | 事件图标 | 12 | 中 |
| B5 | UI 面板 + 骰子 6 面 | 13 | 中低 |

> 每批生成后更新 `docs/ART_ASSET_LIST.md` 状态（待生成 / 已生成 / 已接入），并通知 Claude Code 可接入。

---

## 3. 命名映射（素材路径契约）

> 与 `data/characters.json` / `board_72.json` 中的 `sprite` 字段一致。Codex 按此路径产出。

### 角色（`assets/sprites/characters/`）

| 角色 | 棋子文件 | 头像文件 |
|---|---|---|
| 孙悟空 | `sun_wukong.png` | `sun_wukong_avatar.png` |
| 猪八戒 | `zhu_bajie.png` | `zhu_bajie_avatar.png` |
| 唐僧 | `tang_seng.png` | `tang_seng_avatar.png` |
| 沙僧 | `sha_seng.png` | `sha_seng_avatar.png` |

### 地图（`assets/backgrounds/` 与 `assets/sprites/tiles/`）

| 素材 | 路径 |
|---|---|
| 地图底图 | `assets/backgrounds/board_map.png` |
| 区域装饰（8） | `assets/backgrounds/region_{region_id}.png` |
| 格子图标（6 类） | `assets/sprites/tiles/tile_{type}.png` |

`region_id`：`flower_fruit_mountain` / `gao_village` / `quicksand_river` / `white_bone_ridge` / `women_country` / `flaming_mountain` / `lesser_thunderclap` / `western_paradise`
`tile type`：`normal` / `reward` / `punish` / `warp` / `post_station` / `finish`

### 事件图标（`assets/sprites/effects/`）
文件名 = `event_{event_id}.png`，`event_id` 取自主方案 §5.1 总表（如 `event_peach_forward_2.png`）。

### UI（`assets/sprites/ui/`）
`dice_1.png` … `dice_6.png`、`panel_turn.png`、`panel_event.png`、`panel_ranking.png`、`panel_result.png`、`btn_start.png`、`card_character.png`

---

## 4. 提示词模板

> 用具体参数替换 `{...}`。所有模板已隐含 §1 风格基线与禁止项——若工具不自动继承，请把 §1 内容拼接进每条提示词。

### 4.1 角色棋子

```text
Q版2D游戏角色棋子，西游记主题，{角色名称}，可爱圆润比例，2.5头身，
明亮清爽色彩，东方神话卡通风格，适合休闲飞行棋游戏，正面站姿，表情友好，
轮廓清晰，干净线条，柔和阴影，透明背景，不包含文字，不包含复杂背景。

角色特征：{角色关键特征}

输出要求：单个完整角色，全身，透明背景 PNG，512x512，适合导入 Godot 作为棋子素材。
```

**四角色特征填充**

| 角色 | {角色关键特征} |
|---|---|
| 孙悟空 | 金色虎皮裙、金箍棒、头戴紧箍、猴脸灵动、机灵神气 |
| 猪八戒 | 圆滚体型、九齿钉耙、大耳朵、憨厚笑脸、墨绿僧袍 |
| 唐僧 | 白净文气、锦襕袈裟、合十手势、慈祥宁静、头戴毗卢帽 |
| 沙僧 | 健壮稳重、降妖宝杖、络腮短须、棕色僧袍、朴实可靠 |

### 4.2 角色头像

```text
Q版2D游戏角色头像，西游记主题，{角色名称}，圆形构图，半身或大头，
表情友好，明亮色彩，东方神话卡通风格，轮廓清晰，透明背景，不包含文字。
角色特征：{角色关键特征}
输出要求：256x256，透明背景 PNG，适合角色选择卡片与回合面板。
```

### 4.3 地图底图

```text
Q版2D西游记主题飞行棋地图，横版16:9，明亮清爽，童话感东方神话世界，
从花果山出发，依次经过高老庄、流沙河、白骨岭、女儿国、火焰山、小雷音寺，
最终到达西天灵山。地图是一条蜿蜒的取经路线，适合放置72个棋盘格，
整体可爱、圆润、色彩丰富，休闲桌游风格，
不包含文字，不包含真实人物，不要写实恐怖。

输出要求：1920x1080 或 2048x1152，路线留白清晰以便叠加格子节点。
```

### 4.4 区域装饰

```text
Q版2D西游记区域装饰元素，{区域名称}主题，{区域特征}，圆润可爱，
明亮卡通风格，可作为地图局部点缀，透明背景，不包含文字。
输出要求：透明背景 PNG，分层可叠加到地图底图对应区域。
```

| 区域 | {区域特征} |
|---|---|
| 花果山 | 桃树、瀑布水帘、群猴、青山绿石 |
| 高老庄 | 农庄屋舍、喜宴红绸、稻田 |
| 流沙河 | 滚滚黄沙水流、木筏、芦苇 |
| 白骨岭 | 嶙峋怪石、淡淡雾气、枯树（保持可爱不恐怖） |
| 女儿国 | 花桥流水、粉色花卉、楼阁 |
| 火焰山 | 红色山峦、火苗、芭蕉扇元素 |
| 小雷音寺 | 金色佛塔、幻彩雾气、布袋元素 |
| 西天灵山 | 祥云、莲台、金光佛塔 |

### 4.5 格子图标

```text
Q版2D飞行棋格子图标，西游记主题，{格子类型}，圆形棋盘格，轮廓清晰，
颜色明亮，适合缩小显示，透明背景，干净卡通风格，不包含文字。
输出要求：256x256，透明背景 PNG。
```

| {格子类型} | 视觉提示 | 文件 |
|---|---|---|
| 普通格 | 素雅圆盘，浅色 | `tile_normal.png` |
| 奖励格 | 绿色 / 金色光晕，向上箭头感 | `tile_reward.png` |
| 惩罚格 | 红色 / 警示感，向下箭头感 | `tile_punish.png` |
| 传送格 | 紫色漩涡 / 水帘洞口 | `tile_warp.png` |
| 驿站格 | 蓝色旗幡 / 凉亭 | `tile_post_station.png` |
| 终点格 | 金光莲台 / 佛塔 | `tile_finish.png` |

### 4.6 事件图标

```text
Q版2D游戏事件图标，西游记主题，{事件名称}，圆润可爱，明亮清晰，
适合飞行棋事件弹窗和棋盘格显示，透明背景，图标化设计，不包含文字。
输出要求：256x256，透明背景 PNG。
```

**事件图标清单**（对应主方案 §5.1，按效果归类，可复用同图标给同类事件）

| 图标 | {事件名称} 提示 | 适用 event_id 示例 |
|---|---|---|
| 仙桃 | 鲜嫩仙桃，前进感 | `peach_forward_2` `bajie_forward_2` `raft_forward_3` `bridge_forward_3` `fan_forward_5` `cloud_forward_3` |
| 筋斗云 | 金色祥云加速 | 孙悟空被动特效 |
| 猴群助威 | 群猴欢呼，骰子再掷 | `monkey_reroll` `scripture_reroll` |
| 妖怪埋伏 | 后退 / 受阻 | `monkey_back_1` `steal_back_2` `flame_back_3` `last_trial_back_2` |
| 护盾佛光 | 金色护盾光圈 | `feast_shield` `host_stay_shield` `queen_stay_shield` `buddha_light_shield` `lotus_shield` `iron_fan_counter` |
| 流沙陷落 | 停留 / 困住 | `quicksand_stay` `cymbal_stay` `niu_block` |
| 白骨幻象 | 交换 / 换位漩涡 | `bone_swap_random` `charm_swap_front` |
| 重排序布袋 | 黄眉怪布袋，乱序 | `reorder_all` |
| 芭蕉扇 | 大幅前进风力 | `fan_forward_5` |
| 火焰山火焰 | 红色火焰，负面区域 | `flame_lost_warp_46` |
| 小雷音寺幻境 | 幻彩雾气，随机事件 | `fake_buddha_random` |
| 清净光 | 清除负面 / 净化 | `fiery_eyes_clear` `child_river_clear` `maitreya_clear_forward` |
| 骰子下降 | 骰子 -1 灰雾 | `flood_dice_minus` `demon_dice_minus` |
| 赌斗 | 掷骰判定 | `bone_gamble` |
| 莲花台 | 终点奖励莲台 | 终局奖励 |
| 经书 | 金色经卷，胜利目标 | `game_finish` |

### 4.7 UI 素材

```text
Q版2D休闲桌游 UI 元素，西游记主题，{UI 名称}，圆润边框，明亮配色，
东方纹样点缀，干净卡通风格，透明背景（按钮/面板带描边），不包含文字占位。
输出要求：透明背景 PNG。
```

| {UI 名称} | 说明 | 文件 |
|---|---|---|
| 骰子 1–6 面 | 六张，圆角骰子，点数清晰 | `dice_1.png` … `dice_6.png` |
| 当前角色面板 | 显示当前回合的框 | `panel_turn.png` |
| 事件弹窗框 | 显示事件结果的对话框 | `panel_event.png` |
| 排名面板 | 游戏中排名底板 | `panel_ranking.png` |
| 胜利结算面板 | 终局展示底板 | `panel_result.png` |
| 开始按钮 | 主菜单按钮 | `btn_start.png` |
| 角色选择卡片 | 角色选择界面卡片框 | `card_character.png` |

---

## 5. 质检清单（每张交付前自查）

- [ ] 透明背景（地图底图除外）
- [ ] 无图片内文字
- [ ] 风格统一（Q 版圆润、明亮、非写实非恐怖）
- [ ] 尺寸符合 §3 / 模板要求
- [ ] 文件名与命名契约一致，落位到正确目录
- [ ] 图标缩小到棋盘格尺寸仍可辨识
- [ ] 已更新 `docs/ART_ASSET_LIST.md` 状态
