# CLAUDE.md — GameAI 仓库级约定

> 本文件是仓库**根级**约定，适用于所有子项目。
> 子项目若有自己的 CLAUDE.md（如 [`journey/CLAUDE.md`](./journey/CLAUDE.md)），**以子项目的为准**，本文件只覆盖仓库层面的事项（远端、同步、跨项目边界）。

---

## 1. 仓库构成

| 目录 | 项目 | 技术栈 | 子项目规范 |
|---|---|---|---|
| [`Tavern/`](./Tavern/) | 武林小馆 Wulin Tavern | Phaser 3 + TS + Node API | [CLAUDE.md](./Tavern/CLAUDE.md) |
| [`soulmate/`](./soulmate/) | Soulmate | 原生 HTML/JS + Node + SQLite | [CLAUDE.md](./soulmate/CLAUDE.md) ⚠️ 另有 [AGENTS.md](./soulmate/AGENTS.md) |
| [`star_fighter/`](./star_fighter/) | Star Fighter | 单文件 HTML5 Canvas | [CLAUDE.md](./star_fighter/CLAUDE.md) |
| [`journey/`](./journey/) | 西游记飞行棋 Journey Ludo | Godot 4.x | [CLAUDE.md](./journey/CLAUDE.md) |
| `index.html` | Codex Games 站点首页 | HTML | — |
| `scripts/` | 公共部署 / 工具脚本 | — | — |

**开工前先读对应子项目的 CLAUDE.md**；子项目规范与本文件冲突时，以子项目为准。

**跨项目边界**：各子项目互不干涉。改动一个项目时，不擅自修改其它项目的文件。

---

## 1.1 部署边界（全局红线）

四个游戏**共用同一台服务器的同一个站点根** `/www/wwwroot/g.ismayday.mobi/`，各自占一个子目录：

```
/www/wwwroot/g.ismayday.mobi/     ← 站点根（Codex Games 首页）
├── tavern/          ├── soulmate/
├── star_fighter/    └── journey/
```

各项目 `deploy.sh` 多数带 `rsync --delete`。因此：

- ✅ 只同步到自己的 `$REMOTE_APP_DIR`
- ❌ **绝不**把任何子项目的文件 rsync 到站点根 `$REMOTE_ROOT`
- ❌ **绝不**对站点根执行 `rsync --delete`——会连带删除其它三个游戏
- 若某次部署看起来需要动站点根，**停下来问用户**

密钥（DeepSeek key、`ADMIN_TOKEN` 等）只存在于各项目服务器上的 `.env`，**不入库、不打印、不写进文档**。

---

## 2. Git 远端：主库 / 备份库

本仓库同时挂两个远端，**双端镜像同一份内容**：

| 远端 | 定位 | 地址 | 分支名 |
|---|---|---|---|
| `origin` | **主库**（GitHub，日常开发） | `https://github.com/kevinchenkai/GameAI.git` | `main` |
| `ezone` | **备份库**（金山内网 Ezone） | `http://ezone.kingsoft.com/ksyun/game-ai/chenkai.git` | `master` |

> ⚠️ **两端分支名不同**：本地是 `main`，备份库是 `master`。推备份必须写成 `main:master`，直接 `git push ezone` 会失败或推错分支。

### 同步命令

```bash
# 1) 推主库（GitHub）
git push origin main

# 2) 推备份库（Ezone，注意 main:master 映射）
git push ezone main:master
```

### 同步检查

```bash
git fetch --all --prune
git rev-list --left-right --count origin/main...HEAD    # 期望 0  0
git rev-list --left-right --count ezone/master...HEAD   # 期望 0  0
```

左值 = 远端独有提交数，右值 = 本地独有提交数。备份库正常情况下应始终是**纯快进**（左值为 0）；若左值非 0，说明有人直接改了备份库，**先查清来源再处理，不要强推覆盖**。

### 约定

- **推送需用户明确要求**，不擅自 push（子项目规范中的同款红线，在仓库级同样适用）。
- 备份库只做镜像，**不在 Ezone 上直接提交**。
- 两端保持一致：推完主库后一并推备份库，避免备份长期滞后。
- `.gitignore` 已排除 `.DS_Store`、`journey/.godot/`、`journey/assets/raw/`（出图中间件）等；两端内容因此都不含这些，属预期行为。

---

## 3. 提交规范

- commit 前缀：`feat(scope): ...` / `fix: ...` / `docs(scope): ...` / `chore(scope): ...`，scope 用子项目名（如 `journey`）。
- commit message 使用中文描述。
- 结尾附：
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```
- 不提交 `.DS_Store` 与各类本地环境文件。
