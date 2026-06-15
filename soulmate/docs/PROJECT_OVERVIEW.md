# SoulMate（心动陪伴）项目说明文档

> 文档生成日期：2026-06-15
> 当前版本：**v0.4.4**（前端）/ **0.4.4**（API 运行版本）
> 本地路径：`/Users/kk/Work/GameAI/soulmate/`
> 线上地址：[https://g.ismayday.mobi/soulmate/](https://g.ismayday.mobi/soulmate/)

> 版本口径：API 健康检查与运行日志以 `api/src/config.js` 的 `config.appVersion` 为准；`api/package.json` 应保持同步。

---

## 1. 项目概览

**SoulMate（心动陪伴）** 是一款手机版 HTML5 竖屏恋爱陪伴小游戏，隶属于 GameAI 站点下的子项目。玩家打开页面后进入一个浪漫、轻互动的陪伴空间：查看真实时间、点击照片互动、与「女朋友」文字聊天、积累今日心动值，并根据聊天内容切换开心 / 生气 / 撒娇三种表情。

项目采用 **纯静态前端 + 轻量 Node.js API** 架构：

- 前端不直连 DeepSeek，只请求同域 `/api/chat`
- DeepSeek API Key 仅保存在服务端 `api/.env`
- 聊天记录与记忆数据持久化在 SQLite（`api/data/soulmate.sqlite`）
- 每个终端绑定唯一 **UID**，实现玩家数据分区与迁移

一句话定位：

> **前端负责「她在眼前」，后端负责「她慢慢记住你」。**

---

## 2. 产品定位与核心体验

### 2.1 目标用户与场景

- 主要面向手机浏览器（iPhone Safari、Android Chrome、微信内置浏览器）
- PC 浏览器以居中手机比例舞台呈现，不横向拉满
- 适合碎片时间打开，进行轻量恋爱陪伴互动

### 2.2 核心玩法循环

```text
打开游戏 → 开始陪伴 → 查看真实时间/背景氛围
         → 点击照片互动（短按/长按）→ 积累心动值
         → 文字聊天 → SSE 流式回复 → 表情切换
         → 心动值提升 → 亲密阶段升级 → 更黏人的对话风格
```

### 2.3 女朋友人设（L0 固定 Profile）

人设贯穿 DeepSeek prompt、服务端 fallback 和前端离线回复，核心设定如下：

| 维度 | 设定 |
|------|------|
| 身份 | 北京人，生日 2000-05-20，北京腾讯公司 AI 产品经理 |
| 关系 | 大学同学，大三确定恋爱，稳定 6 年 |
| 居住 | 北京知春路附近合租，同居 1 年 |
| 用户工作 | 字节跳动 Seed 团队 |
| 宠物 | 小猫「康康」 |
| 性格 | 独立要强、创作爱好、健身自律、爱美食旅行电影，偶尔 emo |
| 共同生活 | 小鹏 P7+、周末创作、一起看电影等 |

回复格式约定：`(形象动作) 回复内容`，短、口语、温暖、像微信聊天。

### 2.4 亲密阶段系统

心动值驱动五个亲密阶段，影响 prompt 语气、动作描写和快捷回复：

| 阶段 | 心动值门槛 | 风格 |
|------|-----------|------|
| 陪伴期 companion | 0 | 温柔日常 |
| 贴近期 close | 80 | 主动关心 |
| 心动期 heartbeat | 140 | 亲密撒娇 |
| 热恋期 romance | 220 | 黏人热恋 |
| 专属期 exclusive | 320 | 只属于你 |

每日心动值不是固定从 0 开始。前端每天会按日期生成一个 52~80 左右的基础心动值，再通过点击照片、长按照片和聊天继续增长。

### 2.5 表情与照片互动

- 素材：`images/mate001.jpg` ~ `mate006.jpg`，每张为 **三拼图**（开心 / 生气 / 撒娇），CSS 通过 `width: 300%` + `translateX` 裁剪
- 短按照片：随机切换开心/撒娇，+2 心动值
- 长按照片（>520ms）：撒娇表情，+4 心动值，触发专属长回复
- 聊天内容经 `detectMood()` 关键词匹配切换表情

### 2.6 真实时间同步

- 顶部显示 `HH:mm:ss`、日期、星期
- 背景按时间段切换：清晨 / 白天 / 傍晚 / 夜晚（`data-phase` 属性）
- Prompt 注入当前真实时间、工作日/周末、上班/下班/居家场景围栏，防止地点和行为幻觉

---

## 3. 版本演进

| 版本 | 里程碑 |
|------|--------|
| v0.1 ~ v0.3 | 一期闭环：开始界面、三拼图表情、DeepSeek 直连、心动值、亲密阶段、离线兜底、微信分享 |
| v0.3.1 | **前后端拆分**：DeepSeek Key 移至 Node API，前端只调 `/api/chat` |
| v0.4.1 | SQLite 底座：聊天记录持久化、`/api/health` 检查 DB |
| v0.4.2 | 手动记忆与检索注入：`/api/memory`、`memoryUsed` 返回 |
| v0.4.3 | **UID 玩家分区**：终端自动生成 UID、`/api/uid/move` 迁移 |
| v0.4.4 | 设置页优化 + `/api/uid/reset` 清空当前 UID 数据 |
| v0.4.5+（规划） | DeepSeek 自动记忆提取、对话摘要压缩、设置页记忆审核 |

当前 **尚未实现**：DeepSeek 自动记忆提取（`memoryExtract.js`）、对话压缩（`memoryCompress.js`）、前端记忆管理界面。

---

## 4. 技术架构

### 4.1 整体架构图

```text
┌─────────────────────────────────────────────────────────────┐
│  浏览器（移动端 / PC 居中舞台）                                │
│  frontend/index.html + app.js + styles.css                  │
│  localStorage: uid, messages, heart, mood, ...              │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch('/api/chat')  SSE
                           │ POST /api/uid/move|reset
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Nginx 反向代理（g.ismayday.mobi）                            │
│  /soulmate/*  → 静态文件                                     │
│  /api/*       → 127.0.0.1:3001                              │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  SoulMate API（Node.js 24, node:http）                       │
│  api/src/server.js                                          │
│    ├── prompt.js      → System prompt 编排 + 记忆注入        │
│    ├── deepseek.js    → DeepSeek 流式调用                    │
│    ├── fallback.js    → 服务端离线回复                       │
│    ├── memoryRetrieve.js → 关键词记忆检索                    │
│    ├── memoryStore.js → SQLite CRUD + UID 迁移/重置          │
│    ├── db.js + migrations.js → SQLite 初始化与迁移           │
│    └── config.js      → 环境变量读取                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     DeepSeek API              api/data/soulmate.sqlite
     (deepseek-v4-flash)       (WAL 模式)
```

### 4.2 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 纯 HTML/CSS/JS | 无 React/Vue/Vite，静态部署 |
| 后端 | Node.js 24 推荐，`node:http` | 轻量，无 Express 依赖；需支持 `node:sqlite` |
| 数据库 | `node:sqlite` + `DatabaseSync` | 本地 SQLite，WAL 模式 |
| AI | DeepSeek Chat Completions | `deepseek-v4-flash`，stream + SSE |
| 部署 | rsync + SSH | `./deploy.sh`，排除 `.env` 和数据库 |
| 可选本地 | Docker Compose | `./local.sh start`，Nginx + API 容器 |

### 4.3 三层兜底机制

1. **DeepSeek 正常**：SSE 流式 `delta` → `done`
2. **DeepSeek 失败**（超时、空回复、截断）：服务端 `fallback.js` 规则回复，`source: "fallback"`
3. **API 完全不可达**：前端 `offlineReply()` 本地规则回复，`source: "local"`

聊天体验不会因网络或模型故障而中断。

---

## 5. 目录结构

```text
soulmate/
├── frontend/                 # 前端静态资源（部署源）
│   ├── index.html            # 主游戏页：开始界面 + 游戏界面
│   ├── settings.html         # UID 设置页
│   ├── app.js                # 主逻辑（~1500 行）
│   ├── settings.js           # UID 校验、move、reset
│   ├── styles.css            # 移动端竖屏布局、情绪视觉、PC 适配
│   ├── images/               # 照片、SVG 氛围、分享封面、BGM
│   ├── Dockerfile            # 可选 Docker 构建
│   └── nginx.conf
├── api/                      # Node.js 后端
│   ├── src/
│   │   ├── server.js         # HTTP 路由与聊天主流程
│   │   ├── config.js         # 环境变量
│   │   ├── db.js             # SQLite 连接
│   │   ├── migrations.js     # 数据库迁移（v1 建表, v2 UID）
│   │   ├── memoryStore.js    # 记忆/聊天 CRUD、UID 迁移
│   │   ├── memoryRetrieve.js # 关键词记忆检索与打分
│   │   ├── prompt.js         # System prompt 与人设
│   │   ├── deepseek.js       # DeepSeek 流式调用
│   │   ├── fallback.js       # 服务端兜底回复
│   │   └── http.js           # JSON/SSE 工具
│   ├── data/                 # SQLite 数据（部署时排除）
│   ├── .env.example
│   ├── Dockerfile            # 可选 Docker 构建
│   ├── .dockerignore
│   └── package.json
├── docs/                     # 设计文档与历史记录
├── docker/                   # Docker Compose 配置
├── deploy.sh                 # 生产部署脚本
├── local.sh                  # 本地 Docker 启停
├── README.md                 # 用户向项目摘要
└── AGENTS.md                 # Agent/Codex 工作边界与部署规则
```

> **注意**：早期版本前端文件在仓库根目录；当前以 `frontend/` 为源，`deploy.sh` 将 `frontend/` 同步到服务器 `/soulmate/` 根目录。

---

## 6. 前端详解

### 6.1 页面结构（index.html）

- **开始界面** `#startScreen`：游戏名、简介、版本号、开始按钮
- **游戏界面** `#gameScreen`：
  - 顶部：实时时钟、日期、音乐开关、设置入口、版本按钮
  - 中部：女朋友照片卡片（可点击/长按）
  - 状态行：今日心动值、亲密阶段标签、情绪文案
  - 聊天区：消息气泡列表
  - 底部：输入框 + 发送

`app.js` 中仍保留按亲密阶段生成快捷操作按钮的逻辑，但当前 `index.html` 未渲染 `.quick-actions` 容器；当前主要互动方式是输入框、点击照片和长按照片。

### 6.2 状态与本地存储

| localStorage Key | 用途 |
|------------------|------|
| `soulmate.uid` | 终端绑定的玩家 UID |
| `soulmate.started` | 是否已点击「开始陪伴」 |
| `soulmate.messages` | 聊天记录（最多保留 24 条） |
| `soulmate.heart` | 今日心动值与日期 |
| `soulmate.imageIndex` | 当前照片索引 |
| `soulmate.dailySign` | 每日签状态 |
| `soulmate.musicMuted` | 背景音乐静音 |
| `soulmate.stageCeremonies` | 亲密阶段升级仪式记录 |

运行时 `state.messages` 最多 28 条；请求 API 时携带最近 12 条 `me/her` 消息。

每日首次进入时会写入 `soulmate.dailySign`，并通过日期种子生成当日心动签和基础心动值。

### 6.3 聊天请求流程

```text
用户输入 → detectMood() → addMessage('me')
        → buildSoulMateApiPayload()
            { uid, sessionId, message, mood, heartScore, intimacy, recentMessages, clientTime }
        → fetch('/api/chat') → readSoulMateStream()
            event: meta  → 确认 source
            event: delta → 逐段更新她的气泡
            event: done  → 最终 reply, mood, heartDelta, memoryUsed, source
        → normalizeReply() → setMood() → updateHeartScore()
```

`clientTime` 带时区偏移（如 `2026-06-15T14:30:00+08:00`），供后端按用户本地时间计算场景围栏。

### 6.4 版本与缓存

- `APP_VERSION`：界面显示的版本号（当前 `v0.4.4`）
- `ASSET_VERSION`：静态资源缓存破坏参数（当前 `20260602-reset`）
- `index.html` / `settings.html` 中 CSS/JS 通过 `?v=...` 加载

更新 JS/CSS 时需同步修改 `ASSET_VERSION`、`index.html` 和 `settings.html` 中的 query 参数。

### 6.5 设置页（settings.html + settings.js）

| 功能 | 行为 |
|------|------|
| 显示当前 UID | 首次加载自动生成 `u_` 前缀随机 UID |
| 保存 UID | 调用 `POST /api/uid/move`，成功后更新 localStorage |
| 复制 UID | `navigator.clipboard.writeText()` |
| 清空数据 | 确认后调用 `POST /api/uid/reset`，清除本地聊天/心动等 |

UID 规则：`^[a-z][a-z0-9_-]{2,31}$`（3-32 位，小写字母开头）。

### 6.6 PC 适配

- 主界面限制在居中手机比例舞台
- 桌面端加载 `images/pc-romance-bg-v034.webp`（移动端不加载）
- 增加 hover / focus-visible 反馈
- Safari 毛玻璃补充 `-webkit-backdrop-filter`

### 6.7 微信分享

- Open Graph、Twitter Card、`apple-touch-icon`
- 分享封面 `images/share-cover.png`（724×724）
- 接入微信 JS-SDK 后，`app.js` 自动配置 `wx.updateAppMessageShareData`

---

## 7. 后端 API 详解

### 7.1 接口一览

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/hello` | 无 | 连通性测试 |
| GET | `/api/health` | 无 | 健康检查（含 DB 状态） |
| POST | `/api/chat` | 无（需 uid） | 流式聊天（SSE） |
| POST | `/api/uid/move` | 无 | UID 数据迁移 |
| POST | `/api/uid/reset` | 无 | 清空指定 UID 数据 |
| GET | `/api/memory` | Admin Token | 查看记忆列表 |
| POST | `/api/memory` | Admin Token | 手动新增记忆 |
| PATCH | `/api/memory/:id` | Admin Token | 修改/归档记忆 |
| GET | `/api/context/preview` | Admin Token | 预览记忆召回结果 |

Admin Token 通过请求头 `X-Admin-Token` 或 `Authorization: Bearer` 传递。

`/api/context/preview` 返回结构为 `{ ok, context: { corrections, memories, summaries, keywords } }`，用于调试当前 UID 下会被注入的动态记忆上下文。

### 7.2 POST /api/chat

**请求体：**

```json
{
  "uid": "setachen",
  "sessionId": "setachen",
  "message": "今天好累",
  "mood": "cute",
  "heartScore": 120,
  "intimacy": "heartbeat",
  "clientTime": "2026-06-15T21:30:00+08:00",
  "recentMessages": [
    { "role": "me", "text": "..." },
    { "role": "her", "text": "..." }
  ]
}
```

**SSE 响应事件：**

| 事件 | 载荷 | 说明 |
|------|------|------|
| `meta` | `{ ok, source, uid }` | 流开始 |
| `delta` | `{ delta, fullText }` | 逐段文本 |
| `done` | `{ ok, reply, mood, heartDelta, memoryUsed, source, time }` | 完成 |

**处理流程：**

1. 校验 `uid` 和 `message`
2. `retrieveMemoryContext()` 检索相关记忆
3. `saveChatMessage()` 保存用户消息
4. `buildChatMessages()` 组装 prompt
5. `streamDeepSeek()` 流式生成
6. 保存助手回复，`markMemoryContextUsed()` 更新记忆使用计数
7. 返回 `done` 事件

### 7.3 POST /api/uid/move

在事务内迁移 `fromUid` → `toUid` 的：

- `chat_messages`
- `conversation_summaries`
- `memories`（专属）
- `corrections`（专属）

目标 UID 已有数据时返回 **409 Conflict**。

### 7.4 POST /api/uid/reset

删除指定 UID 的聊天、摘要、专属记忆、专属纠偏和关联 `memory_links`。

**不影响**：`uid IS NULL` 的全局记忆和全局纠偏。

### 7.5 环境变量（api/.env）

```env
HOST=127.0.0.1
PORT=3001
DEEPSEEK_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=<服务端密钥>
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_TIMEOUT_MS=18000
DB_PATH=./data/soulmate.sqlite
MEMORY_ENABLED=true
ADMIN_TOKEN=<管理口令>
```

---

## 8. 数据库与记忆系统

### 8.1 数据库文件

- 路径：`api/data/soulmate.sqlite`
- 引擎：Node 24 内置 `node:sqlite`，`DatabaseSync`
- 模式：WAL + `foreign_keys=ON` + `busy_timeout=5000`
- 迁移：通过 `schema_migrations` 表版本化管理

### 8.2 数据表

| 表名 | 用途 |
|------|------|
| `chat_messages` | 服务端聊天日志（按 uid 隔离） |
| `memories` | 分级记忆（L1~L5，uid=NULL 为全局） |
| `corrections` | 用户纠正规则（优先级高于普通记忆） |
| `conversation_summaries` | 对话摘要（L4，规划中） |
| `memory_links` | 记忆间合并/冲突/替代关系 |
| `memory_jobs` | 提取/压缩任务日志（规划中） |
| `settings` | 键值配置 |
| `schema_migrations` | 迁移版本记录 |

### 8.3 记忆分级

| 级别 | 名称 | 特点 | 当前状态 |
|------|------|------|----------|
| L0 | 固定人设 Profile | 写死在 `RELATIONSHIP_PROFILE` | 每次 prompt 注入 |
| L1 | 核心记忆 | 高可信、长期有效 | 手动/API 写入 |
| L2 | 偏好习惯 | 按相关性检索 | 手动/API 写入 |
| L3 | 短期事件 | 可设 `expires_at` | 手动/API 写入 |
| L4 | 对话摘要 | 压缩历史聊天 | 表已建，逻辑未实现 |
| L5 | 候选记忆 | 默认 pending，不注入 | 表已建，提取未实现 |
| — | Correction | 纠正规则，高优先级 | 手动/API 写入 |

### 8.4 记忆检索（memoryRetrieve.js）

当前为 **关键词 + 标签匹配**，无向量库：

```text
score = 关键词命中×3 + tags命中×4 + importance×1.5
      + pinned×10 + L1 加分 + 最近使用加分
      - 无命中惩罚 - L3 过期惩罚
```

注入上限：

- L1：最多 4 条
- L2：最多 5 条
- L3：最多 4 条
- L4 摘要：最多 1 条
- Correction：最多 5 条
- 普通记忆与摘要候选总上限：最多 9 条

召回范围：`uid IS NULL`（全局）+ 当前 UID 的专属记忆。

### 8.5 UID 隔离规则

- `uid` 是玩家数据边界；`sessionId` 可镜像 `uid`，但不替代 `uid` 做隔离
- 全局记忆：`memories.uid = NULL`、`corrections.uid = NULL`
- 一个终端只绑定一个 UID，设置页改 UID 是 **move** 而非账号切换

---

## 9. Prompt 编排策略

### 9.1 System Prompt 组成

```text
角色身份 + L0 人设
+ 她的生活爱好与性格
+ 动态记忆块（corrections + L1~L4）
+ 回复风格与格式规则
+ 地点/时间/动作围栏
+ 当前心动值与亲密阶段
+ 当前真实时间
```

### 9.2 场景围栏（getLifeScene）

根据工作日/周末、当前时刻判断场景：

| 场景 Key | 时段 | 约束 |
|----------|------|------|
| work | 工作日 09:00-18:30 | 各自在公司，只能线上动作 |
| commute | 工作日 08:00-09:00 | 通勤/准备 |
| afterWork | 工作日 18:30-20:00 | 下班到回家前 |
| homeNight | 工作日 20:00+ | 知春路小家 |
| homeLate | 工作日 00:00-08:00 | 深夜或清晨，通常在知春路小家休息 |
| weekend | 周末 | 可居家或外出，不编造具体地点 |

### 9.3 DeepSeek 调用参数

- 模型：`deepseek-v4-flash`
- `temperature: 0.82`
- `max_tokens: 220`
- `stream: true`
- `thinking: disabled`
- 超时：18 秒（可配置）

### 9.4 截断检测

`deepseek.js` 在流结束后检测：

- 空回复
- `finish_reason === 'length'`
- 动作括号未闭合
- 以连接词/标点结尾的半句话

触发则 fallback 到服务端规则回复。

---

## 10. 部署与运维

### 10.1 生产环境

| 项目 | 值 |
|------|-----|
| 服务器 | `ubuntu@211.159.177.55` |
| 站点根目录 | `/www/wwwroot/g.ismayday.mobi/` |
| SoulMate 目录 | `/www/wwwroot/g.ismayday.mobi/soulmate/` |
| API 监听 | `127.0.0.1:3001` |
| Node 版本 | v24.16.0 |
| 运行用户 | `www` |

### 10.2 部署命令

```bash
cd /Users/kk/Work/GameAI/soulmate
./deploy.sh
```

`deploy.sh` 流程：

1. `rsync frontend/` → 服务器 `$REMOTE_APP_DIR/`
2. `rsync api/` → 服务器 `$REMOTE_APP_DIR/api/`（排除 `.env`、`data/`、`*.sqlite*`）
3. 远端语法检查（`node --check`）
4. 重启 API 进程（通过 `/proc/$pid/cwd` 精确匹配，避免误杀同机 `tavern/api`）
5. 健康检查 `GET /api/health`
6. 冒烟测试 `POST /api/chat`

部署脚本还会在远端清理 `$APP_DIR/audit`、`output`、`roadshow`、`tmp` 等历史临时目录。前端变更发布前必须先在本地执行 `node --check frontend/app.js` 和 `node --check frontend/settings.js`；远端检查用于部署保护。

### 10.3 部署保护规则

**绝不覆盖或删除：**

- 服务器 `api/.env`（DeepSeek Key）
- `api/data/soulmate.sqlite` 及 WAL/SHM 文件

**绝不同步到父站点根目录：**

- SoulMate 的 `index.html`、`app.js`、`styles.css`、`images/` 等不得出现在 `/www/wwwroot/g.ismayday.mobi/` 根目录

### 10.4 部署后验证清单

```text
https://g.ismayday.mobi/                  → GameAI 首页正常
https://g.ismayday.mobi/soulmate/         → SoulMate 游戏
https://g.ismayday.mobi/soulmate/settings.html
https://g.ismayday.mobi/soulmate/app.js?v=...
https://g.ismayday.mobi/soulmate/settings.js?v=...
https://g.ismayday.mobi/soulmate/styles.css?v=...
https://g.ismayday.mobi/soulmate/images/settings-gear.svg?v=...
https://g.ismayday.mobi/api/health        → { "db": "ok", ... }
```

服务器检查（根目录不应有 SoulMate 文件）：

```bash
sudo find /www/wwwroot/g.ismayday.mobi -maxdepth 1 \
  \( -name "app.js" -o -name "settings.html" -o -name "settings.js" \
     -o -name "styles.css" -o -name "images" \) -print
# 应无输出
```

### 10.5 API 进程管理

- 当前使用 `setsid node src/server.js` 后台启动
- 日志：`api/soulmate-api.log`
- 未使用 pm2/systemd（二期可考虑）
- 当前生产环境仍是 rsync + 宿主机 Node 进程部署；Docker Compose 目前用于本地开发和生产容器化规划，尚未替代生产部署脚本。

### 10.6 数据库备份

```bash
sqlite3 api/data/soulmate.sqlite \
  ".backup 'api/data/backups/soulmate-$(date +%F-%H%M%S).sqlite'"
```

---

## 11. 本地开发

### 11.1 方式一：静态前端 + 独立 API

**前端：**

```bash
cd /Users/kk/Work/GameAI/soulmate/frontend
python3 -m http.server 4173
# 访问 http://localhost:4173
```

**后端：**

```bash
cd /Users/kk/Work/GameAI/soulmate/api
cp .env.example .env
# 编辑 .env 填入 DEEPSEEK_API_KEY
npm start
# 监听 http://127.0.0.1:3001
```

> 本地静态服务不会自动代理 `/api/chat` 到 3001 端口。完整联调需通过 Nginx 反代或正式环境验证。

### 11.2 方式二：Docker Compose

```bash
cd /Users/kk/Work/GameAI/soulmate
./local.sh start    # 构建并启动
./local.sh logs     # 查看日志
./local.sh stop     # 停止
```

默认：`http://localhost:${WEB_PORT}`（Web）+ `http://localhost:${API_PORT}/api/health`（API）。

当前默认端口来自 `docker/app.env`：Web `8080`，API `3001`。Compose 会读取 `api/.env` 注入 API 容器，因此首次运行前仍需准备 `api/.env`。

### 11.3 发布前检查

**前端变更：**

```bash
node --check frontend/app.js
node --check frontend/settings.js
```

**API 变更：**

```bash
for f in api/src/*.js; do node --check "$f" || exit 1; done
```

**UID/记忆相关冒烟：**

- `/api/health` 返回 `db: "ok"`
- `/api/chat` 拒绝无效 uid
- `/api/context/preview?uid=...` 只返回全局 + 同 UID 记忆
- `/api/uid/move` 事务迁移，目标有数据返回 409
- `/api/uid/reset` 保留全局记忆
- `/api/memory` 无 token 返回 401

---

## 12. 素材清单

| 文件 | 说明 |
|------|------|
| `mate001.jpg` ~ `mate006.jpg` | 女朋友三拼图照片（2172×724） |
| `romance-bg-v03.svg` | 浪漫背景纹理 |
| `love-sparkles-v03.svg` | 星光氛围层 |
| `heart-medal-v03.svg` | 心动徽章 |
| `music-toggle.svg` | 音乐开关图标 |
| `settings-gear.svg` | 设置齿轮图标 |
| `share-cover.png` | 微信分享封面（724×724） |
| `pc-romance-bg-v034.webp` | PC 端专属背景 |
| `bgm.mp3` | 循环背景音乐 |

---

## 13. 已知限制

| 限制 | 说明 |
|------|------|
| 本地无反代 | 纯静态前端无法直接调本地 API |
| 记忆提取未实现 | 只能手动通过 `/api/memory` 写入记忆 |
| 对话压缩未实现 | 超过 12 条的历史上下文会丢失 |
| 无向量检索 | 记忆召回依赖关键词，语义相近但用词不同时可能漏召回 |
| 无 pm2 | API 进程崩溃后需手动重启或重新部署 |
| iOS 自动播放 | 背景音乐需用户手势触发后才能播放 |
| 心动值增长较快 | 多点几次照片即可快速升级亲密阶段 |

---

## 14. 后续规划（v0.4.5+）

依据 `docs/soulmate_v2_design.md`：

### 14.1 v0.4.5：DeepSeek 自动记忆提取

- 实现 `memoryExtract.js`
- 每轮聊天后低温 JSON 提取结构化记忆
- 高置信 → `active`，中置信 → `pending`，低置信丢弃
- 明显纠正句生成 `correction`

### 14.2 v0.4.6：对话摘要压缩

- 实现 `memoryCompress.js` 和 `conversation_summaries` 写入
- 达到阈值（如 20 条新消息）触发 DeepSeek 摘要
- `/api/chat` 注入最近摘要补足 12 条窗口外的上下文

### 14.3 设置页记忆审核

- 查看 active / pending / archived 记忆
- 确认、修改、删除、归档候选记忆
- 管理 correction 规则

### 14.4 二期产品原则

1. **少记**：只保存对未来陪伴有实际帮助的信息
2. **可改**：任何自动记忆都允许用户纠正、删除、降级
3. **自然想起**：记忆只在话题相关时轻轻带出，不机械复述

---

## 15. 相关文档索引

以下文档里有一部分是历史设计或实施记录，可能保留旧路径、旧目录结构或旧版本号。当前开发和部署边界以 `AGENTS.md`、本文档以及实际代码为准。

| 文档 | 内容 |
|------|------|
| [README.md](../README.md) | 用户向项目摘要、本地运行、配置说明 |
| [api/README.md](../api/README.md) | API 接口用法与 curl 示例 |
| [AGENTS.md](../AGENTS.md) | Agent 工作边界、部署规则、验证清单 |
| [docs/soulmate_v2_design.md](./soulmate_v2_design.md) | 二期记忆系统完整设计 |
| [docs/prompt.txt](./prompt.txt) | 产品需求与 prompt 规范（v0.4.4） |
| [docs/GameDesign.md](./GameDesign.md) | 一期原始游戏设计需求 |
| [docs/soulmate_v1_report.md](./soulmate_v1_report.md) | 一期审核报告 |
| [docs/soulmate_v0_3_1_api_split_summary.md](./soulmate_v0_3_1_api_split_summary.md) | v0.3.1 前后端拆分总结 |
| [docs/soulmate_v0_4_client_api_split_plan.md](./soulmate_v0_4_client_api_split_plan.md) | v0.4 客户端/API 分离计划 |
| [docs/DOCKER_BUILD_MECHANISM.md](./DOCKER_BUILD_MECHANISM.md) | Docker 构建机制说明 |
| [docs/NodeJs_Server_config.md](./NodeJs_Server_config.md) | 服务器 Node.js 配置 |
| [docs/upgrade_server_docker_plan.md](./upgrade_server_docker_plan.md) | 服务器 Docker 升级计划 |

---

## 16. 关键代码入口速查

| 关注点 | 文件 | 函数/模块 |
|--------|------|-----------|
| 前端初始化 | `frontend/app.js` | `initApp()` |
| 聊天发送 | `frontend/app.js` | `sendText()` → `callSoulMateApi()` |
| 心动值 | `frontend/app.js` | `updateHeartScore()`, `getIntimacyLevel()` |
| UID 管理 | `frontend/settings.js` | `ensureClientUid()`, `handleUidSubmit()` |
| API 路由 | `api/src/server.js` | `routeRequest()`, `handleChat()` |
| Prompt 组装 | `api/src/prompt.js` | `buildChatMessages()`, `buildSystemPrompt()` |
| 记忆检索 | `api/src/memoryRetrieve.js` | `retrieveMemoryContext()` |
| DeepSeek 流式 | `api/src/deepseek.js` | `streamDeepSeek()` |
| 数据库迁移 | `api/src/migrations.js` | `runMigrations()` |
| 部署 | `deploy.sh` | rsync + 远端重启 |

---

*本文档基于 2026-06-15 对 SoulMate v0.4.4 代码库与现有 docs 的完整阅读生成，供开发、部署与后续迭代参考。*
