# 心动陪伴 v0.4.4

一款手机版 HTML5 竖屏恋爱陪伴小游戏。打开后可以查看真实时间、点击照片互动、聊天、积累今日心动值，并根据聊天内容切换开心 / 生气 / 撒娇三种表情。v0.4.4 在 UID 玩家分区基础上优化设置页，并支持清空当前 UID 的历史数据和专属记忆。客户端与轻量 Node API 已分离，前端只请求同域 `/api/chat`，DeepSeek Key 只放在后端。

## 本地运行

前端静态页：

```bash
cd /Users/kk/Work/GameAI/soulmate
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173
```

后端 API：

```bash
cd /Users/kk/Work/GameAI/soulmate/api
cp .env.example .env
npm start
```

本地静态服务的 `/api/chat` 不会自动代理到 `3001`。完整联调建议通过正式同域环境验证，或临时配置本地反向代理。

## DeepSeek 配置

DeepSeek 配置已从前端移到 `api/.env` 或服务器环境变量：

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

浏览器源码中不应出现 `sk-`。前端聊天请求只访问：

```js
const SOULMATE_API_CHAT = '/api/chat';
```

## 版本与缓存

`index.html` 通过查询参数加载资源：

```html
styles.css?v=20260602-reset
app.js?v=20260602-reset
```

当前版本参数为 `20260602-reset`。以后更新 JS 或 CSS 时，同时修改 `index.html` 里的版本参数和 `app.js` 顶部的 `ASSET_VERSION`，手机浏览器和微信内置浏览器就会重新拉取新文件。

## 微信分享

页面已加入 Open Graph、Twitter Card、`image_src`、`apple-touch-icon` 等分享信息，并提供 `images/share-cover.png` 作为 724x724 分享封面。

如果接入微信 JS-SDK，完成 `wx.config` 后，`app.js` 会自动调用 `wx.updateAppMessageShareData` 和 `wx.updateTimelineShareData` 设置标题、描述、链接和封面图。微信正式分享时建议使用 HTTPS 公网地址，否则微信可能无法抓取封面。

## PC 浏览器适配

游戏仍以移动端体验优先。PC Chrome / Safari 打开时，会把主游戏界面限制在居中的手机比例舞台中，避免宽屏下聊天区和输入区横向拉伸。桌面端单独加载 `images/pc-romance-bg-v034.webp`，并保留 JPEG fallback，移动端不会额外加载这张大背景。桌面鼠标环境增加了轻量 hover / focus-visible 反馈，Safari 毛玻璃效果补充了 `-webkit-backdrop-filter`。

## API 与兜底

前端发送消息后会 `fetch('/api/chat')`，并读取后端 SSE：

- `delta`：逐段更新她的聊天气泡。
- `done`：返回最终 `reply`、`mood`、`heartDelta`、`source`。

后端调用 DeepSeek 失败时会返回服务端 fallback；如果后端完全不可达，前端仍会使用本地离线回复，保证游戏不崩。

## SQLite 记忆

v0.4.1/v0.4.2 最小闭环已加入轻量 SQLite 记忆底座，v0.4.3 增加 UID 玩家分区：

- `/api/chat` 会把用户和女友回复写入 `api/data/soulmate.sqlite`。
- 每个终端首次加载会生成 `soulmate.uid`，聊天请求会携带 `uid`，服务端按 UID 写入聊天记录。
- 设置页 `settings.html` 可以把当前 UID move 到自定义 UID，例如 `setachen`，服务端会迁移该 UID 下的聊天、摘要、专属记忆和纠偏。
- 设置页可以清空当前 UID 数据：会保留 UID，清除本地聊天/心动状态，并删除服务端该 UID 的聊天、摘要、专属记忆和专属纠偏。
- 可以通过受 `ADMIN_TOKEN` 保护的 `/api/memory` 手动新增、查看和修改记忆。
- `/api/chat` 会检索全局记忆和当前 UID 的 active 记忆并注入 DeepSeek prompt，`done.memoryUsed` 会返回本轮用到的记忆。
- `/api/context/preview` 可预览某句话会召回哪些记忆。

当前还没有开启 DeepSeek 自动记忆提取和对话压缩；这部分留到后续版本。

## 文件

- `index.html`：页面结构、开始界面、主游戏界面。
- `settings.html`：当前终端 UID 设置和 move 页面。
- `styles.css`：移动端竖屏布局、时间段背景、三种情绪视觉状态。
- `app.js`：真实时间、聊天、UID、API 请求、离线回复、心动值、背景音乐和本地存储。
- `settings.js`：UID 校验、复制和 move 请求。
- `api/`：轻量 Node.js 后端，提供 `/api/hello`、`/api/health`、`/api/chat`。
- `images/`：照片素材、分享封面、背景音乐和 v0.3 美术氛围素材。

## 已知限制

- 本地静态前端如果没有反向代理，`/api/chat` 不会自动转发到 `127.0.0.1:3001`。
- iOS/Android 浏览器可能拦截无手势自动播放；点击“开始陪伴”、聊天、照片或音乐按钮后会再次尝试播放背景音乐。
