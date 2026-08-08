# CLAUDE.md — 《武林小馆 Wulin Tavern》Claude Code 约束规范

> 本文件是 Claude Code 在 Tavern 子项目工作的约束规范。
> 仓库级约定（远端、同步、提交）见根目录 [`../CLAUDE.md`](../CLAUDE.md)；本地启动与部署见 [`README.md`](./README.md)。

---

## 1. 项目一句话

武侠主题的客栈群像游戏：玩家进入江湖客栈，与金庸群侠同桌喝酒、拌嘴、触发对话事件。前端 Phaser 3 + TypeScript，后端 Node.js SSE 接 DeepSeek 生成角色化对白。

---

## 2. 技术栈与目录

| 部分 | 技术 | 目录 |
|---|---|---|
| 前端 | Phaser 3.90 + TypeScript + Vite 5 | `web/src/` |
| 后端 | Node.js ≥20（ESM，零依赖，原生 http） | `api/src/` |
| 素材 | PNG 立绘 / 头像 / 场景 | `images/`（项目根，非 web 子目录） |
| 设计文档 | v1 设计 / 美术 / 编码稿 | `docs/` |

前端分层（`web/src/game/`）：

- `scenes/` — `BootScene`（预加载）、`TavernScene`（主场景）
- `systems/` — `movementSystem` / `roundSystem` / `apiClient` / `fullscreenSystem`
- `data/` — `npcs.ts` / `events.ts` / `tables.ts` / `collisions.ts` / `assets.ts`
- `types.ts` — 全局类型定义

后端模块（`api/src/`）：`server.js`（入口/路由）、`config.js`（环境）、`deepseek.js`（上游）、`prompt.js`（提示词组装）、`fallback.js`（降级回复）、`npcs.js`、`http.js`。

---

## 3. 不可违背的实现准则

1. **数据驱动人物**：NPC 人设、口头禅、语气、预设台词全部写在 `web/src/game/data/npcs.ts`，**不在场景或系统代码里硬编码角色文案**。新增 NPC = 加一条数据 + 配套素材，不改渲染逻辑。
2. **前后端人设一致**：`web/src/game/data/npcs.ts` 与 `api/src/npcs.js` 描述同一批角色，改动其一必须同步另一侧，否则前端显示与 AI 生成的口吻会脱节。
3. **fallback 必须可用**：未配置 `DEEPSEEK_API_KEY` 时 `/api/chat` 要返回角色化的 `fallback.js` 回复，**不得报错或返回空**。这是本地开发与线上降级的共同保障。
4. **后端保持零依赖**：`api/` 目前不依赖任何 npm 包（ESM + 原生 `http`）。新增依赖前先确认无法用标准库实现。
5. **密钥不入库**：`DEEPSEEK_API_KEY` 只存在于 `api/.env`（已被 deploy 排除、被 gitignore）。**禁止把密钥写进代码、文档或输出**。
6. **素材目录只读**：Vite 把项目根 `images/` 映射为 `/images/`，**前端不复制、不改写正式素材**。

---

## 4. 本地开发

```bash
# API（默认 3002）
cd api && npm install && npm run dev

# Web（Vite）
cd web && npm install && npm run dev
```

---

## 5. 验证与部署

提交前自检：

```bash
cd web && npm run build    # tsc 类型检查 + vite 构建，必须零报错
```

- 线上：`https://g.ismayday.mobi/tavern/`，API 在 `https://g.ismayday.mobi/tavern-api/`
- 部署：项目根 `./deploy.sh`（rsync 增量 + 远端重启 API + 健康检查）
- 部署目标固定为 `$REMOTE_APP_DIR`（默认 `/www/wwwroot/g.ismayday.mobi/tavern`），**绝不 rsync 到站点根 `$REMOTE_ROOT`**——同级还有 soulmate / star_fighter / journey。

---

## 6. 红线

- ❌ 把角色文案 / 人设硬编码进场景或系统代码
- ❌ 只改前端或只改后端人设，导致两侧不一致
- ❌ 提交 `api/.env` 或在任何输出中打印密钥
- ❌ 部署时波及站点根目录或其它子项目
- ❌ 未经用户要求 push
- ❌ 改动仓库内其它项目（journey / soulmate / star_fighter 互不干涉）
