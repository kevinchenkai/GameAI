# Codex 出图工单 · 第 0 批 —— 旺财 Master Reference（**1 张**）

> **这份文件是给 Codex 直接执行的。**
> 🔴 **先读 [LEGIBILITY-SPEC.md](./LEGIBILITY-SPEC.md)** —— 通用禁用词与光照约束在那里。

- **建立**：2026-08-07
- **要出的图**：`pet-wangcai-master.png`（**1 张**）
- **用途**：★ **角色基准，不进游戏**。后续 7 张旺财素材全部基于它派生

---

## 0. 先看这三条

### 0.1 🔴 为什么只画一张就停

这是**整个美术流程的第一个卡点**。它不过，**不许画任何旺财状态图或 Puppet 分层**。

理由是纯文本 prompt **无法保证角色一致性** —— 同一段描述生成两次，
耳朵形状、眼距、毛色深浅、头身比都会漂移。玩家会觉得"这不是同一只狗"。

**解决办法是先定一张基准图，后续全部基于它编辑派生**，而不是重新生成。
所以基准图错了，后面 7 张全错。

> 🔴 **本工单只要 1 张。请不要"顺手把 happy 也画了"。**

### 0.2 这张图**不进游戏**

它是 1024×1024（比实际使用的 512 大一倍），只用来：

1. 人工确认「这就是旺财」
2. 作为后续所有派生图的参考输入
3. 我照着它标定 Puppet 的旋转锚点

**留足编辑余量**是它比状态图大的原因。

### 0.3 🔴 本批最大的风险：**画成"通用可爱小狗"**

「活泼、惹人喜爱」这类形容词模型很容易滑向**低幼玩偶**或**特定品种犬**
（柴犬 / 柯基 / 金毛的特征非常强势）。

**旺财要的是"中华田园犬气质"** —— 不是某个品种，是那种
邻居家养的、见到你会摇尾巴的、有点憨但很机灵的普通狗。

> ⚠️ **若多次尝试仍摆脱不了品种犬特征，请如实报告** ——
> 那是有价值的边界数据，我们可以调整描述策略。

---

## 1. 执行方式

- 用 **imagegen skill 的内置 `image_gen` 工具**
- §3 的 prompt **逐字使用**，不要替换成你认为更好的描述
- **出 3 个候选**（角色定稿很关键，多给几个选择）
- 🔴 **生成后必须做 §1.1 的后处理**，再判断验收

### 🔴 1.1 尺寸与透明由**后处理**保证，不要求模型直接产出

> ⚠️ **这一条是第一轮的教训**：工单原本直接要求「1024×1024 + 真透明」，
> 但内置工具产出的是 **1254×1254、无 Alpha 通道**。
> **这是工单把工具做不到的事写成了硬性交付条件** —— 是工单的问题。

**正确做法**：模型只管画对角色，尺寸和透明**用后处理解决**。

```
生成（1254×1254，白底 RGB）
   ↓
① 抠图：亮度 > 235 且低饱和的像素 → 透明
        边缘羽化 1~2px，避免白边
   ↓
② 缩放：1254 → 1024，高质量重采样（Lanczos）
   ↓
③ 保存：RGBA PNG
```

**三个候选都做这个处理**，输出到候选目录，文件名加 `-rgba` 后缀。

> 📌 **为什么可以这么做**：实测背景亮度 238~255，接近纯白且无烘焙棋盘格，
> 亮度抠图足够干净。
> ⚠️ **若某张的背景不是纯白**（例如模型给角色打了投影到背景上），
> **报告，不要硬抠** —— 抠出来会带灰边。

### 保存路径

```
garden/assets/pet/pet-wangcai-master.png        ← 后处理并选定的那张
候选放 garden/assets/pet/candidates/            ← 原图与 -rgba 版本都放这里
```

---

## 2. 角色设定（**已定稿，不要自由发挥**）

| 项 | 内容 | 备注 |
| --- | --- | --- |
| **名字** | 旺财 | |
| **性格** | 活泼、惹人喜爱 | |
| **口头禅** | 「快来玩呀！」 | 招呼语，不是催促 |
| 物种 | 小狗，**中华田园犬气质** | 🔴 不要画成特定品种犬 |
| 毛色 | 奶油色至浅棕 | |
| 尾巴 | **粗短、上翘** | 🔴 见 §2.2 |
| 耳朵 | 不要盖住脸 | |
| 配饰 | **无项圈、无任何配饰** | |
| 头身比 | 🔴 **2.2 : 1** —— **头比躯干大一倍以上** | ★ 见 §2.1 |

### 2.1 🔴 头身比是**硬性判据**，不是风格建议

