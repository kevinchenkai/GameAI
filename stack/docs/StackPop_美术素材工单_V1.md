# StackPop 美术素材工单 V1

> **执行方**：Codex Sol（含 Image Gen）
> **提出方**：Claude Opus（方案设计方）
> **依据**：`H5_StackPop_游戏策划和执行方案_V0.3.md` §20~§23
> **日期**：2026-08-22
> **总量**：**23 张**（分 3 批产出）

---

## 0. 怎么用这份工单

1. **先读 §1 Style Guide** —— 所有 prompt 必须带 §1.5 的统一后缀，否则风格会散
2. **按 §2 批次顺序产出** —— 第一批过验收再画第二批，不要一次全画
3. **每张图对照 §6 自检** —— 尤其是 **32px 眯眼测试**
4. **按 §5 的路径与命名投放** —— 命名错了代码加载不到

### 核心纪律

> **同名同尺寸替换。** 代码里已有占位图（M1 用色块），正式图用**完全相同的文件名和尺寸**覆盖即可，零改代码。

> 🔴 **改图必须换文件名**（`paw.webp` → `paw-v2.webp`）。
> 服务器静态图片 `expires 30d`，同名覆盖会让用户 30 天内看到旧图。
> 同仓库 garden 项目已踩过这个坑。

---

# 1. Style Guide

## 1.1 视觉定位

> **软萌、清爽、高辨识、轻立体。**

主题：**萌宠花园**。玩家在一个明亮的猫咪花园里整理卡片。

**明确避免：**

- ❌ 廉价小游戏质感
- ❌ 纯扁平 UI（要有体积，但不写实）
- ❌ 复杂写实、照片级
- ❌ 高密度细节（本作最小显示 32×32px，细节会糊成一团）
- ❌ 过度刺眼的高饱和
- ❌ 直接复制参考截图中受版权保护的素材

## 1.2 本作与普通三消的关键差异 ★ 决定美术标准

**StackPop 的 Tile 底色是统一的奶油色，靠「图案轮廓」区分，不是靠颜色区分。**

这与色块型三消完全不同，因此验收标准也不同：

```text
色块三消：颜色是唯一区分维度 → 要求任意两色灰度可分
StackPop：轮廓是主要区分维度 → 要求任意两图案轮廓可分
          颜色是辅助维度     → 只要求「轮廓相似的那几对」颜色必须拉开
```

**§1.4 的轮廓分组表是本工单最重要的一张表。**

## 1.3 色板

### 底板与背景

| 语义 | 色值 | 用途 |
|---|---|---|
| `tile-base` | `#FFF6E3` | Tile 奶油底色（**8 种图案共用**） |
| `tile-stroke` | `#B08355` | Tile 细棕描边 |
| `tile-shadow` | `rgba(140,100,60,.18)` | Tile 外投影 |
| `sky-top` | `#8FD0FF` | 背景天空（上） |
| `sky-bottom` | `#E8F5FF` | 背景天空（下） |
| `cloud` | `#FFFFFF` | 云朵 |

### 图案主色（8 种）

| Tile | 中文 | 主色 | 灰度 | 轮廓类别 |
|---|---|---|---:|---|
| `paw` | 猫爪 | `#FF8FA3` | 168.3 | 放射状 |
| `grass` | 小草 | `#5FBF6A` | 164.5 | 尖锐向上 |
| `watering` | 浇水壶 | `#54A8E0` | 154.2 | 带突出物 |
| `bell` | 铃铛 | `#FFC93C` | 202.3 | 梯形 |
| `fish` | 小鱼 | `#FF9A5C` | 171.0 | 水平延展 |
| `yarn` | 毛线球 | `#B98BE0` | 154.9 | 正圆 |
| `bone` | 骨头 | `#EFE6D2` | 230.5 | 水平延展 |
| `flowerpot` | 花盆 | `#C97B4A` | 136.0 | 梯形 |

## 1.4 轮廓分组与冲突控制 ★ 硬性约束

8 个图案按轮廓归为 6 类。**同类内必须靠颜色强制拉开：**

| 轮廓类别 | 成员 | 状态 |
|---|---|---|
| 放射状 | `paw` | ✅ 轮廓唯一 |
| 尖锐向上 | `grass` | ✅ 轮廓唯一 |
| 带突出物 | `watering` | ✅ 轮廓唯一 |
| 正圆 | `yarn` | ✅ 轮廓唯一 |
| **梯形** | `bell` + `flowerpot` | ⚠️ 灰度差 **66.3** ✅ 通过 |
| **水平延展** | `fish` + `bone` | ⚠️ 灰度差 **59.5** ✅ 通过 |

