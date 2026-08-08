# Codex 出图工单 · 第 3 批 —— 补全 Stage 0（**16 张**）

> **这份文件是给 Codex 直接执行的。**
> 🔴 **前置：[第 1 批棋子](./codex-imagegen-order-batch1-pieces.md) 已通过 40px 灰度联合测试。**
> 通用约束见 [LEGIBILITY-SPEC.md](./LEGIBILITY-SPEC.md)。

- **建立**：2026-08-07
- **要出的图**：3 叠加层 + 2 冰块 + 5 UI + 2 背景 + 4 院门 = **16 张**
- **可与[第 2 批](./codex-imagegen-order-batch2-wangcai-puppet.md)并行**

---

## 0. 先看这四条

### 0.1 🔴 特殊棋子做成**通用叠加层**，不是 18 张

火箭与炸弹要叠在**每一种颜色**的棋子上。按 6 色 × 3 种做就是 **18 张**。

**改成 3 张半透明叠加层，代码在普通棋子上叠一层即可。**

| | 张数 | 颜色是否匹配 |
| --- | --- | --- |
| 每色单独画 | 18 | 要靠人工保证 |
| **通用叠加层** | **3** | ✅ **永远匹配**（因为底下就是那张棋子）|

> 🔴 **所以这 3 张必须半透明** —— 要能透出下面棋子的颜色。
> 不透明就退化成"18 张的效果 + 3 张的信息量"，反而更糟。

### 0.2 🔴 冰块也必须半透明，这是**玩法要求**不是美术偏好

玩家要能**看见冰下面是什么棋子**，否则无法规划下一步。

对于"低压力、挑战来自思考"的核心承诺，看不见 = 只能靠猜 = 挫败。

> ⚠️ prompt 里明确写 `semi-transparent, clearly see-through`。

### 0.3 🔴 `level-bg` **画得太漂亮反而是失败的**

这是关卡背景。它的唯一职责是**不抢棋盘**。

棋子必须是屏幕上最醒目的东西 —— 背景一旦有清晰细节或高对比，
玩家的视线就会被拉走，而三消游戏的视线应该始终在棋盘上。

```text
✅ soft blurred, low contrast, desaturated, no sharp details
❌ detailed, vibrant, eye-catching, beautiful garden scenery
```

> 📌 **验收方法**：把 `level-bg` 和 6 个棋子叠在一起看，
> **第一眼看到的必须是棋子。**

### 0.4 一处**故意的取舍**：院门 4 张必须严格同构图

玩家看到的是「**同一个地方变好了**」。视角一变，成长感就毁了 ——
会变成"换了张图"而不是"我把它修好了"。

**色调递进本身就是最强的信号**：0 偏灰冷 → 3 明亮温暖。
这比往画面里加物件有效得多。

> ⚠️ **如果 4 张的视角对不齐，宁可报告也不要交付** ——
> 这是 Stage 0 的核心验证点（"再玩两关就能把院门修好了"）。

---

## 1. 执行方式

- 用 **imagegen skill 的内置 `image_gen` 工具**
- 各段 prompt **逐字使用**
- **每张出 2 个候选**；🔴 **院门 4 张建议一次生成一组**，便于保持同构图

### 保存路径

```
garden/assets/pieces/     overlay-rocket-h.png  overlay-rocket-v.png  overlay-bomb.png
garden/assets/obstacles/  obstacle-ice-1.png  obstacle-ice-2.png
garden/assets/ui/         ui-panel-bg.png  ui-btn-primary.png  ui-moves-badge.png
                          ui-objective-slot.png  ui-btn-pause.png
garden/assets/garden/     level-bg.jpg  garden-bg-spring.jpg
                          garden-gate-0.png ~ garden-gate-3.png
```

### 统一风格段（**除背景图外，各段 prompt 都已嵌入**）

```text
STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky simple shapes.
```

---

## 2. 一、特殊棋子叠加层（3 张）→ `assets/pieces/`

尺寸均 **256 × 256**，**透明 PNG**，🔴 **半透明**。

### 2.1 `overlay-rocket-h.png`

