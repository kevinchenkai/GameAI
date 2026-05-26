# SoulMate 二期设计文档：SQLite 记忆系统与 DeepSeek 记忆提取

文档日期：2026-05-26  
当前项目路径：`/Users/kk/Work/GameAI/soulmate/`  
线上部署路径：`/www/wwwroot/g.ismayday.mobi/soulmate/`  
当前线上版本：`v0.3.4`  
二期目标版本：`v0.4.x`  
技术方向：移动端优先 HTML5 前端 + 轻量 Node.js API + SQLite + DeepSeek 记忆提取/压缩

## 1. 当前状态核对

本节基于 2026-05-26 对本地代码和线上服务器的实际检查。

### 1.1 已完成的一期能力

当前项目已经完成“前端/后端拆分改造”，这部分不再作为二期目标重复建设。

已完成内容：

- 前端保持纯静态 HTML/CSS/JavaScript，不引入 React/Vue/Vite。
- 前端只请求同域 `/api/chat`，浏览器侧不再保存 DeepSeek API Key。
- 后端位于 `api/`，使用 Node.js 原生 `node:http` 实现轻量 API 服务。
- 后端提供 `GET /api/hello`、`GET /api/health`、`POST /api/chat`。
- `/api/chat` 负责组装 system prompt，并调用 DeepSeek Chat Completions。
- DeepSeek 调用已使用 `stream: true`。
- 后端到前端使用 SSE，支持 `meta`、`delta`、`done` 事件。
- DeepSeek 失败、超时、空回复、疑似截断时，后端返回服务端 fallback。
- 如果后端完全不可达，前端还有本地 `offlineReply()` 兜底。
- 当前 prompt 已包含恋爱关系、人设、同居背景、康康、Seed 团队、真实时间、地点围栏、上班时间围栏和亲密阶段。
- 当前 PC 端已经有居中手机舞台和浅紫色 WebP 背景图，移动端仍是优先体验。

关键代码位置：

- 前端入口：`index.html`
- 前端状态与聊天：`app.js`
- 后端入口：`api/src/server.js`
- DeepSeek 流式调用：`api/src/deepseek.js`
- Prompt 编排：`api/src/prompt.js`
- 服务端 fallback：`api/src/fallback.js`
- 部署脚本：`deploy.sh`

### 1.2 当前聊天上下文策略

当前多轮对话是“前端 localStorage 短期上下文 + 后端无状态 prompt 组装”。

前端存储：

- 聊天记录存在浏览器 `localStorage`。
- key：`soulmate.messages`
- 运行时 `state.messages` 最多保留 28 条。
- 写入 `localStorage` 时最多保留 24 条。
- 请求 `/api/chat` 时只带最近 12 条 `me/her` 消息。

后端处理：

- 后端不存聊天记录。
- 后端从 `payload.recentMessages` 再取最近 12 条。
- 每条历史消息最多截断到 500 字。
- 然后组装为：`system prompt + history + 当前用户消息`。

当前没有真正的长期记忆，也没有摘要压缩策略。所谓“记忆”主要是写死在 `RELATIONSHIP_PROFILE` 里的固定人设事实。

### 1.3 当前服务器情况

服务器：

- SSH：`ubuntu@211.159.177.55`
- 站点根目录：`/www/wwwroot/g.ismayday.mobi/`
- SoulMate 目录：`/www/wwwroot/g.ismayday.mobi/soulmate/`
- API 目录：`/www/wwwroot/g.ismayday.mobi/soulmate/api/`
- 运行用户：`www`
- Node 二进制：`/www/server/nodejs/v24.16.0/bin/node`
- SQLite CLI：`3.45.1`
- 当前 SoulMate API 进程 cwd：`/www/wwwroot/g.ismayday.mobi/soulmate/api`
- 同机还有 `tavern/api` 的 `node src/server.js` 进程，部署脚本必须继续通过 cwd 区分，不要误杀。

API 健康检查：

```json
{
  "ok": true,
  "service": "soulmate-api",
  "version": "0.2.0"
}
```

当前部署方式：

- 本地执行 `./deploy.sh`。
- 脚本通过 `rsync --delete` 同步到服务器。
- `.env`、`.htaccess`、`package-lock.json`、`*.log` 等已排除。
- 远端 API 使用 `setsid node src/server.js` 启动。
- 暂未使用 pm2 或 systemd。

二期引入 SQLite 后，必须先调整部署脚本，避免 `rsync --delete` 删除线上数据库文件。

## 2. 二期目标

二期的核心不是继续堆 UI，而是建立“她能记住、能纠正、能越来越稳定”的后端人格与记忆系统。

目标：

