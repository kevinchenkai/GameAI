# Codex 重出指令 · 叠加层 3 张（**我的工单写错了**）

> 承接 [第 4 批工单](./codex-imagegen-order-batch4-overlays.md)。
> 🔴 **必读 [LEGIBILITY-SPEC §5.2](./LEGIBILITY-SPEC.md)** —— 本次修正的根据。

- **建立**：2026-08-08
- **重出**：`overlay-rocket-h.png` / `overlay-rocket-v.png` / `overlay-bomb.png`
- **不动**：`obstacle-ice-2.png` ✅ **已验收通过**

---

## 0. 先说清楚：这次是**我的工单写错了**，不是你做错了

你完全按工单执行了，每一条都达标：

| 工单要求 | 你交付的 | |
| --- | --- | --- |
| 真 Alpha、有中间值、无 255 像素 | ✅ 全部满足 | |
| 不透明度 ≤ ice-1（48%） | 33.7 / 32.7 / 26.4%，峰值 44.7% | ✅ |
| 炸弹中心透明 | 中心 **100×100** 全透明（比你报的 80×80 还好） | ✅ |
| 火箭空白三分之二 | 上下（左右）1/3 最大 Alpha = 0 | ✅ |
| near-white、不饱和 | ✅ 照做了 | ⚠️ **← 这条是错的** |

> 📌 你报的不透明度（33.7 / 32.7 / 26.4）用的是 `alpha>0` 阈值，
> 我用 `alpha>8` 量得 40.4 / 39.7 / 35.7。**两个都对，只是阈值不同**，
> 结论一致：全部低于 ice-1。这点没有问题。

### 0.1 错在哪

我把**冰块**的约束（"淡、不饱和、低不透明度"）原样套到了**叠加层**上。
但这两类东西的职责相反：

| | 冰块 = **遮挡层** | 火箭/炸弹 = **标记层** |
| --- | --- | --- |
| 职责 | 挡住棋子，但要能透出来 | **让人一眼看见"这颗不一样"** |
| 失败形态 | 棋子认不出 | **标记看不见** |

我要求 near-white + ≤45% 不透明度，结果是：**标记在浅色棋子上几乎消失。**

实测标记处与邻近棋子的灰度差：

| 棋子 | 横火箭 Δ | 炸弹 Δ |
| --- | --- | --- |
| **yellow（香蕉）** | **5.7** ⚠️ | **12.6** ⚠️ |
| green | 23.3 ✅ | 22.8 ✅ |
| blue | 32.9 ✅ | 33.6 ✅ |
| orange | 43.0 ✅ | 46.7 ✅ |
| purple | 59.6 ✅ | 65.0 ✅ |
| red | 66.3 ✅ | 75.3 ✅ |

香蕉上 Δ=5.7 —— **等于没有标记**。近白色压浅色，必然如此，跟画工无关。

在游戏内真实尺寸（43pt）下看，横火箭读起来像**一个灰色的双箭头 UI 控件**，
不像"这颗棋子蓄了能量"。炸弹环同理，是一圈很淡的白线。

**特殊棋子是三消里最需要被看见的状态。现在它是棋盘上最不显眼的东西。**

---

## 1. 修正后的规则

| # | 原（作废） | **新** |
| --- | --- | --- |
| 1 | near-white、不饱和 | 🔴 **深色描边 + 亮色芯**（双色），任何底色上都有边界 |
| 2 | 整体不透明度 ≤45% | 🔴 **标记本体可以到 85~95%**，靠**只占小面积**保证棋子仍认得出 |
| 3 | 判据="棋子还认不认得出" | 🔴 判据=**"标记与其下棋子灰度差 ≥ 20，六色全部满足"** |

> 🔴 **关键思路转变**：
> 避免遮挡棋子，靠的是**标记面积小**（细带 / 细环），
> **不是**靠标记颜色淡。
>
> 一条又细又实的带子，比一条又宽又淡的带子**更清楚且遮挡更少**。