```text
A horizontal energy streak overlay for a match-3 game piece, to be layered on top of a
fruit piece.

CONTENT: a single horizontal band of light running all the way across the square frame from
the left edge to the right edge, with a soft arrowhead shape at each end pointing outward.

CRITICAL — THIS MUST BE SEMI-TRANSPARENT: the band is a translucent white-to-pale-gold glow
with roughly 50 to 60 percent opacity in its brightest part and softly feathered edges. The
fruit underneath must remain clearly visible and its color must still be readable through
the overlay. Do NOT make this opaque.

The rest of the square is fully transparent — only the horizontal band is drawn.

STYLE: soft rounded 3D cartoon style, warm healing color palette, clean chunky simple
shapes.

Critical: the band is translucent, not solid; it spans the full width edge to edge; nothing
else is drawn in the frame; no text, no watermark, no signature.

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

CRITICAL — THIS MUST BE SEMI-TRANSPARENT: the band is a translucent white-to-pale-gold glow
with roughly 50 to 60 percent opacity in its brightest part and softly feathered edges. The
fruit underneath must remain clearly visible and its color must still be readable through
the overlay. Do NOT make this opaque.

It must be the exact vertical mirror of the horizontal version in width, opacity and glow,
so the two read as a matched pair.

The rest of the square is fully transparent — only the vertical band is drawn.

STYLE: soft rounded 3D cartoon style, warm healing color palette, clean chunky simple
shapes.

Critical: the band is translucent, not solid; it spans the full height edge to edge; nothing
else is drawn in the frame; no text, no watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL — this image is inherently translucent and
CANNOT be produced on a white background and keyed out afterwards. If the tool cannot output
a genuine alpha channel, STOP and report it instead of delivering an opaque version.
```

### 2.3 `overlay-bomb.png`

```text
A bomb marker overlay for a match-3 game piece, to be layered on top of a fruit piece.

CONTENT: a glowing RING near the outer edge of the square frame, drawn as a circular band of
light, plus a short curved FUSE at the top right with a small spark at its tip.

CRITICAL — THIS MUST BE SEMI-TRANSPARENT: the ring is a translucent warm orange-gold glow
with roughly 50 to 60 percent opacity and softly feathered edges, so the fruit inside the
ring stays fully visible and its color stays readable. Do NOT fill the centre of the ring —
the entire middle of the frame must be completely transparent.

STYLE: soft rounded 3D cartoon style, warm healing color palette, clean chunky simple
shapes.

Critical: the centre of the ring is empty and fully transparent; the ring itself is
translucent, not solid; no text, no watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL — this image is inherently translucent and
CANNOT be produced on a white background and keyed out afterwards. If the tool cannot output
a genuine alpha channel, STOP and report it instead of delivering an opaque version.
```

### 2.4 叠加层自检

| # | 检查 |
| --- | --- |
| 1 | 🔴 **半透明** —— 叠在 6 个棋子上试一遍，**每一色都还能认出是什么水果** |
| 2 | 🔴 炸弹环**中心是空的**，没有盖住棋子主体 |
| 3 | 横竖两条**粗细与亮度一致**（是一对）|
| 4 | 贯穿整个画布，不是只画在中间一小段 |

> 🔴 **第 1 条必须实际叠一遍再判断**，不要只看叠加层本身。

---

## 3. 二、冰块障碍（2 张）→ `assets/obstacles/`

尺寸均 **256 × 256**，**透明 PNG**，🔴 **半透明**。

### 3.1 `obstacle-ice-1.png`

```text
A single-layer ice block overlay for a match-3 game, covering one board cell.

CONTENT: a rounded square slab of ice that fills the frame, with soft chipped corners and
several visible crack lines across its surface.

CRITICAL — THIS MUST BE CLEARLY SEE-THROUGH: the ice is SEMI-TRANSPARENT, a pale blue-white
with roughly 40 to 50 percent opacity. The game piece underneath must remain clearly
visible and identifiable through the ice — the player has to be able to see which fruit is
frozen in order to plan a move. Do NOT make this opaque or milky.

A few small bright glints sit on the surface to read as ice, but they are small and must not
hide what is underneath.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes.

Critical: semi-transparent and clearly see-through; the fruit underneath stays readable;
several cracks are visible so this reads as the WEAKER of two ice states; no text, no
watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL — this image is inherently translucent and
CANNOT be produced on a white background and keyed out afterwards. If the tool cannot output
a genuine alpha channel, STOP and report it instead of delivering an opaque version.
```