1. 使用 SQLite 存储聊天记录、记忆、摘要和纠正记录。
2. 建立记忆分级，区分固定人设、核心记忆、偏好习惯、短期事件、摘要记忆和候选记忆。
3. 使用 DeepSeek 从对话中提取可长期保存的记忆。
4. 使用 DeepSeek 对长对话做摘要压缩，避免上下文无限增长。
5. 每次 `/api/chat` 根据当前用户输入检索相关记忆，动态注入 prompt。
6. 保持现有移动端体验和 SSE 流式聊天体验。
7. 保留服务端 fallback 和前端 fallback，不能因为记忆系统失败导致聊天不可用。

一句话定位：

> 前端负责“她在眼前”，后端负责“她慢慢记住你”。

### 2.1 二期产品原则：少记、可改、自然想起

二期不能把“长期陪伴”简单理解成“把所有聊天都塞进数据库”。真实恋爱关系里的记忆有选择、有轻重、有误会修正，也会随着新的相处被更新。

因此 SoulMate 二期的记忆系统遵循三条原则：

1. **少记**：只保存对未来陪伴有实际帮助的信息，例如稳定偏好、重要计划、关系边界、明确纠正和反复出现的情绪模式。
2. **可改**：任何自动记忆都可能错，系统必须允许用户纠正、删除、降级、过期和人工确认。
3. **自然想起**：记忆不是展示清单，只有在当前话题相关时才轻轻带出来，不能为了证明“我记得”而机械复述。

这三条原则要贯穿数据库结构、提取 prompt、检索排序、前端设置页和验收测试。

### 2.2 二期体验目标

二期的成功标准不是“数据库里有多少记忆”，而是用户连续使用几天后能感觉到：

- 她会记得真正重要的事，比如用户的回复风格偏好、近期压力、周末约定。
- 她不会把闲聊、玩笑、模型自己说过的话当成长期事实。
- 她被纠正后会变稳定，不会反复犯同一个错。
- 她想起旧事时像真实恋人顺手提一句，而不是长篇汇报。
- 她忘记或记错时可以被温柔修正，关系感不会崩。

一句更准确的二期目标：

> SoulMate 从一个真实世界短期的陪伴小游戏，升级成一个能随着互动深入、持续生长、但仍可被用户掌控的恋爱陪伴系统。

## 3. 技术方案选择

### 3.1 前端

继续保持当前形态：

- 纯静态 HTML/CSS/JavaScript。
- 前端不直接访问 DeepSeek。
- 前端短期保留最近聊天，用于 UI 渲染和兜底。
- 长期记忆以服务端 SQLite 为准。

前端二期只做必要增量：

- `/api/chat` 请求结构可以保持兼容。
- 可以在 `done` 事件里接收 `memoryUsed`、`memoryUpdated` 等可选字段。
- 后续设置页可以查看记忆和手动管理记忆。

### 3.2 后端

继续使用当前轻量 Node.js API，不强制迁移 Express。

原因：

- 当前 API 代码量小，路径清晰。
- 已经能稳定支持 SSE。
- 现阶段新增 SQLite、memory service、prompt builder 即可。
- 没必要为了二期引入 Express 造成额外重构。

建议新增模块：

```text
api/src/
  db.js
  migrations.js
  memoryStore.js
  memoryExtract.js
  memoryCompress.js
  memoryRetrieve.js
  prompt.js
```

`prompt.js` 可以继续保留当前人设和场景围栏，但需要拆出记忆注入逻辑。

### 3.3 SQLite 接入方式

优先使用 Node 24 的内置 SQLite 能力。

推荐顺序：

1. 优先尝试 `node:sqlite`，减少 native npm 依赖。
2. 如果线上 Node 构建不支持，再考虑 `better-sqlite3`。
3. 不建议一开始使用远程数据库，当前单人轻量游戏 SQLite 足够。

数据库建议路径：

```text
api/data/soulmate.sqlite
```

必须更新 `deploy.sh` 排除：

```text
api/data/
*.sqlite
*.sqlite-wal
*.sqlite-shm
```

否则 `rsync --delete` 有风险删除线上数据库。

### 3.4 DeepSeek 用法

二期 DeepSeek 分成三类调用：

1. 聊天生成：继续使用当前 `deepseek-v4-flash`，`stream: true`。
2. 记忆提取：使用 DeepSeek 低温非流式 JSON 输出。
3. 对话压缩：使用 DeepSeek 低温非流式摘要输出。

建议配置：

```env
MEMORY_ENABLED=true
MEMORY_EXTRACT_ENABLED=true
MEMORY_COMPRESS_ENABLED=true
MEMORY_EXTRACT_MODEL=deepseek-v4-flash
MEMORY_EXTRACT_TEMPERATURE=0.2
MEMORY_EXTRACT_MAX_TOKENS=800
DB_PATH=./data/soulmate.sqlite
ADMIN_TOKEN=本地管理口令
```

记忆提取和压缩失败时，只记录日志，不影响当前聊天回复。

## 4. 记忆分级设计

记忆不要只有一个“memories”池子，否则 prompt 会越来越乱。二期采用分级记忆。

