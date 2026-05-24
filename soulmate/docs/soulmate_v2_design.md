# SoulMate v2 技术改造设计文档

文档日期：2026-05-23  
项目路径：`/Users/kk/Documents/Codex/soulmate/`  
目标版本：v0.4 - v0.6  
技术方向：HTML5 前端 + Node.js 后端 + SQLite + Nginx 反向代理  

## 1. 背景

SoulMate 一期已经完成手机版 HTML5 竖屏陪伴小游戏，实现了开始界面、真实时间同步、女朋友照片三表情切换、DeepSeek 聊天、离线兜底、心动值、亲密阶段、背景音乐和移动端适配。

二期的重点不应只是继续加 UI 或小游戏玩法，而是把“她像不像她”这件事做深。参考 `therealXiaomanChu/ex-skill` 的角色个性化思路，SoulMate v2 应从单一 system prompt 升级为可持续演进的人格系统：

- 人格档案可编辑。
- 共同记忆可积累。
- 用户纠正可记录。
- 每次对话按真实场景、亲密阶段和相关记忆动态组装 prompt。
- API Key 从前端移到服务器。
- 支持腾讯云轻量服务器 + Nginx 正式部署。

## 2. 总体目标

SoulMate v2 的核心目标：

1. 保留一期 HTML5 手机网页小游戏体验。
2. 将 DeepSeek API 调用迁移到 Node.js 后端代理。
3. 建立 Personality Pack 人格档案系统。
4. 建立 Memory 共同记忆系统。
5. 建立 Correction 用户纠正机制。
6. 支持长期陪伴和角色持续进化。
7. 支持腾讯云轻量服务器 Nginx 部署。

一句话定位：

> 前端负责“她在我眼前”，后端负责“她越来越像她”。

## 3. 技术选型

### 3.1 前端

继续使用一期结构：

- HTML5
- CSS3
- 原生 JavaScript
- 静态资源目录 `images/`

前端不引入 React/Vue/Vite 等构建工具，保持轻量。

前端负责：

- 竖屏全屏 UI。
- 开始界面。
- 真实时间展示。
- 女朋友照片三拼图表情裁剪。
- 聊天窗口。
- 心动值展示。
- 亲密阶段展示。
- 背景音乐。
- 设置页入口。
- 本地临时缓存。
- 调用后端 `/api/*`。

### 3.2 后端

选择：

- Node.js
- Express
- SQLite
- pm2

后端负责：

- DeepSeek API 代理。
- API Key 保存。
- prompt 编排。
- 人格档案读取与更新。
- 共同记忆存储与检索。
- 用户纠正记录。
- 聊天摘要。
- 设置接口。

### 3.3 Web Server

使用腾讯云轻量服务器上的 Nginx：

- `/` 提供静态 HTML5 游戏。
- `/api/*` 反向代理到 Node.js 后端。
- Node.js 只监听 `127.0.0.1:3001`。
- Nginx 对公网提供 HTTP/HTTPS。

## 4. 总体架构

```text
手机浏览器
  |
  | HTTPS
  v
Nginx
  |
  |-- /                 -> 静态 SoulMate HTML5 游戏
  |-- /images/*          -> 静态图片、音乐、SVG
  |-- /api/chat          -> Node.js API
  |-- /api/profile       -> Node.js API
  |-- /api/memory        -> Node.js API
  |-- /api/correction    -> Node.js API
  |-- /api/settings      -> Node.js API
        |
        v
Node.js Express 后端
  |
  |-- SQLite 本地数据库
  |-- DeepSeek API
```

建议服务器目录：

```text
/var/www/soulmate/
  public/
    index.html
    styles.css
    app.js
    images/
  server/
    package.json
    src/
      index.js
      config.js
      db.js
      routes/
      services/
      prompt/
    data/
      soulmate.sqlite
    logs/
```

开发目录可先保持在：

```text
/Users/kk/Documents/Codex/soulmate/
  index.html
  styles.css
  app.js
  images/
  server/
```

## 5. v2 核心模块

## 5.1 Chat Proxy 聊天代理

一期前端直接请求 DeepSeek：

```js
fetch('https://api.deepseek.com/chat/completions')
```

v2 改为：

```js
fetch('/api/chat')
```

前端请求示例：

```json
{
  "message": "今天好累",
  "clientTime": "2026-05-23T21:30:12+08:00",
  "mood": "cute",
  "heartScore": 138,
  "intimacy": "heartbeat",
  "recentMessages": [
    { "role": "me", "text": "今天开会开麻了" },
    { "role": "her", "text": "(轻轻拍拍你) 辛苦啦，先喝口水。" }
  ]
}
```

后端响应示例：

