# StackPop UI R2-A 执行与验收记录

日期：2026-08-24  
状态：实现完成，待 Claude 独立验收  
基线：`22abc00`（R2-0 已通过并提交）

## 1. 范围

本轮只完成 R2-A 的四个组件族：

1. 棋盘 Tile 的 covered / active 分层；
2. 打乱、撤回、重来按钮的统一材质与交互状态；
3. Tray 面板、空/占用槽位和两张同类提示；
4. HUD 奶油表面、剩余牌数字层级与设置按钮降权。

未修改关卡、规则、难度、Tile 尺寸、重叠率、棋盘布局、命中区、背景图片或缓存文件名；
R2-B / MA4 不在本轮范围。

## 2. R2-0 补充回归

按 Claude 验收反馈，`layout.test.ts` 的实际深度覆盖从 `[8, 4, 2]` 扩到
`[8, 4, 2, 1]`。深度 1 实测最大单块空白约 `230.87px / 29.87%`，按 `≤30%`
断言；公共基线、上下对称、相对旧算法改善和反向验证继续保留。

## 3. 视觉参数

所有新增材质尺寸、透明度、描边和阴影均集中在 `GAME_UI`，Scene 不再保存另一套状态参数。

| 组件 | 关键参数 |
|---|---|
| HUD | 奶油面板 alpha 0.92、圆角 16px、蓝灰阴影 y=3px / 0.11、顶部高光 0.78 |
| 设置 | 视觉 32px / alpha 0.90，命中区继续 48px |
| 工具按钮 | 圆角 13px、描边 1.5px、阴影主/次/重来为 0.14/0.08/0.04 |
| 按压态 | 下移 2px、阴影降到 35%，不再缩放按钮 |
| Tray | 面板 alpha 0.88、空槽 0.66、占用槽 1.0、两张同类 2px 一次性柔光 |
| covered Tile | frame 0.86、icon 1.0、icon 下方 overlay 0.03 |
| active Tile | 蓝灰阴影 y=3px / 0.12、暖金外沿 1px / 0.35 |

## 4. 实现结果

### 4.1 Tile

- 新增纯函数 `resolveTileVisualStyle()`，frame、icon、overlay、shadow、outline 分层解析。
- covered Tile 不再对整个 Container 使用 `setAlpha()`，图案保持完整饱和度。
- active Tile 的阴影和外沿只影响视觉，不改变 placement、frame 命中区或坐标。
- 图案主体仍为 `174 / 256 = 67.97%`，未越 206px 安全区。

### 4.2 工具按钮

- 扩展既有 `resolveToolButtonStyle()`，未创建第二套按钮样式系统。
- 三按钮共用圆角、描边宽度、图标尺寸和按压规则；阴影强度表达主次。
- 图标与文字按组合总宽居中，角标半径 9px、距上/右可见边缘 7px。
- disabled 使用中性填充且阴影为 0；pressed 只下移和减弱阴影。

### 4.3 Tray

- 空槽 alpha 降到 0.66；有牌槽位保持 1.0，并加轻微暖色内高光。
- 保持 `tray_slot → tile image` 两层结构，没有恢复内嵌 `tile_frame`。
- 新增相邻同类 run 识别；首次出现两张同类时播放一次 400ms 柔光，随后保留轻提示。
- 正常计数拆为加粗数字与次级 `/7`；5/7、6/7、7/7 继续显示“注意/危险/已满”文字。

### 4.4 HUD

- 64px 高度、16px 圆角和整体布局不变。
- `剩余 / 数字 / 张` 拆成小型状态组，数字使用 17px/700，其余使用 13px。
- 设置图标由 34px 降到 32px，静止 alpha 0.90；命中区仍为 48×48px。
- hover 只在 fine pointer 下增强，按压与恢复不再误用 `setScale(1)` 破坏素材显示尺寸。

## 5. 自动验证

- `npm run lint`：通过，0 warning。
- `npm test -- --run`：18 个测试文件、121 项测试全部通过。
- `npm run build`：通过。
- `git diff --check`：通过。
- Playwright 浏览器控制台：0 error、0 warning。

新增 `uiR2.test.ts` 7 项契约，覆盖：

- covered 图案保持饱和；
- active 阴影/外沿；
- 禁止 Container 整体压灰；
- 工具按钮材质统一和阴影层级；
- pressed / disabled 状态；
- Tray 空/占用层级及相邻同类识别；
- HUD 与设置命中区。

反向验证：临时把 `tileActiveShadowAlpha` 从 `0.12` 改为 `0` 后，
`uiR2.test.ts` 明确失败；恢复后全量测试重新通过。

## 6. 截图矩阵

截图属于验证产物，继续放在已被 gitignore 排除的 `output/playwright/ui-r2-a/`：