### 4.1 L0：固定人设 Profile

特点：

- 稳定、人工维护、每次都注入。
- 不是从聊天自动抽取。
- 包括女友身份、恋爱关系、同居背景、用户工作、康康、地点围栏。

当前代码里的 `RELATIONSHIP_PROFILE` 可以先作为 L0 来源，后续再迁移到 SQLite `profile` 表。

示例：

- 女友是北京人，生日 2000-05-20，在北京腾讯公司担任 AI 产品经理。
- 从大三开始恋爱，稳定 6 年。
- 在北京知春路附近合租，同居 1 年。
- 用户在字节跳动 Seed 团队。
- 一起养小猫康康。

### 4.2 L1：核心记忆 Core Memory

特点：

- 高可信、高稳定、长期有效。
- 通常来自用户明确表达或人工确认。
- 经常参与 prompt，但仍要控制数量。

示例：

- 用户不喜欢太夸张的小作文回复。
- 用户更喜欢短、口语、真实的恋爱聊天。
- 用户希望回复格式是 `(形象动作) 回复内容`。

### 4.3 L2：偏好与习惯 Preference/Habit

特点：

- 稳定但不是每次都需要。
- 根据当前输入相关性检索。

示例：

- 用户喜欢看科幻电影。
- 用户下班后更喜欢先吃饭再散步。
- 用户不太喜欢被频繁说教喝水。

### 4.4 L3：短期事件 Episode/Event

特点：

- 和最近几天、某个计划、某次情绪有关。
- 有时间衰减或过期时间。
- 适合短期陪伴，不适合永久注入。

示例：

- 这周末想一起看电影。
- 今天用户加班很累。
- 昨晚聊过想吃水煮鱼。

### 4.5 L4：对话摘要 Summary Memory

特点：

- 不是事实条目，而是对一段历史聊天的压缩。
- 用于弥补最近 12 条窗口之外的上下文。
- 按日期或主题保存。

示例：

- `2026-05-26 晚上：用户聊到工作压力和周末安排，女友主要安抚并约定下班后再说。`

### 4.6 L5：候选记忆 Candidate

特点：

- DeepSeek 提取出来但不够确定。
- 默认不注入 prompt。
- 可以在设置页给用户审核后提升为 L1/L2/L3。

示例：

- 用户似乎喜欢某个咖啡品牌，但只提过一次。

### 4.7 Correction：纠正规则

纠正记录独立于普通记忆，优先级高于 L1-L5。

示例：

- 用户说：“她不会这么文艺。”
- 生成规则：“回复避免过度文艺和诗化表达，要更像微信随口聊天。”

纠正规则会注入 prompt 的高优先级区域，但也要限制条数。

### 4.8 记忆生命周期

每条记忆都应该有生命周期，而不是一旦写入就永久有效。

推荐生命周期：

```text
候选产生
  -> 自动丢弃 / pending 待确认 / active 生效
  -> 被检索使用
  -> 被强化、合并、更新、降级、过期或归档
  -> 如被用户纠正，则 correction 优先覆盖
```

生命周期规则：

- L1 核心记忆默认长期有效，但需要来源清晰，数量要少。
- L2 偏好习惯可以长期有效，但如果长期未使用或被新偏好替代，可以降权。
- L3 短期事件必须有 `expires_at` 或衰减规则，避免“今天加班很累”变成永久设定。
- L4 摘要可以按日期或主题滚动更新，旧摘要可被新摘要覆盖。
- L5 候选记忆默认不进入 prompt，必须人工确认或后续对话强化后才能升级。
- correction 不等同于普通记忆，它是“如何解释和使用记忆”的高优先级规则。

### 4.9 是否该记：四问规则

自动提取前先做四个判断：

1. 这是用户明确说出的信息，还是模型推测出来的？
2. 这件事未来再次陪伴时会有帮助吗？
3. 它是稳定偏好/事实，还是只适合短期上下文？
4. 如果记错了，用户是否能轻松纠正？

只有前两项为“是”，并且第三项能分清层级时，才允许入库。

典型不该记：

- 用户随口说“哈哈你真笨”，不能记成用户讨厌她。
- 用户今天说“累死了”，不能记成用户长期消极。
- 女友回复里提到“我给你煮面”，不能记成真实发生过煮面。
- 用户提到公司项目细节，默认不写入长期记忆，避免隐私和机密风险。

## 5. SQLite 数据库设计

### 5.1 文件位置

```text
api/data/soulmate.sqlite
api/data/backups/
```

部署前必须确保：

- 服务器 `api/data/` 由 `www:www` 拥有。
- `deploy.sh` 不会删除 `api/data/`。
- 定期备份 `soulmate.sqlite`。

### 5.2 `schema_migrations`

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
```

### 5.3 `profile`

保存 L0 固定人设。第一版可以先不迁移，等记忆系统稳定后再迁。

```sql
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 5.4 `chat_messages`

