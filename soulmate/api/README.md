# SoulMate API

轻量 Node.js API 后端，负责同域 `/api/chat`、DeepSeek 密钥隔离、流式回复和服务端兜底。

## 本地运行

```bash
cd /Users/kk/Work/GameAI/soulmate/api
cp .env.example .env
```

在 `api/.env` 中填入真实 Key：

```env
HOST=127.0.0.1
PORT=3001
DEEPSEEK_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=真实 key
DEEPSEEK_MODEL=deepseek-v4-flash
DB_PATH=./data/soulmate.sqlite
MEMORY_ENABLED=true
ADMIN_TOKEN=管理口令
```

启动：

```bash
npm start
```

默认监听：

```text
http://127.0.0.1:3001
```

## 测试接口

```bash
curl http://127.0.0.1:3001/api/hello
curl http://127.0.0.1:3001/api/health
```

流式聊天：

```bash
curl -N -X POST http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"uid":"setachen","sessionId":"setachen","message":"今天好累","mood":"cute","heartScore":120,"intimacy":"heartbeat","recentMessages":[]}'
```

迁移当前终端 UID：

```bash
curl -X POST http://127.0.0.1:3001/api/uid/move \
  -H 'Content-Type: application/json' \
  -d '{"fromUid":"u_local0000000000000000","toUid":"setachen"}'
```

清空当前 UID 数据：

```bash
curl -X POST http://127.0.0.1:3001/api/uid/reset \
  -H 'Content-Type: application/json' \
  -d '{"uid":"setachen"}'
```

这会保留 UID 本身，删除该 UID 下的聊天、摘要、专属记忆和专属纠偏；不会删除全局记忆。

手动新增记忆：

```bash
curl -X POST http://127.0.0.1:3001/api/memory \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Token: 管理口令' \
  -d '{"uid":"setachen","level":"L2","type":"preference","text":"用户喜欢短一点、口语一点的回复。","tags":["说话风格","回复长度"],"importance":8}'
```

查看记忆：

```bash
curl 'http://127.0.0.1:3001/api/memory?uid=setachen' \
  -H 'X-Admin-Token: 管理口令'
```

预览上下文召回：

```bash
curl 'http://127.0.0.1:3001/api/context/preview?uid=setachen&message=别写小作文' \
  -H 'X-Admin-Token: 管理口令'
```

## 部署说明

Node 项目建议监听 `127.0.0.1:3001`，公网只通过 Nginx 反代访问：

```text
https://g.ismayday.mobi/api/chat -> http://127.0.0.1:3001/api/chat
```

服务器必须在 `api/.env` 或面板环境变量中配置 `DEEPSEEK_API_KEY`。前端 `app.js` 不再包含任何 DeepSeek Key。

SQLite 数据库默认保存在 `api/data/soulmate.sqlite`，部署脚本会排除 `api/data/` 和 `*.sqlite*`，避免发布时误删线上记忆数据。

v0.4.3 起，聊天、摘要、专属记忆和专属纠偏都按 `uid` 隔离。`memories.uid` 和 `corrections.uid` 为 `NULL` 时代表全局规则，会和当前 UID 的专属数据一起参与召回。`POST /api/uid/move` 是单终端 UID 迁移接口，目标 UID 已有数据时会返回 `409`，避免误合并。`POST /api/uid/reset` 用于初始化当前 UID 数据，但不会删除全局记忆。
