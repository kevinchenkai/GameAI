# CLAUDE.md — 《Star Fighter》Claude Code 约束规范

> 本文件是 Claude Code 在 star_fighter 子项目工作的约束规范。
> 仓库级约定（远端、同步、提交）见根目录 [`../CLAUDE.md`](../CLAUDE.md)。

---

## 1. 项目一句话

霓虹风格的街机太空射击：驾驶战机穿越深空，闪避弹幕、拾取强化、扛住渐强的敌潮，危急时放 Omega Blast。强调即时手感、可读的战斗画面与可重复挑战的街机节奏。

---

## 2. 形态：单文件游戏

**整个游戏就是 [`index.html`](./index.html) 一个文件**（约 72KB）：内联 `<style>` + 内联 `<script>` + `<canvas id="gameCanvas">`，原生 JS 手写渲染循环，**无框架、无构建步骤、无 npm 依赖**。

| 文件 | 作用 |
|---|---|
| `index.html` | 游戏全部代码（样式 + 逻辑 + 渲染） |
| `images/` | 战机 / 敌机 / Boss / 背景 PNG |
| `prompt.txt` | 产品与设计需求、可追溯记录 |
| `deploy.sh` | 部署脚本（含本地自检） |

**保持单文件形态**：不要为了"工程化"擅自拆分成模块、引入打包器或框架。要拆分需先与用户确认。

---

## 3. 不可违背的实现准则

1. **数值集中在 `CONFIG`**：速度、血量、冷却、掉落率、难度系数、配色全部在 `index.html` 顶部的 `CONFIG` 对象里（约 L205）。**禁止把平衡数值散写进逻辑函数**。调平衡 = 改 `CONFIG`，不改代码结构。
2. **敌机 / 素材表驱动**：敌机类型在 `ENEMY_TYPES`，素材路径在 `ASSET_PATHS`（约 L253）。新增敌机或素材 = 加表项 + 放 PNG，不改渲染主循环。
3. **配色走 `CONFIG.colors`**：霓虹色板已定义（cyan / violet / pink / gold 等）。**不要在绘制代码里写死十六进制颜色**，否则整体风格会逐渐走样。
4. **固定逻辑分辨率**：逻辑画布固定 480×720，高分屏通过 `maxPixelRatio` 适配。**不要改逻辑分辨率**——所有坐标、碰撞半径、速度都基于它。
5. **素材路径相对**：`ASSET_PATHS` 用 `images/...` 相对路径。游戏部署在 `/star_fighter/` 子目录，改成 `/images/...` 会指向站点首页根目录而 404。
6. **移动端可玩**：触屏操作（`touchShootDelay` 等）是既有能力，改输入逻辑时不要只顾键盘而破坏触屏。

---

## 4. 本地运行与验证

直接用浏览器打开 `index.html` 即可，无需构建。

改动后必须做内联 JS 语法自检（`deploy.sh` 内置同款检查，也可单独跑）：

```bash
CHECK_ONLY=1 ./deploy.sh
```

该命令只做本地校验（必需素材存在 + 解析全部 `<script>` 块），**不连服务器**。改动后建议实际试玩一局：开火、拾取强化、升级战机、进 Boss 战、放 Omega Blast。

---

## 5. 部署

- 线上：`https://g.ismayday.mobi/star_fighter/`
- 部署：`./deploy.sh`（可用 `DRY_RUN=1 ./deploy.sh` 预览改动）
- 目标固定为 `$REMOTE_APP_DIR`（默认 `/www/wwwroot/g.ismayday.mobi/star_fighter`）。脚本带 `--delete`，**务必确认目标目录正确**——同级还有首页与 tavern / soulmate / journey，误指站点根会造成破坏性删除。
- `images/*source.png`（源文件）已被部署排除，属预期行为。

---

## 6. 红线

- ❌ 把平衡数值 / 颜色硬编码进逻辑与绘制代码，绕过 `CONFIG`
- ❌ 未经确认拆分单文件形态或引入框架 / 打包器
- ❌ 改逻辑分辨率 480×720
- ❌ 把素材路径改成根路径 `/images/...`
- ❌ 部署波及站点根目录或其它子项目
- ❌ 未经用户要求 push
- ❌ 改动仓库内其它项目（journey / soulmate / Tavern 互不干涉）