服务端聊天日志，用于记忆提取和摘要压缩。

```sql
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL DEFAULT 'default',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  text TEXT NOT NULL,
  mood TEXT,
  heart_score INTEGER,
  intimacy TEXT,
  source TEXT,
  client_time TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
```

### 5.5 `memories`

核心记忆表。

```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL CHECK (level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  normalized_text TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'deepseek',
  source_message_ids_json TEXT NOT NULL DEFAULT '[]',
  confidence REAL NOT NULL DEFAULT 0.0,
  importance INTEGER NOT NULL DEFAULT 5,
  durability INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'archived', 'rejected')),
  pinned INTEGER NOT NULL DEFAULT 0,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_memories_status ON memories(status);
CREATE INDEX idx_memories_level ON memories(level);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_updated_at ON memories(updated_at);
```

字段说明：

- `level`：记忆级别。
- `type`：`fact`、`preference`、`habit`、`event`、`emotion`、`style`、`summary` 等。
- `confidence`：DeepSeek 提取置信度。
- `importance`：重要性，影响检索排序。
- `durability`：持久度，影响过期/衰减。
- `status`：候选记忆用 `pending`，确认后变 `active`。
- `pinned`：强制保留，不参与自动清理。
- `expires_at`：短期事件可设置过期时间。

### 5.6 `memory_links`

记录记忆之间的合并、替代和冲突关系。

```sql
CREATE TABLE memory_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_memory_id INTEGER NOT NULL,
  to_memory_id INTEGER NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('duplicate', 'updates', 'conflicts', 'supports')),
  created_at TEXT NOT NULL
);
```

### 5.7 `corrections`

```sql
CREATE TABLE corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  rule TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_corrections_enabled ON corrections(enabled);
```

### 5.8 `conversation_summaries`

```sql
CREATE TABLE conversation_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL DEFAULT 'default',
  scope TEXT NOT NULL,
  start_message_id INTEGER,
  end_message_id INTEGER,
  summary TEXT NOT NULL,
  facts_json TEXT NOT NULL DEFAULT '[]',
  mood_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_conversation_summaries_session_id ON conversation_summaries(session_id);
```

### 5.9 `memory_jobs`

记录提取和压缩任务，便于排查。

