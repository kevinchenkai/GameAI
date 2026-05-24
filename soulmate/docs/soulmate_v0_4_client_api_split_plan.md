# SoulMate v0.4 前置改造方案：客户端与轻量 Node API 分离

文档日期：2026-05-23  
面向执行者：SoulMate-Coder  
项目路径：`/Users/kk/Documents/Codex/soulmate/`  
服务器部署路径：`/www/wwwroot/g.ismayday.mobi/soulmate/`  
后端目录：`/www/wwwroot/g.ismayday.mobi/soulmate/api/`  
正式域名：`https://g.ismayday.mobi`  

## 1. 改造目标

在正式开发 v0.4 人格系统前，先完成一个低风险的架构拆分：

> 前端 HTML5 游戏不再直连 DeepSeek，统一请求同域 Node.js 后端 `/api/chat`。

本次只做“客户端与轻量 API 分离”，不做完整 Personality Pack、Memory、Correction、SQLite。目标是先把后端链路、密钥隔离和部署方式打稳。

## 2. 当前已具备条件

腾讯云服务器已部署好静态站点与 Node API 目录：

```text
/www/wwwroot/g.ismayday.mobi/soulmate/
  api/
  app.js
  design/
  docs/
  images/
  index.html
  prompt.txt
  README.md
  styles.css
```

Nginx 已完成 `/api/` 反向代理：

```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 60s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;

    proxy_buffering off;
}
```

当前测试接口已通：

```text
https://g.ismayday.mobi/api/hello
```

返回：

```json
{
  "ok": true,
  "message": "Hello, world!",
  "from": "SoulMate Node.js API",
  "time": "2026-05-22T17:10:42.057Z"
}
```

说明链路已经可用：

```text
浏览器 -> Nginx HTTPS -> /api/ 反向代理 -> 127.0.0.1:3001 -> Node.js API
```

## 3. 本次改造范围

## 3.0 开工前备份要求

SoulMate-Coder 开始修改任何文件前，必须先对当前项目做 zip 备份。

源目录：

```text
/Users/kk/Documents/Codex/soulmate
```

备份目录：

```text
/Users/kk/Documents/Codex/Version/
```

备份文件命名规则：

```text
soulmate-YYYYMMDD-HHMMSS-before-v031-api-split.zip
```

示例：

```text
/Users/kk/Documents/Codex/Version/soulmate-20260523-153000-before-v031-api-split.zip
```

推荐命令：

```bash
mkdir -p /Users/kk/Documents/Codex/Version
cd /Users/kk/Documents/Codex
zip -r "Version/soulmate-$(date +%Y%m%d-%H%M%S)-before-v031-api-split.zip" soulmate \
  -x "soulmate/node_modules/*" \
  -x "soulmate/api/node_modules/*" \
  -x "soulmate/.git/*"
```

备份完成后必须确认 zip 文件存在：

```bash
ls -lh /Users/kk/Documents/Codex/Version/soulmate-*-before-v031-api-split.zip
```

如果备份失败，不要继续改造。

### 必须完成

1. 后端新增 `POST /api/chat`。
2. DeepSeek API Key 从前端移到 `api` 后端配置中。
3. 前端 `app.js` 删除明文 DeepSeek Key。
4. 前端聊天请求改为 `fetch('/api/chat')`。
5. 保留前端离线兜底回复，后端失败时前端仍不崩。
6. 保留当前 UI、照片表情、心动值、亲密阶段、聊天历史。
7. README 和部署文档更新。
8. 本地和服务器分别验证。

### 暂不做

1. 不引入 SQLite。
2. 不做 Memory 系统。
3. 不做 Correction 纠正机制。
4. 不做人格档案编辑 UI。
5. 不重构前端整体 UI。
6. 不改变 Nginx 已经成功的 `/api/` 代理规则。

## 4. 版本建议

本次版本命名：

```text
前端版本：v0.3.1
后端版本：0.2.0
资源版本：20260523-001
```

前端必须使用：

```js
const APP_VERSION = 'v0.3.1';
const ASSET_VERSION = '20260523-001';
```

