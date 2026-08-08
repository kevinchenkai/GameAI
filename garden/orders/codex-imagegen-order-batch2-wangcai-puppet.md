# Codex 出图工单 · 第 2 批 —— 旺财 Puppet 分层 + 状态图（**7 张 + 1 张验收件**）

> **这份文件是给 Codex 直接执行的。**
> 🔴 **前置：[第 0 批](./codex-imagegen-order-batch0-wangcai-master.md) 已定稿。**
> 本批全部**基于 Master 编辑派生**，不要从纯 prompt 重新生成。

- **建立**：2026-08-07
- **要出的图**：Puppet 5 层 + `preview-composite` + `happy` + `hint`
- **前置**：`pet-wangcai-master.png` 已人工确认

---

## 0. 先看这四条

### 0.1 🔴 为什么 Idle 不画整图，而是拆成 5 层

旺财的性格是**活泼**。直觉做法是"多画几张跳跃欢呼图"，
**但这条路走不通** —— 重反应动画有 8% 的时长预算上限，撞爆预算会让"陪伴变打断"。

**正确做法：把活泼放在 Idle 层。**

玩家感知到的"这只狗很活泼"，**80% 来自它在你不操作时也一直在动**，
而不是来自它庆祝得多用力。前者零预算成本，后者是稀缺资源。

**5 层 Puppet 能做出的动画**（全部是低成本 Tween，不占预算）：

| 效果 | 实现 |
| --- | --- |
| 尾巴摆动 | `tail.rotation` 循环 |
| 眨眼 | `eyes-open` ↔ `eyes-blink` 切换 |
| 耳朵抖动 | `ears.rotation` 短促 |
| 呼吸 | `body.scaleY` 微幅 |
| **偶尔看向玩家** | `eyes` 容器 x/y 偏移 |

> 📌 **这也是本批省下的第一张图**：Idle 不需要整图。

### 0.2 🔴 **不要从纯文本 prompt 重新生成**

纯文本生成的漂移（耳朵形状、眼距、毛色深浅、头型）**无法靠 prompt 一致性解决**。
这正是第 0 批先做 Master 的全部理由。

**本批全部用 image_gen 的图生图 / 局部编辑能力，以 Master 为参考输入。**

### 0.3 🔴 关于旋转锚点 —— **请注意职责划分**

**PNG 格式存不了 pivot 数据。** 所以：

| 谁 | 负责什么 |
| --- | --- |
| **你（美术）** | 保证「根部朝向合理的一侧」（tail 朝一侧、ears 朝上）+ 交付拼合预览图 |
| **我（代码）** | 精确旋转坐标，定义在 `config/pet-rig.ts`，照着预览图实测标定 |

> ✅ **你不需要标注锚点，也不需要提供坐标。**
> （上一版工单曾要求"在图里定义旋转锚点"，那是**无法交付的要求**，已修正。）

### 0.4 一处**故意的取舍**：Stage 0 **不拆 head 层**

「偶尔看向玩家」这个微动作，理论上拆出 head 层能做得更好（可以转头）。
**但为一个微动作再加一层资产和 Rig 复杂度不划算。**

**Stage 0 只移动 eyes 容器的偏移**，head 含在 body 里。
若后续真人测试证明"看玩家"对陪伴感特别有效，V1 Full 再拆。

> ⚠️ **所以 `body.png` 必须包含头部。** 不要自作主张拆开。

---

## 1. 执行方式

- 用 **imagegen skill 的内置 `image_gen` 工具**，**以 Master 为参考输入**
- 尺寸见各图规格，**全部透明背景 PNG**
  🔴 **尺寸与透明由后处理保证**，见 [LEGIBILITY-SPEC §6.5](./LEGIBILITY-SPEC.md)
- **每张出 2 个候选**

### 参考图

| 文件 | 用途 |
| --- | --- |
| 🔴 `garden/assets/pet/pet-wangcai-master.png` | **角色基准** —— 毛色、耳型、体型、尾巴照它复制 |

### 保存路径

```
garden/assets/pet/wangcai/body.png  tail.png  ears.png
                        eyes-open.png  eyes-blink.png
                        preview-composite.png     ← 验收件，不进游戏
garden/assets/pet/pet-wangcai-happy.png
garden/assets/pet/pet-wangcai-hint.png
候选放 garden/assets/pet/candidates/
```