```sql
CREATE TABLE memory_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type TEXT NOT NULL CHECK (job_type IN ('extract', 'compress')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'failed')),
  input_json TEXT NOT NULL,
  output_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 5.10 `settings`

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 6. DeepSeek 记忆提取策略

### 6.1 触发时机

第一版建议在 `/api/chat` 完成后同步轻量触发，但不能阻塞用户看到回复。

推荐流程：

1. 用户请求 `/api/chat`。
2. 后端生成女友回复，并通过 SSE 返回给前端。
3. 后端保存 user/assistant 两条消息到 `chat_messages`。
4. 后端在 `done` 后或 `res.end()` 前后触发 `extractMemoryFromTurn()`。
5. 提取失败只写日志，不影响聊天。

后续可以升级为队列：

- 先写入 `memory_jobs`。
- 后台 worker 处理提取和压缩。
- API 主链路只负责聊天。

### 6.2 提取范围

每次提取只看：

- 当前用户消息。
- 当前女友回复。
- 最近 6-12 条上下文。
- 当前 L0 人设和地点时间围栏。

不要让模型基于大量旧聊天自由发挥，否则容易幻觉。

### 6.3 提取原则

只有满足以下条件才入库：

- 用户明确表达了偏好、习惯、事实、重要计划、纠正或稳定情绪模式。
- 信息对未来陪伴有帮助。
- 不是一次性的闲聊噪声。
- 不与 L0 固定人设冲突。
- 不包含用户公司机密、同事真实信息或敏感隐私。

不应入库：

- “哈哈”“好呀”“嗯嗯”这类低信息量内容。
- 模型自己编出来的地点、事件、偏好。
- 没有用户明确依据的猜测。
- 已经过期的临时情绪，除非它形成了模式。

### 6.4 提取 prompt 输出格式

DeepSeek 记忆提取必须返回严格 JSON，不要自然语言解释。

建议输出结构：

```json
{
  "memories": [
    {
      "level": "L2",
      "type": "preference",
      "text": "用户下班后更喜欢先吃饭再安排活动。",
      "tags": ["下班", "吃饭", "约会安排"],
      "confidence": 0.82,
      "importance": 6,
      "durability": 7,
      "expiresAt": null,
      "reason": "用户明确表达了下班后先吃饭的安排偏好"
    }
  ],
  "corrections": [
    {
      "type": "style",
      "rawText": "她不会这么文艺",
      "rule": "回复避免过度文艺和诗化表达，要更像微信随口聊天。",
      "confidence": 0.92
    }
  ],
  "summaryDelta": "本轮用户主要在聊下班后的约会安排，偏好真实、轻松的陪伴。",
  "discarded": [
    {
      "text": "用户说想看电影",
      "reason": "可能只是当前计划，暂作为 L3 事件而非长期偏好"
    }
  ]
}
```

### 6.5 自动入库阈值

建议：

- `confidence >= 0.78` 且不冲突：自动写入 `active`。
- `0.55 <= confidence < 0.78`：写入 `pending`，设置页待审核。
- `confidence < 0.55`：丢弃，只记录 job output。
- correction 如果命中明显句式，`confidence >= 0.7` 可自动启用。

### 6.6 去重与合并

第一版不做向量数据库，先做轻量规则：

1. 对 `text` 做 normalize：去标点、转小写、压缩空格。
2. 同 `type` + tags 命中 + 文本相似度高时，认为可能重复。
3. 重复时更新原记忆的 `updated_at`、`confidence`、`importance`，增加 `use_count`。
4. 如果新记忆与旧记忆冲突，写入 `memory_links`，并将新记忆设为 `pending`。

后续再考虑 SQLite FTS5 或 embedding。

## 7. 对话压缩策略

### 7.1 为什么需要压缩

当前系统只给模型最近 12 条消息。聊久后，较早但重要的上下文会消失。

二期不应该把全部历史都塞给模型，而是：

```text
最近 12 条原文
+ 相关长期记忆
+ 近期摘要
+ 当前用户消息
```

### 7.2 触发条件

建议任一条件触发压缩：

- 新增 20 条 `chat_messages` 后。
- 当天聊天超过 40 条后。
- 距离上次摘要超过 30 分钟且有新消息。
- 手动调用管理接口。

### 7.3 压缩内容

DeepSeek 压缩输出：

```json
{
  "summary": "今晚用户聊到工作压力和周末约会安排，女友主要以安抚和轻松计划回应。",
  "facts": [
    "用户今天加班后比较疲惫",
    "用户倾向下班后先吃饭再看电影"
  ],
  "emotions": {
    "user": "疲惫但愿意互动",
    "her": "温柔安抚"
  },
  "openLoops": [
    "周末看什么电影还没定"
  ]
}
```

压缩要求：

- 不新增用户没说过的事实。
- 不编造地点、票务、餐厅。
- 不把短期情绪误升级为长期性格。
- 摘要文字控制在 120-200 字以内。

### 7.4 摘要使用方式

每次聊天最多注入：

- 最近一条当天摘要。
- 或与当前输入相关的一条主题摘要。

摘要在 prompt 中放在长期记忆之后、最近消息之前。

## 8. Prompt 编排策略

二期 `/api/chat` 的 prompt 组成：

```text
System Prompt =
  L0 固定人设
  + 当前真实时间
  + 当前生活场景围栏
  + 当前亲密阶段
  + 当前情绪
  + 高优先级纠正规则
  + L1 核心记忆
  + 相关 L2/L3 记忆
  + L4 对话摘要
  + 回复格式与边界
  + 最近聊天历史
  + 当前用户消息
```

优先级：

1. 当前用户消息必须优先回答。
2. 安全、地点、上班时间围栏必须优先于记忆。
3. 用户纠正规则优先于默认风格。
4. L0/L1 比 L2/L3 更稳定。
5. L3 短期事件过期后不再注入。
6. 模型不得把候选记忆 L5 当成事实。

注入数量建议：

- Correction：最多 5 条。
- L1：最多 4 条。
- L2/L3：最多 5 条。
- L4 摘要：最多 1 条。
- 最近消息：继续保持 12 条以内。

Prompt 中记忆块示例：

```text
可用共同记忆：
- [核心] 用户更喜欢短、口语、真实的恋爱聊天，不喜欢小作文。
- [偏好] 用户下班后更喜欢先吃饭再安排活动。
- [短期] 这周末用户提过想一起看电影，但具体电影未定。

