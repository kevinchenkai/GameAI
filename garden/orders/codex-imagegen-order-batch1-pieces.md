# Codex 出图工单 · 第 1 批 —— 六个普通棋子（**6 张**）

> **这份文件是给 Codex 直接执行的。**
> 🔴 **先读 [LEGIBILITY-SPEC.md](./LEGIBILITY-SPEC.md)** —— **本批是那份规范的主战场。**

- **建立**：2026-08-07
- **要出的图**：`piece-yellow` `piece-green` `piece-blue` `piece-orange` `piece-purple` `piece-red`（**6 张**）
- **前置**：无。**可与第 0 批并行**（棋子与宠物互不依赖）

---

## 0. 先看这四条

### 0.1 🔴 这批是 Style Guide 的验证批

六张一次画完，**放在一起对比再交付**。它们同时决定两件事：

1. 整套视觉规范成不成立（材质、光泽、体积语言是否统一）
2. 🔴 **游戏对目标用户可不可玩**（能不能分清）

**这批过了才画第 3 批**（叠加层 / 障碍 / UI / 花园）。

### 0.2 🔴🔴 色值是**重算过的**，请严格照抄

**原色板有 4 对在灰度下几乎无法区分**：

| 原色对 | 灰度值 | 问题 |
| --- | --- | --- |
| orange `#FF9A3C` vs blue `#4FB4F0` | 168.7 vs 162.9 | **Δ=5.8 —— 几乎相同** |
| orange vs green `#5FD068` | 168.7 vs 176.5 | **Δ=7.8** |
| green vs blue | 176.5 vs 162.9 | **Δ=13.6** |
| red `#FF5A5A` vs purple `#A97BE0` | 125.1 vs 140.1 | **Δ=15.0** |

现色板已重算，**最小两两灰度差 25.7**。

> 🔴 **请不要"微调得更好看"** —— 一调就可能撞回冲突区。
> 色值是约束条件，不是建议值。

### 0.3 🔴 本批最容易漏的一条：**高光阴影会吃掉明度差**

色板的灰度是**纯色块**算的。实际画出来有高光有阴影，会把有效明度往中间拉。

**量化结果：全部 5 对相邻色的高光/阴影区间都是重叠的。**

| 亮档 · 阴影 | 暗档 · 高光 |
| --- | --- |
| yellow 阴影 176.0 | green 高光 211.6 |
| green 阴影 133.3 | blue 高光 198.5 |
| blue 阴影 110.3 | orange 高光 173.3 |
| orange 阴影 91.0 | purple 高光 141.9 |
| purple 阴影 60.9 | red 高光 119.8 |

**所以有一条硬规则**（详见 [LEGIBILITY-SPEC §4](./LEGIBILITY-SPEC.md)）：

> 🔴 **高光与阴影各自不超过 30% 面积，主色占大面积。**

| 高光/阴影面积 | 最小相邻明度差 | |
| --- | --- | --- |
| 各 15% | 23.4 | ✅ |
| **各 30%** | **21.1** | ✅ **上限** |
| 各 45% | 18.8 | ⚠️ 掉出安全区 |

这与"画得立体好看"的直觉相反，**但立体感在本项目是次要目标**。

### 0.4 一处**故意的取舍**，请照做不要"优化"

**橘子和苹果都偏圆**，是这套里轮廓最接近的一对。

本可以把苹果改成别的形状，但**苹果是三消游戏里辨识度最高的水果**，
换掉会增加用户的认知成本。**所以保留，靠明度差 60.7 拉开**（130.0 vs 69.3）。

> ⚠️ **代价**：这两个的**颜色绝对不能画偏**。
> 橘子偏暗或苹果偏亮，这对就会撞。**自检时重点看这一对。**

---

## 1. 执行方式

- 用 **imagegen skill 的内置 `image_gen` 工具**
- §3 的六段 prompt **逐字使用**
- 尺寸 **256 × 256**，**透明背景 PNG**
  🔴 **尺寸与透明由后处理保证**，见 [LEGIBILITY-SPEC §6.5](./LEGIBILITY-SPEC.md) ——
  模型原始输出是 1254² 无 Alpha，**那是预期行为，不算失败**
