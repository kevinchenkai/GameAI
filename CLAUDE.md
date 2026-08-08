# CLAUDE.md — GameAI 仓库级约定

> 本文件是仓库**根级**约定，适用于所有子项目。
> 子项目若有自己的 CLAUDE.md（如 [`journey/CLAUDE.md`](./journey/CLAUDE.md)），**以子项目的为准**，本文件只覆盖仓库层面的事项（远端、同步、跨项目边界）。

---

## 1. 仓库构成

| 目录 | 项目 | 技术栈 |
|---|---|---|
| [`Tavern/`](./Tavern/) | 武林客栈 Wulin Tavern | HTML5 |
| [`soulmate/`](./soulmate/) | Soulmate | HTML5 |
| [`star_fighter/`](./star_fighter/) | Star Fighter | HTML5 |
| [`journey/`](./journey/) | 西游记飞行棋 Journey Ludo | Godot 4.x |
| `index.html` | Codex Games 站点首页 | HTML |
| `scripts/` | 公共部署 / 工具脚本 | — |

**跨项目边界**：各子项目互不干涉。改动一个项目时，不擅自修改其它项目的文件。

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