## 5. 后端改造设计

当前后端是零依赖 Node HTTP 服务：

```text
api/package.json
api/src/server.js
```

本次可以继续保持零依赖，避免服务器上安装依赖的复杂度。也可以选择 Express，但本次建议先不用。

### 5.1 API 配置

DeepSeek 配置必须写在 `api` 后端配置里，不再出现在前端 `app.js`。

推荐使用 `api/.env`：

```env
HOST=127.0.0.1
PORT=3001
DEEPSEEK_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=真实 key
DEEPSEEK_MODEL=deepseek-v4-flash
```

提交文件：

```text
api/.env.example
```

不要提交真实 `.env`，但服务器部署时必须在 `api` 目录下配置真实值。

如果当前 Node 服务不读取 `.env`，SoulMate-Coder 需要实现 `api/src/config.js`，从以下来源读取配置：

1. `process.env`
2. `api/.env`
3. 必要时报错提示缺少 `DEEPSEEK_API_KEY`

如果服务器面板不方便读 `.env`，可以先在面板环境变量中配置，或用启动命令：

```bash
DEEPSEEK_URL=https://api.deepseek.com \
DEEPSEEK_API_KEY='真实 key' \
DEEPSEEK_MODEL=deepseek-v4-flash \
npm start
```

### 5.2 新增接口：`POST /api/chat`

请求：

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

流式 `done` 事件中的最终 payload：

```json
{
  "ok": true,
  "reply": "(轻轻靠过来) 辛苦啦，今晚先别硬撑，我陪你一会儿。",
  "mood": "cute",
  "heartDelta": 2,
  "source": "deepseek",
  "time": "2026-05-23T21:30:13.000+08:00"
}
```

后端失败兜底时，流式 `done` 事件中的最终 payload：

```json
{
  "ok": true,
  "reply": "(把水杯递给你) 辛苦啦，先靠我一会儿，慢慢说。",
  "mood": "cute",
  "heartDelta": 1,
  "source": "fallback",
  "time": "2026-05-23T21:30:13.000+08:00"
}
```

严重参数错误响应：

```json
{
  "ok": false,
  "error": "message is required"
}
```

### 5.3 后端模块建议

可以把 `api/src/server.js` 拆成少量模块：

```text
api/src/
  server.js
  config.js
  deepseek.js
  prompt.js
  fallback.js
  http.js
```

职责：

- `server.js`：路由、HTTP server、请求分发。
- `config.js`：读取环境变量。
- `deepseek.js`：调用 DeepSeek。
- `prompt.js`：组装 system prompt。
- `fallback.js`：后端兜底回复。
- `http.js`：读取 JSON body、发送 JSON、错误处理。

如果为了最快执行，也可以先只改 `server.js`，但建议最少拆 `prompt.js` 和 `deepseek.js`，后面 v0.5 会更好接。

### 5.4 Prompt 迁移策略

当前前端 `app.js` 中已有：

- `RELATIONSHIP_PROFILE`
- `INTIMACY_LEVELS`
- `getLifeScene(date)`
- `buildSystemPrompt(date)`
- `buildChatMessages(input)`
- `normalizeReply(reply)`
- `offlineReply(input, phase)`

本次不要大规模重写这些规则。

建议：

1. 把后端需要的“人设与 prompt 组装”复制到 `api/src/prompt.js`。
2. 把后端兜底回复复制/简化到 `api/src/fallback.js`。
3. 前端暂时保留自己的 `offlineReply()`，作为浏览器侧兜底。
4. 后端 prompt 先和当前前端保持尽量一致，避免人设突然变化。

### 5.5 后端 DeepSeek 流式调用

接口：

```text
POST ${DEEPSEEK_URL}/chat/completions
```

本次必须继续保留流式请求。后端请求 DeepSeek 时使用：

```json
{
  "model": "deepseek-v4-flash",
  "messages": [],
  "temperature": 0.82,
  "max_tokens": 220,
  "extra_body": {
    "thinking": {
      "type": "disabled"
    }
  },
  "stream": true
}
```

