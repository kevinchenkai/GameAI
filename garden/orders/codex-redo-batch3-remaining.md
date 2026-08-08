# Codex 重出指令 · 第 3 批剩余 9 张

> 承接 [第 3 批工单](./codex-imagegen-order-batch3-stage0-rest.md) 的未交付部分。
> 通用约束见 [LEGIBILITY-SPEC.md](./LEGIBILITY-SPEC.md)。

- **建立**：2026-08-08
- **背景**：第 3 批已交付 7 张（5 UI + 2 背景），**全部验收通过**。剩余 9 张分两种情况，处理方式完全不同。

---

## 0. 先说结论：院门不用重出

**我核对了你保留的候选文件，结论与你的判断相反：候选组 1 的四张是合格的，请直接交付。**

你按验收项 15「四张叠在一起，门的位置与大小应重合」判定不合格。这条判据是我写的，**写得不对**——我漏掉了一件事：

> **gate-0/1 的门是歪的，gate-2/3 的门是正的。这是工单 §6.1 要求的阶段差异（"歪→正"）。**
> 门被扶正，轮廓就必然不重合。**这里的"对不齐"正是修复本身。**

按原判据严格执行，等于要求"修好了但看起来没修"——自相矛盾。**是判据错了，不是你的图错了。**

### 0.1 我的实测数据

我对两组候选做了分区 IoU（相对 gate-0）：

**候选组 1：**

| | 左立柱 | 右立柱 | ★中间门板 | 底部地面 |
|---|---|---|---|---|
| vs gate-1 | 0.849 | 0.787 | **0.996** | 0.917 |
| vs gate-2 | 0.791 | 0.736 | **0.927** | 0.769 |
| vs gate-3 | 0.851 | 0.857 | **0.995** | 0.968 |

**候选组 2：**

| | 左立柱 | 右立柱 | ★中间门板 | 底部地面 |
|---|---|---|---|---|
| vs gate-1 | 0.771 | 0.678 | 0.895 | 0.846 |
| vs gate-2 | 0.753 | 0.656 | 0.915 | 0.812 |
| vs gate-3 | 0.799 | 0.775 | 0.896 | 0.861 |

**候选组 1 在每一个分区都优于候选组 2。**

再看包围盒（组 1）：中心 x = 400.0 / 399.5 / 400.0 / 399.0，**四张最大偏差 1px**；宽度 769 / 768 / 769 / 767，**最大偏差 2px**。视角、构图、缩放**完全一致**——这正是验收项 15 真正想要的东西。

立柱与地面 IoU 偏低（0.74~0.86）同样是**设计要求的**：gate-0 有杂草、gate-3 有花丛和灯笼，工单 §6.1 明写了。这些区域的轮廓本来就该变。

### 0.2 判据修正（**以此为准**）

| | 原判据（作废） | **新判据** |
|---|---|---|
| 15 | 四张叠加，门的轮廓应重合 | **门的中心 x 偏差 ≤ 8px、包围盒宽度偏差 ≤ 16px**（即视角/缩放/位置一致）。**轮廓因"歪→正"、"加花加灯笼"而不重合是正确的** |

### 0.3 请执行

1. 把**候选组 1** 的四张交付到正式路径：

```
garden/assets/garden/garden-gate-0.png   ← garden-gate-0-candidate-1.png
garden/assets/garden/garden-gate-1.png   ← garden-gate-1-candidate-1.png
garden/assets/garden/garden-gate-2.png   ← garden-gate-2-candidate-1.png
garden/assets/garden/garden-gate-3.png   ← garden-gate-3-candidate-1.png
```

2. 保持 800×800、真 Alpha、不要重新生成、**不要再做任何像素改动**。
3. 确认交付即可，无需再出新候选。

> ⚠️ 如果你认为候选组 1 还有**别的**问题（不是对齐问题），说出来，我再看。
> 但"对不齐"这一条已经查清了，不成立。

---

