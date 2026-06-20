# 第二阶段优化方案：棋子尺寸 + 选择/结算背景

> 关联：S1 [`UPGRADE_S1_BOARD_FUSION.md`](./UPGRADE_S1_BOARD_FUSION.md)、美术清单 [`../prompts/imagegen/S2_SCREENS_BRIEF.md`](../prompts/imagegen/S2_SCREENS_BRIEF.md)。

## 改进点

### (a) 角色棋子调大 — ✅ 已完成（编码侧，无需美术）

- 现状：S1 为适配 ~70px 路面石板把棋子缩得偏小。
- 改动：`CharacterPiece.gd` 解耦立绘尺寸与状态半径——新增 `SPRITE_SIZE = 84`（原 ~48px），四角偏移微调到 ±16/±14，使单子明显变大、同格多子仍可辨（轻微重叠可接受）。
- 验证：截图确认单子在路面石板上比例合适、像「站在路上的角色」；2 子同格并排清晰。

### (b) 角色选择 + 结算 两张背景 — ✅ 已完成

- 需求与**预留空间坐标**见 [`S2_SCREENS_BRIEF.md`](../prompts/imagegen/S2_SCREENS_BRIEF.md)。
- Codex 交付：`assets/backgrounds/select_bg.png`、`result_bg.png`（均 1920×1080），并附 `assets/raw/imagegen/S2_SCREENS/*_debug_rects.png` 确认预留区与 brief 一致。
- 编码接入：
  - `CharacterSelect.tscn/.gd`：铺背景；4 卡片按中心 x=480/800/1120/1440、y≈570 绝对定位到背景光台；标题 (360,60)。
  - `ResultScene.tscn/.gd`：铺背景；胜者横幅 (360,90)、立绘 (810,200,300,300)、排名 (730,520,460,280)、按钮 (860,830,200,60)。
  - `RankingPanel.gd`：浅金底改深棕/深橙金文字 + 居中，保证可读。
- 实机验证（截图）：选择界面 4 卡片精准落在光台、结算界面胜者立绘/排名/按钮各就各位，文字清晰。