用户纠正规则：
- 回复避免过度文艺和诗化表达。
- 不要频繁叫“宝宝”，除非撒娇场景。
```

### 8.1 自然召回规则

记忆注入给模型之后，还需要约束模型如何使用记忆。

推荐写入 prompt 的规则：

```text
记忆使用规则：
- 当前用户消息优先，不要为了使用记忆而转移话题。
- 每次最多自然带出 1 条共同记忆，除非用户主动问“你还记得什么”。
- 使用记忆时要像真实恋人顺口想起，不要说“根据我的记忆库”。
- 不确定的记忆要用轻确认语气，例如“我记得你之前好像说过...”。
- 如果用户否认或纠正，立刻承认并以用户最新说法为准。
```

理想效果：

- 用户说：“今天好累。”  
  可以回复：“(靠近一点) 又是加班到很晚吗？你上次也说这阵子项目压得紧，先别硬撑。”
- 用户说：“晚上吃什么？”  
  可以回复：“(想了想) 你下班后一般想先吃点热乎的，我们要不要简单点？”

不理想效果：

- “我记得你的第 12 条偏好是下班后先吃饭。”
- “根据长期记忆、短期事件和摘要，你今天应该很累。”

### 8.2 记忆冲突时的 prompt 策略

当记忆之间出现冲突时，不能把冲突都塞给模型让它自由判断。

优先级：

1. 用户当前消息。
2. correction。
3. 人工确认或 pinned 记忆。
4. 最近更新的高置信 active 记忆。
5. 旧的低置信记忆。

冲突处理：

- 明确冲突时，旧记忆应归档或降级，而不是继续一起注入。
- 如果无法判断新旧哪个正确，只注入“需要确认”的温和表述。
- 不允许让模型同时看到两条互相矛盾的事实后自行编圆。

## 9. API 设计

### 9.1 保持现有接口

现有接口继续保留：

- `GET /api/hello`
- `GET /api/health`
- `POST /api/chat`

`POST /api/chat` 仍然返回 SSE。

`done` 事件建议扩展为：

```json
{
  "ok": true,
  "reply": "(轻轻看着你) 好呀，今晚就先吃饭，再慢慢看。",
  "mood": "cute",
  "heartDelta": 2,
  "source": "deepseek",
  "memoryUsed": [
    { "id": 12, "level": "L2", "text": "用户下班后更喜欢先吃饭再安排活动。" }
  ],
  "memoryUpdated": {
    "created": 1,
    "merged": 0,
    "pending": 0
  }
}
```

如果记忆提取是异步后台做，`memoryUpdated` 可以先不返回。

### 9.2 `GET /api/memory`

用途：查看记忆列表。

查询参数：

- `q`
- `level`
- `type`
- `status`
- `limit`

写操作需要 `ADMIN_TOKEN`，读操作也建议先加 token，避免公网暴露隐私。

### 9.3 `POST /api/memory`

用途：手动新增记忆。

```json
{
  "level": "L2",
  "type": "preference",
  "text": "用户喜欢短一点、口语一点的回复。",
  "tags": ["说话风格", "回复长度"],
  "importance": 8,
  "durability": 9
}
```

### 9.4 `PATCH /api/memory/:id`

用途：修改、归档、确认候选记忆。

常用场景：

- `pending` -> `active`
- 修改 `level`
- 修改 `importance`
- 设置 `expires_at`
- `active` -> `archived`

### 9.5 `POST /api/memory/extract`

用途：手动触发对最近消息的记忆提取。

仅管理使用，方便调试 DeepSeek 提取效果。

### 9.6 `POST /api/memory/compress`

用途：手动触发摘要压缩。

仅管理使用。

### 9.7 `GET /api/context/preview`

用途：调试下一次 `/api/chat` 会注入哪些记忆。

建议只在本地或管理 token 下开放。

返回：

```json
{
  "profile": [],
  "corrections": [],
  "memories": [],
  "summary": [],
  "recentMessages": []
}
```

## 10. 记忆检索策略

第一版使用 SQLite + 关键词，不上向量库。

输入：

- 当前用户消息。
- 当前时间段。
- 当前 mood。
- 当前 intimacy。
- 最近 3 条聊天。

排序评分：

```text
score =
  关键词命中 * 3
  + tags 命中 * 4
  + importance * 1.5
  + pinned * 10
  + recently_used_bonus
  - expired_penalty
  - stale_episode_penalty
