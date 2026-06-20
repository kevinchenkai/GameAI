# Journey Ludo（西游记飞行棋）V0.1

以《西游记》取经路线为主题的 Q 版 2D 单线 72 格飞行棋（Godot 4.x）。玩家选 1 角色，其余 3 个 AI，先到第 72 格者胜。

## 文档导航

| 文档 | 作用 |
|---|---|
| [docs/JOURNEY_LUDO_V0_1_PLAN.md](docs/JOURNEY_LUDO_V0_1_PLAN.md) | 主方案（规则裁决 §3.4、事件总表 §5.1 为实现唯一准绳） |
| [docs/CLAUDE_TASKS.md](docs/CLAUDE_TASKS.md) | 编码任务手册（Task 1–8、autoload 规划、里程碑） |
| [CLAUDE.md](CLAUDE.md) | Claude Code 编码约束规范 |
| [AGENTS.md](AGENTS.md) | Claude Code（编码）与 Codex（美术）协作边界 |
| [prompts/imagegen/ART_ASSET_PROMPTS.md](prompts/imagegen/ART_ASSET_PROMPTS.md) | 美术生成手册 |
| [docs/ART_ASSET_LIST.md](docs/ART_ASSET_LIST.md) | 美术资产清单与状态 |

## 环境

- Godot **4.2+**（开发于 **4.7 stable**）
- 2D 项目，**Compatibility（GL Compatibility）** 渲染——兼容老显卡，也是 Web 导出推荐渲染后端

---

## 一、在 macOS 本地运行

### 1. 安装 Godot 4.x

任选其一：

```bash
# 方式 A：Homebrew（推荐，命令行直接可用）
brew install godot

# 方式 B：官网下载 .app 拖进 /Applications
#   https://godotengine.org/download/macos/
```

验证：

```bash
godot --version          # 期望输出 4.7.stable.official.… 或任意 4.2+
```

> Homebrew 装的会放到 `/opt/homebrew/bin/godot`（Apple Silicon）。若用 .app，可执行文件在
> `/Applications/Godot.app/Contents/MacOS/Godot`，可自建别名：
> `alias godot="/Applications/Godot.app/Contents/MacOS/Godot"`。

### 2. 首次导入美术素材（重要）

本仓库的 PNG 素材需经 Godot 导入才能在运行时加载（`.import` 文件已随仓库提交；`.godot/` 缓存未提交、首次需本机生成）。**新机首次务必先跑一次导入**，否则会出现“只有占位圆、图全不显示”：

```bash
# 在项目根目录（含 project.godot）执行，生成 .godot/ 导入缓存后立即退出
godot --headless --path . --import
# 或用编辑器打开一次本目录也会自动导入
```

### 3. 运行游戏

```bash
# 方式 A：编辑器内运行
#   用 Godot 打开本目录（选 project.godot）→ 按 F5（主场景 scenes/Main.tscn）

# 方式 B：命令行直接运行（无需打开编辑器）
godot --path .
```

预期：进入**角色选择**界面 → 选 1 个角色 → 72 格对局（掷骰 / 移动 / 事件 / 技能 / 碰撞）→ 判胜 → **排名结算** → 重新开始。游戏内按 **D** 键可切换格子编号调试显示。

---

## 二、导出 Web 版并部署到 nginx

Godot 4 的 Web 导出产物是一套静态文件（`.html` / `.js` / `.wasm` / `.pck`），用任意静态服务器托管即可，无需后端。

### 1. 安装 Web 导出模板（一次性）

导出前必须装与引擎**同版本**的 Export Templates，否则报“缺少模板”。任选其一：

```bash
# 方式 A：编辑器内 → 菜单 Editor → Manage Export Templates… → Download and Install

# 方式 B：命令行（版本号需与 `godot --version` 一致，此处 4.7.stable）
#   下载官方模板包 Godot_v4.7-stable_export_templates.tpz 后安装到：
#   ~/Library/Application Support/Godot/export_templates/4.7.stable/
```

验证模板就位：

```bash
ls ~/Library/Application\ Support/Godot/export_templates/4.7.stable/ | grep web
# 期望看到 web_*.zip（如 web_release.zip / web_debug.zip / web_nothreads_*.zip）
```

### 2. 添加 Web 导出预设

本仓库未提交 `export_presets.cfg`（机器相关，已 gitignore）。首次需创建一个名为 **Web** 的预设：

```text
编辑器 → Project → Export… → Add… → Web
  - Runnable: 开
  - 其余默认即可（Compatibility 渲染已适配 Web）
```

> 兼容性提示：若目标 nginx **未启用 HTTPS + 跨源隔离头**（见下），在 Export 预设里关闭
> `Threads`（部分版本叫 “Thread Support”）可避免对 COOP/COEP 的硬性要求，省去配置麻烦。

