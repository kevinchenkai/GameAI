# Codex 出图工单 · 第 4 批 —— Stage 0 收尾（**4 张**）

> **这份文件是给 Codex 直接执行的。**
> 通用约束见 [LEGIBILITY-SPEC.md](./LEGIBILITY-SPEC.md)，
> 🔴 **本批必读 [§5.1 半透明覆盖物会压缩灰度差](./LEGIBILITY-SPEC.md)**。

- **建立**：2026-08-08
- **要出的图**：3 叠加层 + 1 冰块（ice-2）= **4 张**
- **前置**：`obstacle-ice-1.png` 已交付并验收通过，**本批以它为基准**

---

## 0. 先看这三条

### 0.1 ✅ ice-1 的做法是对的，照它做

上一轮 `obstacle-ice-1.png` 验收通过。我实测复核了你报的数字，全部属实：

| | 你报的 | 我测的 |
| --- | --- | --- |
| 中间透明度像素 | 30,727 | **30,727** ✅ |
| Alpha 范围 | 0–128 | **0–128** ✅ |
| 255 不透明像素 | 0 | **0** ✅ |
| 有效覆盖区不透明度 | — | **48.0%**（工单要求 40–50%）✅ |

**原生 Alpha 路径 + 只做缩放与 Alpha 缩放的后处理 —— 这套流程本批继续用。**

### 0.2 🔴🔴 本批最重要的一条：**不要提高不透明度**

我把 ice-1 叠在六色棋子上做了量化测试，发现一个**结构性**问题：

| | 六色最小相邻灰度差 |
| --- | --- |
| 裸棋子 | **22.7** ✅ |
| 盖 ice-1 后 | **12.3** ⚠️（低于 20 底线）|

各色被抬升的幅度**极不均匀**：红 **+53.0**、黄 **−2.2**。六色向冰的颜色收敛了。

**这不是 ice-1 画得不好，是 alpha 混合的数学性质**：

```
输出 = 棋子 × (1 − a) + 覆盖物 × a
a 越大 → 六色越向覆盖物的颜色收敛
```

实测调淡也救不回来：

| 有效不透明度 | 36% | 25% | 22% | **18%** |
| --- | --- | --- | --- | --- |
| 最小灰度差 | 12.3 | 17.3 | 19.0 | **20.4** ✅ |

要淡到 18% 才达标，那已经不像冰了。**所以我接受了 ice-1** —— 因为三层编码里另外两层完好：

| 层 | 状态 |
| --- | --- |
| 灰度 | ⚠️ 压到 12.3（唯一受损） |
| **色相** | ✅ 最小相邻差 **29.7°** |
| **剪影** | ✅ 覆盖物是方的，棋子轮廓在方框外露出 |

> 🔴 **由此得出本批的三条硬性约束：**
>
> | # | 约束 | 原因 |
> | --- | --- | --- |
> | 1 | **不透明度不得高于 ice-1（≈48%）** | 灰度层已到极限，再高会连色相层一起吃掉 |
> | 2 | **覆盖物保持几何形（方/条/环），不要贴合棋子造型** | 棋子轮廓露在覆盖物之外，是剪影层还能起作用的**唯一原因** |
> | 3 | **不要用高饱和度颜色** | 会把色相层也吃掉 |

### 0.3 ice-2 的定位：**比 ice-1 厚，但不是不透明**

代码里 ice-2 目前**回退用 ice-1 的贴图 + 更高不透明度**。这是刻意的妥协：
宁可两级冰长得像，也不要让 2hp 的冰看不见。

你交付真的 ice-2 后，回退会被移除。**但它仍要遵守 §0.2 的三条约束** ——
"更厚"要靠**裂纹更少、边缘更实、冰层纹理更密**来表达，
**不要靠提高不透明度**。

---

## 1. 执行方式

- 用**已验证可出原生 Alpha 的路径**（与 ice-1 同源，ChatGPT 图像生成 + 人工提交）
- 后处理**只允许**：缩放到目标尺寸、整体缩放 Alpha、把漂移的主色归回工单色板
- ❌ **不允许**：重绘、加细节、改造型
- 各段 prompt **逐字使用**
- **每张出 2 个候选**

### 保存路径

```
garden/assets/pieces/     overlay-rocket-h.png  overlay-rocket-v.png  overlay-bomb.png
garden/assets/obstacles/  obstacle-ice-2.png
```

候选与测试图放 `<对应目录>/candidates/`。

---

## 2. 三张叠加层 → `assets/pieces/`

尺寸均 **256 × 256**，透明 PNG，🔴 半透明。