| 状态 | 文件 |
|---|---|
| 移动端默认 / Tray 0/7 / Undo disabled | `mobile-l4-default-402x773.png` |
| Tray 2/7，同类两张 | `mobile-tray-2of7-402x773.png` |
| Tray 5/7，文字注意态 / Undo enabled | `mobile-tray-5of7-402x773.png` |
| Tray 6/7，文字危险态 | `mobile-tray-6of7-402x773.png` |
| Tray 7/7，文字已满态 | `mobile-tray-7of7-402x773.png` |
| 胜利弹窗 | `mobile-win-dialog-402x773.png` |
| 失败弹窗 | `mobile-fail-dialog-402x773.png` |
| 重来二次确认 | `mobile-restart-confirm-402x773.png` |
| 工具按钮 pressed | `mobile-tools-pressed-402x773.png` |
| 桌面 1280×720 | `desktop-l4-1280x720.png` |
| enabled 按钮灰度层级 | `mobile-tray-5of7-grayscale.png` |
| 8 图案 covered / active 32px | `tile-covered-active-8types-32px.png` |

浏览器内的 Tray/胜负状态通过临时状态注入生成，只用于渲染验收，不写入源码、关卡或存档。

## 7. 动画证据

`pick-column-reflow-mobile-402x773.webm` 记录一次真实 Debug API 取牌：

- 取牌请求被接受；
- 第 1 列深度从 8 降到 7；
- 牌进入 Tray，计数变为 1/7；
- 同列剩余牌重新对齐公共基线，未发现坐标错位或瞬间跳到旧命中区。

视频编码为 VP8，画面为 402×772（VP8 要求偶数高度），验证源视口为 402×773。

## 8. 待验收

请 Claude 重点复核：

1. covered 图案是否足够清楚，同时 active 六张是否能在 1 秒内指出；
2. 两张同类柔光是否“有组感但不像已消除”；
3. 5/7、6/7 压力提示是否仍足够明确；
4. HUD 信息顺序是否为关卡标题 → 剩余牌 → 设置；
5. 桌面 1280×720 的限宽、边界和按钮 hover 是否协调。

---

# Claude R2-A 验收（2026-08-24）

**结论：通过，可提交。** 独立复核，非采信报告。

## 我在 Review 中提的三条附加要求

| 要求 | 实测 |
|---|---|
| R2-1：只压暗 frame，**保持 icon 饱和度** | `tileCoveredIconAlpha: 1` —— 图案**完全不降透明度** ✅ |
| R2-1：覆盖牌图案 32px 下仍可辨 | 8 类图案 covered / active 并排，**全部清晰** ✅ |
| R2-3：不得削弱 5/7、6/7 压力提示 | `uiR1.test.ts` 7 项全过；6/7 显示**红色「危险 6/7」文字** ✅ |
| R2-2：扩展 `resolveToolButtonStyle`，不新开一套 | 确认在原文件上扩展 ✅ |
| 材质参数进 `GAME_UI` 常量 | 40 个 token 集中管理 ✅ |
| 深度 1 回归（上轮遗留） | `[8,4,2,1]`，深度 1 断言 230.87px ✅ |

## covered / active 区分度实测

我一开始用 32px 对比图整体取样，得出「亮度只差 1.0」，**这个读数是错的**——
把背景一起算进去稀释了差异。改在真机渲染图上取卡框奶油底（避开图案）：

| | 卡框亮度 |
|---|---:|
| covered（列顶） | 175.1 |
| active（列尾） | **202.1** |
| 差值 | **27.0** |

差 27 个亮度点，加上 `tileActiveShadowAlpha 0.12` 的投影与
`tileActiveOutline` 暖色外沿，区分**清晰可感**。桌面截图上尤其明显。

分层实现（`tileVisualStyle.ts`）干净：`frameAlpha / iconAlpha / overlayAlpha /
shadowAlpha / outlineAlpha` 五个独立通道，正是 Review 要求的
「拆分 frame / icon / overlay」。

## 反向验证

| 注入的错误 | 结果 |
|---|---|
| `tileCoveredIconAlpha` → 0.6（违反 R2-1） | **立刻变红** ✅ |
| `tileActiveShadowAlpha` → 0（去掉浮起感） | **立刻变红** ✅ |

两处均已还原，`git diff` 干净。

## 截图矩阵：已补齐

Review §5 点名的 5 个「从 M4 至今从未验证过」的状态**全部补上**：

| 状态 | 文件 |
|---|---|
| Tray 5/7 | `mobile-tray-5of7-402x773.png` |
| Tray 6/7 | `mobile-tray-6of7-402x773.png` |
| 胜利弹窗 | `mobile-win-dialog-402x773.png` |
| 失败弹窗 | `mobile-fail-dialog-402x773.png` |
| 重来确认 | `mobile-restart-confirm-402x773.png` |
| 桌面 1280×720 | `desktop-l4-1280x720.png` |

另有 7/7、按钮按压态、灰度版、取牌回落动画（webm）。
放在 gitignore 的 `output/playwright/ui-r2-a/`——**验证产物不入库是合理的**。

桌面截图复核：480px 限宽、居中、有边界，**标题栏未被裁切**，符合 §45。

## 门禁

lint / **121 项测试** / build 全过。R2-0 的 ground truth 与基线断言未受影响。

## 遗留（不阻塞）

`GameScene.ts` 仍有 3 处散落的硬编码 alpha：
`settings.setAlpha(0.5)`（309）、`glow.setAlpha(0.25)`（518）、
星级置灰 `setAlpha(0.48)`（718）。

数量少且不影响本轮门槛，但与「材质参数集中到 `GAME_UI`」的原则不一致。
建议下轮顺手收进常量，避免日后调色时漏改。