> ⚠️ **第一轮三个候选全部栽在这条**：画出来都是接近 **1:1** 的写实比例。
> 角色气质是对的，**只差比例**。

**为什么这条不能让步**：旺财在游戏里的实际显示高度约 **96pt**。
写实比例下，脸只占其中一小块，**happy / hint 的表情在这个尺寸下读不出来** ——
而"表情读得出来"是宠物系统的全部意义。

| ✅ 要的 | ❌ 不要的 |
| --- | --- |
| 头是整个角色**最主要的形体**，躯干和腿短小 | 头和身体差不多大的写实小狗 |
| 头比躯干**大一倍以上** | "略微放大一点头" |
| 仍读得出是**真狗**的卡通化 | 毛绒玩具 |

> 📌 **一句话判据**：**缩到 96pt 高还能看清五官表情**，就够了；看不清就是头不够大。

### 2.2 🔴 尾巴必须上翘 —— 这不是审美偏好

**垂尾在犬类肢体语言里意味着沮丧或警惕。** 画成垂尾，
玩家的第一印象就是"这只狗不高兴"，与"活泼"直接冲突。

**除 thinking / encourage 两个状态外（那两张在 V1 Full），所有旺财素材的尾巴都应上翘或摆动。**

### 2.3 「惹人喜爱」的分寸

| ✅ 要做到 | ❌ 不要做成 |
| --- | --- |
| 眼神友善 | 谄媚、讨好 |
| 姿态放松 | 僵硬摆拍 |
| 有生命力 | 玩具感、塑料感 |
| 憨中带机灵 | 低幼、过度卖萌 |

> 📌 **参考感觉**：邻居家那只见到你会摇尾巴的狗，
> **不是玩具店货架上的毛绒公仔。**

---

## 3. Prompt（**逐字使用**）

```text
A friendly cartoon puppy character sheet reference, full body, standing in a relaxed neutral
pose, three-quarter view facing slightly toward the viewer, centered in the frame.

THE CHARACTER: a young mixed-breed village dog with a CREAM TO LIGHT BROWN coat. He is NOT
any specific recognizable breed — not a Shiba Inu, not a Corgi, not a Golden Retriever, not a
Husky. He looks like an ordinary friendly neighbourhood dog: a gently rounded muzzle, a small
dark nose, warm dark round eyes set well apart, and a soft closed-mouth smile.

PROPORTIONS — THIS IS A HARD REQUIREMENT AND THE MOST COMMON FAILURE: a strongly stylized
chibi-like head-to-body ratio of roughly 2.2 to 1. The HEAD IS MORE THAN TWICE AS LARGE as
the torso and is the single dominant shape of the whole character. The body and the legs are
small and stubby beneath it. This character will be displayed at a small size in a mobile
game, so the head has to carry all of the readability. Do NOT draw realistic dog proportions
where the head is roughly the same size as the body. He should still read as a real dog
rather than as a plush toy.

THE TAIL — THIS IS IMPORTANT: a THICK, SHORT tail that CURVES UPWARD above the line of his
back. The tail must NOT hang down and must NOT be tucked. An upward tail is what makes him
read as lively and happy.

THE EARS: medium-sized ears that fold slightly at the tip and sit clear of his face. They
must NOT cover or overlap his eyes.

NO ACCESSORIES AT ALL: he wears NO collar, NO bandana, NO tag, NO clothing and no accessory
of any kind. His neck is bare.

PERSONALITY TO CONVEY: lively and endearing. His eyes are friendly, his posture is relaxed
and alert, and he looks like he is about to invite you to play. He is NOT sad, NOT sleepy,
NOT pleading and NOT overly cute. Avoid a babyish or saccharine look.

STYLE: soft rounded 3D cartoon style, warm healing color palette, gentle top-left
45-degree lighting, soft non-black shadows, clean chunky shapes, matte surface with only a
subtle sheen, mobile game character art.

Critical: the head is clearly MORE THAN TWICE the size of the torso; the tail curves UPWARD
and is thick and short; the ears do not cover the eyes; there is NO collar and no accessory
anywhere on the character; he is not a specific dog breed; the full body including all four
paws and the tail is completely inside the frame with clear margin on every side; no text,
no watermark, no signature.

Output 1024x1024 px, PNG. If the tool cannot output a real alpha channel, render the
character on a PLAIN PURE WHITE background with no shadow cast onto the background and no
checkerboard pattern, so the background can be keyed out afterwards.
```

---

## 4. 自检表（**交付前逐张过一遍**）

### 4.1 🔴 角色定位（**本批最重要**）

