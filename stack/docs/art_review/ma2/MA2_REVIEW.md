# MA2 第 2 批 Tile 与背景交付记录

## 结论

第 2 批 `fish` / `yarn` / `bone` / `flowerpot` 与 `game_bg` / `home_bg` 已按 MA1 验收约束落地：

- Tile：256×256 透明 WebP，仅含图案，alpha bbox 最长边 174px（67.97%）；
- 背景：1125×2436 WebP，中央低对比留空，单张远低于 200KB；
- 同名覆盖 Asset Manifest 已引用的占位文件，游戏代码与 Manifest 均未修改；
- 彩色、灰度、冲突对三组 32px 眯眼测试均通过。

## 生成方式与提示词

模式：内置 ImageGen。`docs/art_review/_master_reference.png` 仅作为风格与色板参考，每项独立生成。

Tile 共同提示词：

> Production mobile puzzle-game tile icon matching the approved StackPop Master Reference: soft cute glossy candy-like 3D game asset, rounded chunky shapes, warm dark-brown outline at least 4% of icon width, one restrained broad highlight, gentle soft shading, warm bright lighting, minimal internal detail, crisp silhouette. One icon centered on a square canvas; longest visible subject dimension about 68% with generous even padding. Use a genuinely transparent background. Icon only; no cream tile frame, backing card, panel, cast shadow outside the icon, text, label, watermark, or extra objects. Preserve high readability at 32px; actual alpha transparency, not a checkerboard pattern.

各 Tile 主体要求：

- `fish`：橙色 `#FF9A5C` 侧视梭形鱼身、扇形尾鳍、一个圆眼；水平延展，须明显暗于 bone。
- `yarn`：紫色 `#B98BE0` 正圆毛线球，仅 2~3 条粗缠绕线与紧贴球体的短线头；不得形成 paw 式放射轮廓。
- `bone`：接近白的米色 `#EFE6D2` 经典工字形骨头，深暖棕描边；须明显亮于 fish。
- `flowerpot`：暗陶土棕 `#C97B4A` 倒梯形盆身、一道上沿、一朵小五瓣花；目标 mean L ≤ 140，须明显暗于 bell。

背景共同提示词：

> Extra-tall 1125:2436 portrait production background for a casual mobile puzzle game, using the approved Master Reference only as a palette and softness reference. Extremely pale soft pet-garden illustration, gentle airy sky gradient from #8FD0FF toward #E8F5FF, washed-out rounded shapes, central 70% visually quiet and open for UI and cards. No text, logo, UI, cards, tile icons, border, dark areas, saturated accents, or high-frequency texture.

- `game_bg`：极淡天空、边缘少量半透明云、下部约 4~6% 强度的坐姿猫线稿水印。
- `home_bg`：同色天空，装饰仅在底部约 22% 内；极淡草地、少量花朵与一只浅色坐姿猫。

内置 ImageGen 再次把透明棋盘格烘焙进 RGB。处理仅将与画布边缘连通的中性棋盘底提取为透明，保留被主体轮廓包围的白色高光和鱼眼；随后机械裁切、缩放、居中并转 WebP，不进入游戏运行时代码。

## 技术实测

mean L 使用 Rec.709 亮度，对 alpha ≥ 250 的前景像素计算，与 MA1 验收口径一致。

| 资源 | alpha bbox | 最长边占比 | mean L | 文件大小 |
|---|---:|---:|---:|---:|
| `fish.webp` | 174×90 | 67.97% | 135.2 | 5,960 B |
| `yarn.webp` | 170×174 | 67.97% | 127.8 | 8,444 B |
| `bone.webp` | 174×94 | 67.97% | 201.8 | 5,098 B |
| `flowerpot.webp` | 165×174 | 67.97% | 102.3 | 6,358 B |

- bone − fish = **66.6**，米白/橙色冲突对通过；
- bell − flowerpot = **75.7**，且 flowerpot L=102.3 ≤ 140，亮黄/暗陶土冲突对通过；
- yarn 保持近正圆主体，与 paw 的五瓣放射轮廓分离。

| 背景 | 尺寸 | 全图平均亮度 | 文件大小 |
|---|---:|---:|---:|
| `game_bg.webp` | 1125×2436 | 231.9 | 10,906 B |
| `home_bg.webp` | 1125×2436 | 242.2 | 11,630 B |

## 32px 与背景自检产物

- 八图真实底框彩色：`ma2_all_tiles_32px.png`
- 八图真实底框灰度：`ma2_all_tiles_32px_gray.png`
- 冲突对（bell / flowerpot / fish / bone）：`ma2_conflict_pairs_32px.png`
- 四张新增 Tile 单图：`fish_32px.png` / `yarn_32px.png` / `bone_32px.png` / `flowerpot_32px.png`
- 两张背景缩略预览：`ma2_backgrounds_preview.jpg`