```

候选范围：

- `status = active`
- `expires_at IS NULL OR expires_at > now`
- L1/L2/L3/L4
- 不取 L5 pending

每次最多注入 8-10 条总记忆，其中真正相关 L2/L3 不超过 5 条。

后续升级：

- 使用 SQLite FTS5 建全文索引。
- 使用 DeepSeek 或其他 embedding 做语义检索。
- 引入 decay 机制，长期不用的低重要记忆自动降权。

## 11. 纠正机制

纠正是二期最重要的“人格稳定器”。

明显纠正句式：

- 她不会这样说。
- 她不会叫我宝宝。
- 她不应该这么文艺。
- 这个记忆不对。
- 我不是这个意思。
- 以后不要这样回复。
- 她应该更口语一点。

处理流程：

1. `/api/chat` 先识别是否是纠正语义。
2. 如果明显是纠正，调用 DeepSeek 生成结构化 correction。
3. 写入 `corrections`。
4. 当前回复要承认修正，例如：`(认真点点头) 嗯，我记住啦，以后不那样说。`
5. 后续 prompt 高优先级注入 correction。

纠正 prompt 输出：

```json
{
  "isCorrection": true,
  "type": "style",
  "rule": "回复更口语、更短，不要写成小作文。",
  "confidence": 0.91
}
```

纠正不要过度触发。用户只是说“不对吧？”时，第一版可以当普通聊天处理。

### 11.1 三类纠错

纠错不只是一种，需要分清类型。

1. **事实纠错**  
   例：“我不是在阿里，我是在字节。”  
   处理：归档冲突事实，写入新事实，必要时标记来源消息。

2. **风格纠错**  
   例：“不要写这么长，像微信聊天一点。”  
   处理：写入 correction，优先注入 prompt，不一定写入普通 memories。

3. **关系边界纠错**  
   例：“她不会在上班时间说这种亲密动作。”  
   处理：更新场景围栏或 correction，优先级高于普通偏好。

### 11.2 纠错后的即时体验

用户纠正后，当轮回复应该先给情绪反馈，再说明已修正。

推荐回复形态：

```text
(认真点点头) 嗯，我改掉。以后我会说得短一点，更像我们平时微信聊天。
```

避免：

```text
已更新 correction id=12。
```

技术上可以在 `done` 事件里返回 `memoryUpdated`，但前端主聊天气泡不展示技术细节。

## 12. 部署与运维要求

### 12.1 部署脚本必须先调整

引入 SQLite 前，`deploy.sh` 必须增加排除：

```bash
--exclude "api/data/"
--exclude "*.sqlite"
--exclude "*.sqlite-wal"
--exclude "*.sqlite-shm"
```

否则线上数据库可能被 `rsync --delete` 删除。

### 12.2 服务器目录

建议线上：

```text
/www/wwwroot/g.ismayday.mobi/soulmate/
  index.html
  styles.css
  app.js
  images/
  api/
    .env
    data/
      soulmate.sqlite
      backups/
    src/
```

### 12.3 `.env`

建议增加：

```env
HOST=127.0.0.1
PORT=3001
DEEPSEEK_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=真实 key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_TIMEOUT_MS=18000

