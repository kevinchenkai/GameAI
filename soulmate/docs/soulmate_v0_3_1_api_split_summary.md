# SoulMate v0.3.1 升级总结：客户端与轻量 API 分离

文档日期：2026-05-23  
项目路径：`/Users/kk/Documents/Codex/soulmate/`  
线上地址：`https://g.ismayday.mobi/soulmate/`  
API 地址：`https://g.ismayday.mobi/api/`  

## 1. 本次升级目标

本次升级是 v0.4 正式人格系统开发前的基础设施改造，核心目标是：

> 前端 HTML5 游戏不再直连 DeepSeek，统一通过同域 Node.js 后端 `/api/chat` 调用模型。

升级后，DeepSeek API Key 不再出现在浏览器源码中，后续 Personality Pack、Memory、Correction 等能力都可以继续在 Node API 层扩展。

## 2. 版本信息

- 前端版本：`v0.3.1`
- 后端版本：`0.2.0`
- 静态资源版本：`20260523-001`
- 备份文件：`/Users/kk/Documents/Codex/Version/soulmate-20260523-125447-before-v031-api-split.zip`

相关代码：

- `app.js` 顶部已更新：

```js
const APP_VERSION = 'v0.3.1';
const ASSET_VERSION = '20260523-001';
const SOULMATE_API_CHAT = '/api/chat';
```

- `index.html` 中 JS、CSS、分享图、音乐图标、BGM 都已切换到 `?v=20260523-001`。

## 3. 架构变化

### 改造前

```text
浏览器前端
  -> 直接 fetch DeepSeek /chat/completions
  -> 浏览器中包含 DeepSeek URL、Model、API Key
```

主要问题：

- API Key 暴露在前端源码中。
- 浏览器可能遇到 CORS、网络策略和超时问题。
- 后续人格、记忆、纠错等服务端能力不好扩展。

### 改造后

```text
HTML5 前端
  -> fetch('/api/chat')
  -> Nginx /api/ 反向代理
  -> Node.js API 127.0.0.1:3001
  -> DeepSeek Chat Completions
  -> Node.js API 通过 SSE 返回 delta / done
  -> 前端流式展示聊天气泡
```

改造后收益：

- DeepSeek Key 只存在服务器 `api/.env` 或环境变量中。
- 浏览器 DevTools 只会看到 `/api/chat`。
- 前端仍保留本地离线兜底，后端不可达时游戏不崩。
- 后端也有服务端 fallback，DeepSeek 失败时仍能返回完整回复。
- Prompt、fallback、模型调用逻辑已经移动到 API 层，后续可继续扩展。

## 4. 前端升级内容

### 4.1 删除前端 DeepSeek 明文配置

已从 `app.js` 删除：

```js
DEEPSEEK_URL
DEEPSEEK_API_KEY
DEEPSEEK_MODEL
```

新增：

```js
const SOULMATE_API_CHAT = '/api/chat';
```

验收点：

- 线上 `app.js` 中不应出现 `sk-`。
- 线上 `app.js` 中不应出现 `DEEPSEEK_API_KEY`。
- 线上 `app.js` 中不应出现 `api.deepseek.com`。

### 4.2 聊天请求改为 `/api/chat`

新增前端函数：

- `buildSoulMateApiPayload(input)`
- `formatClientTime(date)`
- `callSoulMateApi(input, onDelta)`
- `readSoulMateStream(response, onDelta)`

请求 payload：

```json
{
  "message": "今天好累",
  "clientTime": "2026-05-23T13:20:00+08:00",
  "mood": "cute",
  "heartScore": 120,
  "intimacy": "close",
  "recentMessages": []
}
```

注意：前端发送后会立即把用户消息加入聊天记录。为了避免重复上下文，构造 `recentMessages` 时会剔除刚刚发送的当前输入，后端再统一追加当前用户消息。

### 4.3 保留流式体验

前端仍然使用 `fetch()` + `response.body.getReader()` 读取 SSE 流。

后端 SSE 事件：

```text
event: meta
data: {"ok":true,"source":"deepseek"}

event: delta
data: {"delta":"辛苦","fullText":"辛苦"}

event: done
data: {"ok":true,"reply":"...","mood":"cute","heartDelta":2,"source":"deepseek"}
```

