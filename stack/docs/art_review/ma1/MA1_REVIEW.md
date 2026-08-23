# MA1 第 1 批 Tile 图案交付记录

## 结论

第 1 批 `paw` / `grass` / `watering` / `bell` 已按 V0.3.4 后续验收意见落地：

- 256×256、透明背景、WebP；
- 仅含图案，不含奶油色 Tile 底框；
- 图案 alpha bbox 最长边统一为 174px，即画布的 67.97%（目标 68%）；
- 覆盖 `config/assets.ts` 已引用的同名文件，游戏代码及 Asset Manifest 无需修改；
- 单张 32px 与四张并排 32px 均可在 1 秒内依靠颜色和轮廓区分。

## 生成方式与提示词

模式：内置 ImageGen，使用 `docs/art_review/_master_reference.png` 作为风格参考；每个图案独立生成。

共同提示词：

> Create one production-ready casual mobile game tile icon matching the supplied StackPop Master Reference: glossy candy-like 3D rendering, rounded friendly shapes, warm dark-brown outline, restrained highlight, crisp readable silhouette. Render the icon only on a truly transparent background. Do not include the cream tile frame, backing card, border panel, cast shadow outside the icon, text, label, watermark, or any extra object. Use a square canvas and keep the subject centered. Its longest visible dimension must occupy about 68% of the canvas, leaving generous transparent padding. Preserve strong readability at 32px.

各图案主体要求：

- `paw`：soft pink cat paw (`#FF8FA3`), one large central pad and exactly four toe pads, radial silhouette.
- `grass`：bright green grass tuft (`#5FBF6A`), exactly five bold upward leaves, sharp upward silhouette.
- `watering`：sky-blue watering can (`#54A8E0`), chunky body, long left spout and large right handle, protruding horizontal silhouette; no heart or decoration.
- `bell`：golden-yellow bell (`#FFC93C`), simple bell body, top ring and one broad highlight, trapezoid silhouette; no clapper, bow, face or decoration.

ImageGen 两次输出均把棋盘格烘焙进 RGB 图像而没有提供 alpha。为保持已确认的图案造型，未重新设计图形，只对中性高亮棋盘底做机械遮罩提取，再统一裁切、缩放和居中。该处理不进入游戏运行时代码。

## 交付与尺寸实测

| 资源 | alpha bbox | 最长边占比 | 文件大小 |
|---|---:|---:|---:|
| `paw.webp` | 174×167 | 67.97% | 12,848 B |
| `grass.webp` | 174×166 | 67.97% | 9,572 B |
| `watering.webp` | 174×119 | 67.97% | 9,208 B |
| `bell.webp` | 150×174 | 67.97% | 7,922 B |

四张正式资源位于 `web/public/assets/tiles/`。

## 32px 眯眼测试

- 单张：`paw_32px.png` / `grass_32px.png` / `watering_32px.png` / `bell_32px.png`
- 四张并排：`ma1_tiles_32px.png`
- 结果：通过。放射状、尖锐向上、左右突出、梯形四种轮廓在 32px 下保持分离；粉、绿、蓝、亮黄颜色通道亦无混淆。

> 第 2 批须等待本批经外部验收后再启动。

---

## Claude 验收（2026-08-23）

**结论：通过，可启动第 2 批。** 独立复核，非采信报告。

### 核心修正项已落实

MA0 提出的「图案占框 68%」硬修正**已达成**：

| 资源 | alpha bbox | 最长边占比 | 居中偏移 |
|---|---|---:|---:|
| paw | 174×167 | 67.97% | (+0.0, −0.5) |
| grass | 174×166 | 67.97% | (0, 0) |
| watering | 174×119 | 67.97% | (+0.0, −0.5) |
| bell | 150×174 | 67.97% | (0, 0) |

叠加真实 `ui/tile_frame.webp` 实测：图案四周留白均匀，**不再贴住棕色描边**，
内阴影留白得以保留。MA0 的 ~85% 问题已解决。

### 棋盘格遮罩提取的质量复核（重点）

Codex 报告提到 ImageGen 把棋盘格烘焙进 RGB、由机械遮罩提取 alpha。
这是**高风险操作**，故逐项实测：

| 检查 | 结果 |
|---|---|
| 残留中性灰像素（棋盘格残渣） | **4 张合计 1 px** ✅ |
| bbox 外杂散像素岛 | 无 ✅ |
| 半透明边缘占比 | 2.7%~5.5%，属正常抗锯齿 ✅ |
| 边缘色相 | 均值 ≈(150,118,87) 暖棕，即设计描边色，**非灰边** ✅ |
| 灰边像素(sat<15) | ≤0.8% ✅ |

结论：提取干净，无 fringing，可放行。

### 真实尺寸可辨性

除 Codex 的 32px 缩略外，另按**真机实际渲染条件**复核：
375px 屏 6 列 → tileSize 52px，叠加底框后置于天蓝背景。
四种轮廓（放射 / 尖锐向上 / 左右突出 / 梯形）+ 四色通道在 52px 与 32px 下均清晰分离。

### 其它复核

- lint / 76 项测试 / 生产构建：**均自行重跑通过**
- 提交 `912721c` 干净：无 `output/`、`dist/`、临时文件
- **批次纪律成立**：仅 4 张为正式图（7.9~12.8 KB），
  bone / fish / flowerpot / yarn 仍为占位（466~1034 B），未越批
- 体积预算：单张最大 12.8 KB（限 30 KB），资源合计 57.9 KB（限 2 MB），余量充足
- HTTP 服务：4 张均 200 + `image/webp`，served bytes 与磁盘 md5 一致

> 注：浏览器面板因自身 WebGL 故障（`Framebuffer status: Incomplete Attachment`）
> 无法启动 Phaser 场景，**与本批资源无关**；已用离线合成 + HTTP 校验替代验证。

### 第 2 批约束（fish / yarn / bone / flowerpot + 2 背景）

沿用第 1 批全部规格（256×256、透明、仅图案、最长边 174px、居中）。
**额外亮度约束**——第 1 批实测平均亮度：

| 已定 | mean L |
|---|---:|
| bell | **178.0** |
| grass | 142.1 |
| watering | 140.5 |
| paw | 136.8 |

工单 §1.4 要求的对照组据此收紧：

- `bone`（米白 `#EFE6D2`）须**明显亮于** `fish`（橙 `#FF9A5C`）
- `flowerpot`（陶土棕 `#C97B4A`）须**明显暗于** `bell`（L=178）——
  建议 flowerpot 目标 **L ≤ 140**，与 bell 拉开 ≥38
- `yarn`（紫 `#B98BE0`）正圆轮廓，勿与 paw 放射状混淆

背景 `game_bg` / `home_bg`（1125×2436）须**极淡**，不与 Tile 抢注意力；
单张 < 200 KB。