DB_PATH=./data/soulmate.sqlite
MEMORY_ENABLED=true
MEMORY_EXTRACT_ENABLED=true
MEMORY_COMPRESS_ENABLED=true
MEMORY_EXTRACT_MODEL=deepseek-v4-flash
MEMORY_EXTRACT_TEMPERATURE=0.2
MEMORY_EXTRACT_MAX_TOKENS=800
ADMIN_TOKEN=本地管理口令
```

### 12.4 备份

SQLite 备份建议：

```bash
sqlite3 api/data/soulmate.sqlite ".backup 'api/data/backups/soulmate-$(date +%F-%H%M%S).sqlite'"
```

部署前、迁移前必须备份。

### 12.5 健康检查

`GET /api/health` 建议扩展：

```json
{
  "ok": true,
  "service": "soulmate-api",
  "version": "0.3.0",
  "db": "ok",
  "deepseekConfigured": true,
  "memoryEnabled": true,
  "uptime": 123
}
```

## 13. 分阶段实施计划

### 13.1 v0.4.1：SQLite 底座

目标：

- 新增 `api/src/db.js` 和 migrations。
- 创建 `api/data/soulmate.sqlite`。
- 保存每轮 user/assistant 消息到 `chat_messages`。
- `/api/health` 检查 DB。
- 更新 `deploy.sh` 保护 `api/data/`。

验收：

- 部署后数据库不会被删除。
- 聊天不受影响。
- `sqlite3 api/data/soulmate.sqlite ".tables"` 可看到表。
- `/api/health` 返回 `db: "ok"`。

### 13.2 v0.4.2：手动记忆与检索注入

目标：

- 实现 `memories` 表。
- 实现 `GET/POST/PATCH /api/memory`。
- 手动写入几条记忆。
- `/api/chat` 根据当前输入检索相关记忆并注入 prompt。
- `done` 可返回 `memoryUsed`。

验收：

- 手动新增记忆后，相关问题能被模型自然使用。
- 不相关问题不会硬塞记忆。
- 上班时间和地点围栏仍然有效。
- 能通过 `GET /api/context/preview` 看到将要注入的记忆，方便调试。

### 13.3 v0.4.3：DeepSeek 自动记忆提取

目标：

- 实现 `memoryExtract.js`。
- 每轮聊天后调用 DeepSeek 提取结构化 JSON。
- 高置信记忆自动 active，中置信 pending，低置信丢弃。
- 实现基础去重合并。

验收：

- 用户明确说偏好后，数据库出现 L2 记忆。
- 用户纠正回复风格后，数据库出现 correction。
- 普通闲聊不会产生大量垃圾记忆。
- 模型自己的回复不会被当成用户事实入库。
- 同一偏好重复出现时会强化或合并，而不是生成多条重复记忆。

### 13.4 v0.4.4：对话摘要压缩

目标：

- 实现 `conversation_summaries`。
- 达到阈值后调用 DeepSeek 压缩聊天。
- `/api/chat` 可注入最近摘要。

验收：

- 超过最近 12 条的关键上下文仍能被召回。
- 摘要不编造新事实。
- prompt 长度可控。

### 13.5 v0.4.5：设置页与记忆审核

目标：

- 前端设置页查看记忆。
- pending 记忆可确认/删除。
- 支持清空聊天、导出数据库备份说明。

验收：

- 可以人工修正错误记忆。
- 可以把候选记忆提升为长期记忆。
- 可以禁用不希望再使用的记忆。

### 13.6 v0.4.6：记忆体验打磨

目标：

- 增加自然召回规则。
- 增加纠错后的即时反馈。
- 增加冲突记忆处理策略。
- 优化记忆注入数量与话术，让回复更像真实恋人。

验收：

- 连续 3 天测试中，她能自然提起 1-2 个相关旧事。
- 用户纠正一次后，后续 10 轮不再重复同类错误。
- 不相关问题不会硬插共同记忆。
- 记忆被使用时不会出现“数据库”“长期记忆”等技术感词汇。

## 14. 风险与约束

### 14.1 记忆幻觉

风险：模型把自己回复里的内容当成用户事实。

控制：

- 提取 prompt 明确“只能从用户明确表达的信息中提取”。
- `source_message_ids_json` 记录来源。
- 中低置信记忆进 pending。
- 短期计划默认 L3，不直接升为长期偏好。

### 14.2 记忆污染

风险：一句玩笑话变成长期设定。

控制：

- 重要性和持久度分开。
- L3 事件设置过期。
- L5 候选不注入。
- 设置页可以审核。

### 14.3 Prompt 变长

风险：记忆越多，回复变慢、成本上升、模型更啰嗦。

控制：

- 每类记忆限制注入数量。
- 最近消息仍控制 12 条。
- 摘要最多 1 条。
- 回复长度规则继续保留。

### 14.4 部署误删数据库

风险：当前 `rsync --delete` 会删除远端本地新增文件。

控制：

- 实施 SQLite 前必须先改 `deploy.sh`。
- `api/data/` 必须排除。
- 迁移前做 `.backup`。

### 14.5 多应用进程误杀

服务器同机还有 `tavern/api` 的 Node 进程，命令同样是 `node src/server.js`。

控制：

- 部署脚本继续通过 `/proc/$pid/cwd` 判断 API_DIR。
- 不要用粗暴 `pkill -f "node src/server.js"`。

## 15. 验收清单

### v0.4.1

- [ ] `deploy.sh` 已保护 `api/data/`。
- [ ] 线上能创建并保留 `api/data/soulmate.sqlite`。
- [ ] `/api/health` 返回 DB 状态。
- [ ] `/api/chat` 流式回复正常。
- [ ] 重复部署后数据库仍在。

### v0.4.2

- [ ] 能手动新增 L1/L2/L3 记忆。
- [ ] `/api/chat` 能检索并注入相关记忆。
- [ ] `done.memoryUsed` 可看到实际使用的记忆。
- [ ] 不相关记忆不会被滥用。

### v0.4.3

- [ ] DeepSeek 能从对话提取 JSON 记忆。
- [ ] 高置信记忆自动入库。
- [ ] 中置信记忆进入 pending。
- [ ] 明显纠正句能生成 correction。
- [ ] 闲聊不产生大量垃圾记忆。

### v0.4.4

- [ ] 长对话能生成摘要。
- [ ] 摘要能补足最近窗口之外的上下文。
- [ ] 摘要不编造事实。
- [ ] prompt 长度可控。

### v0.4.5

- [ ] 设置页能查看 active / pending / archived 记忆。
- [ ] pending 记忆可以确认、修改、删除。
- [ ] active 记忆可以归档或禁用。
- [ ] correction 可以查看和关闭。

### v0.4.6

- [ ] 记忆召回像自然聊天，不出现技术化表达。
- [ ] 每轮最多自然使用 1 条共同记忆。
- [ ] 用户纠正事实后，冲突旧记忆被归档或降级。
- [ ] 用户纠正风格后，后续回复明显稳定。

## 16. 最终判断

当前 SoulMate 已经完成前后端拆分，二期不需要再重复“服务器化”这件事。接下来最值得做的是在现有轻量 Node API 上增加 SQLite 记忆底座，并让 DeepSeek 负责两件事：

1. 从对话中提取结构化记忆。
2. 把长对话压缩成可控摘要。

二期成功的关键不是让她“什么都记”，而是让她“只记该记的、能纠正错的、用的时候自然想起来”。这样 SoulMate 才会从一个短期陪伴小游戏，升级成一个能持续生长的恋爱陪伴系统。

更进一步说，二期要建立的是一份“记忆契约”：

- 系统只把用户明确表达、对未来有用的信息当作候选记忆。
- 系统永远允许用户纠正自己，并以用户最新纠正为准。
- 系统使用记忆时服务于当下互动，而不是炫耀自己记得很多。

只要这份契约成立，后续再做节日事件、关系成长、主动问候、照片回忆和多端同步，SoulMate 的人格都会更稳。
