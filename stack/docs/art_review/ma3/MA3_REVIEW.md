# MA3 第 3 批 UI 与 FX 交付记录

## 结论

第 3 批 9 张 UI 与 3 张 FX 已按 MA2 验收约束落地：

- 全部同名、同冻结尺寸覆盖占位文件，游戏代码与 Asset Manifest 零改动；
- 全部为 RGBA WebP，透明前景各只有 1 个连通主体；
- `tile_frame` 中央 200×200 安全区不含棕色边沿，可完整容纳 174px 图案；
- 四个按钮只含图标，不含文字、字母或数字；
- Tray 普通/预警态与胜/负面板采用成对生成，几何保持一致；
- 12 张资源完成实际渲染尺寸视觉复核。

## 生成方式与提示词

模式：内置 ImageGen。`docs/art_review/_master_reference.png` 作为风格参考；`tray_slot_warn` 以生成后的 `tray_slot` 为精确编辑目标，`panel_fail` 以生成后的 `panel_win` 为精确编辑目标。

UI 共同提示词：

> Production StackPop game UI asset matching the approved Master Reference: soft cute polished mobile-game UI, rounded chunky forms, warm clean edging, gentle 3D volume, restrained broad highlights, soft shading and minimal detail. One centered front-facing UI object with even transparent padding. Genuinely transparent background outside the UI shape. No text, letters, numbers, labels, logos, watermarks, unrelated objects, or checkerboard pattern.

各 UI 主体要求：

- `tile_frame`：`#FFF6E3` 奶油圆角底板、`#B08355` 外沿、轻内阴影和外投影；中央至少 200×200 平坦无阻挡。
- `tray_slot`：浅奶油内凹圆角槽，浅暖灰棕细沿；无图标。
- `tray_slot_warn`：只在 `tray_slot` 同几何基础上增加暖琥珀金发光边沿，中心保持浅色。
- `btn_shuffle`：金黄色圆角方形按钮、白色双交叉水平箭头，无文字。
- `btn_undo`：粉色圆角方形按钮、白色左弯撤回箭头，无文字。
- `btn_settings`：紫蓝圆形按钮、白色齿轮，无文字。
- `btn_hint`：天蓝圆角方形按钮、暖白灯泡与 3 条短光线，无文字。
- `panel_win`：8:9 奶油色空白圆角面板，顶部 28% 留星星位，中部留代码文字和按钮位。
- `panel_fail`：仅把 `panel_win` 调成浅薰衣草灰与冷蓝灰边沿，几何和空白区不变。

FX 提示词：

- `sparkle_01`：单个暖白四角星光，长横竖尖角，轻淡金色辉光。
- `sparkle_02`：单个更小的暖白六角星光，短宽尖角，轻淡蓝白辉光。
- `star`：单个金黄色实心五角星，圆润轻立体、深金描边、一道高光；无脸、文字或附加装饰。

内置 ImageGen 输出再次包含烘焙棋盘底。处理仅移除与画布边缘连通的中性底色，并按原始完整画布等比缩放到冻结尺寸；没有裁切成对资源，因此普通/预警 Tray 与胜/负面板的相对几何得以保留。该过程不进入游戏运行时代码。

## 技术实测

| 资源 | 尺寸 | alpha bbox | 连通主体 | 文件大小 |
|---|---:|---:|---:|---:|
| `tile_frame.webp` | 256×256 | 235×232 | 1 | 3,564 B |
| `tray_slot.webp` | 200×200 | 164×166 | 1 | 2,416 B |
| `tray_slot_warn.webp` | 200×200 | 173×174 | 1 | 4,840 B |
| `btn_shuffle.webp` | 320×320 | 255×259 | 1 | 9,136 B |
| `btn_undo.webp` | 320×320 | 267×266 | 1 | 9,292 B |
| `btn_settings.webp` | 200×200 | 171×174 | 1 | 7,940 B |
| `btn_hint.webp` | 320×320 | 274×276 | 1 | 9,432 B |
| `panel_win.webp` | 800×900 | 718×814 | 1 | 12,826 B |
| `panel_fail.webp` | 800×900 | 717×814 | 1 | 14,762 B |
| `sparkle_01.webp` | 128×128 | 95×97 | 1 | 4,332 B |
| `sparkle_02.webp` | 128×128 | 40×41 | 1 | 1,772 B |
| `star.webp` | 256×256 | 188×186 | 1 | 8,490 B |