---

## 2. 第一部分：Puppet 分层（5 张 + 1 张验收件）

### 2.1 规格

| 文件 | 尺寸 | 要求 |
| --- | --- | --- |
| `body.png` | **512×512** | 完整身体，🔴 **含头部**（Stage 0 不拆 head）|
| `tail.png` | **256×256** | 尾巴，🔴 **根部朝画布一侧**（便于绕根部旋转）|
| `ears.png` | **256×256** | 双耳，🔴 **根部朝画布上方** |
| `eyes-open.png` | **256×128** | 睁眼 |
| `eyes-blink.png` | **256×128** | 闭眼版（一条弧线即可）|
| `preview-composite.png` | 512×512 | 🔴 **5 层拼合效果图，验收用，不进游戏** |

### 2.2 🔴 各层单独看必须画完整

**body 被 tail / ears 遮挡的部分也要画完整。**

理由：这些层会**旋转**。尾巴转起来时，原本被尾巴盖住的身体部分会露出来 ——
如果那里是空的，就会**露白**。

> ⚠️ 这条最容易漏。检查方法：把每层单独放在纯色背景上看，有没有缺口。

### 2.3 🔴 eyes 两张必须同尺寸同位置

`eyes-open` 与 `eyes-blink` **切换时不能位移**。
眼睛是脸上最受注意的部分，位移 1px 玩家都能看出"抖了一下"。

### 2.4 Prompt 指引（图生图，以 Master 为参考）

```text
[Using pet-wangcai-master.png as the character reference]

Separate this exact character into a layered puppet for 2D animation. Keep the identical
fur color, ear shape, tail shape, eye size and body proportions as the reference — this
must remain the same dog.

Produce these layers, each on a fully transparent background:

1. BODY (512x512): the complete dog INCLUDING THE HEAD, but WITHOUT the tail, WITHOUT the
   ears and WITHOUT the eyes. Draw the body COMPLETE even in the areas that the tail and
   ears would normally cover, because those layers will rotate and must not reveal any
   empty gap underneath.

2. TAIL (256x256): the tail only, positioned so that its ROOT is toward ONE SIDE of the
   canvas, so it can be rotated around that root.

3. EARS (256x256): both ears only, positioned so that their ROOTS are toward the TOP of
   the canvas, so they can be rotated around those roots.

4. EYES-OPEN (256x128): both open eyes only, centered.

5. EYES-BLINK (256x128): both closed eyes, drawn as simple downward curved lines, at
   EXACTLY the same size and EXACTLY the same position within the canvas as EYES-OPEN, so
   that switching between them causes no shift at all.

6. PREVIEW-COMPOSITE (512x512): all five layers stacked back together, to prove they
   reassemble into the reference character with no seams and no gaps.

Critical: the body layer includes the head; every layer is drawn complete with no missing
areas where other layers overlap; eyes-open and eyes-blink are pixel-aligned to each other;
transparent backgrounds; no text, no watermark, no signature.
```

### 2.5 Puppet 自检表

| # | 检查 |
| --- | --- |
| 1 | 🔴 5 层能**严丝合缝拼回 Master 的样子**（交付 `preview-composite.png` 佐证）|
| 2 | `tail` 根部朝画布一侧，`ears` 根部朝上 |
| 3 | 🔴 `eyes-open` / `eyes-blink` **同尺寸同位置**，切换不位移 |
| 4 | 🔴 各层单独看**无缺口** —— body 被遮挡处也画完整 |
| 5 | 🔴 **body 含头部** |
| 6 | **后处理产物**尺寸精确，背景真透明、**无白边**（贴深色底检查）|

---

## 3. 第二部分：整图状态（2 张）

### 3.1 规格

| 项 | 值 |
| --- | --- |
| 尺寸 | **512 × 512 px** |
| 背景 | 透明 PNG |
| 构图 | 全身，脚底贴近画布下缘（留 5% 空隙）|
| 朝向 | 面向观众，略偏 3/4 侧 |

### 3.2 🔴 与 Puppet **构图位置必须一致**

运行时会在 Puppet（Idle）与整图（happy / hint）之间切换。
**构图不一致，切换时旺财会"跳"一下。**

> 📌 **检查方法**：把 `preview-composite.png` 与两张状态图叠在一起，
> 身体的位置与大小应当基本重合。

### 3.3 `pet-wangcai-happy.png`