- **每张出 2 个候选**
- 🔴 **六张全部完成后，先做 §4.1 的联合测试，再决定交付哪一组候选**

### 保存路径

```
garden/assets/pieces/piece-{color}.png
候选放 garden/assets/pieces/candidates/
```

---

## 2. 统一规格（六张都必须满足）

| 项 | 值 |
| --- | --- |
| 输出尺寸 | **256 × 256 px** |
| 实际显示 | 约 38~43pt（@3x ≈ 129px），256 给足余量 |
| 背景 | **透明 PNG** |
| 内容占比 | 主体占画布 **85%**，四周留 7.5% 空隙 |
| 构图 | 主体视觉中心在画布正中 |
| 光照 | **左上 45°**，六张必须一致 |
| 表面 | **哑光 + 微弱光泽**，不要强反光 |

### 2.1 统一风格段（**六段 prompt 里都已嵌入，请勿删改**）

```text
STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes, matte surface with only a subtle sheen.
The flat mid-tone base color dominates the shape: the highlight covers less than a third
of the surface and the soft shadow covers less than a third, so the piece reads as one
clear tone when seen small.
```

> 🔴 **最后那句是 §0.3 的直接编码，不要删。**

---

## 3. 六段 Prompt（**逐字使用**）

### 3.1 `piece-yellow.png` —— 香蕉

> 造型价值：**唯一的非凸形状**，剪影一眼认出。

```text
A cute stylized banana game piece, a single curved banana shaped like a crescent moon,
soft rounded 3D cartoon form, seen from the front and slightly above, centered and filling
about 85 percent of a square frame.

COLOR — USE THESE EXACT VALUES: the base color is #FFDE5C, the highlight is #FFEC9B and
the shadow is #D9B12E. Do not shift these colors.

SHAPE — THIS IS THE MOST IMPORTANT PART: a clear CRESCENT curve with both tips tapering.
The silhouette alone must be instantly recognizable as a banana and must not read as a
round blob. Keep the curve open and obvious.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes, matte surface with only a subtle sheen.
The flat mid-tone base color dominates the shape: the highlight covers less than a third
of the surface and the soft shadow covers less than a third, so the piece reads as one
clear tone when seen small.

Critical: the crescent silhouette is unmistakable even as a solid black shape; the base
color dominates and the highlight is small; the shadow is soft and NOT pure black; no
text, no watermark, no signature; the whole shape is inside the frame with clear margin.

Output 256x256 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 3.2 `piece-green.png` —— 梨

> 造型价值：**葫芦形**，有明确的腰线。

```text
A cute stylized pear game piece, a single whole pear, soft rounded 3D cartoon form, seen
from the front and slightly above, centered and filling about 85 percent of a square frame.

COLOR — USE THESE EXACT VALUES: the base color is #7FD957, the highlight is #A8E88A and
the shadow is #4E9E33. Do not shift these colors.

SHAPE — THIS IS THE MOST IMPORTANT PART: a clear GOURD silhouette, NARROW at the top and
WIDE at the bottom, with a visible waist where the narrow upper part meets the round lower
part. A very short stem on top. The silhouette alone must be distinguishable from a plain
circle.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes, matte surface with only a subtle sheen.
The flat mid-tone base color dominates the shape: the highlight covers less than a third
of the surface and the soft shadow covers less than a third, so the piece reads as one
clear tone when seen small.

Critical: the narrow-top wide-bottom gourd silhouette with a visible waist is clear even
as a solid black shape; the base color dominates and the highlight is small; the shadow is
soft and NOT pure black; no leaf and no extra detail; no text, no watermark, no signature.

Output 256x256 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 3.3 `piece-blue.png` —— 蓝莓

> 造型价值：靠**顶部星形花萼**破圆。

