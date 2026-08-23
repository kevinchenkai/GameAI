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
