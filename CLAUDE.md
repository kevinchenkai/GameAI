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
| [`garden/`](./garden/) | Garden Match 三消 🚧 开发中 | Phaser 3 + TS + Vite | [CLAUDE.md](./garden/CLAUDE.md) |
| `index.html` | Codex Games 站点首页 | HTML | — |
| `scripts/` | 公共部署 / 工具脚本 | — | — |

**开工前先读对应子项目的 CLAUDE.md**；子项目规范与本文件冲突时，以子项目为准。

**跨项目边界**：各子项目互不干涉。改动一个项目时，不擅自修改其它项目的文件。

### 开发中项目

| 目录 | 状态 |
|---|---|
| `garden/` | Garden Match（三消 + 萌宠 + 花园），**Stage 0 功能已齐并已上线** https://g.ismayday.mobi/garden/ 。接口契约冻结见 [garden/CLAUDE.md](./garden/CLAUDE.md) §3，开发记录见 [开发日志](./garden/docs/开发日志%20Stage%200（M0~M7）.md)。当前阶段：UI 美化 → M8 真人测试。 |

---

## 1.1 部署边界（全局红线）

各游戏**共用同一台服务器的同一个站点根** `/www/wwwroot/g.ismayday.mobi/`，各自占一个子目录：

```
/www/wwwroot/g.ismayday.mobi/     ← 站点根（Codex Games 首页 index.html）
├── star_fighter/    ├── soulmate/
├── tavern/          ├── journey/
├── garden/          ← Garden Match，开发中，首次发布时创建
├── images/promo/    ← 首页自用素材（如 journey-ludo-cover.jpg）
└── mimo/  mystock/  ← ⚠️ 非本仓库项目，不归 GameAI 管，勿动
```

> `mimo/` 与 `mystock/` 是部署在同一台服务器的**其它非游戏项目**，不在本仓库内。
> 它们不是"多余目录"，**任何情况下不清理、不同步、不纳入部署范围**。

各项目 `deploy.sh` 多数带 `rsync --delete`。因此：

- ✅ 只同步到自己的 `$REMOTE_APP_DIR`
- ❌ **绝不**把任何子项目的文件 rsync 到站点根 `$REMOTE_ROOT`
- ❌ **绝不**对站点根执行 `rsync --delete`——会连带删除其它所有游戏与 mimo / mystock
- 若某次部署看起来需要动站点根，**停下来问用户**

### 服务器访问

用户本机 Mac 已配好 SSH 免密，**可直接登录，无需每次询问**：

```bash
ssh ubuntu@211.159.177.55
```

- 该账号 **sudo 免密**，`rsync` 已安装
- nginx `root` = `/www/wwwroot/g.ismayday.mobi`
- 文件属主统一 `www:www`，权限 644
- 静态图片 `expires 30d`（**改图请换文件名**，否则用户 30 天内看到旧图）
- 各 `deploy.sh` 的 `REMOTE_HOST` 默认值即此主机，可用同名环境变量覆盖

> 换机器 / 未配密钥的环境下会连不上——那是环境问题，交给用户处理，不要代为配置密钥。

### 首页发布

**站点根 `index.html` 没有部署脚本**，需手动 rsync（`images/` 等首页自用素材同理）：

```bash
rsync -avz --rsync-path="sudo rsync" --no-owner --no-group --chmod=F644 \
  index.html ubuntu@211.159.177.55:/www/wwwroot/g.ismayday.mobi/
```

发布后对齐属主：

```bash
ssh ubuntu@211.159.177.55 "sudo chown -R www:www /www/wwwroot/g.ismayday.mobi/index.html /www/wwwroot/g.ismayday.mobi/images"
```

发布纪律：

- **先 `--dry-run` 确认影响范围**，再实际执行
- 发布后核对本地与服务器 md5 一致，并 curl 各页面确认 200
- 只发布用户要求的内容；**大范围改动或涉及站点根删除时，先问用户**

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


### Tag 约定

| 前缀 | 含义 | 例 |
|---|---|---|
| `vX.Y.Z` | **整仓**版本（历史遗留，实际多为某个子项目的发版） | `v1.1.1`（soulmate 发版） |
| `<子项目>-<阶段>-vX.Y` | **单个子项目**的里程碑 / 回滚点 | `garden-stage0-v1.0` |

新建里程碑标签**一律用子项目前缀**——本仓库有 5 个子项目，
裸 `vX.Y.Z` 无法表达"这是谁的版本"（现有 3 个整仓标签就有这个问题）。

打 tag 前必须确认：

```bash
git status --porcelain          # 空
npm test && npm run build       # 全绿（在对应子项目里跑）
git rev-list --left-right --count origin/main...HEAD    # 0  0
```

**用附注标签**（`git tag -a`）而非轻量标签，说明里写清
「此时做完了什么、明确没做什么、怎么回滚」——
回滚点的价值在于半年后还知道它是什么。

推送要**分别推两个远端**（tag 不随 `git push` 自动带上）：

```bash
git push origin <tag>
git push ezone  <tag>
```

⚠️ 已推送的提交**不要 `reset --hard`** —— 两个远端都会不一致。
回滚用 `git revert`（保留历史）或 `git checkout <tag>`（只看）。

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