```text
[Using pet-wangcai-master.png as the character reference]

Same puppy character Wangcai, identical fur color, ear shape, tail shape, eye size and
body proportions as the reference.

POSE: standing up on all fours with his weight forward and his chest lifted, clearly
pleased. His tail is WAGGING WIDELY and swept upward — you may draw a soft motion trail to
suggest the wag. His eyes are curved into happy crescents and his mouth is open in a
cheerful smile.

He is happy in an ordinary everyday way — pleased, not hysterical.

COMPOSITION: full body, feet close to the bottom edge of the canvas with about five
percent margin, facing the viewer at a slight three-quarter angle, matching the framing and
scale of the reference.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky shapes, matte surface with only a
subtle sheen.

Critical: same dog as the reference; NO collar and no accessory; tail is up and wagging;
whole body inside the frame; no text, no watermark, no signature.

Output 512x512 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 3.4 `pet-wangcai-hint.png`

> 🔴 **这张的语气是「邀请」，不是「催促」。** 玩家愣住时旺财招呼你一起玩。
> 配套台词是「快来玩呀！」

```text
[Using pet-wangcai-master.png as the character reference]

Same puppy character Wangcai, identical fur color, ear shape, tail shape, eye size and
body proportions as the reference.

POSE: turned to one side with one FRONT PAW LIFTED and pointing clearly toward that side,
his head TILTED in a curious way, looking in the direction he is pointing. His tail is
raised. His expression is focused and eager, as if he has spotted something and wants you
to come and look.

TONE — THIS MATTERS: he is INVITING, not nagging. He looks like he wants to play together,
not like he is telling you to hurry up. Keep the expression bright and friendly rather
than impatient or worried.

COMPOSITION: full body, feet close to the bottom edge of the canvas with about five
percent margin, at a three-quarter angle, matching the framing and scale of the reference.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky shapes, matte surface with only a
subtle sheen.

Critical: same dog as the reference; NO collar and no accessory; the pointing paw and the
head tilt are both clearly readable at small size; tail is up; the expression is inviting
and NOT impatient; whole body inside the frame; no text, no watermark, no signature.

Output 512x512 px, PNG. If the tool cannot output a real alpha channel, render the subject
on a PLAIN PURE WHITE background with no shadow cast onto the background, so it can be
keyed out afterwards.
```

### 3.5 🔴 本批**只要这 2 张**

`watching` / `thinking` / `excited` / `skill` / `encourage` / `victory`
**推迟到 V1 Full，现在不要画。**

理由：Stage 0 宠物只做 Hint，不做技能与完整状态机。
提前画会浪费，且那时角色可能还要微调。

---

## 4. 整图自检表

| # | 检查 |
| --- | --- |
| 7 | 🔴 与 Master 是**同一只旺财**（毛色、耳型、体型、尾巴一致）|
| 8 | 🔴 与 Puppet **构图位置一致** —— 否则切换时会跳 |
| 9 | 表情**在小尺寸下读得出来**（缩到 96pt 高再看）|
| 10 | 🔴 **两张的尾巴都上翘或摆动**（「活泼」的统一体现）|
| 11 | `hint` 是**邀请**不是催促 |
| 12 | 🔴 **无项圈、无配饰**（与 Master 一致）|
| 13 | **后处理产物** 512×512，背景真透明无白边，全身在画内 |
| 14 | 无文字、无水印、无签名 |

---

## 5. 做不到怎么办（**如实报告，不要凑数**）

| 情况 | 怎么处理 |
| --- | --- |
| 🔴 **分层拼不回 Master 的样子** | **如实报告并附 `preview-composite.png`**。这是本批最关键的验收项，拼不回去就没法用 |
| **body 被遮挡处画不完整** | 如实报告。这条不能将就 —— 运行时会露白 |
| **eyes 两张对不齐** | 如实报告。可以试着用同一张图编辑得到闭眼版，保证对齐 |
| **状态图与 Puppet 构图对不上** | 如实报告，附叠加对比图 |
| **角色漂移了**（不像同一只狗）| 🔴 **如实报告，不要交付**。漂移会一直留在游戏里 |
| **两条判据打架** | 🔴 **停下来报告** |

> 📌 **可与[第 3 批](./codex-imagegen-order-batch3-stage0-rest.md)并行**（前提是第 1 批棋子已通过）。
