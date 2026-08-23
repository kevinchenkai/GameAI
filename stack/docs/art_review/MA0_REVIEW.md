# StackPop MA0 Master Reference 审核记录

- 批次：第 0 批 Master Reference
- 生成方式：Codex 内置 Image Gen（`imagegen` skill）
- 最终图：`_master_reference.png`（1024×1024）
- 32px 缩略自检：`_master_reference_32px.png`（64×64，2×2 中每个 Tile 约 32px）
- 投放状态：仅作风格审核，未放入 `web/public/assets/`

## 最终生成 Prompt

```text
Use case: stylized-concept
Asset type: Master Reference sheet for a mobile puzzle game (not a production game asset)
Primary request: A clean 2x2 grid of exactly four separate square game tiles for a cute pet-garden puzzle game.
Scene/backdrop: plain neutral transparent or very pale backdrop around the four tiles, with generous even spacing.
Subject: Tile 1 is a soft pink cat paw print (#FF8FA3), one large central pad plus four toe pads, radial silhouette. Tile 2 is a bright green grass tuft (#5FBF6A), three to five bold upward leaves, sharp upward silhouette. Tile 3 is a sky-blue watering can (#54A8E0), chunky body, long spout, large handle, clear protruding silhouette. Tile 4 is a golden-yellow bell (#FFC93C), simple bell body, top ring, one broad highlight, trapezoid silhouette.
Style/medium: soft cute mobile game asset, rounded chunky shapes, thick clean dark-warm-brown outline, gentle 3D volume with soft shading, warm bright lighting, polished original game art.
Composition/framing: exact 2x2 grid; each icon centered and occupies about 68% of its tile. Each tile has a rounded-square warm cream background (#FFF6E3), thin brown outline (#B08355), subtle inner shadow, and soft drop shadow. All four tiles are equal size and fully visible.
Constraints: high readability at 32px, minimal internal detail, at most three recognizable components per icon, consistent outline thickness and highlight direction across the set, no text, no labels, no watermark, no extra objects, no bows, no faces, no scene background. Four tiles only, one of each subject.
```

## 单点修订 Prompt

初稿铃铛含额外铃舌，与简形化要求冲突，因此只修订该元素：

```text
Use case: precise-object-edit
Asset type: Master Reference sheet for a mobile puzzle game
Input images: Image 1 is the edit target.
Primary request: Change only the golden-yellow bell in the bottom-right tile: remove the round clapper/tongue hanging below the bell. The bell must be simplified to exactly three visible components: bell body, top ring, and one broad highlight. Keep the bell's bold trapezoid silhouette and bright golden-yellow color.
Invariants: preserve the exact 2x2 layout, tile frames, spacing, cream backgrounds, shadows, line thickness, lighting, colors, proportions, and the paw, grass, and watering-can tiles unchanged. Do not change any other element.
Constraints: high readability at 32px, no text, no labels, no watermark, no extra objects, no bow, no face, no bell clapper/tongue.
```

## 自检

- [x] 1024×1024
- [x] 四枚 Tile 等尺寸 2×2 排列
- [x] 奶油底框、棕色描边、软投影风格统一
- [x] 猫爪 / 小草 / 浇水壶 / 铃铛四类轮廓无冲突
- [x] 32px 缩略下可在 1 秒内区分
- [x] 铃铛已去掉铃舌，保留钟身 + 顶环 + 高光
- [x] 无文字、无水印、无额外物件

> 第 1 批必须等待本图风格验收通过后再生成。

---

## Claude 风格验收（2026-08-23）

**结论：通过，可进入第 1 批。** 以下为客观复核结果与第 1 批必须遵守的修正。

### 客观复核

| 项 | 结果 |
|---|---|
| 尺寸 1024×1024 | ✅ |
| 四框一致性 | ✅ 边框 bbox 互差 ≤1%（439/436 px） |
| 32px 四图案可辨 | ✅ 轮廓类别无冲突：放射 / 尖锐向上 / 突出物 / 梯形 |
| 铃舌已移除 | ✅ 钟身 + 顶环 + 高光，三组件 |
| 无文字 / 水印 / 额外物件 | ✅ |

### 实测色值（第 1 批必须对齐这些值，而非工单原始值）

| 图案 | 工单 spec | 实测 | 偏差 |
|---|---|---|---|
| paw | `#FF8FA3` | `#FD909B` | 8 ✅ |
| bell | `#FFC93C` | `#FEC826` | 22 ✅ |
| watering | `#54A8E0` | `#6CBCF3` | 37，偏亮 ⚠️ |
| grass | `#5FBF6A` | `#8CC73E` | 63，偏黄绿 ⚠️ |

> grass / watering 偏离 spec，但**不影响可辨识度**——grass 是集合中唯一的绿色，
> 其判别依据是「尖锐向上轮廓」而非色相。**以实测值为准继续**，不要回改成工单原值，
> 否则第 1 批会与 Master Reference 风格脱节。第 2 批的 fish / bone / flowerpot
> 仍须按工单 §1.4 与 bell / 各自对照组保持亮度差。

### 必须修正项：图案占比

Master Reference 的图案占框内 **~85%**，工单 §3.1 要求 **68%**。

- 实测：paw 85×82% / grass 86×86% / watering 86×75% / bell 86×86%（占框比）
- 影响：图案几乎贴住棕色描边，压掉内阴影留白；且 Tile 图案与底框是**分离资源**
  （§4.1），叠加后若图案过大会溢出 `tile_frame.webp` 的内框。
- **第 1 批要求**：256×256 画布内，图案 bbox 控制在 **约 174×174（68%）**，
  四周留白均匀，居中。Master Reference 仅作**风格**基准（描边粗细、高光方向、
  体积感、配色），**占比不作数**。

### 第 1 批交付要求（对齐工单 §4.1）

- 只含图案本身，**不含奶油底框**——底框走 `ui/tile_frame.webp`
- 256×256，透明通道，转 WebP
- 覆盖 `web/public/assets/tiles/` 同名文件，代码零改动（Manifest 已就位）
- 自检：单张 32px 缩略 + 四张并排 32px 缩略各做一次