### 3. 导出静态文件

```bash
mkdir -p build/web
godot --headless --path . --export-release "Web" build/web/index.html
```

成功后 `build/web/` 下生成：`index.html`、`index.js`、`index.wasm`、`index.pck`、`index.audio.worklet.js` 等。

> `build/` 已被 `.gitignore` 忽略，不会误提交。

### 4. 部署到 nginx server

把 `build/web/` 整个目录拷到服务器（示例 `/var/www/journey/`）：

```bash
rsync -avz build/web/ user@your-server:/var/www/journey/
```

nginx 站点配置（关键是 **.wasm 的 MIME 类型** 与 **跨源隔离响应头**——Godot 4 的多线程 WebAssembly 需要 `SharedArrayBuffer`，浏览器仅在 COOP/COEP 头下放行）：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/journey;
    index index.html;

    # 正确的 wasm MIME（否则浏览器拒绝以 WebAssembly 流式实例化）
    types { application/wasm wasm; }

    # 跨源隔离：开启 SharedArrayBuffer（多线程导出必需）
    add_header Cross-Origin-Opener-Policy   "same-origin"          always;
    add_header Cross-Origin-Embedder-Policy "require-corp"         always;

    location / {
        try_files $uri $uri/ =404;
    }

    # 大文件（.wasm/.pck）建议关闭再压缩（已是二进制）并允许缓存
    location ~* \.(wasm|pck)$ {
        add_header Cross-Origin-Opener-Policy   "same-origin"  always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        gzip off;
        expires 7d;
    }
}
```

应用并验证：

```bash
sudo nginx -t && sudo systemctl reload nginx
# 浏览器打开 http://your-domain.com/ ，进入角色选择即成功
```

**常见问题**
- **白屏 / 控制台报 `SharedArrayBuffer is not defined`**：缺 COOP/COEP 头，按上面补；或导出时关掉 Threads。
- **`.wasm` 404 或 MIME 错误**：确认 `types { application/wasm wasm; }` 已生效，文件已上传。
- **加载到一半卡住**：`.pck` 未上传或被改名；保持与 `index.html` 同目录、同名前缀。
- **生产环境**：COOP/COEP 在多数浏览器要求 **HTTPS**，正式部署请配 TLS（如 Let’s Encrypt）。

---

## 项目结构

```text
journey/
├── project.godot              # 2D / Compatibility，7 个 autoload
├── icon.svg
├── scenes/
│   ├── Main.tscn              # 入口（跳转角色选择）
│   ├── CharacterSelect.tscn   # 角色选择
│   ├── GameScene.tscn         # 主对局（棋盘+棋子+UI）
│   ├── ResultScene.tscn       # 结算/排名/重开
│   ├── board/ (Board, Tile)
│   ├── pieces/ (CharacterPiece)
│   └── ui/ (DicePanel, TurnPanel, EventPopup, RankingPanel)
├── scripts/                   # 各 .gd（含 autoload 单例）
├── data/                      # board_72 / events / characters / balance（数据驱动）
└── assets/                    # 美术素材（Codex 产出，已接入）
```

## 可复现随机

全项目统一使用 `GameRng` 单例。固定随机序列以复现 bug：把 `data/balance.json` 的 `debug_seed` 设为整数（如 `12345`）；设为 `null` 则每次随机播种。

## 开发进度

- [x] **Task 1** 项目基础结构
- [x] **Task 2** 72 格棋盘
- [x] **Task 3** 角色与移动
- [x] **Task 4** 回合与骰子
- [x] **Task 5** 事件系统
- [x] **Task 6** 角色被动技能
- [x] **Task 7** 结算界面（角色选择 / 排名 / 重开）
- [x] **Task 8** 美术接入（地图底图 / 格子 / 角色 / 骰子 / 事件图标）

**V0.1 可玩闭环完成**：选角 → 72 格对局（掷骰/移动/事件/技能/碰撞）→ 判胜 → 排名结算 → 重开。

## 场景流程

```text
Main → CharacterSelect → GameScene →(判胜)→ ResultScene →(重新开始)→ CharacterSelect
```

> 美术素材为 PNG，需 Godot 导入（`.import` 文件已随仓库提交）。首次在新机打开如未自动导入，用编辑器打开一次即可生成缓存。

## Web 导出说明

主方案要求 M0 即验证 Web（HTML5）导出可行。导出需在 Godot 编辑器安装对应 Export Templates 后，于 `Project > Export` 添加 Web 预设。命令行导出示例（模板就绪后）：

```bash
godot --headless --path . --export-release "Web" build/web/index.html
```

> 注：CI/headless 环境若未安装 Export Templates，导出会提示缺模板；本机验证以编辑器内导出为准。