> ✅ 两组冲突对的灰度差均远超阈值 25，色板可用。
> **但产出时必须保证：`bell` 明显偏亮黄、`flowerpot` 明显偏暗棕；
> `bone` 接近白、`fish` 明显偏橙。** 若产出结果灰度被拉近，该组必须重做。

### 前 4 种优先

关卡 1~5 只用前 4 种（`paw` / `grass` / `watering` / `bell`），它们**分属 4 个不同轮廓类别，零冲突**。这是第一批优先产出它们的原因。

## 1.5 统一 Prompt 后缀 ★ 每张图必须带

```text
soft cute mobile game asset, rounded chunky shapes, thick clean outline,
gentle 3D volume with soft shading, warm bright lighting, high readability
at small size, minimal internal detail, flat background removed,
transparent PNG, centered composition, no text, no watermark,
consistent art style across set
```

## 1.6 简形化硬性要求 ★ 本作最重要的美术约束

**最小显示尺寸 32×32 CSS px**（375px 屏，6 列，tileSize 48px，图案占 ~68%）。

| 规则 | 说明 |
|---|---|
| ✅ 轮廓差异优先 | 猫爪 vs 骨头 ✅；小鱼 vs 鲸鱼 ❌ |
| ✅ 可辨识元素 ≤ 3 个 | 例：铃铛 = 钟身 + 顶环 + 一道高光。**不要加铃舌、纹路、蝴蝶结** |
| ✅ 描边加粗 | 相对图案宽度 ≥ 4%，256px 图上即 ≥ 10px |
| ✅ 不只依赖颜色 | 色盲可访问性（§6.3） |
| ❌ 不用渐变细节 | 大面积柔和渐变可以，细碎渐变不行 |
| ❌ 不用 < 3px 线条 | 按 256px 原图算，即 < 3px 的线在缩放后会消失 |
| ❌ 不用复杂纹理 | 毛线球只画 2~3 道缠绕线，不画毛绒质感 |

---

# 2. 批次计划

| 批次 | 内容 | 数量 | 前置 |
|---|---|---:|---|
| **第 0 批** | Master Reference（1 张，定风格） | 1 | — |
| **第 1 批** | 前 4 种 Tile 图案 | 4 | 第 0 批验收 |
| **第 2 批** | 后 4 种 Tile + 背景 | 6 | 第 1 批验收 |
| **第 3 批** | UI + FX | 12 | 第 2 批验收 |
| | **合计** | **23** | |

> **不要跳批。** 第 0 批的作用是把风格定死；若第 1 批发现风格不对，只需重画 4 张而不是 23 张。

---

# 3. 第 0 批：Master Reference

## 3.1 `_master_reference.png`（不投放到游戏，仅作风格基准）

**尺寸**：1024 × 1024
**内容**：一张图里画 4 个 Tile（猫爪 / 小草 / 浇水壶 / 铃铛），2×2 排列，**含完整 Tile 外框**（奶油底 + 棕描边 + 投影）。

```text
Prompt:
A 2x2 grid of four square game tiles for a cute pet-garden puzzle game.
Each tile is a rounded square with warm cream background (#FFF6E3),
a thin brown outline (#B08355), subtle inner shadow and soft drop shadow.
Tile 1: a soft pink cat paw print (#FF8FA3).
Tile 2: a bright green grass tuft (#5FBF6A).
Tile 3: a sky blue watering can (#54A8E0).
Tile 4: a golden yellow bell (#FFC93C).
Each icon is simple, bold, with thick outlines and minimal internal detail,
occupying about 68% of its tile.
[+ §1.5 统一后缀]
```

**验收后**：把这张图作为后续所有 prompt 的风格参照（Sol 可在后续 prompt 中引用它保持一致性）。

---

# 4. 资源清单

## 4.1 Tiles（8 张）

**统一规格**：`256 × 256`，透明 PNG → 转 WebP
**重要**：Tile 图案文件**只含图案本身，不含奶油底框**。底框由 `ui/tile_frame.webp` 单独提供，代码负责叠加。

> 这样做的好处：换主题时只换 8 张图案，底框复用；且图案可以单独做缩放动画。