`tile_frame` 的保守检测口径为 alpha 前景中亮度 L < 200 的棕色/暗色边沿：离中心最近的 Chebyshev 距离为 102.5px，对应 **205px 安全方区**；中央 200×200 内暗边像素为 **0**。174px 图案每边至少保留约 15.5px 的保守余量。

全部 22 张投放资源合计 **176,748 B（约 173KB）**；另有 1 张不投放的 Master Reference。首屏资源远低于 2MB 预算。

## 视觉自检产物

- 正式底框叠 8 图、64px：`ma3_tile_frame_8_tiles_64px.png`
- Tray 普通/预警、48px：`ma3_tray_pair_48px.png`
- 四按钮、72px：`ma3_buttons_72px.png`
- FX 代码实际尺寸（sparkle 22px / star 72px）：`ma3_fx_runtime_sizes.png`
- 胜/负面板对照：`ma3_panel_pair_240x270.png`

结果：底框不压图案；Tray 预警态清晰但不刺眼；按钮图标无需文字即可辨认；FX 在实际尺寸可见；面板内部留白足够代码渲染内容。

> MA3 等待外部验收；在通过前不再继续美术批次。

---

## Claude 验收（2026-08-23）

**结论：通过。22 张游戏资源全部就位，美术工单完成。** 独立复核，非采信报告。

### 关键项：`tile_frame` 安全区（我在 MA2 提的硬要求）

| 检查 | 实测 |
|---|---|
| 最大无暗色居中方形 | **206×206**（画布 80.5%） |
| 174×174 居中区内暗色像素 | **0** → 容得下 174px 图案 ✅ |
| 205×205 居中区内暗色像素 | 0 |

「保守安全区 205px」属实，内沿未收窄，与 MA1/MA2 的 174px 图案兼容。

### 尺寸与格式：12 张全对

全部为目标尺寸 RGBA WebP，无一偏差。合计 86.7 KB。

### Tray 预警态——一处需要说明的测量差异

源图分辨率下测得 warn 态实心 bbox 比 normal **每边大 3px**
（normal solid `(18,16,181,181)` vs warn solid `(15,12,184,184)`，剪影 IoU 0.9315）。

**但这不构成缺陷。** 按真机渲染尺寸（traySlotSize ≈ 44px）复核：
宽度差 1px、高度差 2px，肉眼不可辨，且视觉上读作暖光的一部分。
7 格并排对比图确认：**槽位不会在 6/7 切换时跳动**，观感为「同一个槽亮起边框」。
中央 120×120 区域色差像素为 **0**，确认仅边框变化。

> 记录此项是因为源图数据与「轮廓一致」的表述有出入；结论是按实际渲染条件
> 判定通过。后续若 traySlotSize 显著增大（如平板 >80px），需重新评估。

### 胜负面板

- 几何一致：bbox 仅差 1px，剪影 IoU **0.9987** ✅
- win 暖奶油 / fail 冷灰紫，符合「同风格但色调偏冷」
- 中央与顶部留白，供代码渲染星级与文案 ✅

### 按钮

四个按钮**均只含图标，无文字/字母/数字** ✅
（「打乱」「撤回」由代码渲染，换语言无需重画。）
配色符合工单：shuffle 黄 / undo 粉 / settings 紫蓝渐变 / hint 蓝。

### 其它

- lint / 76 项测试 / 生产构建：**均自行重跑通过**
- **未修改代码或 Asset Manifest** ✅
- 占位图**全部清零**：22 张无一小于 1.5 KB
- 体积：合计 **172.6 KB**（限 2 MB），余量充足
- dist 产物 22 张齐全

> 计数订正：投放资源为 **22 张**，第 23 张是不投放的 `_master_reference.png`。
> Codex 报告的「23 张正式游戏资源」略有出入，资源集本身完整无缺。

### 整体观感复核

按真机条件合成完整游戏画面（375×812、6 列叠放、tray 5 满 2 预警、按钮 52px）：
奶油卡片在天蓝背景上分离清晰，8 类图案在 52px 下全部可辨，
猫咪水印不抢注意力，按钮图标清晰。**达到可上线质量。**

### 美术工单状态

第 0~3 批全部完成并验收。后续如需调整，注意静态图 `expires 30d`——
**改图必须换文件名**，否则用户 30 天内看到旧图。