### 1.1 双色描边为什么是唯一解

单色标记必然在某一端失效：

- 纯亮色 → 在香蕉、梨上消失
- 纯暗色 → 在苹果、葡萄上消失

**深色描边 + 亮色芯**同时提供两种边界，**六色通吃**。
这与棋子本身的三层编码是同一个道理。

---

## 2. 执行方式

- 路径与上次相同：`garden/assets/pieces/`
- **每张出 2 个候选**
- 后处理**只允许**缩放与整体 Alpha 缩放，不许重绘
- 🔴 **`obstacle-ice-2.png` 不要动**，已验收通过

### 2.1 `overlay-rocket-h.png`

```text
A horizontal energy streak marker for a match-3 game piece, to be layered on top of a
fruit piece. This is a MARKER whose job is to be NOTICED at a glance.

CONTENT: a single horizontal bar running all the way across the square frame from the very
left edge to the very right edge, with an arrowhead at each end pointing outward. The bar
is THIN — about one eighth of the frame's height — and it sits vertically centred.

CRITICAL — TWO-TONE SO IT IS VISIBLE ON ANY FRUIT COLOUR: the bar has a BRIGHT WARM GOLD
core (#FFD24A) wrapped in a distinct DARK BROWN OUTLINE (#4A3520) about 3 pixels thick on
every side, including around the arrowheads. The dark outline is what makes the marker
readable on pale fruit; the bright core is what makes it readable on dark fruit. BOTH are
required.

OPACITY: the bar itself is nearly solid — around 90 percent opacity — because it is small.
Do NOT make it a faint translucent veil. It stays unobtrusive by being THIN, not by being
pale.

The rest of the square is FULLY TRANSPARENT. The top and bottom of the frame must be
completely empty so the fruit's outline stays visible above and below the bar.

CRITICAL — REACH BOTH EDGES: the bar must touch the left and right edges of the frame with
no transparent margin, so that when several of these sit side by side they form one
continuous line.

STYLE: soft rounded 3D cartoon style, warm healing color palette, clean chunky simple
shapes.

Critical: thin bar with a bright gold core AND a dark brown outline; nearly solid, not
translucent; touches both left and right edges; everything above and below the bar is empty;
no text, no watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL. If the tool cannot output a genuine alpha
channel, STOP and report it.
```

### 2.2 `overlay-rocket-v.png`

```text
A vertical energy streak marker for a match-3 game piece, to be layered on top of a fruit
piece. This is a MARKER whose job is to be NOTICED at a glance.

CONTENT: a single vertical bar running all the way across the square frame from the very top
edge to the very bottom edge, with an arrowhead at each end pointing outward. The bar is
THIN — about one eighth of the frame's width — and it sits horizontally centred.

CRITICAL — TWO-TONE SO IT IS VISIBLE ON ANY FRUIT COLOUR: the bar has a BRIGHT WARM GOLD
core (#FFD24A) wrapped in a distinct DARK BROWN OUTLINE (#4A3520) about 3 pixels thick on
every side, including around the arrowheads. BOTH are required.

OPACITY: the bar itself is nearly solid — around 90 percent opacity. It stays unobtrusive by
being THIN, not by being pale.

It must be the exact vertical mirror of the horizontal version in thickness, colour and
outline weight, so the two read as a matched pair.

The rest of the square is FULLY TRANSPARENT. The left and right of the frame must be
completely empty so the fruit's outline stays visible on both sides of the bar.

CRITICAL — REACH BOTH EDGES: the bar must touch the top and bottom edges of the frame with
no transparent margin.

STYLE: soft rounded 3D cartoon style, warm healing color palette, clean chunky simple
shapes.

Critical: thin bar with a bright gold core AND a dark brown outline; nearly solid; touches
both top and bottom edges; everything left and right of the bar is empty; no text, no
watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL. If the tool cannot output a genuine alpha
channel, STOP and report it.
```