重要要求：

- `stream: true` 必须保留。
- `extra_body: {"thinking": {"type": "disabled"}}` 必须保留，这是关闭 DeepSeek think 的重要配置。
- 不要因为兼容性猜测删除 `extra_body`。

### 5.6 后端到前端的流式返回

本次必须继续保留前端和后端之间的流式体验。

推荐后端对前端使用 SSE：

```text
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
```

前端仍然用 `fetch('/api/chat')` 发起 `POST`，然后读取 `response.body.getReader()`，不使用 `EventSource`，因为 `EventSource` 不方便发送 POST JSON。

后端 SSE 事件建议：

```text
event: meta
data: {"ok":true,"source":"deepseek"}

event: delta
data: {"delta":"辛苦","fullText":"辛苦"}

event: done
data: {"reply":"(轻轻靠过来) 辛苦啦，今晚先别硬撑，我陪你一会儿。","mood":"cute","heartDelta":2,"source":"deepseek"}
```

如果 DeepSeek 失败，后端仍然用 SSE 返回 fallback：

```text
event: done
data: {"reply":"(把水杯递给你) 辛苦啦，先靠我一会儿，慢慢说。","mood":"cute","heartDelta":1,"source":"fallback"}
```

### 5.7 后端超时

建议 DeepSeek 请求超时：

```text
18 秒
```

超时后返回后端 fallback，不要让前端一直等待。即使走 fallback，也要按 SSE `done` 事件返回，保证前端读取逻辑一致。

## 6. 前端改造设计

当前前端问题：

```js
const DEEPSEEK_URL = 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = '...';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';
```

这些必须从前端删除。

### 6.1 删除前端 DeepSeek 配置

从 `app.js` 删除：

```js
const DEEPSEEK_URL = 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = '...';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';
```

新增：

```js
const SOULMATE_API_CHAT = '/api/chat';
```

### 6.2 替换聊天调用并保留流式显示

当前主流程在 `sendText(input)`：

```js
const messages = buildChatMessages(input);
reply = await callDeepSeek(messages, onDelta);
```

改成：

```js
const result = await callSoulMateApi(input, (delta, fullText) => {
  // 复用当前 streamingIndex / updateMessage 逻辑逐字更新她的气泡
});
reply = result.reply;
```

建议新增函数：

```js
async function callSoulMateApi(input, onDelta) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(SOULMATE_API_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input,
        clientTime: new Date().toISOString(),
        mood: state.mood,
        heartScore: state.heartScore,
        intimacy: getIntimacyLevel().key,
        recentMessages: state.messages
          .filter((item) => item.role === 'me' || item.role === 'her')
          .slice(-12)
      }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`SoulMate API ${response.status}`);
    if (!response.body || typeof response.body.getReader !== 'function') {
      const data = await response.json();
      if (!data?.ok || !data.reply) throw new Error(data?.error || 'SoulMate API empty reply');
      return data;
    }

    return await readSoulMateStream(response, onDelta);
  } finally {
    window.clearTimeout(timer);
  }
}
```

需要新增 `readSoulMateStream(response, onDelta)`：

```js
async function readSoulMateStream(response, onDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let lastPayload = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event.split('\n').map((line) => line.trim());
      const eventName = (lines.find((line) => line.startsWith('event:')) || '').slice(6).trim();
      const dataLine = lines.find((line) => line.startsWith('data:'));
      if (!dataLine) continue;
      const payload = JSON.parse(dataLine.slice(5).trim());

      if (eventName === 'delta' && payload.delta) {
        onDelta?.(payload.delta, payload.fullText || '');
      }
      if (eventName === 'done') {
        lastPayload = payload;
      }
    }
  }

  if (!lastPayload?.reply) throw new Error('SoulMate API empty stream');
  return { ok: true, ...lastPayload };
}
```

### 6.3 前端兜底策略

如果 `/api/chat` 失败：

```js
reply = offlineReply(input, getTimePhase(new Date()));
```

也就是说：