前端行为：

- 发送后显示“她正在回复...”。
- 收到第一段 `delta` 后移除等待提示。
- 创建她的气泡并逐段更新。
- 收到 `done` 后使用最终 `reply` 归一化文案、切换表情、增加心动值、保存聊天记录。

### 4.4 双层兜底

现在有两层兜底：

- 后端 fallback：DeepSeek 失败、超时、返回不完整时，后端返回 `source: "fallback"`。
- 前端 fallback：如果 `/api/chat` 完全不可达，前端使用 `offlineReply()`。

这样可以避免聊天卡死或出现空回复。

## 5. 后端升级内容

后端目录：

```text
api/
  package.json
  .env.example
  README.md
  src/
    server.js
    config.js
    deepseek.js
    prompt.js
    fallback.js
    http.js
```

### 5.1 `server.js`

提供接口：

- `GET /api/hello`
- `GET /api/health`
- `POST /api/chat`

`POST /api/chat` 行为：

- 校验 `message`。
- 设置 SSE 响应头。
- 调用 `buildChatMessages()` 组装模型上下文。
- 调用 `streamDeepSeek()` 获取 DeepSeek 流式回复。
- 转发 `delta` 给前端。
- 最终返回 `done`。
- 出错时返回服务端 fallback。

### 5.2 `config.js`

负责读取配置：

1. `process.env`
2. `api/.env`
3. 默认值

配置项：

```env
HOST=127.0.0.1
PORT=3001
DEEPSEEK_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=真实 key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_TIMEOUT_MS=18000
```

如果缺少 `DEEPSEEK_API_KEY`，DeepSeek 调用会抛错，并进入服务端 fallback。

### 5.3 `deepseek.js`

负责调用 DeepSeek OpenAI 兼容接口：

```text
POST https://api.deepseek.com/chat/completions
```

请求关键配置：