### 3.2 `obstacle-ice-2.png`

```text
A double-layer ice block overlay for a match-3 game, covering one board cell. This is the
STRONGER, thicker version of the single-layer ice.

CONTENT: a rounded square slab of ice that fills the frame, noticeably THICKER and more
frosted than the single-layer version, with FEWER cracks — it looks intact and solid rather
than damaged.

CRITICAL — IT MUST STILL BE SEE-THROUGH: even though it is thicker, the ice remains
SEMI-TRANSPARENT at roughly 55 to 65 percent opacity. The game piece underneath must still
be identifiable through the ice. It should read as HARDER TO BREAK than the single-layer
version, but never as an opaque block. Do NOT make this fully opaque.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes.

Critical: still see-through; visibly thicker and whiter than the single-layer version with
FEWER cracks; the two ice images must read as an obvious two-step progression; no text, no
watermark, no signature.

Output 256x256 px, PNG WITH A REAL ALPHA CHANNEL — this image is inherently translucent and
CANNOT be produced on a white background and keyed out afterwards. If the tool cannot output
a genuine alpha channel, STOP and report it instead of delivering an opaque version.
```

### 3.3 冰块自检

| # | 检查 |
| --- | --- |
| 5 | 🔴 **两张都能透出下面的棋子** —— 叠在 6 色棋子上各试一遍 |
| 6 | 🔴 **ice-2 明显比 ice-1 厚/白/裂纹少**，一眼看出是两个阶段 |
| 7 | 两张尺寸与轮廓一致（同一个格子）|

---

## 4. 三、UI 元件（5 张）→ `assets/ui/`

> 🔴 **按钮不要把文字画进去。** 文字由代码渲染 —— 要支持多字号与后续多语言。
> **每段 prompt 都写了 `no text`，请保留。**

| 文件 | 尺寸 | 内容 |
| --- | --- | --- |
| `ui-panel-bg.png` | **720×960** | 弹窗面板，🔴 九宫格可拉伸 |
| `ui-btn-primary.png` | **480×160** | 主按钮，橙色 `#FFB03A` |
| `ui-moves-badge.png` | **256×160** | 步数底框 |
| `ui-objective-slot.png` | **200×200** | 目标图标底框 |
| `ui-btn-pause.png` | **128×128** | 暂停按钮 |

### 4.1 `ui-panel-bg.png`

> 🔴 **九宫格拉伸**：代码会把这张图按九宫格切开拉伸到任意尺寸。
> **四角 48px 区域必须是纯装饰、不含会被拉变形的内容**，
> **四边中段必须是可平铺的重复纹理**。

```text
A rounded rectangular UI panel background for a casual mobile game, designed to be used as
a NINE-SLICE scalable panel.

CONTENT: a cream white panel (#FFFBF2) with generously rounded corners and a warm wooden
border (#8A6A4A) running around the edge.

CRITICAL — NINE-SLICE SAFE: the four corners each occupy about 48 pixels and contain only
the corner curve of the wooden border. The straight edges between the corners must be a
SIMPLE UNIFORM REPEATING pattern that can be stretched horizontally or vertically without
looking wrong. The large centre area must be a FLAT even cream fill with no decoration, no
gradient banding and no illustration, because it will be stretched.

Do NOT place any ornament, icon, motif or highlight in the centre or along the middle of the
edges.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky simple shapes.

Critical: the centre is flat and empty so it can stretch; the edges are uniform and
repeatable; no text, no watermark, no signature.

Output 720x960 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 4.2 `ui-btn-primary.png`

```text
A primary action button background for a casual mobile game.

