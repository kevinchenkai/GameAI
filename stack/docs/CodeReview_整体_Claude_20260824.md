# StackPop 整体 Code Review（Claude，2026-08-24）

> 触发：iPhone 真机验收通过后的一次全量复查。
> 范围：`web/src/**` 全部 5158 行 + 测试与工程配置。
> 性质：**没有发现必须立即修的缺陷**。以下全部是「可以更好」，按性价比排序。
>
> ---
>
> ## ✅ 执行状态（2026-08-24 更新）
>
> §7 汇总表中 **1~5 项已全部完成**，随 `stack-v1.0` 发布：
>
> | # | 项 | 状态 | 提交 |
> |---|---|---|---|
> | 1 | 抽 `RoundedButton` 统一三处按钮 | ✅ 已在 R2-A 完成 | — |
> | 2 | 拆 `game/render/` 三个渲染器 | ✅ 完成 | `14c86ce` `b5d7300` `5647389` |
> | 3 | `renderGame` 补动画清理 | ✅ 完成 | `d307b6c` |
> | 4 | 散落 alpha 收进 `GAME_UI` | ✅ 完成（新增 29 个 token） | `e6bfc60` 等 |
> | 5 | Phaser 单独切 chunk | ✅ 完成 | `af25a94` |
> | 6 | 补 20 关 / 打乱可解性测试 | ⬜ 未做（P3） | — |
> | 7 | Phaser 自定义构建裁剪 | ⬜ 按建议**暂不做** | — |
>
> **实际结果与原估计的偏差**：
> - GameScene **1121 → 877 行**（原估 ~400）。差距源于 §1 的估计假设三个渲染器
>   都能整体搬走；实际 `drawResult` / `drawRestartConfirmation` 深度依赖 model 与
>   undoManager，整体搬走会违反「渲染层不碰 model」的契约，故只抽了无状态原语。
>   **契约优先于行数指标**——这是刻意的取舍，不是没做完。
> - 散落 alpha 原记「3 处」，实际 5 处；连同棋盘 / 暂存槽 / 弹窗的颜色字面量一并
>   收进 `GAME_UI` 与 `COLORS`，共新增 **15 个颜色 token + 14 个数值 token**。
> - 测试 131 → **140 项**（新增 `uiTokens.test.ts` 防回归，已反向验证会变红）。

---

## 0. 先说做得好的（不是客套，是为了别改坏）

这几条已经在多轮里救过场，**后续重构必须保住**：

| | 为什么重要 |
|---|---|
| **红线零违反** | `core/`+`config/` 零 Phaser 依赖、零 `Math.random`、零 `any`、零 `new AudioContext` —— 四条全清 |
| **规则单一真源** | `core/rules/` 被 GameModel / Solver / Simulator 共用，且有引用相等性测试锁死 |
| **纯函数返回命中区** | `calculateBottomAlignedBoardPlacements` 让渲染与测试共用同一套坐标，**结构上杜绝**「画面改了但点击留在旧位置」 |
| **视觉 token 集中** | `GAME_UI` 40 个 token + `toolButtonStyle` / `tileVisualStyle` / `trayPresentation` 三个纯函数 |
| **门禁能真的变红** | 每轮都做反向验证。`uiLint.test.ts` 甚至给 lint 规则本身留了正反例 |
| **可访问性有实测支撑** | 8 类图案**灰度 32px 下仍可辨**，色盲玩家可玩 —— 这是意外收获，别在后续调色时弄丢 |

我另跑了三条独立探针，全部通过：

- **20 关初始盘面全部可解**（Solver 穷举，200k 节点预算）
- **打乱后仍可解**（前 8 关抽样）
- **撤回栈有上限**（300 步长对局后 ≤120）

---

## 1. P1｜`GameScene.ts` 1075 行，70% 是绘制代码

### 事实

| 文件 | 行数 |
|---|---:|
| **GameScene.ts** | **1075** |
| SaveManager.ts | 292 |
| HowToPlayScene.ts | 284 |

GameScene 是第二名的 **3.7 倍**。按方法归类：

```
渲染/绘制  715 行 (70%)   14 个 draw*/create* 方法
流程/状态  302 行 (30%)   输入、撤回、存档、生命周期
```

### 问题

不是「行数多」本身，而是**两类关注点缠在一起**：改一个视觉参数要在一个千行文件里
定位，而这个文件同时还管着输入队列、存档时机和场景生命周期。
R2-A 那轮 GameScene 一次改了 262 行，就是这个结构的代价。

### 建议：抽出 `game/render/` 三个纯绘制模块

```
game/render/
├── BoardRenderer.ts    drawBoard / createTileVisual / makeTileInteractive
├── TrayRenderer.ts     drawTray / createTrayTile
└── DialogRenderer.ts   drawResult / drawRestartConfirmation / drawResultStat
```

**关键约束**：这些模块**只接收 `layout` 与 `state`、只产出 GameObject**，
不碰 `this.model`、不碰存档、不触发状态变更——
即「渲染层可替换」这条框架原则的落地。

GameScene 保留 `renderGame()` 作为编排者与全部流程逻辑，预计降到 ~400 行。

**收益**：视觉改动的爆炸半径从 1075 行缩到单个渲染器；
**风险**：纯移动代码，121 项测试是安全网。建议**一次只搬一个模块**，各自单独提交。

---

## 2. P1｜三个按钮绘制方法重复

`drawToolButton`（8 处绘制原语）、`drawResultButton`（8 处）、
`drawConfirmationButton`（2 处）各自实现了同一套：