| 文件 | 图案 | Prompt 要点 |
|---|---|---|
| `paw.webp` | 猫爪 | 一个大肉垫 + 4 个小趾垫，粉色 `#FF8FA3`，**放射状轮廓** |
| `grass.webp` | 小草 | 3~5 根向上的草叶，绿色 `#5FBF6A`，**尖锐向上轮廓** |
| `watering.webp` | 浇水壶 | 壶身 + 长壶嘴 + 提手，蓝色 `#54A8E0`，壶身可有一个小爱心。**突出物轮廓** |
| `bell.webp` | 铃铛 | 钟形 + 顶部圆环 + 一道高光，**亮金黄** `#FFC93C`。可带蓝色蝴蝶结（原型图有）。**梯形轮廓，必须比花盆明显亮** |
| `fish.webp` | 小鱼 | 侧视梭形鱼身 + 扇形尾鳍 + 一个圆眼，**橙色** `#FF9A5C`。**水平延展轮廓，必须比骨头明显暗/偏橙** |
| `yarn.webp` | 毛线球 | 正圆 + 2~3 道缠绕线 + 一小截垂线头，紫色 `#B98BE0`。**正圆轮廓** |
| `bone.webp` | 骨头 | 经典工字形骨头，**接近白的米色** `#EFE6D2` + 较深描边。**水平延展轮廓，必须比小鱼明显亮** |
| `flowerpot.webp` | 花盆 | 倒梯形盆身 + 上沿 + 盆里一朵小花，**暗陶土棕** `#C97B4A`。**梯形轮廓，必须比铃铛明显暗** |

## 4.2 UI（9 张）

| 文件 | 尺寸 | 说明 |
|---|---|---|
| `tile_frame.webp` | 256×256 | 奶油底 + 棕描边 + 内阴影 + 外投影的**空白 Tile 底框** |
| `tray_slot.webp` | 200×200 | 暂存槽空格，浅色内凹方框，圆角 |
| `tray_slot_warn.webp` | 200×200 | 同上，但**边框发暖光**（6/7 预警态，§23.6） |
| `btn_shuffle.webp` | 320×320 | 圆角方形按钮，黄底，中间双向箭头图标 |
| `btn_undo.webp` | 320×320 | 圆角方形按钮，粉底，中间左弯回退箭头 |
| `btn_settings.webp` | 200×200 | 圆形按钮，紫蓝渐变，白色齿轮 |
| `btn_hint.webp` | 320×320 | 圆角方形按钮，蓝底，灯泡图标（MVP 隐藏，先出图） |
| `panel_win.webp` | 800×900 | 胜利弹窗底板，圆角，浅奶油，顶部留星星位 |
| `panel_fail.webp` | 800×900 | 失败弹窗底板，同风格但色调偏冷 |

> **按钮不要把文字画进图里**（「打乱」「撤回」由代码渲染），否则换语言要重画。

## 4.3 背景（2 张）

| 文件 | 尺寸 | 说明 |
|---|---|---|
| `game_bg.webp` | 1125×2436 | 天空蓝渐变 + 几朵云 + **淡淡的猫咪轮廓水印**。⚠️ 必须极淡，不能与 Tile 抢注意力 |
| `home_bg.webp` | 1125×2436 | 同色系，可有草地 / 花朵 / 一只坐着的猫 |

## 4.4 FX（3 张）

| 文件 | 尺寸 | 说明 |
|---|---|---|
| `sparkle_01.webp` | 128×128 | 四角星光，白偏暖，中心亮 |
| `sparkle_02.webp` | 128×128 | 六角星光，稍小 |
| `star.webp` | 256×256 | 实心五角星，金黄，用于星级与胜利动画 |

---

# 5. 投放路径与命名

```text
stack/web/public/assets/
├── tiles/
│   ├── paw.webp        grass.webp    watering.webp  bell.webp
│   └── fish.webp       yarn.webp     bone.webp      flowerpot.webp
├── ui/
│   ├── tile_frame.webp tray_slot.webp tray_slot_warn.webp
│   ├── btn_shuffle.webp btn_undo.webp btn_settings.webp btn_hint.webp
│   └── panel_win.webp  panel_fail.webp
├── bg/
│   ├── game_bg.webp    home_bg.webp
└── fx/
    ├── sparkle_01.webp sparkle_02.webp star.webp
```

**规则：**

