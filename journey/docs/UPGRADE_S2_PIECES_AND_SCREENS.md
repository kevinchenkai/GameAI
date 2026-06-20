# 第二阶段优化方案：棋子尺寸 + 选择/结算背景

> 关联：S1 [`UPGRADE_S1_BOARD_FUSION.md`](./UPGRADE_S1_BOARD_FUSION.md)、美术清单 [`../prompts/imagegen/S2_SCREENS_BRIEF.md`](../prompts/imagegen/S2_SCREENS_BRIEF.md)。

## 改进点

### (a) 角色棋子调大 — ✅ 已完成（编码侧，无需美术）

- 现状：S1 为适配 ~70px 路面石板把棋子缩得偏小。
- 改动：`CharacterPiece.gd` 解耦立绘尺寸与状态半径——新增 `SPRITE_SIZE = 84`（原 ~48px），四角偏移微调到 ±16/±14，使单子明显变大、同格多子仍可辨（轻微重叠可接受）。
- 验证：截图确认单子在路面石板上比例合适、像「站在路上的角色」；2 子同格并排清晰。

### (b) 角色选择 + 结算 两张背景 — ⏳ 待 Codex 交付

- 需求与**预留空间坐标**见 [`S2_SCREENS_BRIEF.md`](../prompts/imagegen/S2_SCREENS_BRIEF.md)。
- 交付物：`assets/backgrounds/select_bg.png`、`assets/backgrounds/result_bg.png`（均 1920×1080）。
- **协同关键**：两张图都按 1920×1080 给了精确的 UI 预留矩形（标题/卡片/排名/按钮），编码侧 UI 控件锚点与之对齐。
- 执行顺序：**图到位后**再做编码接入（背景铺图 + 控件按 1920×1080 重排）。

## 待编码接入（图到位后）

- `CharacterSelect.tscn` / `ResultScene.tscn`：从 1280×720 旧布局升级到 **1920×1080**，背景铺满，控件锚点对齐 brief 预留区。
- 实机验证文字/卡片在背景上清晰可读。