| # | 检查 | 合格 | 不合格 |
| --- | --- | --- | --- |
| 1 | **「活泼」读得出来** | 尾巴上翘、姿态有精神 | 尾巴下垂、无精打采 |
| 2 | **「惹人喜爱」读得出来** | 眼神友善、想摸一下 | 谄媚 / 呆滞 / 油腻 |
| 3 | 🔴 **中华田园犬气质** | 普通家犬感 | 明显是柴犬/柯基/金毛 |
| 4 | **不低幼** | 像真狗的卡通化 | 像毛绒玩具 |

> 🔴 **第 3 条是本批最容易失败的一条**（模型对品种犬的先验很强）。
> **判断方法**：问自己「**这只狗有名字吗？**」——
> 如果第一反应是"这是只柴犬"，就不合格；
> 如果是"这是只普通的小土狗"，就对了。

### 4.2 🔴 头身比（**第一轮全军覆没在这条，请单独查**）

| # | 检查 | 合格 | 不合格 |
| --- | --- | --- | --- |
| 5 | 🔴 **头 vs 躯干** | 头**明显大于躯干的两倍** | 头和身体差不多大 |
| 6 | 🔴 **96pt 缩放测试** | 缩到 **128px 高**仍能看清眼鼻嘴 | 五官糊成一片 |

> 🔴 **第 6 条是可执行的判据，请实际缩一遍再判断**，不要目测原图。
> 原图 1024px 下什么比例都好看，**96pt 才是真实使用尺寸**。

### 4.3 其余硬性要素

| # | 检查 |
| --- | --- |
| 7 | **尾巴粗短且上翘**（不是垂着、不是夹着）|
| 8 | **耳朵不盖眼睛** |
| 9 | 🔴 **无项圈、无任何配饰**（脖子是光的）|
| 10 | 毛色奶油至浅棕 |

### 4.4 技术（**后处理之后再查**）

| # | 检查 |
| --- | --- |
| 11 | 后处理产物尺寸 **1024 × 1024** |
| 12 | 后处理产物有**真 Alpha 通道**，背景透明、**无白边** |
| 13 | 🔴 **四爪与尾巴完整在画内**，四周留有空隙（后续要裁分层，贴边会裁坏）|
| 14 | 光照左上 45°，阴影不是纯黑，**且不投到背景上**（会影响抠图）|
| 15 | 无文字、无水印、无签名 |
| 16 | 禁用词零出现（见 [LEGIBILITY-SPEC §6](./LEGIBILITY-SPEC.md)）|

> 🔴 **第 11、12 条查的是后处理产物，不是模型原始输出。**
> 原始输出是 1254×1254 无 Alpha 属于**预期行为**，不是失败（见 §1.1）。
>
> 🔴 **第 13 条容易漏**：这张图后面要**拆成 5 个 Puppet 图层**，
> 尾巴或爪子贴到画布边缘，拆分时就会缺一块。

---

## 5. 做不到怎么办（**如实报告，不要凑数**）

| 情况 | 怎么处理 |
| --- | --- |
| 🔴 **头身比推不上去**（还是接近 1:1）| **如实报告并附 128px 缩放对比**。可试着在 prompt 里再加重，**但不要为了放大头把身体画到畸形** |
| **摆脱不了品种犬特征** | **如实报告**并附候选图。这是有价值的边界数据，我们可以换描述策略（例如改用负面词列举） |
| **尾巴总是画成垂的** | 如实报告。可在 prompt 里再强调一次，**但不要为了翘尾巴牺牲整体姿态自然度** |
| **模型坚持加项圈** | 如实报告，**不要交付带项圈的图** —— 项圈会出现在后续全部 7 张里 |
| **背景不是纯白 / 有投影** | 如实报告，**不要硬抠**（会带灰边）。可重出一版并强调 `no shadow cast onto the background` |
| **工具产出尺寸/格式不符** | ⚠️ **这不算失败** —— 按 §1.1 后处理即可。只有**后处理也救不回来**时才报告 |
| **两条判据打架** | 🔴 **停下来报告**，不要二选一硬凑 —— 判据互斥是工单的问题 |

> 📌 **第一轮你拒交并附技术核验，这个处理是对的，请保持。**
> **两条拒交理由中，「无 Alpha / 尺寸不符」属实，但那是工单的错**
> （把工具做不到的事写成硬性条件），已按 §1.1 改为后处理。
> **「棋盘格被烘焙进像素」这条经核验不成立** —— 背景是接近纯白（238~255）
> 加轻微噪点，你看到的棋盘格是图片查看器给透明区域画的底纹。

> 📌 **本批交付后请停下，等待人工确认「这就是旺财」。**
> **确认前不要开始第 2 批（Puppet 分层与状态图）。**