- 全部 **WebP**，带 Alpha
- 文件名**全小写 + 下划线**，与本工单完全一致
- 改图**换名到 `-v2`**，并同步改代码里的 Asset Manifest（§6.5）
- **不要投放 `_master_reference.png`** 到 `public/`（它不是游戏资源）

---

# 6. 验收标准

## 6.1 ★ 32px 眯眼测试（最重要）

```text
1. 把 8 个 Tile 图案缩放到 32×32 px
2. 一行排开，截图
3. 眯眼 / 后退两步看
4. 能否在 1 秒内区分全部 8 个？
```

**做不到就重做。** 这不是主观判断——本作最小显示就是这个尺寸，看不清就是不可用。

## 6.2 轮廓组冲突复检

```text
把 bell 与 flowerpot 并排 → 必须一眼看出「一个亮黄、一个暗棕」
把 fish  与 bone      并排 → 必须一眼看出「一个偏橙、一个接近白」
```

这两组轮廓相似（都是梯形 / 都是水平延展），**颜色是唯一区分手段，不能含糊**。

## 6.3 灰度测试（色盲可访问性）

```text
把 8 个图案转成灰度图，再做一次 §6.1 的眯眼测试。
允许颜色信息全部丢失后，仍需靠轮廓区分出 8 个。
```

> 本作轮廓是主维度，理论上应当通过。若某两个在灰度下混淆，说明轮廓做得不够有区别，**重做轮廓，不是调颜色**。

## 6.4 风格一致性

```text
8 个 Tile 并排，是否像「同一套」？
检查：描边粗细、高光位置、体积感强度、饱和度水平
```

## 6.5 技术验收

- [ ] 尺寸与 §4 完全一致
- [ ] 透明背景，无白边、无杂色像素
- [ ] WebP 带 Alpha
- [ ] 单张 Tile < 30KB，背景 < 200KB
- [ ] **全部资源合计 < 2MB**（首屏预算 §43）
- [ ] 文件名与 §5 完全一致
- [ ] 图案居中，四周留白均匀（避免缩放后位置跳动）

---

# 7. 与代码的对接

## 7.1 Asset Manifest

**素材路径只走 Manifest，不在代码里硬编码字符串。**

```ts
// config/assets.ts
export const ASSETS = {
  tiles: {
    paw:       'assets/tiles/paw.webp',
    grass:     'assets/tiles/grass.webp',
    watering:  'assets/tiles/watering.webp',
    bell:      'assets/tiles/bell.webp',
    fish:      'assets/tiles/fish.webp',
    yarn:      'assets/tiles/yarn.webp',
    bone:      'assets/tiles/bone.webp',
    flowerpot: 'assets/tiles/flowerpot.webp',
  },
  ui: { /* ... */ },
  bg: { /* ... */ },
  fx: { /* ... */ },
} as const;
```

改图换名时**只改这一个文件**。

## 7.2 防回归测试 ★ 必做

```text
✓ PreloadScene 中 load 的每个纹理 key，都能在渲染层找到引用
```

> garden 曾有 **6 张「load 了但从没被画过」的贴图，占首屏 54%**。
> 这类浪费**没有任何症状**，靠人 review 抓不到，必须靠测试。

## 7.3 占位图策略

M1~M3 阶段用**纯色块 + 字母**，不等美术。
美术就位后按 §5 投放，**代码零改动**（因为走 Manifest + 同名同尺寸）。

---

# 8. 交付清单

```text
第 0 批  [ ] _master_reference.png              （1 张，不投放）

第 1 批  [ ] paw.webp    [ ] grass.webp
         [ ] watering.webp [ ] bell.webp        （4 张）

第 2 批  [ ] fish.webp   [ ] yarn.webp
         [ ] bone.webp   [ ] flowerpot.webp
         [ ] game_bg.webp [ ] home_bg.webp      （6 张）

第 3 批  [ ] tile_frame.webp
         [ ] tray_slot.webp [ ] tray_slot_warn.webp
         [ ] btn_shuffle.webp [ ] btn_undo.webp
         [ ] btn_settings.webp [ ] btn_hint.webp
         [ ] panel_win.webp [ ] panel_fail.webp
         [ ] sparkle_01.webp [ ] sparkle_02.webp [ ] star.webp   （12 张）

合计 23 张
```

**每批完成后先做 §6 自检，再提交验收，通过后才进入下一批。**