- 后端失败时，后端自己 fallback。
- 如果后端完全不可达，前端 fallback。

这样体验最稳。

### 6.4 流式回复处理

当前前端有流式增量显示逻辑：

- `streamingIndex`
- `streamedReply`
- `readDeepSeekStream()`

本次必须保留流式增量显示体验：

- 发送后显示“她正在回复...”。
- 后端返回第一段 `delta` 后，移除“她正在回复...”。
- 创建她的气泡。
- 随 `delta` 逐字/逐段更新气泡。
- 收到 `done` 后，执行 `normalizeReply()`、`setMood()`、`updateHeartScore()`、持久化消息。

推荐清理：

- 删除或停用前端直连 DeepSeek 的 `callDeepSeek()`
- 删除或停用前端解析 DeepSeek 原始 SSE 的 `readDeepSeekStream()`
- 删除 `recoverDeepSeekReply()`
- 删除 `buildRetryMessages()`
- 新增解析后端 SSE 的 `readSoulMateStream()`
- 保留 `normalizeReply()`
- 保留 `offlineReply()`
- 保留 `detectMood()` / `resolveMood()`

### 6.5 表情与心动值

后端响应可能返回：

```json
{
  "mood": "cute",
  "heartDelta": 2
}
```

前端处理建议：

```js
const finalMood = ['happy', 'angry', 'cute'].includes(result.mood)
  ? result.mood
  : resolveMood(userMood, cleanReply);

setMood(finalMood);
updateHeartScore(Number(result.heartDelta) || 2);
```

如果 API fallback 或本地 fallback，没有 `heartDelta`，仍按旧逻辑 `+2`。

## 7. API 安全边界

本次完成后：

- DeepSeek Key 只存在服务器。
- 浏览器源码里不再出现 `sk-...`。
- Node 服务继续监听 `127.0.0.1:3001`。
- 公网只通过 Nginx 的 `https://g.ismayday.mobi/api/*` 访问。

需要检查：

```bash
grep -R "sk-" /www/wwwroot/g.ismayday.mobi/soulmate/app.js
```

应无结果。

## 8. 本地开发验证流程

### 8.1 启动后端

```bash
cd /Users/kk/Documents/Codex/soulmate/api
DEEPSEEK_API_KEY='真实 key' npm start
```

测试：

```bash
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:3001/api/hello
```

测试聊天：

```bash
curl -X POST http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"今天好累","mood":"cute","heartScore":120,"intimacy":"heartbeat","recentMessages":[]}'
```

如果返回 SSE，使用 `-N` 查看流式输出：

```bash
curl -N -X POST http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"今天好累","mood":"cute","heartScore":120,"intimacy":"heartbeat","recentMessages":[]}'
```

### 8.2 启动前端

```bash
cd /Users/kk/Documents/Codex/soulmate
python3 -m http.server 4173
```

注意：

如果本地前端访问 `http://127.0.0.1:4173`，而 API 在 `http://127.0.0.1:3001`，`/api/chat` 不会自动到 3001。

本地有两种方案：

方案 A：用服务器域名测试前端。

方案 B：临时把 `SOULMATE_API_CHAT` 配成：

```js
const SOULMATE_API_CHAT = 'http://127.0.0.1:3001/api/chat';
```

并允许 CORS。当前后端 hello 服务已加 `Access-Control-Allow-Origin: *`，可沿用。

正式部署时必须改回：

```js
const SOULMATE_API_CHAT = '/api/chat';
```

## 9. 服务器部署验证流程

上传文件到：

```text
/www/wwwroot/g.ismayday.mobi/soulmate/
```

后端目录：

```text
/www/wwwroot/g.ismayday.mobi/soulmate/api/
```

重启 Node 项目：

```bash
cd /www/wwwroot/g.ismayday.mobi/soulmate/api
npm start
```

或通过面板重启 Node 项目。

服务器本机验证：

```bash
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"今天好累","mood":"cute","heartScore":120,"intimacy":"heartbeat","recentMessages":[]}'
```

正式域名验证：