CONTENT: a wide rounded rectangular button in warm orange (#FFB03A), with a soft chunky
three-dimensional feel — a slightly lighter top surface and a subtle darker rim along the
bottom edge, so it reads as a physical pressable button.

CRITICAL — COMPLETELY EMPTY: the face of the button must be entirely empty. There is NO
text, NO label, NO icon and NO symbol on it — a caption will be rendered on top of it by
the game code.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky simple shapes.

Critical: the button face is empty with nothing drawn on it; no text, no watermark, no
signature; the whole button is inside the frame with a small margin.

Output 480x160 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 4.3 `ui-moves-badge.png`

```text
A small badge background that will hold the remaining-moves counter in a casual mobile game.

CONTENT: a rounded rectangular plaque in cream white (#FFFBF2) with a warm wooden border
(#8A6A4A), slightly wider than it is tall, with a soft chunky three-dimensional feel.

CRITICAL — COMPLETELY EMPTY: the face of the plaque must be entirely empty. There is NO
number, NO text and NO icon on it — the number will be rendered on top by the game code.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky simple shapes.

Critical: the face is empty with nothing drawn on it; no text, no watermark, no signature.

Output 256x160 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 4.4 `ui-objective-slot.png`

```text
A square slot background that will hold a level-objective icon in a casual mobile game.

CONTENT: a rounded square frame in cream white (#FFFBF2) with a warm wooden border
(#8A6A4A), with a soft chunky three-dimensional feel and a gently recessed inner area so it
reads as a slot that something sits inside.

CRITICAL — COMPLETELY EMPTY: the inner area must be entirely empty and evenly filled. There
is NO icon, NO fruit, NO number and NO text inside it — a fruit icon and a count will be
drawn on top by the game code.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky simple shapes.

Critical: the inner area is empty; no text, no watermark, no signature.

Output 200x200 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 4.5 `ui-btn-pause.png`

```text
A small square pause button for a casual mobile game.

CONTENT: a rounded square button in cream white (#FFFBF2) with a warm wooden border
(#8A6A4A), with a soft chunky three-dimensional feel. Centered on it are TWO simple vertical
bars in warm brown (#5A4632) — the standard pause symbol.

The two bars are a SYMBOL, not text. Keep them thick and simple so they stay readable at
small size.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky simple shapes.

Critical: exactly two thick vertical bars, nothing else; no letters, no text, no watermark,
no signature.

Output 128x128 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 4.6 UI 自检

| # | 检查 |
| --- | --- |
| 8 | 🔴 **按钮与底框上没有任何文字/数字** |
| 9 | 🔴 `ui-panel-bg` **中心平坦可拉伸**，四角装饰不超过 48px |
| 10 | 五张风格一致（同一套木质描边与奶白底）|
| 11 | 暂停按钮的两条竖杠**在 128px 下清晰可辨** |
| 12 | 🔴🔴 **抠图后面板内部的奶白色仍在**（见下）|

> 🔴🔴 **UI 是本批抠图风险最高的一类**：
> 面板底色 `#FFFBF2` **灰度 251.2**，比抠图阈值还亮 ——
> **纯亮度抠图会把整块面板抠成透明。**
>
> **必须只从画布四边向内做 flood fill**（漫水填充），不要全图逐像素判断：
> 背景连通到画布边缘，而面板内部**不连通**，因此不会被误抠。
> 详见 [LEGIBILITY-SPEC §6.5.2](./LEGIBILITY-SPEC.md)。
>
> 📌 **验收方法**：把抠完的图**贴到深色底上**看。
> 面板中间要是实心奶白，不是透出深色。

---

## 5. 四、背景（2 张）→ `assets/garden/`

> 🔴 **无透明需求，用 JPG 质量 85** —— 可省约 60% 体积。

### 5.1 `level-bg.jpg`

> 🔴 **见 §0.3：这张画得太漂亮反而是失败的。**

```text
A background image for a match-3 game level, vertical portrait orientation.

CONTENT: a distant garden scene — soft sky, faraway trees and a hint of grass — rendered as
a BLURRED, LOW CONTRAST, DESATURATED backdrop.

CRITICAL — THIS IMAGE MUST NOT COMPETE WITH THE GAME BOARD: it is soft blurred, low
contrast and desaturated, with NO sharp details, NO strong colors, NO focal point and
nothing that draws the eye. Every element is muted and out of focus. The whole image should
feel like a quiet wash of warm pale color rather than a picture of anything in particular.
The game pieces drawn on top of it must be the most visible thing on the screen.

Keep the overall tone warm and pale, close to #FFF6E5 through #FFE3C0, with only very gentle
variation across the frame.

Critical: soft blurred, low contrast, desaturated, no sharp details, no focal point; do NOT
make this look impressive or eye-catching; no text, no watermark, no signature.

Output 1080x1920 px, JPG.
```

### 5.2 `garden-bg-spring.jpg`

> 这张是**花园场景**的背景，与 `level-bg` 相反 —— 它**可以好看**，因为花园页没有棋盘要保护。

```text
A spring garden background for a casual mobile game, vertical portrait orientation.

CONTENT: a gentle spring garden panorama — a soft warm sky in the upper part, distant rolling
hills, and a green lawn (#8FD98A) filling the lower part. A few simple trees and small
flowers sit along the left and right sides.

CRITICAL — KEEP THE MIDDLE CLEAR: the CENTRAL area of the frame must stay open and
uncluttered, because a garden building will be placed there by the game. Put all scenery
elements toward the edges and keep the centre as simple lawn and sky.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky simple shapes.

Critical: the centre of the frame is open and simple; the scene is calm and warm rather
than busy; no text, no watermark, no signature.

Output 1080x1920 px, JPG.
```

### 5.3 背景自检

| # | 检查 |
| --- | --- |
| 12 | 🔴 `level-bg` **叠上 6 个棋子后，第一眼看到的是棋子** |
| 13 | `garden-bg-spring` **中央留空**，够放院门 |
| 14 | 两张都是 **1080×1920 JPG**（不是 PNG）|

---

## 6. 五、院门建设节点（4 张）→ `assets/garden/`

尺寸均 **800 × 800**，**透明 PNG**。

> 🔴 **见 §0.4：四张必须严格同构图同视角，只改内容。**
> 建议**一次生成一组**，或以 gate-0 为参考图编辑出后三张。

### 6.1 四张的内容

| 文件 | 阶段 | 内容 | 色调 |
| --- | --- | --- | --- |
| `garden-gate-0.png` | 初始 | 破旧院门：杂草丛生，木门倾斜 | **偏灰冷** |
| `garden-gate-1.png` | 阶段 1 | 杂草清除：地面干净，门仍旧 | 略回暖 |
| `garden-gate-2.png` | 阶段 2 | 门框修好：木料新，站直了 | 继续回暖 |
| `garden-gate-3.png` | 阶段 3 | 完成：挂上灯笼，两侧种花 | **明亮温暖** |

### 6.2 Prompt（**先出 gate-0，再以它为参考出后三张**）

```text
A wooden garden gate for a casual mobile game, seen straight on from the front at eye level,
centered in the frame, full structure visible with clear margin on every side.

STAGE 0 — RUN DOWN: the wooden gate is LEANING to one side, its planks are weathered and
grey, and TALL WEEDS grow thickly around its base and through the gaps. The ground is
patchy and untidy. The whole scene is COOL AND GREY in tone, subdued and a little sad,
though never dark or frightening.

COMPOSITION — THIS EXACT FRAMING WILL BE REUSED: the gate sits at the centre of the frame,
photographed straight on from the front at eye level, at this exact size and position. Three
further versions of this same gate will be produced later and they must line up with this
one, so keep the viewpoint, the scale and the placement simple and reproducible.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky simple shapes.

Critical: straight-on front view at eye level, gate centered, whole structure inside the
frame; cool grey tone; no text, no watermark, no signature.

Output 800x800 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

**后三张**（以 `garden-gate-0.png` 为参考输入）：

```text
[Using garden-gate-0.png as the composition reference]

The EXACT SAME wooden gate, from the EXACT SAME straight-on front viewpoint, at the EXACT
SAME size and position in the frame. Do not change the camera angle, the framing or the
scale in any way — only the condition of the gate and the color tone change.

<按阶段替换下面这段>

  · gate-1: The WEEDS ARE GONE and the ground around the gate is clean and tidy, but the
    gate itself is still leaning and weathered exactly as before. The tone warms very
    slightly from the grey of stage 0.

  · gate-2: The weeds are gone AND the gate frame has been REPAIRED — the planks are fresh
    new wood and the gate now stands UPRIGHT and straight. No lanterns and no flowers yet.
    The tone is noticeably warmer.

  · gate-3: The gate is fully restored and standing upright in fresh wood, with a warm
    glowing LANTERN hanging on each side and small colourful FLOWERS planted along the base
    on both sides. The tone is BRIGHT AND WARM, welcoming and cheerful.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky simple shapes.

Critical: identical viewpoint, identical framing and identical scale to the reference; only
the gate's condition and the color tone differ; no text, no watermark, no signature.

Output 800x800 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 6.3 院门自检

| # | 检查 |
| --- | --- |
| 15 | 🔴 **四张严格同视角同构图** —— 判据见下，**不是"轮廓重合"** |
| 16 | 🔴 **色调从冷灰递进到暖亮**，四张排开能看出渐变 |
| 17 | 阶段差异清晰可辨（杂草→干净、歪→正、加灯笼与花）|
| 18 | 四张都是 800×800 透明 PNG，门完整在画内 |

> 🔴 **第 15 条的检查方法**（**2026-08-08 修正**）：
>
> | | 判据 |
> | --- | --- |
> | ✅ **要一致的** | 门的**中心 x 偏差 ≤ 8px**、**包围盒宽度偏差 ≤ 16px**（即视角、缩放、位置一致）|
> | ✅ **本来就该不一致的** | **门板轮廓**（gate-0/1 歪、gate-2/3 正）、**立柱与地面轮廓**（杂草→干净→花丛灯笼）|
>
> ⚠️ **初版判据写成「叠加后轮廓应重合」是错的**，与 §6.1 要求的"歪→正"阶段差异直接矛盾 ——
> 门被扶正，轮廓就必然不重合；**那个"不重合"正是修复本身**。
> 按初版判据执行会把**合格**的四张判为失败（2026-08-08 实际发生过一次）。
>
> 📌 **正确做法**：量中心 x 与包围盒宽度，不要目测轮廓叠加图。

---

## 7. 数量核对

```
3 叠加层 + 2 冰块 + 5 UI + 2 背景 + 4 院门 = 16 张
```

加上前三批：`1 + 6 + 7 + 16 = 30 张` = **Stage 0 全部所需**
（其中 `pet-wangcai-master.png` 不进游戏 → **实际入游戏 29 张**；
`preview-composite.png` 是验收附件，不计入此表）

---

## 8. 做不到怎么办（**如实报告，不要凑数**）

| 情况 | 怎么处理 |
| --- | --- |
| 🔴🔴 **工具输出不了真 Alpha 通道** | **叠加层与冰块这 5 张会因此做不了** —— 它们本身就要求半透明，**白底抠图救不回来**（无法区分"该透明的背景"与"该半透明的主体"）。**停下来报告**，我们换工具路径。**其余 11 张不受影响**，按白底抠图正常做 |
| 🔴 **叠加层/冰块做不到半透明** | **如实报告并附叠加效果图**。不透明的版本**不要交付** —— 它会让玩家看不见棋子 |
| 🔴 **UI 面板抠图后中间变透明了** | 说明用的是全图亮度判断。改成**从四边向内 flood fill**（§4.6）。面板底色灰度 251 比阈值还亮，全图判断必然误抠 |
| 🔴 **院门 4 张视角对不齐** | **如实报告并附叠加对比图**。宁可少交也不要交对不齐的 —— 成长感是 Stage 0 核心验证点 |
| **`level-bg` 总是画得太抢眼** | 如实报告。可以再往"更糊更淡"推，**不要担心它看起来平淡** |
| **九宫格面板中心总有装饰** | 如实报告。中心有内容就没法拉伸 |
| **模型坚持在按钮上写字** | 如实报告，**不要交付带文字的按钮** |
| **两条判据打架** | 🔴 **停下来报告** |

> 📌 **本批可与第 2 批并行。** 两批都完成即 Stage 0 美术齐活。
>
> 🔴 **如果需要再压张数**：可以先只做 `gate-0` 与 `gate-3`（起点与终点），
> 中间两阶段用代码插值过渡做验证 —— 那样是 **28 张**。
> **但这是我的备选方案，请先按 16 张做，需要时我会说。**