### 2.3 `overlay-bomb.png`

```text
A bomb marker overlay for a match-3 game piece, to be layered on top of a fruit piece. This
is a MARKER whose job is to be NOTICED at a glance.

CONTENT: a RING near the outer edge of the square frame, drawn as a thin circular band, plus
a short curved FUSE at the top right with a small four-point spark at its tip.

CRITICAL — TWO-TONE SO IT IS VISIBLE ON ANY FRUIT COLOUR: the ring has a BRIGHT WARM GOLD
core (#FFD24A) wrapped in a distinct DARK BROWN OUTLINE (#4A3520) about 3 pixels thick on
both its inner and outer side. The dark outline is what makes it readable on pale fruit; the
bright core is what makes it readable on dark fruit. BOTH are required. The fuse and spark
follow the same two-tone treatment.

OPACITY: the ring and fuse are nearly solid — around 90 percent opacity — because the ring
is THIN. Do NOT make it a faint translucent outline.

CRITICAL — THE CENTRE MUST BE EMPTY: do NOT fill or tint the centre of the ring. The entire
middle of the frame must be COMPLETELY TRANSPARENT so the fruit inside is shown at full
strength with nothing over it. Only the thin ring near the edge and the small fuse are
drawn.

STYLE: soft rounded 3D cartoon style, warm healing color palette, clean chunky simple
shapes.

Critical: thin ring with a bright gold core AND a dark brown outline; nearly solid, not
translucent; the centre of the ring is entirely empty and fully transparent; no text, no
watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL. If the tool cannot output a genuine alpha
channel, STOP and report it.
```

---

## 3. 验收

### 3.1 必交附件（与上次同名，覆盖即可）

```
assets/pieces/candidates/overlay-rocket-h-over-6-pieces.png
assets/pieces/candidates/overlay-rocket-v-over-6-pieces.png
assets/pieces/candidates/overlay-bomb-over-6-pieces.png
```

### 3.2 自检表（🔴 判据变了）

| # | 检查 | 判据 |
| --- | --- | --- |
| 1 | 🔴🔴 **标记在六色棋子上都清晰可见** | **尤其检查香蕉（最浅）与苹果（最深）** |
| 2 | 🔴 **深色描边存在且连续** | 描边是浅色棋子上唯一的边界来源 |
| 3 | 🔴 **炸弹环中心完全透明** | 中心区域 Alpha = 0 |
| 4 | 🔴 **火箭触到画布两端** | 边缘像素 Alpha > 0，多格相接能连成一条线 |
| 5 | 标记够细 | 火箭约 1/8 画布宽度；细才不遮挡 |
| 6 | 横竖两条粗细、颜色、描边一致 | 是一对 |
| 7 | 叠加后棋子仍认得出是什么水果 | 靠标记面积小来保证 |
| 8 | 真 Alpha 通道 | 存在中间值（羽化边缘） |

> 🔴 **第 1 条的量化判据**：标记处与其下棋子的**灰度差 ≥ 20，六色全部满足**。
> 上一版香蕉只有 5.7 —— 那是不合格的。
>
> 📌 **这次不要求"整体不透明度 ≤48%"** —— 那条只适用于冰块。

---

## 4. 做不到怎么办

| 情况 | 怎么处理 |
| --- | --- |
| **描边太粗导致遮挡棋子** | 把**带子做细**，不要把描边做淡。细带+实色 > 宽带+淡色 |
| **模型不肯画描边** | 如实报告。描边是浅色棋子上唯一的边界来源，没有它这批就白做 |
| **炸弹环中心又被填上** | 如实报告。中心不透明就把棋子盖死了 |
| **火箭还是碰不到边缘** | 如实报告并附实测。可以接受少量留白，但**不要**因此把带子画短 |
| **两条判据打架** | 🔴 **停下来报告** |

> 📌 **`obstacle-ice-2.png` 已通过，不要重出、不要修改。**
> 本次只重出 3 张叠加层。