```bash
curl https://g.ismayday.mobi/api/health
curl https://g.ismayday.mobi/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"今天好累","mood":"cute","heartScore":120,"intimacy":"heartbeat","recentMessages":[]}'
```

流式验证：

```bash
curl -N https://g.ismayday.mobi/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"今天好累","mood":"cute","heartScore":120,"intimacy":"heartbeat","recentMessages":[]}'
```

浏览器验证：

```text
https://g.ismayday.mobi/soulmate/
```

或实际站点入口按当前 Nginx root 配置访问。

## 10. 验收标准

### 后端

- `GET /api/hello` 仍可用。
- `GET /api/health` 返回 `ok: true`。
- `POST /api/chat` 能返回 SSE 流式响应。
- SSE 至少包含 `delta` 或 `done` 事件。
- DeepSeek 配置正确时，`source` 为 `deepseek`。
- DeepSeek 失败时，`source` 为 `fallback`，仍返回可显示回复。
- 服务器本机和正式域名都能访问 `/api/chat`。

### 前端

- `app.js` 中不再有 DeepSeek API Key。
- 聊天仍可正常发送和接收回复。
- 聊天仍保留逐字/逐段流式显示。
- API 失败时仍有本地离线回复。
- 开心 / 生气 / 撒娇表情切换仍正常。
- 心动值和聊天历史仍保留。
- 移动端布局不回退。

### 安全

- 浏览器 DevTools Network 中只看到请求 `/api/chat`。
- 浏览器源码中看不到 `sk-...`。
- Node 端口 `3001` 不需要公网直接暴露。
- `api` 后端配置中能找到 `DEEPSEEK_API_KEY` 的读取逻辑。

## 11. 建议执行顺序

1. 先按“开工前备份要求”生成 zip 备份。
2. 确认备份文件存在且大小合理。
3. 后端先实现 `/api/chat`，本地 curl 通过。
4. 后端部署到服务器，服务器本机 curl 通过。
5. 正式域名 `https://g.ismayday.mobi/api/chat` curl 通过。
6. 前端删除 DeepSeek Key，改请求 `/api/chat`。
7. 本地或服务器页面验证聊天。
8. 更新 README 和 docs。
9. 做 Playwright 移动端回归截图。

## 12. Playwright 回归建议

改造完成后，继续使用已有移动端验证脚本：

```text
audit/mobile-validation.spec.js
```

至少验证：

- `390x844`
- `375x667`
- `360x800`
- `320x568`

新增一个聊天 API smoke test：

1. 打开游戏。
2. 输入“今天好累”。
3. 等待回复。
4. 确认消息数量增加。
5. 确认页面无 JS error。

## 13. 失败回滚

如果 `/api/chat` 改造出问题：

1. 保留当前 v0.3 前端文件备份。
2. 回滚 `app.js` 和 `index.html` 的资源版本。
3. Node API 保留 `/api/hello` 不影响静态游戏。
4. Nginx `/api/` 配置可以继续保留，不影响前端静态页面。

建议在执行前备份：

```bash
cp app.js app.v0.3.backup.js
cp index.html index.v0.3.backup.html
cp -r api api.hello.backup
```

## 14. 交付物

SoulMate-Coder 完成后应交付：

- 开工前 zip 备份文件路径。
- 修改后的 `api/` 后端代码。
- 修改后的 `app.js`。
- 如更新资源版本，修改 `index.html`。
- 更新 `README.md`。
- 更新或新增部署说明文档。
- 本地 curl 验证结果。
- 服务器 curl 验证结果。
- 移动端截图验证结果。

## 15. 最终目标状态

完成后，架构应变成：

```text
HTML5 前端
  -> fetch('/api/chat')
  -> Nginx
  -> Node.js API
  -> DeepSeek
  -> Node.js API 流式返回 delta，最终 done 返回 reply/mood/heartDelta
  -> 前端展示消息和表情
```

这一步完成后，SoulMate 就具备了 v0.4 正式开发所需的后端基础。后续 Personality Pack、Memory、Correction 都可以在 Node API 上继续扩展。