```json
{
  "reply": "(轻轻靠过来) 辛苦啦，今晚先别硬撑，我陪你一会儿。",
  "mood": "cute",
  "heartDelta": 3,
  "memoryUsed": [
    "用户最近工作压力大",
    "用户在字节跳动 Seed 团队工作"
  ],
  "source": "deepseek"
}
```

如果 DeepSeek 失败，后端返回：

```json
{
  "reply": "(把水杯递给你) 辛苦啦，先靠我一会儿，慢慢说。",
  "mood": "cute",
  "heartDelta": 1,
  "memoryUsed": [],
  "source": "fallback"
}
```

## 5.2 Personality Pack 人格档案

人格档案是 v2 的核心资产。它不只是“人设文本”，而是结构化角色配置。

建议结构：

```json
{
  "identity": {
    "name": "她",
    "hometown": "北京",
    "birthday": "2000-05-20",
    "job": "北京腾讯公司 AI 产品经理"
  },
  "relationship": {
    "metAt": "大学同学",
    "startedAt": "大三开始恋爱",
    "years": 6,
    "home": "北京知春路附近合租小家",
    "cat": "康康",
    "feeling": "她非常喜欢用户"
  },
  "user": {
    "job": "字节跳动 Seed 团队"
  },
  "speechStyle": {
    "length": "短句，通常 1 句，最多 2 句",
    "tone": ["温柔", "自然", "亲密", "轻微撒娇"],
    "format": "(短动作) 回复内容",
    "addressing": ["你", "宝宝"],
    "avoid": ["长篇说教", "客服腔", "过度文艺", "机械重复人设"]
  },
  "emotionRules": {
    "happy": "轻快、主动回应、暖一点",
    "angry": "恋爱里的小脾气，嘴硬心软，不攻击",
    "cute": "撒娇、贴近、求陪伴、声音更软"
  },
  "boundaries": {
    "places": [
      "她的公司=北京腾讯公司",
      "用户公司=字节跳动 Seed 团队",
      "共同住处=北京知春路附近合租小家"
    ],
    "workTime": "工作日 09:00-18:30 默认各自在公司，只能隔着手机聊天",
    "noFabrication": "不编造具体餐厅、影院、商场、同事、项目机密"
  }
}
```

前端二期可以先只提供只读查看，后续再做编辑 UI。

## 5.3 Memory 共同记忆系统

共同记忆用于解决“她越来越像她”的问题。

Memory 不应该全部塞进 system prompt，而应该按当前输入检索相关内容，每次只注入 3-5 条。

记忆类型：

- `fact`：稳定事实。
- `relationship`：关系经历。
- `preference`：偏好。
- `style`：说话习惯。
- `event`：具体事件。
- `emotion`：情绪模式。

示例：

```json
{
  "id": 1,
  "type": "preference",
  "text": "她不太喜欢太肉麻的称呼，只有撒娇时才会叫宝宝。",
  "tags": ["称呼", "说话风格"],
  "weight": 8,
  "createdAt": "2026-05-23T20:00:00+08:00",
  "updatedAt": "2026-05-23T20:00:00+08:00"
}
```

检索策略 v1：

- 不做向量数据库，先用 SQLite + 关键词匹配。
- 根据用户输入、当前 mood、当前时间段匹配 `tags` 和 `text`。
- 按 `weight`、最近更新时间、关键词命中数排序。
- 每次最多选 5 条。

后续可升级：

- DeepSeek embedding 或其他 embedding。
- SQLite FTS5。
- 向量数据库。

## 5.4 Correction 用户纠正机制

这是 v2 最值得吸收 `ex-skill` 思路的功能。

用户可以自然输入：

```text
她不会这样说
她不会叫我宝宝
她生气不会这么凶
她平时不会这么文艺
她更喜欢说“行吧”而不是“好呀”
这个记忆不对，我们不是那天去的
```

后端识别为纠正请求，进行分类：

- `persona`：说话风格纠正。
- `memory`：事实记忆纠正。
- `boundary`：越界纠正。
- `emotion`：情绪反应纠正。
- `nickname`：称呼纠正。

纠正记录示例：

```json
{
  "id": 1,
  "type": "persona",
  "rawText": "她平时不会这么文艺",
  "rule": "回复避免过度文艺和诗化表达，要更像微信里随口说话。",
  "enabled": true,
  "createdAt": "2026-05-23T21:00:00+08:00"
}
```

后端在 prompt 中追加：

```text
用户纠正过的规则：
- 回复避免过度文艺和诗化表达，要更像微信里随口说话。
- 她不常叫用户“宝宝”，除非撒娇场景。
- 她生气时会嘴硬心软，但不会冷暴力。
```

前端交互建议：

- 如果用户输入明显是纠正句，聊天区显示：
  - 用户消息。
  - 系统提示：“已记住：她以后会更少这样说。”