```json
{
  "model": "deepseek-v4-flash",
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

保留了：

- `stream: true`
- `extra_body.thinking.type = disabled`
- 18 秒超时
- 流式 `finish_reason === "length"` 检查
- 明显半句截断检查

### 5.4 `prompt.js`

把原前端中的核心人设和围栏规则迁移到后端。

包含：

- 稳定恋爱 6 年。
- 大三开始确定恋爱关系。
- 北京知春路附近合租，同居 1 年。
- 用户在字节跳动 Seed 团队。
- 女友在北京腾讯公司担任 AI 产品经理。
- 一起养小猫康康。
- 工作日时间围栏。
- 地点防漂移规则。
- 心动值和亲密阶段。
- `(形象动作) 回复内容` 输出格式。

### 5.5 `fallback.js`

服务端 fallback 复制并简化了前端离线回复逻辑。

支持：

- 疲惫、压力、焦虑等安慰场景。
- 工作、加班、Seed、腾讯等工作场景。
- 康康、小猫场景。
- 二选一、计划、偏好类输入。
- 工作日上班、下班、居家、周末等场景围栏。

### 5.6 `http.js`

封装：

- JSON 响应。
- CORS 头。
- SSE 响应头。
- SSE 写事件。
- JSON body 读取和大小限制。

## 6. 部署脚本

新增：

```text
deploy.sh
```

后续发布命令：

```bash
cd /Users/kk/Documents/Codex/soulmate
./deploy.sh
```

脚本能力：

- 使用 `rsync` 同步本地代码到服务器。
- 使用 `sudo rsync` 解决服务器文件归属为 `www:www` 的写入问题。
- 排除不应覆盖的文件：
  - `.git/`
  - `node_modules/`
  - `.DS_Store`
  - `.env`
  - `.checks/`
  - `.htaccess`
  - `package-lock.json`
  - `*.log`
- 远端执行 API 语法检查。
- 重启 API 后端。
- 验证 `/api/health`。
- 验证 `/api/chat` SSE smoke test。
- 检查 `/api/chat` 是否返回 `event: done` 和 `"ok": true`。

当前服务器 Node 路径：

```text
/www/server/nodejs/v24.16.0/bin/node
```

当前 API 运行用户：

```text
www
```

## 7. 服务器部署状态

部署目标：

```text
ubuntu@211.159.177.55:/www/wwwroot/g.ismayday.mobi/soulmate/
```

API 目录：

```text
/www/wwwroot/g.ismayday.mobi/soulmate/api/
```

当前线上 API 进程：

```text
/www/server/nodejs/v24.16.0/bin/node src/server.js
```

API 监听：

```text
127.0.0.1:3001
```

公网通过 Nginx 反代：

```text
https://g.ismayday.mobi/api/*
```

## 8. 已完成验证

### 8.1 本地验证

已通过：

```bash
node --check app.js
node --check api/src/server.js
node --check api/src/config.js
node --check api/src/prompt.js
node --check api/src/deepseek.js
node --check api/src/fallback.js
node --check api/src/http.js
```

已检查本地前端公开文件：

```bash
rg "sk-|DEEPSEEK_API_KEY|api.deepseek.com" app.js index.html styles.css
```

结果：无命中。

### 8.2 服务器验证

已验证：

```bash
curl https://g.ismayday.mobi/api/health
```

返回：

```json
{
  "ok": true,
  "service": "soulmate-api",
  "version": "0.2.0"
}
```

已验证：

```bash
curl -N -X POST https://g.ismayday.mobi/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"今天好累","mood":"cute","heartScore":120,"intimacy":"close","recentMessages":[]}'
```

结果：

- 返回 SSE。
- 包含 `event: meta`。
- 包含多个 `event: delta`。
- 包含 `event: done`。
- `done` payload 中包含 `"ok": true`。
- `source` 已验证可为 `"deepseek"`。

### 8.3 线上静态资源验证

已验证：

```text
https://g.ismayday.mobi/soulmate/
```

页面中包含：

- `v0.3.1`
- `styles.css?v=20260523-001`
- `app.js?v=20260523-001`
- `images/share-cover.png?v=20260523-001`
- `images/bgm.mp3?v=20260523-001`

已验证线上 `app.js`：

- 不含 `sk-`。
- 不含 `DEEPSEEK_API_KEY`。
- 不含 `api.deepseek.com`。
- 只保留 `SOULMATE_API_CHAT = '/api/chat'`。

## 9. 验收重点

建议验收时重点检查：

1. 打开 `https://g.ismayday.mobi/soulmate/`，版本显示是否为 `v0.3.1`。
2. 手机浏览器或微信内置浏览器是否加载新资源。
3. DevTools Network 中聊天请求是否为 `/api/chat`。
4. 前端源码中是否看不到 DeepSeek Key。
5. 聊天是否仍然流式显示。
6. DeepSeek 回复是否仍然保持 `(形象动作) 回复内容`。
7. 心动值、表情切换、聊天历史、本地 fallback 是否仍正常。
8. 断开或停止 API 时，前端是否能走本地离线回复。
9. 执行 `./deploy.sh` 是否能一键完成发布和 API 重启。

## 10. 当前已知注意事项

1. `deploy.sh` 当前使用后台 `node src/server.js` 启动 API，适合当前轻量服务验证。后续如果接入宝塔 Node 项目、systemd 或 PM2，可以把重启逻辑替换成对应命令。
2. 本地静态服务 `python3 -m http.server 4173` 不会自动代理 `/api/chat` 到 `127.0.0.1:3001`。完整联调建议用正式同域环境，或单独配置本地反向代理。
3. 目前 API fallback 是轻量规则版，后续 v0.4 可以升级为 Personality Pack、Memory 和 Correction。
4. 这次没有改动 UI 主结构，重点是安全边界、流式链路和部署流程。

## 11. 后续建议

v0.4 可以在当前基础上继续推进：

- Personality Pack：把人设、关系、生活围栏抽成独立配置。
- Memory：记录关键偏好、纪念日、常见话题。
- Correction：当用户指出“不是这样”时，修正后续回复。
- Admin/Debug：增加后端健康状态、模型 source、fallback 统计。
- 更稳的进程管理：使用 systemd 或 PM2 托管 API。