```
fillRoundedRect + strokeRoundedRect + POINTER_OVER/OUT/DOWN/UP
```

### 后果

R2-A 统一按钮材质时，**只有工具栏按钮拿到了新的圆角/阴影/按压态**；
结果弹窗按钮和确认按钮仍是旧样式。这不是猜测——看
`mobile-win-dialog` 截图，三个按钮扁平、无阴影，与底部工具栏材质明显不同。

### 建议

抽 `game/ui/RoundedButton.ts`：

```ts
interface ButtonSpec {
  x, y, width, height: number;
  label: string;
  style: ToolButtonStyle;   // 复用 R1 已有的 token
  onTap: () => void;
  enabled?: boolean;
}
export function drawRoundedButton(scene, spec): Phaser.GameObjects.Container
```

三处调用点全部改用它。**副作用是顺手修好了 §5 的弹窗按钮材质不一致。**

---

## 3. P2｜首屏 1.6 MB（gzip 366 KB），几乎全是 Phaser

### 事实

```
dist/assets/index-*.js   1,606 KB  (gzip 366 KB)
自有代码约 60 KB，其余全是 Phaser 3.90
```

实际用到的 Phaser 能力**很窄**：

```
Input.Events 37  Scenes.Events 10  Scale.Events 10
Geom.Rectangle 6  Container 5  Loader.Events 4
Tweens 2  Sound.Events 2  Image 2  Graphics 2
```

**完全没用到**：物理引擎（Arcade/Matter）、Tilemap、Spine、Video、粒子系统的高级特性。

### 但这不是一个快速优化

我查了 `node_modules/phaser/dist/`，官方只预置了
`phaser-arcade-physics` 和 `phaser-ie9`，**没有 "no-physics" 变体**。
真要裁剪得用 Phaser 自己的 webpack 配置做自定义构建，属于独立的工程任务。

### 建议

- **现在不做**。gzip 366 KB 在 4G 下约 1~2 秒，配合已有的 30 天缓存，
  回访用户零成本。
- **记录为技术债**。若将来首屏时间成为真实投诉（而非猜测），
  再评估自定义构建，预期能省 30~40%。
- 更便宜的先行项：`build.rollupOptions` 把 Phaser 单独切 chunk，
  让业务代码更新时不必让用户重下 1.5 MB。**这条值得先做。**

---

## 4. P2｜三处散落的硬编码 alpha

```
GameScene.ts:309  settings.setAlpha(0.5)
GameScene.ts:518  glow.setAlpha(0.25)
GameScene.ts:718  star.setTint(0xaebbc5).setAlpha(0.48)
```

与「材质参数集中到 `GAME_UI`」的原则不一致。数量少、不影响门槛，
但**调色时容易漏改**——和 `px()` 漏乘一样，不报错、只是看起来不对。

建议随 §1 重构一并收进 `GAME_UI`。

---

## 5. P2｜`renderGame()` 全量重建，未来可能成为性能瓶颈

`renderGame()` 里 `this.children.removeAll(true)` 销毁**全部** GameObject 再重建，
每次取牌都跑一遍（代码中 10 处调用）。

**当前没有问题**：最大 6 列 × 12 层 = 72 张牌，真机实测流畅，
`tweens.killAll()` 也在 SHUTDOWN 里做了。

**风险点**在于：多数动画 tween 以 `resolve()` 结束、天然先于重建完成，
但这是**时序上的巧合而非结构保证**。若将来加入更长的动画（例如 §6 建议的胜利彩纸），
就可能出现「tween 还在跑，target 已被 destroy」。

建议：`renderGame()` 开头补一句显式清理，把巧合变成保证：

```ts
this.tweens.killAll();          // 已有 trayWarningTween?.stop()，扩为全量
this.children.removeAll(true);
```

差量更新（只重绘变化的列）**暂不建议**——当前规模下是过度优化，
且会引入「渲染状态与模型状态不同步」这类更难查的 bug。

---

## 6. P3｜可以加的测试

现有 121 项覆盖良好，补两类会更稳：

1. **全 20 关初始盘面可解性**——我这次是临时脚本跑的，
   建议固化进 `levels.test.ts`（我实测 20/20 通过，Solver 200k 节点预算内）
2. **打乱后可解性**——`findSolvableShuffle` 已有测试，
   但建议把抽样关卡从少数几关扩到全 20 关（实测前 8 关通过）

---

## 7. 汇总与建议顺序

| # | 项 | 优先级 | 收益 | 风险 |
|---|---|---|---|---|
| 1 | 抽 `RoundedButton`，统一三处按钮 | **P1** | 顺带修好弹窗按钮材质不一致 | 低 |
| 2 | 拆 `game/render/` 三个渲染器 | **P1** | GameScene 1075 → ~400 行 | 低（纯移动 + 121 项测试兜底） |
| 3 | `renderGame` 补 `tweens.killAll()` | P2 | 把时序巧合变成结构保证 | 极低 |
| 4 | 3 处散落 alpha 收进 `GAME_UI` | P2 | 一致性 | 极低 |
| 5 | Phaser 单独切 chunk | P2 | 业务更新不必重下 1.5 MB | 低 |
| 6 | 补 20 关可解性 / 打乱可解性测试 | P3 | 防回归 | 无 |
| 7 | Phaser 自定义构建裁剪 | **暂不做** | 省 30~40% 体积 | 中，需独立评估 |

**建议先做 1，因为它同时是 §5 UI 问题的修复**；再做 2，一次搬一个模块。