- 也可以让后端同时返回一句她的轻回应：
  - “(小声点头) 嗯，我记住啦，以后不那样说。”

## 5.5 Prompt Orchestrator 提示词编排器

后端每次 `/api/chat` 不只是转发消息，而是动态组装 prompt。

prompt 组成：

```text
System Prompt =
  基础身份 Profile
  + 当前真实时间
  + 当前生活场景
  + 当前亲密阶段
  + 当前情绪
  + 相关共同记忆
  + 用户纠正规则
  + 回复格式与边界
  + 最近聊天摘要/上下文
```

建议后端模块：

```text
server/src/services/promptBuilder.js
  buildSystemPrompt()
  buildSceneContext()
  buildMemoryBlock()
  buildCorrectionBlock()
  buildIntimacyBlock()
```

核心原则：

- 共同记忆每次最多注入 3-5 条。
- 用户纠正规则优先级高于默认人格。
- 当前用户输入优先级最高，必须先回答当前问题。
- 事实围栏和地点围栏必须每次保留。
- 回复要短，不要长篇。

## 5.6 Settings 设置页

二期建议加入一个轻量设置页或隐藏面板。

入口：

- 顶部版本号按钮。
- 或长按版本号。

设置页功能：

- 查看版本号。
- API 连通性测试。
- 清空聊天记录。
- 重置今日心动值。
- 音乐开关。
- 查看人格档案。
- 查看共同记忆。
- 查看纠正记录。
- 手动新增一条记忆。

v0.4 可以先做最少功能：

- API 状态。
- 清空聊天。
- 查看版本。

v0.5/v0.6 再加入人格和记忆编辑。

## 6. 数据库设计

推荐 SQLite。

### 6.1 `profile`

保存人格档案。

```sql
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

`data` 存 JSON 字符串。

### 6.2 `memories`

```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  weight INTEGER NOT NULL DEFAULT 5,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 6.3 `corrections`

```sql
CREATE TABLE corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  rule TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 6.4 `chat_messages`

```sql
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  mood TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);
```

### 6.5 `settings`

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 7. API 设计

## 7.1 `POST /api/chat`

用途：

- 发送聊天消息。
- 后端组装 prompt。
- 请求 DeepSeek。
- 返回回复、情绪和心动值变化。

请求：

```json
{
  "message": "今天好累",
  "clientTime": "2026-05-23T21:30:12+08:00",
  "mood": "cute",
  "heartScore": 138,
  "intimacy": "heartbeat",
  "recentMessages": []
}
```

响应：

```json
{
  "reply": "(轻轻靠过来) 辛苦啦，今晚先别硬撑，我陪你一会儿。",
  "mood": "cute",
  "heartDelta": 3,
  "memoryUsed": [],
  "source": "deepseek"
}
```

## 7.2 `GET /api/profile`

返回人格档案。

## 7.3 `PUT /api/profile`

更新人格档案。

## 7.4 `GET /api/memory`

返回记忆列表。

查询参数：

- `q`
- `type`
- `enabled`

## 7.5 `POST /api/memory`

新增记忆。

```json
{
  "type": "preference",
  "text": "她不太喜欢太肉麻的称呼。",
  "tags": ["称呼", "说话风格"],
  "weight": 8
}
```

## 7.6 `PATCH /api/memory/:id`

更新记忆。

## 7.7 `DELETE /api/memory/:id`

删除或禁用记忆。

建议默认软删除：

```json
{
  "enabled": false
}
```

## 7.8 `GET /api/correction`

返回纠正记录。

## 7.9 `POST /api/correction`

新增纠正。

```json
{
  "rawText": "她平时不会这么文艺"
}
```

后端生成：

```json
{
  "type": "persona",
  "rule": "回复避免过度文艺和诗化表达，要更像微信里随口说话。"
}
```

## 7.10 `GET /api/health`

健康检查。

响应：

```json
{
  "ok": true,
  "version": "v0.4.0",
  "deepseekConfigured": true,
  "db": "ok"
}
```

## 8. 前端改造点

一期前端保留大部分 UI 和状态机。

主要改造：

1. 删除前端 DeepSeek Key。
2. `callDeepSeek()` 改成 `callSoulMateApi()`。
3. 请求 `/api/chat`。
4. 使用后端返回的 `reply`、`mood`、`heartDelta`。
5. 设置页新增 API 状态、记忆、纠正入口。
6. 如果 `/api/chat` 失败，前端仍保留本地离线回复兜底。

前端请求示意：

```js
async function callSoulMateApi(input) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: input,
      clientTime: new Date().toISOString(),
      mood: state.mood,
      heartScore: state.heartScore,
      intimacy: getIntimacyLevel().key,
      recentMessages: state.messages.slice(-12)
    })
  });

  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}
