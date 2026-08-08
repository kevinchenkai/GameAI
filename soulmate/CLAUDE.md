# CLAUDE.md — 《Soulmate》Claude Code 约束规范

> ⚠️ **本项目的硬性边界写在 [`AGENTS.md`](./AGENTS.md)，开工前必读，其内容优先于本文件。**
> 本文件只做导航与要点提炼，**不重复也不覆盖** `AGENTS.md` 的规则。
> 仓库级约定（远端、同步、提交）见根目录 [`../CLAUDE.md`](../CLAUDE.md)。

---

## 1. 项目一句话

移动端优先的陪伴体验：进入私人房间，与伴侣角色聊天、看照片、要一个拥抱、听一句晚安。强调情绪节奏、轻量交互与"在场感"。前端原生 HTML/CSS/JS，后端 Node.js + SQLite，接 DeepSeek。

---

## 2. 开工前必读

| 文档 | 内容 | 何时读 |
|---|---|---|
| [`AGENTS.md`](./AGENTS.md) | **硬边界**：部署范围、生产数据保护、UID/记忆隔离、人设设定、验证清单 | **每次开工前** |
| [`README.md`](./README.md) | 项目概览与本地启动 | 首次接触 |
| `docs/soulmate_v2_design.md` | 记忆 / UID 架构设计 | 改记忆或 UID 逻辑前 |
| `prompt.txt` | 产品与提示词需求、可追溯记录 | 改人设或提示词前 |
| `api/README.md` | 后端 API 用法 | 改后端前 |

---

## 3. 高频红线速查（细节以 `AGENTS.md` 为准）

以下是最容易踩且后果最重的四类，**完整规则务必回查 `AGENTS.md`**：

| 主题 | 要点 |
|---|---|
| **部署范围** | 只同步到 `/www/wwwroot/g.ismayday.mobi/soulmate/`。**绝不** rsync 到站点根，**绝不**对站点根跑 `rsync --delete`——同级还有首页与 tavern / star_fighter / journey |
| **生产数据** | 部署必须排除 `.env`、`api/data/`、`*.sqlite*`。服务器上的 DeepSeek 配置与 SQLite 数据**不可被本地文件覆盖或删除** |
| **UID 隔离** | `uid` 是玩家数据边界。一个 UID **不得**读到另一个 UID 的私有记忆；`uid = NULL` 表示全局规则 |
| **资源路径** | 页面由 `/soulmate/` 提供，前端资源保持**相对路径**（`app.js?v=...`、`images/...`），改成 `/app.js` 这类根路径会指向站点首页 |

**密钥**：任何情况下不打印、不写入文档、不提交 `ADMIN_TOKEN` / DeepSeek key / `.env` 内容。

---

## 4. 改动后必做

前端改动后：

```bash
node --check app.js
node --check settings.js
```

后端改动后：

```bash
for f in api/src/*.js; do node --check "$f" || exit 1; done
```

- 静态资源变更时同步更新 `app.js` 的 `ASSET_VERSION` 与 `index.html` / `settings.html` 里的 `?v=` 查询参数，否则用户拿到缓存旧版。
- 行为变更时同步更新对应文档（见 `AGENTS.md` §Documentation）。
- 部署后按 `AGENTS.md` §Post-Deploy Checklist 逐条核验。

---

## 5. 红线

- ❌ 违反 `AGENTS.md` 中任何一条硬边界
- ❌ 部署波及站点根目录或其它子项目
- ❌ 覆盖 / 删除生产 `.env` 与 SQLite 数据
- ❌ 打破 UID 数据隔离
- ❌ 打印或提交任何密钥
- ❌ 未经用户要求 push