> 🔴 **为什么是 3 张不是 18 张**：火箭与炸弹要叠在**每一种颜色**的棋子上。
> 按 6 色 × 3 种做是 18 张，且颜色要靠人工保证匹配。
> 做成通用叠加层只要 3 张，且**颜色永远匹配**（因为底下就是那张棋子）。
> 这也是它们**必须半透明**的原因 —— 不透明就退化成"18 张的效果 + 3 张的信息量"。

### 2.1 `overlay-rocket-h.png`

```text
A horizontal energy streak overlay for a match-3 game piece, to be layered on top of a
fruit piece.

CONTENT: a single horizontal band of light running all the way across the square frame from
the left edge to the right edge, with a soft arrowhead shape at each end pointing outward.
The band occupies only the middle third of the frame's height.

CRITICAL — THIS MUST BE SEMI-TRANSPARENT: the band is a translucent white-to-pale-gold glow
whose brightest part reaches at most 45 percent opacity, with softly feathered edges. The
fruit underneath must remain clearly visible and its colour must still be readable through
the overlay. Do NOT make this opaque, and do NOT make it more opaque than a thin veil.

KEEP IT PALE: use a desaturated, near-white glow. Do NOT use a strong saturated colour —
a saturated overlay would hide the colour of the fruit underneath.

The rest of the square is fully transparent — only the horizontal band is drawn. The top
third and bottom third of the frame must be completely empty so the fruit's outline stays
visible above and below the band.

STYLE: soft rounded 3D cartoon style, warm healing color palette, clean chunky simple
shapes.

Critical: the band is translucent and pale, not solid and not saturated; it spans the full
width edge to edge; the top and bottom thirds are empty; nothing else is drawn in the frame;
no text, no watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL — this image is inherently translucent and
CANNOT be produced on a white background and keyed out afterwards. If the tool cannot output
a genuine alpha channel, STOP and report it instead of delivering an opaque version.
```

### 2.2 `overlay-rocket-v.png`

```text
A vertical energy streak overlay for a match-3 game piece, to be layered on top of a fruit
piece.

CONTENT: a single vertical band of light running all the way across the square frame from
the top edge to the bottom edge, with a soft arrowhead shape at each end pointing outward.
The band occupies only the middle third of the frame's width.

CRITICAL — THIS MUST BE SEMI-TRANSPARENT: the band is a translucent white-to-pale-gold glow
whose brightest part reaches at most 45 percent opacity, with softly feathered edges. The
fruit underneath must remain clearly visible and its colour must still be readable through
the overlay. Do NOT make this opaque.

KEEP IT PALE: use a desaturated, near-white glow. Do NOT use a strong saturated colour.

It must be the exact vertical mirror of the horizontal version in width, opacity and glow,
so the two read as a matched pair.

The rest of the square is fully transparent — only the vertical band is drawn. The left
third and right third of the frame must be completely empty so the fruit's outline stays
visible on both sides of the band.

STYLE: soft rounded 3D cartoon style, warm healing color palette, clean chunky simple
shapes.

Critical: the band is translucent and pale; it spans the full height edge to edge; the left
and right thirds are empty; nothing else is drawn in the frame; no text, no watermark, no
signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL — this image is inherently translucent and
CANNOT be produced on a white background and keyed out afterwards. If the tool cannot output
a genuine alpha channel, STOP and report it instead of delivering an opaque version.
```

### 2.3 `overlay-bomb.png`

```text
A bomb marker overlay for a match-3 game piece, to be layered on top of a fruit piece.

CONTENT: a glowing RING near the outer edge of the square frame, drawn as a circular band of
light, plus a short curved FUSE at the top right with a small spark at its tip.

CRITICAL — THIS MUST BE SEMI-TRANSPARENT: the ring is a translucent warm pale-gold glow
reaching at most 45 percent opacity, with softly feathered edges. Do NOT make it opaque and
do NOT use a strong saturated colour.

CRITICAL — THE CENTRE MUST BE EMPTY: do NOT fill the centre of the ring. The entire middle
of the frame must be COMPLETELY TRANSPARENT, so the fruit inside the ring is shown at full
strength with nothing over it. Only the thin ring near the edge and the small fuse are
drawn.

STYLE: soft rounded 3D cartoon style, warm healing color palette, clean chunky simple
shapes.

Critical: the centre of the ring is entirely empty and fully transparent; the ring itself is
translucent and pale; no text, no watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL — this image is inherently translucent and
CANNOT be produced on a white background and keyed out afterwards. If the tool cannot output
a genuine alpha channel, STOP and report it instead of delivering an opaque version.
```

---

## 3. `obstacle-ice-2.png` → `assets/obstacles/`

**256 × 256**，透明 PNG，🔴 半透明。

> 🔴 **以 `obstacle-ice-1.png` 为基准**：同一个格子、同样的方形轮廓、同样的画风。
> 差别只在"看起来更难打"。