```

## 9. Node.js 后端目录建议

```text
server/
  package.json
  .env
  src/
    index.js
    config.js
    db.js
    routes/
      chat.js
      profile.js
      memory.js
      correction.js
      health.js
    services/
      deepseekClient.js
      promptBuilder.js
      memoryService.js
      correctionService.js
      fallbackService.js
      sceneService.js
    prompt/
      defaultProfile.js
      promptTemplates.js
  data/
    soulmate.sqlite
```

`.env`：

```env
PORT=3001
DEEPSEEK_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=你的真实 key
DEEPSEEK_MODEL=deepseek-v4-flash
```

注意：

- `.env` 不提交公网仓库。
- Node 只监听 `127.0.0.1`。
- Nginx 代理 `/api/*`。

## 10. Nginx 配置建议

示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/soulmate/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /images/ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

如果启用 HTTPS，建议使用腾讯云证书或 Let's Encrypt。

## 11. pm2 部署建议

启动：

```bash
cd /var/www/soulmate/server
npm install
pm2 start src/index.js --name soulmate-api
pm2 save
pm2 startup
```

查看：

```bash
pm2 status
pm2 logs soulmate-api
```

重启：

```bash
pm2 restart soulmate-api
```

## 12. 版本路线

## 12.1 v0.4：服务器化

目标：

- 把 DeepSeek Key 移到服务器。
- 前端改为请求 `/api/chat`。
- Nginx 同时提供静态页面和 API 代理。
- 增加 `/api/health`。
- 保留前端离线兜底。

交付：

- `server/` 后端项目。
- `.env.example`。
- Nginx 配置说明。
- README 更新。

## 12.2 v0.5：人格档案

目标：

- 增加 Personality Pack。
- 后端按 profile 动态组装 system prompt。
- SQLite 保存 profile。
- 设置页可查看人格档案。
- 加入 API 连通性测试。

交付：

- `profile` 表。
- `GET /api/profile`。
- `PUT /api/profile`。
- 设置页基础 UI。

## 12.3 v0.6：记忆和纠正

目标：

- 增加 Memory 系统。
- 增加 Correction 系统。
- 支持“她不会这样说”等自然纠正。
- 聊天时检索相关记忆和纠正规则。
- 设置页查看/管理记忆与纠正。

交付：

- `memories` 表。
- `corrections` 表。
- `/api/memory`。
- `/api/correction`。
- prompt builder 注入相关记忆和纠正。

## 13. 安全与隐私

必须调整：

- DeepSeek API Key 不再出现在前端。
- `.env` 保存在服务器。
- Node 仅监听 `127.0.0.1`。
- Nginx 对外暴露 `/api/*`。

建议：

- 后台设置页加简单口令。
- `/api/profile`、`/api/memory`、`/api/correction` 写操作需要口令。
- SQLite 数据定期备份。
- 如果公网开放，限制请求频率。

## 14. 风险与注意事项

1. CORS  
前端和 API 同域部署后，CORS 问题基本消失。

2. prompt 过长  
人格、记忆、纠正都增加后，必须限制注入数量。记忆最多 5 条，纠正最多 8 条。

3. 人设过拟合  
不要把所有用户聊天都当成长期记忆。只有明确偏好、纠正、事实、重要事件才入库。

4. 纠正误判  
用户普通抱怨不一定是纠正。建议 v0.6 初期只识别明显句式，例如“她不会……”“她应该……”“这个不对……”。

5. 多设备同步  
后端存储后，多设备会共享记忆和聊天。但本地前端 `localStorage` 仍可能有旧状态，需要设置页提供同步/重置。

6. 微信内置浏览器  
音频自动播放、缓存、HTTPS 分享图抓取仍需专项测试。

## 15. 二期优先级建议

建议不要一次性实现全部。

推荐顺序：

1. v0.4 先把服务器化打稳。
2. v0.5 再做人格档案。
3. v0.6 最后做记忆和纠正。

原因：

- API 稳定是基础。
- 人格档案是记忆系统的底座。
- 纠正机制需要稳定的人格和存储，否则容易越做越乱。

## 16. 最终判断

SoulMate v2 完全可以继续使用 HTML5 实现前端体验，但角色个性化和长期陪伴能力必须迁移到后端。

Node.js 方案适合当前项目，因为：

- 前端已有大量 JavaScript 逻辑。
- Express 开发快。
- SQLite 足够轻量。
- pm2 + Nginx 在腾讯云轻量服务器上部署简单。
- 后续要做流式回复、设置页、记忆接口也很自然。

二期成功的关键不是“加更多按钮”，而是建立一个可进化的人格档案系统，让她能被纠正、能记住、能逐渐稳定成一个更像真实恋人的角色。
