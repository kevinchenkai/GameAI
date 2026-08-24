# StackPop UI-R1 执行与验收记录

> 日期：2026-08-23  
> 执行基线：`172f768`  
> 依据：`UI整体评估与优化方案_iPhone实测_V1.md` §7、§8、§9、§12  
> 范围：代码层视觉校正 + D3 底部基线；不改关卡规格，不重画素材。

## 1. 已完成改造

1. 棋盘 Tile 图案画布倍率从 `0.70` 恢复为 `1.00`；
2. Tray 取消内嵌 `tile_frame` 与 inset，只保留槽位和一层 `0.90` 图案倍率；
3. disabled 撤回不再继承黄色 primary fill，改用独立中性样式；
4. HUD、Tray、工具按钮使用统一的奶油面、圆角、描边和软阴影 token；
5. HUD 文案改为 `第2关`、`剩余 24张`，次级文字加深；
6. 设置图标保持 34px，透明命中区扩大为 48×48px；
7. 全屏背景 wash 从顶部/底部 `0.08/0.28` 降为 `0.04/0.14`；
8. 每列可点击 Tile 固定到 Tray 上方同一底部基线，其余牌由基线向上生长；
9. 5/7、6/7、7/7 分别显示“注意 / 危险 / 已满”，不再只靠颜色传达压力；
10. 胜利标题同步移除中文数字两侧的多余空格。

视觉常量集中在 `web/src/game/config/layout.ts` 的 `GAME_UI`，按钮状态由
`web/src/game/ui/toolButtonStyle.ts` 单一解析，Tray 压力文案由
`web/src/game/ui/trayPresentation.ts` 单一解析。

## 2. 八条量化门槛结果

| # | 门槛 | 实测/实现 | 结果 |
| --- | --- | --- | --- |
| 1 | 棋盘主体占比 62%~68% | `174 / 256 × 1.00 = 67.96875%` | 通过 |
| 2 | 不越 206px 安全区 | 主体 174px，安全区 206px，余量 32px | 通过 |
| 3 | Tray 无三层缩放 | `tray_slot + tile image × 0.90`，无 inset、无内嵌 frame | 通过 |
| 4 | 六列 ground truth 不变 | `tileSize=52.1667`、`rowStep=44.3417` | 通过 |
| 5 | disabled 不用 primary fill | disabled primary 解析为 `disabledFill`，反向断言不等于黄色 | 通过 |
| 6 | 八图案 32px 眯眼可辨 | 真实 R1 倍率离线浏览器合成，八种轮廓均可区分 | 通过 |
| 7 | 可点 Tile 坐标/命中区有测试 | 四个不同列深逐位同基线；六列命中区内命中、越界 0.01px 不命中 | 通过 |
| 8 | lint / test / build | 见 §4 | 通过 |

关键测试：

- `web/tests/layout.test.ts`：底部基线、列尾坐标、命中区正反向断言；
- `web/tests/uiR1.test.ts`：图案占比、安全区、Tray 层级、按钮 disabled、
  设置命中区、wash、Tray 压力文案；
- 原六列 ground truth 测试未改期望值，仍逐位验证 `52.17 / 44.34`。

## 3. 截图矩阵

自动化截图保存在被 Git 忽略的 `output/playwright/ui-r1/`，不会进入仓库：

| 文件 | 视口/状态 | 验证点 | 结果 |
| --- | --- | --- | --- |
| `01-375x812-l2-step0.png` | 375×812，L2，空 Tray | 67.97% 图案、HUD、disabled Undo | 通过 |
| `02-390x844-l3-tray3.png` | 390×844，L3，真实点击 3 步 | 不同列深、Tray 3/7、底部基线 | 通过 |
| `03-414x760-l10-tray3.png` | 414×760，L10，真实点击 3 步 | 短屏、六列、底部安全区 | 通过 |
| `04-430x932-l17-tray5.png` | 430×932，L17，真实点击 5 步 | “注意 5/7”、工具栏 | 通过 |
| `05-375x812-l17-tray6.png` | 375×812，L17，真实点击 6 步 | “危险 6/7”、描边、呼吸态 | 通过 |
| `06-375x812-restart-confirm.png` | 375×812，重来确认 | 遮罩、危险操作层级 | 通过 |
| `07-375x812-win.png` | 375×812，胜利视觉夹具 | 弹窗、背景降噪、按钮 | 通过 |
| `08-375x812-fail.png` | 375×812，失败视觉夹具 | 满槽、失败弹窗、disabled 工具 | 通过 |
| `09-1280x720-l10-desktop.png` | 1280×720，L10 桌面 | 480px 限宽、边界、居中 | 通过 |
| `10-32px-squint-strip.png` | 8 图案并排 32px | 轮廓一秒辨识 | 通过 |

浏览器运行期间 Console：0 error、0 warning（Phaser 启动 info 除外）。

## 4. 自动验证

在 `web/` 下执行：

```text
npm run lint
npm test        # 17 files / 112 tests passed
npm run build
```

最终结果：lint 0 warning，17 个测试文件 / 112 项测试全部通过，TypeScript + Vite
生产构建通过。构建仅保留 Vite 既有的大 chunk 提示，不属于本轮新增错误。

## 5. 证据边界与真机复验