```text
A double-layer ice block overlay for a match-3 game, covering one board cell. This is the
STRONGER, thicker version of an existing single-layer ice block.

CONTENT: a rounded square slab of ice that fills the frame, in the same square shape and
the same position as the single-layer version. It reads as THICKER and more solid: the
edges are crisper and heavier, the internal ice facets are denser and more layered, and
there are FEWER cracks — it looks intact rather than damaged.

CRITICAL — DO NOT MAKE IT MORE OPAQUE: it must be NO MORE opaque than the single-layer
version. Its brightest part reaches at most 45 percent opacity. Express "thicker and harder
to break" through EDGE WEIGHT, DENSER INTERNAL FACETS and FEWER CRACKS — never through
higher opacity and never through a whiter, milkier fill. The game piece underneath must
still be clearly identifiable.

KEEP IT PALE AND DESATURATED: a very pale blue-white. Do NOT use a strong saturated blue —
a saturated overlay would hide the colour of the fruit underneath.

CRITICAL — KEEP IT SQUARE: the ice is a rounded SQUARE slab filling the cell. Do NOT shape
it to follow the fruit's outline — the fruit's silhouette must stay visible outside the
square.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes.

Critical: no more opaque than the single-layer version; visibly thicker through edge weight
and facet density, with FEWER cracks; still clearly see-through; rounded square shape; no
text, no watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL — this image is inherently translucent and
CANNOT be produced on a white background and keyed out afterwards. If the tool cannot output
a genuine alpha channel, STOP and report it instead of delivering an opaque version.
```

---

## 4. 🔴 验收（**每张都要实际叠一遍再判断**）

### 4.1 必交的验收附件

```
assets/pieces/candidates/overlay-rocket-h-over-6-pieces.png
assets/pieces/candidates/overlay-rocket-v-over-6-pieces.png
assets/pieces/candidates/overlay-bomb-over-6-pieces.png
assets/obstacles/candidates/ice-2-over-6-pieces.png
assets/obstacles/candidates/ice-1-vs-ice-2.png    ← 两级冰并排对比
```

每张"over-6-pieces"的内容：**把覆盖层分别叠在 6 色棋子上，排成一行**。
这是唯一能证明"透得出来"的证据。

### 4.2 自检表

| # | 检查 | 判据 |
| --- | --- | --- |
| 1 | 🔴 **真 Alpha 通道** | 存在**中间值**，不是只有 0 和 255 |
| 2 | 🔴 **不透明度 ≤ ice-1** | 有效覆盖区平均 ≤ 48%，**没有 255 的像素** |
| 3 | 🔴 **叠在 6 色棋子上，每一色都还认得出是什么水果** | 实际叠一遍看 |
| 4 | 🔴 **棋子轮廓在覆盖物之外可见** | 覆盖物保持几何形，没有贴合棋子造型 |
| 5 | 🔴 **颜色淡而不饱和** | near-white / pale-gold / pale blue-white |
| 6 | 炸弹环**中心完全透明** | 中心区域 Alpha = 0 |
| 7 | 横竖火箭**粗细与亮度一致** | 是一对 |
| 8 | 火箭贯穿整个画布 | 不是只画中间一小段 |
| 9 | ice-2 比 ice-1 **裂纹更少、边缘更实** | 并排对比看得出是两个阶段 |
| 10 | ice-2 与 ice-1 **同尺寸同轮廓** | 同一个格子 |

> 📌 **判断标准不是"覆盖物好不好看"**，而是
> **「隔着它，六种水果还认得出是哪一种」**。
> 认不出就是不合格，无论覆盖物本身多漂亮。

---

## 5. 做不到怎么办（**如实报告，不要凑数**）

| 情况 | 怎么处理 |
| --- | --- |
| **出不了真 Alpha** | **停下来报告**，附能力测试证据 |
| **半透明但棋子仍认不出** | 如实报告并附 6 色叠加图。**可以再往"更淡"推**，不要担心覆盖物看起来太弱 |
| **ice-2 做不出"更厚"又不加不透明度** | 如实报告。可以往"裂纹更少 + 边缘更实"再推，**但绝不要靠提高不透明度解决** |
| **炸弹环中心总是被填上** | 如实报告。中心不透明就把棋子盖死了，等于没做叠加层 |
| **模型坚持贴合棋子造型** | 如实报告。几何形是剪影层能起作用的唯一原因 |
| **画风与 ice-1 对不上** | 🔴 **停下来报告**。风格断层比缺一张图严重 |
| **两条判据打架** | 🔴 **停下来报告** |

> 📌 **本批交付后 Stage 0 美术全部齐活**（30 张，实际入游戏 29 张）。