```text
A cute stylized blueberry game piece, a single round berry, soft rounded 3D cartoon form,
seen from the front and slightly above, centered and filling about 85 percent of a square
frame.

COLOR — USE THESE EXACT VALUES: the base color is #5FB0E8, the highlight is #9BCFF2 and
the shadow is #3579AD. Do not shift these colors.

SHAPE — THIS IS THE MOST IMPORTANT PART: a round berry topped with a small STAR-SHAPED
CALYX made of five short pointed tips, in the same blue family but darker. The star tips
must break the round outline clearly enough that the silhouette is not just a circle.
Make the star crown large enough to survive being seen very small.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes, matte surface with only a subtle sheen.
The flat mid-tone base color dominates the shape: the highlight covers less than a third
of the surface and the soft shadow covers less than a third, so the piece reads as one
clear tone when seen small.

Critical: the pointed star calyx clearly breaks the circular silhouette even as a solid
black shape; the base color dominates and the highlight is small; the shadow is soft and
NOT pure black; no text, no watermark, no signature.

Output 256x256 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 3.4 `piece-orange.png` —— 橘子

> 🔴 **这张与苹果是最接近的一对，靠明度拉开。颜色绝对不能画偏（不要变亮）。**

```text
A cute stylized tangerine game piece, a single round citrus fruit, soft rounded 3D cartoon
form, seen from the front and slightly above, centered and filling about 85 percent of a
square frame.

COLOR — USE THESE EXACT VALUES: the base color is #E0701F, the highlight is #F0A163 and
the shadow is #A34D11. Do not shift these colors and do NOT make it lighter or more
yellow — this exact darkness is required to keep it distinct from the other pieces.

SHAPE: a round citrus with a slightly dimpled top and a very small dark green stem nub on
top. The surface has a gentle citrus-peel texture that is suggested with soft subtle
bumps only, never with sharp speckles or noise.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes, matte surface with only a subtle sheen.
The flat mid-tone base color dominates the shape: the highlight covers less than a third
of the surface and the soft shadow covers less than a third, so the piece reads as one
clear tone when seen small.

Critical: the orange must stay DARK as specified and must not drift lighter; the peel
texture stays subtle and does not turn into noise; the base color dominates and the
highlight is small; the shadow is soft and NOT pure black; no text, no watermark, no
signature.

Output 256x256 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 3.5 `piece-purple.png` —— 葡萄串

> 造型价值：**唯一的复合轮廓**。

```text
A cute stylized bunch of grapes game piece, several small round grapes clustered together,
soft rounded 3D cartoon form, seen from the front and slightly above, centered and filling
about 85 percent of a square frame.

COLOR — USE THESE EXACT VALUES: the base color is #7B4FB0, the highlight is #A87FD4 and
the shadow is #523175. Do not shift these colors.

SHAPE — THIS IS THE MOST IMPORTANT PART: a CLUSTER of about six or seven round grapes
forming a clear downward-pointing TRIANGULAR outline, wide at the top and narrowing to a
single grape at the bottom. Use FEW and LARGE grapes rather than many small ones, so the
cluster still reads as a cluster when seen very small. The bumpy compound silhouette is
what distinguishes this piece.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes, matte surface with only a subtle sheen.
The flat mid-tone base color dominates the shape: the highlight covers less than a third
of the surface and the soft shadow covers less than a third, so the piece reads as one
clear tone when seen small.

Critical: use FEW LARGE grapes, not many tiny ones; the bumpy triangular cluster
silhouette is clear even as a solid black shape; the base color dominates and the
highlight is small; the shadow is soft and NOT pure black; no text, no watermark, no
signature.

Output 256x256 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 3.6 `piece-red.png` —— 苹果

> 🔴 **这张与橘子是最接近的一对。颜色绝对不能画偏（不要变亮、不要偏橙）。**

```text
A cute stylized apple game piece, a single whole apple, soft rounded 3D cartoon form, seen
from the front and slightly above, centered and filling about 85 percent of a square frame.

COLOR — USE THESE EXACT VALUES: the base color is #B82533, the highlight is #DB5C67 and
the shadow is #7D1622. Do not shift these colors and do NOT make it lighter, brighter or
more orange — this exact deep red is required to keep it distinct from the other pieces.

SHAPE: a round apple with a clear DENT at the top where a short brown stem sits, and ONE
small green leaf attached beside the stem. The dented top and the single leaf are what
break the plain circular outline.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, clean chunky simple shapes, matte surface with only a subtle sheen.
The flat mid-tone base color dominates the shape: the highlight covers less than a third
of the surface and the soft shadow covers less than a third, so the piece reads as one
clear tone when seen small.