本轮补齐的是 **Chromium 真实渲染的视口矩阵**，不是新增的 iPhone 真机截图。
L3/L10/L17 的 Tray 状态由真实规则点击产生；胜负弹窗使用视觉状态夹具，避免为了截图
完整重放整关。它们足以发现裁切、缩放、基线、层级和状态样式问题，但不能替代：

- iPhone 微信内置浏览器的 safe-area / 顶底工具栏行为；
- DPR=2 真机清晰度与 GPU 性能；
- 手指命中、动画手感、震动和 BGM/音效平衡。

因此 R1 可进入 Claude 代码验收；部署前仍建议用 iPhone 至少复拍 L2 空 Tray、
L17 5/7、L17 6/7、胜负弹窗四个代表状态。D3 若出现“玩家不知道点哪张”的反馈，
优先只回滚 `calculateBottomAlignedBoardPlacements()` 的调用，R1 其余视觉改造可保留。

## 6. R1 预览部署

2026-08-23 已将当前未提交的 R1 工作区构建部署至：

<https://g.ismayday.mobi/stack/>

- dry-run 仅涉及 `/www/wwwroot/g.ismayday.mobi/stack/`，未触及站点根；
- 本地/远端 `index.html` MD5：`0ffc7aa7205164f1a4e6e81ba9075169`；
- 线上/本地新 bundle `index-DJULRdOX.js` MD5：`94bcee83fedbf533147cf80ef0b5e339`；
- 首页、新 bundle、WebP、M4A 均返回 HTTP 200；
- WebP 与 M4A 均返回 `cache-control: max-age=2592000`（30 天）；
- `npm audit --omit=dev`：0 个生产依赖漏洞；
- 线上 Chromium 冒烟：L2 合法取牌后 `moveCount 0→1`、Tray `0→1`、
  状态保持 `playing`，Console 0 error / 0 warning；
- 线上冒烟截图：`output/playwright/deploy-r1/live-l2-after-pick.png`（Git 忽略）。

本次只部署预览，尚未提交或推送 R1 源码。

---

# Claude R1 验收（2026-08-23）

**结论：8 条量化门槛全部通过，R1 可提交。** 独立复核，非采信报告。

## 门槛逐条核对

| # | 门槛 | 实测 | |
|---|---|---|---|
| 1 | 棋盘图案占卡牌 62%~68% | `boardIconCanvasRatio: 1` → 67.97% × 1.00 = **68.0%** | ✅ |
| 2 | 主体不越 206px 安全区 | 棋盘主体 **174px**、Tray **157px** | ✅ |
| 3 | Tray 不得有三层缩放 | `createTrayTile` 已改为**单张 Image**，无嵌套 frame | ✅ |
| 4 | 6 列 ground truth 52.17 / 44.34 | 15 项布局单测全过 | ✅ |
| 5 | disabled 不用 primary fill | `resolveToolButtonStyle` 在 `!enabled` 时**提前返回**中性色 | ✅ |
| 6 | 32px 眯眼可辨 | 真机截图 8 类图案清晰可辨 | ✅ |
| 7 | 可点 Tile 坐标/命中区有测试 | `layout.test.ts` 新增基线对齐 + 命中区边界内外反向验证 | ✅ |
| 8 | lint / test / build | **112 项**全过 | ✅ |

Tray 图案占比 **40.1% → 61.2%**（槽位已无内框，不适用 62% 下限）。

## 反向验证（确认测试不是空气）

| 注入的错误 | 结果 |
|---|---|
| `boardIconCanvasRatio` 退回 `0.7` | 占比门槛**立刻变红** ✅ |
| disabled 改用 `primaryFill` | 按钮门槛**立刻变红** ✅ |

两文件均已还原，`git diff` 为空。

## 设计上值得肯定的一点

`calculateBottomAlignedBoardPlacements` 做成**纯函数并返回命中区**，
渲染与测试共用同一套坐标——这从结构上杜绝了「画面改了但点击还在旧位置」
的静默回归。D3 的独立可回滚要求也因此满足。

---

# R1 遗留：空白位置改变了，但总量没变

**这是 R1 未解决、且 R2 文档未列为首要项的问题。**

底部基线把棋盘锚定到 Tray 上方，**空白从棋盘下方转移到了 HUD 与棋盘之间**。
真机截图（L4 步数 5）实测中间空白约 **406px ≈ 屏幕 15%**，
且**随取牌进行持续增大**——与 R1 前的问题同源，只是换了位置。

根因：`calculateBottomAlignedBoardPlacements` 的 `baselineY` 恒等于
`trayTop - spaceBeforeTray - tileSize`，所有余量全部堆积在上方。

三种处理方向：

1. **棋盘整体垂直居中**（保留底部基线的列内对齐，但让整块棋盘在
   HUD~Tray 之间居中）—— 改动小，空白平分上下
2. **Tray 与工具栏上移**，主动吃掉空白 —— 需重排底部区域
3. **空白区放内容**（关卡目标 / 花园装饰）—— 需新素材，R3 范畴

> ⚠️ `calculateCenteredBoardTop` 目前**只被自己的测试引用**，生产代码已不再调用。
> 若采用方向 1 可直接复用；若确定不用，应连同测试一并删除，
> 但需注意 §12.2 要求底部基线**保持独立可回滚**。

## 给 R2 的优先级意见

R2 文档的四项（头部白框、按钮材质、Tray 空槽、卡片投影）**都是对的，
但都是材质层面**。上面这条空白问题是**结构层面**，影响面更大，
建议**排在 R2 材质精修之前**。