## 1. 半透明 5 张：同意换原生 Alpha 路径，但先出 1 张

你的判断我认可：这 5 张**必须真 Alpha**，白底抠图救不回来。理由工单 §8 已写明——白底抠图只能产生**二值**透明（0 或 255），而这 5 张的全部价值就在**中间值**。

你保留了能力测试原图作为证据，没有伪造半透明，这是对的做法。

### 1.1 🔴 但先只出 1 张：`obstacle-ice-1.png`

**不要一次出 5 张。** 原因：

- 换生成路径 = 换了一个**尚未验证过的产出源**。前 22 张的质量是在内置 `image_gen` 上建立的，新路径的表现我没有任何证据。
- 冰块是这 5 张里**玩法权重最高**的：它直接决定玩家能否看清冰下的水果、能否规划下一步。也最能暴露半透明质量问题。
- 一张出错，改一次 prompt；五张一起出错，返工五倍。

**流程：出 `obstacle-ice-1.png` → 交付 → 我实测「叠在 6 色棋子上的可辨识度」→ 通过后你再出剩下 4 张。**

### 1.2 对新路径的约束（**与后处理规范一致**）

换的是**生成工具**，不是**验收标准**。[LEGIBILITY-SPEC §6.5](./LEGIBILITY-SPEC.md) 对后处理的限制原样适用：

| | 允许 | 禁止 |
|---|---|---|
| 后处理 | 改透明、改尺寸、把漂移的主色归回工单色板 | **重绘、加细节、改造型** |

另外请**如实报告你用了什么工具**（名称即可），我需要知道这 5 张和前 22 张不同源。

### 1.3 Prompt（**逐字使用**，与原工单 §3.1 一致）

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

### 1.4 保存路径

```
garden/assets/obstacles/obstacle-ice-1.png          ← 正式（先只出这一张）
garden/assets/obstacles/candidates/                 ← 候选与测试图
```

### 1.5 🔴 必交的验收附件

除了 `obstacle-ice-1.png` 本身，**必须一并交付**：

```
garden/assets/obstacles/candidates/ice-1-over-6-pieces.png
```

内容：**把冰块分别叠在 6 色棋子上，排成一行**。这是唯一能证明"透得出来"的证据。

> 📌 判断标准不是"冰好不好看"，而是**「隔着冰，六种水果还认得出是哪一种」**。
> 认不出就是不合格，无论冰本身多漂亮。

### 1.6 自检

| # | 检查 |
|---|---|
| 1 | 🔴 **真 Alpha 通道**，且存在**中间值**（不是只有 0 和 255）|
| 2 | 🔴 **叠在 6 色棋子上，每一色都还认得出是什么水果** |
| 3 | 256×256，轮廓填满画布（是一个格子的覆盖物）|
| 4 | 裂纹可见（这是两阶段里**较弱**的一张）|
| 5 | 报告所用工具名称 |

---

## 2. 本次交付清单

```
院门 4 张  ← 从候选组 1 直接交付，不重新生成
冰块 1 张  ← 新路径试产 + 6 色叠加测试图
─────────────────────────────
本次共 5 张
```

**剩余 4 张（3 叠加层 + ice-2）等冰块验收通过后再出。**

---

## 3. 做不到怎么办

| 情况 | 怎么处理 |
|---|---|
| **新路径也出不了真 Alpha** | **停下来报告**，附能力测试证据。我们再想办法（例如改用纯色块占位，等后续补） |
| **冰块透明度够但棋子仍认不出** | 如实报告并附 6 色叠加图。**可以再往"更透"推**（30~40%），不要担心冰看起来太淡 |
| **新路径的画风与前 22 张对不上** | 🔴 **停下来报告**。风格断层比缺一张图严重 |
| **你认为院门候选组 1 还有别的问题** | 说出来，附证据。**但"对不齐"已查清不成立** |
| **两条判据打架** | 🔴 **停下来报告** |

> 📌 **不要凑数，不要伪造半透明。** 如实报告永远是对的。