Critical: the red must stay DEEP as specified and must not drift lighter or toward orange;
exactly ONE leaf, kept large enough to be visible when small; the base color dominates and
the highlight is small; the shadow is soft and NOT pure black; no text, no watermark, no
signature.

Output 256x256 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

---

## 4. 自检表（**交付前必做**）

### 4.1 🔴🔴 40px 灰度联合测试（**硬性，本批的主要目的**）

**做法**：6 张同时缩到 **40×40 px**、**转灰度**、并列摆放。

| # | 检查 | 合格 | 不合格 |
| --- | --- | --- | --- |
| 1 | 🔴 **两两对比** | 6 个互不相同 | 有任意一对难以区分 → **重画** |
| 2 | 🔴 **橘子 vs 苹果** | 明显一亮一暗 | 两个都是中间调 → 重画 |
| 3 | **纯剪影**（全填黑） | 仍能分出 6 种外形 | 有两个剪影几乎一样 |
| 4 | **明度阶梯** | 六档均匀分布 | 有两个挤在同一档 |

> 🔴 **必须【缩小】和【灰度】两个条件同时施加。**
> 分开测会放过问题：40px 彩色能分辨、灰度大图也能分辨，
> 但**又小又灰**才是真实的最坏情况（老年视力 + 昏暗环境 + 小屏）。
>
> ⚠️ **不要因为色值已按灰度算过就跳过此测试** —— 原因见 §0.3。
> **算过 ≠ 画出来没问题。**

### 4.2 缩小可读性

| # | 检查 |
| --- | --- |
| 5 | 40px 下仍能认出是什么水果 |
| 6 | 40px 下细节没有糊成一团 |
| 7 | 🔴 若糊了 → **简化造型**（去掉叶子、去掉纹理），**不要加细节** |

> 📌 **糊了要做减法，不要做加法。** 40px 下细节只会变成噪点。

### 4.3 明度控制（§0.3 的直接检查）

| # | 检查 |
| --- | --- |
| 8 | 高光面积 **< 1/3**，不是大面积反光 |
| 9 | 阴影面积 **< 1/3**，且**不是纯黑** |
| 10 | 主色占据画面主要面积，缩小后是**一个清晰的色调** |

### 4.4 整体一致性

| # | 检查 |
| --- | --- |
| 11 | 六张像**同一套**（材质、光泽、体积语言统一）|
| 12 | 光照方向都是左上 45° |
| 13 | 整体氛围**温暖治愈，不刺眼** |

### 4.5 技术

| # | 检查 |
| --- | --- |
| 14 | **后处理产物**尺寸精确 **256 × 256**（错一像素棋盘就错位）|
| 15 | **后处理产物**背景真透明、**无白边**（贴到深色底上检查）|
| 15b | ⚠️ `piece-yellow` 高光灰度 234，接近抠图阈值 —— **确认高光没被咬出洞** |
| 16 | 主体占 85%，**不出血、不贴边** |
| 17 | 无文字、无水印、无签名 |
| 18 | 禁用词零出现（`glossy` / `dramatic lighting` / `deep shadows` / `intricate details` 等）|

---

## 5. 做不到怎么办（**如实报告，不要凑数**）

| 情况 | 怎么处理 |
| --- | --- |
| 🔴 **某一对怎么都分不清** | **如实报告是哪一对，并附 40px 灰度对比图**。这是最有价值的反馈 —— 可能需要换造型或调色值，**那是工单要改，不是你的问题** |
| **橘子/苹果总是画偏色** | 如实报告。可以试着再强调，**但不要为了拉开明度把颜色改到色板之外** |
| **40px 下糊成一团** | 先按 §4.2 做减法简化造型；仍不行则报告 |
| **色值照抄后不好看** | 🔴 **以色值为准**。"好看"在本项目排在"分得清"之后 —— 但可以报告你的观察 |
| **两条判据打架** | 🔴 **停下来报告**，不要二选一硬凑 |

> 📌 **本批交付后请停下，等待人工确认通过 40px 灰度联合测试。**
> **确认前不要开始第 3 批。**
>
> 🔴 **一张分不清的棋子会一直留在游戏里**，
> 它造成的伤害（目标用户玩不了）**远大于晚一天交付**。