结果：彩色、灰度和冲突对均可依靠轮廓与亮度在 1 秒内区分；背景不与 Tile 争抢注意力。

> 第 3 批须等待本批外部验收后再启动。

---

## Claude 验收（2026-08-23）

**结论：通过。8 张 Tile 全部就位，可进入第 3 批（UI + FX）。** 独立复核，非采信报告。

### 我在 MA1 设的三条亮度约束——逐条实测

| 约束 | 实测 | 判定 |
|---|---|---|
| `bone` 明显亮于 `fish` | 200.3 vs 134.4，**Δ65.9** | ✅ |
| `flowerpot` L ≤ 140 | **101.8** | ✅ |
| `flowerpot` 与 `bell` 拉开 ≥38 | 178.0 − 101.8 = **76.2** | ✅ |

（与 Codex 报告的 135.2/201.8/102.3 差约 1，为 alpha 取样阈值差异，非分歧。）

### 几何：8 张全部一致

全部 **256×256、67.97% 占框、居中偏移 ≤0.5px**。第 2 批与第 1 批规格完全对齐。

### 抠图质量（第 2 批比第 1 批更干净）

| 资源 | 半透明占比 | 灰残渣 | 连通块 | 边缘均色 | 灰边 |
|---|---:|---:|---:|---|---:|
| fish | 1.61% | **0 px** | 1 | (121,85,48) 暖棕 | 0.0% |
| yarn | 2.06% | **0 px** | 1 | (157,114,79) 暖棕 | 0.0% |
| bone | 1.99% | **0 px** | 1 | (119,86,48) 暖棕 | 0.0% |
| flowerpot | 2.48% | **0 px** | 1 | (113,74,49) 暖棕 | 0.0% |

「单一连通前景」属实，无杂散像素岛。

### 低亮度差对——靠色相/宽高比分离（关键复核）

亮度不是唯一判据。8 张两两最小亮度差出现在下列组合，逐对核对分离手段：

| 对 | ΔL | Δhue | 宽高比 | 判定 |
|---|---:|---:|---|---|
| grass / watering | 1.6 | 102.9° | 1.05 / 1.46 | ✅ |
| **paw / fish** | **2.4** | **27.9°** | **1.04 / 1.93** | ✅ 靠轮廓 |
| paw / watering | 3.7 | 153.8° | 1.04 / 1.46 | ✅ |
| paw / grass | 5.3 | 103.3° | 1.04 / 1.05 | ✅ 靠色相 |

最紧的是 `paw` / `fish`（粉 vs 橙，色相仅差 27.9°），
但宽高比 1.04 vs 1.93 使其在 32px 下不可能混淆。**工单 §1.4 的轮廓分类体系成立。**

### 可辨性

- **真机条件复核**：375px 屏 6 列 → tileSize 52px，叠底框 + 天蓝背景，8 张全部秒辨
- **灰度 32px**：完全去色后仅凭剪影仍可区分 8 张 ✅
  → 色盲玩家可正常游玩，这是意外收获，建议保持

### 背景

| | 尺寸 | 体积 | 棋盘区亮度 std | 局部梯度均值 |
|---|---|---:|---:|---:|
| game_bg | 1125×2436 | 10.6 KB | 6.3 | 0.06 |
| home_bg | 1125×2436 | 11.4 KB | 3.7 | 0.05 |

棋盘区近乎平坦，**不与 Tile 抢注意力**，符合「必须极淡」。
猫咪水印位置偏下、避开棋盘区，处理得当。

### 其它

- lint / 76 项测试 / 生产构建：**均自行重跑通过**
- **未修改任何代码**（`git status` 无 `.ts` / `.html` 改动）✅
- 体积：合计 **93.9 KB**（限 2 MB）；最大 tile 12.8 KB（限 30 KB）；最大 bg 11.4 KB（限 200 KB）
- dist 产物中 4 张新图 md5 与源文件一致 ✅

### 第 3 批（UI + FX，12 张）注意

现有占位 UI 尺寸已冻结，正式图**同名同尺寸覆盖**即可，代码零改动：

- `tile_frame.webp` 256×256 —— 内框留白须容纳 174px 图案，**不要收窄内沿**
- `tray_slot` / `tray_slot_warn` 200×200 —— 预警态靠**暖光边框**区分，二者轮廓须一致
- `btn_shuffle` / `btn_undo` / `btn_hint` 320×320、`btn_settings` 200×200
  —— **按钮内不要画文字**（「打乱」「撤回」由代码渲染）
- `panel_win` / `panel_fail` 800×900 —— 顶部留星星位
- FX `sparkle_01` / `sparkle_02` 128×128、`star` 256×256
- 背景已达 11 KB，UI 正式图后总量仍应远低于 2 MB；如某张 panel 超 30 KB 属正常（限值针对 tile）
