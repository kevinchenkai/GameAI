# SoulMate API

轻量 Node.js API 后端，负责同域 `/api/chat`、DeepSeek 密钥隔离、流式回复和服务端兜底。

## 本地运行

```bash
cd /Users/kk/Documents/Codex/soulmate/api
cp .env.example .env
```

在 `api/.env` 中填入真实 Key：

```env
HOST=127.0.0.1
PORT=3001
DEEPSEEK_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=真实 key
DEEPSEEK_MODEL=deepseek-v4-flash
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
  -d '{"message":"今天好累","mood":"cute","heartScore":120,"intimacy":"heartbeat","recentMessages":[]}'
```

## 部署说明

Node 项目建议监听 `127.0.0.1:3001`，公网只通过 Nginx 反代访问：

```text
https://g.ismayday.mobi/api/chat -> http://127.0.0.1:3001/api/chat
```

服务器必须在 `api/.env` 或面板环境变量中配置 `DEEPSEEK_API_KEY`。前端 `app.js` 不再包含任何 DeepSeek Key。
