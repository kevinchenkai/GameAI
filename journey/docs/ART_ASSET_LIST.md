# 《Journey Ludo》美术资产清单与状态

> 拥有方：**Codex + imagegen**。生成规则见 [`../prompts/imagegen/ART_ASSET_PROMPTS.md`](../prompts/imagegen/ART_ASSET_PROMPTS.md)。
> 状态：`待生成` → `已接入`（PNG 已落位）→ `已接入`（Claude Code 已在场景/数据引用）。

## B1 角色（`assets/sprites/characters/`）

| 素材 | 文件 | 规格 | 状态 |
|---|---|---|---|
| 孙悟空棋子 | `sun_wukong.png` | 512x512 透明 | 已接入 |
| 猪八戒棋子 | `zhu_bajie.png` | 512x512 透明 | 已接入 |
| 唐僧棋子 | `tang_seng.png` | 512x512 透明 | 已接入 |
| 沙僧棋子 | `sha_seng.png` | 512x512 透明 | 已接入 |
| 孙悟空头像 | `sun_wukong_avatar.png` | 256x256 透明 | 已接入 |
| 猪八戒头像 | `zhu_bajie_avatar.png` | 256x256 透明 | 已接入 |
| 唐僧头像 | `tang_seng_avatar.png` | 256x256 透明 | 已接入 |
| 沙僧头像 | `sha_seng_avatar.png` | 256x256 透明 | 已接入 |

## B2 地图（`assets/backgrounds/`）

| 素材 | 文件 | 规格 | 状态 |
|---|---|---|---|
| 地图底图 | `board_map.png` | 1920x1080+ | 已接入 |
| 花果山装饰 | `region_flower_fruit_mountain.png` | 透明分层 | 已接入 |
| 高老庄装饰 | `region_gao_village.png` | 透明分层 | 已接入 |
| 流沙河装饰 | `region_quicksand_river.png` | 透明分层 | 已接入 |
| 白骨岭装饰 | `region_white_bone_ridge.png` | 透明分层 | 已接入 |
| 女儿国装饰 | `region_women_country.png` | 透明分层 | 已接入 |
| 火焰山装饰 | `region_flaming_mountain.png` | 透明分层 | 已接入 |
| 小雷音寺装饰 | `region_lesser_thunderclap.png` | 透明分层 | 已接入 |
| 西天灵山装饰 | `region_western_paradise.png` | 透明分层 | 已接入 |

## S1 棋盘背景融合（`assets/backgrounds/` + `data/`）

| 素材 | 文件 | 规格 | 状态 |
|---|---|---|---|
| 取经路背景 v2 | `board_map.png` | 1920x1080，内嵌 72 个统一格位 | 已生成 |
| 旧背景备份 | `board_map_v0.png` | 1920x1080 | 已生成 |
| 72 格点位表 | `board_path.json` | 72 个归一化中心坐标 | 已生成 |

## S2 场景背景（`assets/backgrounds/`）

| 素材 | 文件 | 规格 | 状态 |
|---|---|---|---|
| 角色选择背景 | `select_bg.png` | 1920x1080，UI 预留区对齐 S2 坐标 | 已接入 |
| 结算背景 | `result_bg.png` | 1920x1080，UI 预留区对齐 S2 坐标 | 已接入 |

## B3 格子图标（`assets/sprites/tiles/`）

| 素材 | 文件 | 规格 | 状态 |
|---|---|---|---|
| 普通格 | `tile_normal.png` | 256x256 透明 | 已接入 |
| 奖励格 | `tile_reward.png` | 256x256 透明 | 已接入 |
| 惩罚格 | `tile_punish.png` | 256x256 透明 | 已接入 |
| 传送格 | `tile_warp.png` | 256x256 透明 | 已接入 |
| 驿站格 | `tile_post_station.png` | 256x256 透明 | 已接入 |
| 终点格 | `tile_finish.png` | 256x256 透明 | 已接入 |

## B4 事件图标（`assets/sprites/effects/`）

> 文件名 `event_{event_id}.png`，event_id 见主方案 §5.1。同类效果可复用同图标。状态统一登记如下（按图标归类）。

| 图标 | 状态 |
|---|---|
| 仙桃 / 前进 | 已接入 |
| 筋斗云 | 已接入 |
| 猴群助威 / 再掷 | 已接入 |
| 妖怪埋伏 / 后退 | 已接入 |
| 护盾佛光 | 已接入 |
| 流沙陷落 / 停留 | 已接入 |
| 白骨幻象 / 交换 | 已接入 |
| 重排序布袋 | 已接入 |
| 芭蕉扇 | 已接入 |
| 火焰山火焰 | 已接入 |
| 小雷音寺幻境 / 随机 | 已接入 |
| 清净光 / 清除负面 | 已接入 |
| 骰子下降 | 已接入 |
| 赌斗判定 | 已接入 |
| 莲花台 | 已接入 |
| 经书 | 已接入 |

## B5 UI（`assets/sprites/ui/`）

| 素材 | 文件 | 状态 |
|---|---|---|
| 骰子 1–6 面 | `dice_1.png` … `dice_6.png` | 已接入 |
| 当前角色面板 | `panel_turn.png` | 已接入 |
| 事件弹窗框 | `panel_event.png` | 已接入 |
| 排名面板 | `panel_ranking.png` | 已接入 |
| 胜利结算面板 | `panel_result.png` | 已接入 |
| 开始按钮 | `btn_start.png` | 已接入 |
| 角色选择卡片 | `card_character.png` | 已接入 |
