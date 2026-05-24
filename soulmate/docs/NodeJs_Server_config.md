# Node.js API 服务器配置记录

文档日期：2026-05-23  
项目：SoulMate v0.3.4 API 基础服务  
域名：`g.ismayday.mobi`  
Node API 端口：`3001`  

## 1. 目标

本次配置目标是在腾讯云轻量服务器上跑通 SoulMate 轻量 Node.js API，并通过正式域名访问：

```text
https://g.ismayday.mobi/api/hello
```

最终链路：

```text
浏览器
  -> https://g.ismayday.mobi/api/hello
  -> Nginx HTTPS
  -> 反向代理 /api/
  -> http://127.0.0.1:3001/api/hello
  -> Node.js API
  -> JSON 返回
```

## 2. 本地 API 项目结构

本地项目目录：

```text
/Users/kk/Documents/Codex/soulmate/api/
```

核心文件：

```text
api/package.json
api/src/server.js
api/.env.example
api/README.md
```

当前实现接口：

```text
GET /api/hello
GET /api/health
POST /api/chat
```

默认监听：

```text
127.0.0.1:3001
```

## 3. 本地 Mac 验证

进入 API 目录：

```bash
cd /Users/kk/Documents/Codex/soulmate/api
```

启动服务：

```bash
npm start
```

正常输出类似：

```text
soulmate-api v0.2.0 listening on http://127.0.0.1:3001
```

新开一个终端测试：

```bash
curl http://127.0.0.1:3001/api/hello
```

正常返回：

```json
{
  "ok": true,
  "message": "Hello, world!",
  "from": "SoulMate Node.js API",
  "time": "..."
}
```

健康检查：

```bash
curl http://127.0.0.1:3001/api/health
```

正常返回：

```json
{
  "ok": true,
  "service": "soulmate-api",
  "version": "0.2.0",
  "uptime": 10,
  "time": "..."
}
```

停止服务：

```text
Ctrl + C
```

## 4. 上传到服务器

把本地 `api/` 目录上传到服务器：

```text
/www/wwwroot/g.ismayday.mobi/api
```

服务器面板 Node 项目建议：

```text
项目目录：/www/wwwroot/g.ismayday.mobi/api
项目名称：API
启动选项：自定义启动命令
启动命令：npm start
Node版本：v24.16.0
包管理器：npm
项目端口：3001
```

如果用命令行启动：

```bash
cd /www/wwwroot/g.ismayday.mobi/api
npm start
```

服务器本机验证：

```bash
curl http://127.0.0.1:3001/api/hello
```

确认返回：

```json
{
  "ok": true,
  "message": "Hello, world!",
  "from": "SoulMate Node.js API",
  "time": "..."
}
```

## 5. 为什么不直接访问 3001 端口

不推荐访问：

```text
https://g.ismayday.mobi:3001/api/hello
```

原因：

- Node 当前服务是 HTTP，不是 HTTPS。
- Node 服务推荐只监听 `127.0.0.1`，不直接暴露公网。
- 正式访问应该走 Nginx 的 HTTPS 域名。

正确访问方式：

```text
https://g.ismayday.mobi/api/hello
```

## 6. Nginx 反向代理配置

在 `g.ismayday.mobi` 的 Nginx `server {}` 配置中加入：

```nginx
# SoulMate Node.js API
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

推荐放置位置：

```nginx
#REWRITE-END

# SoulMate Node.js API
location ^~ /api/ {
    ...
}

# 禁止访问的敏感文件
location ~* (...) {
    return 404;
}
```

关键点：

```nginx
proxy_pass http://127.0.0.1:3001;
```

后面不要加 `/`。

这样：

```text
https://g.ismayday.mobi/api/hello
```

会原样转发到：

```text
http://127.0.0.1:3001/api/hello
```

## 7. 检查并重载 Nginx

检查配置：

```bash
sudo nginx -t
```

如果显示配置正常，再重载：

```bash
sudo systemctl reload nginx
```

## 8. 正式域名验证

命令行测试：

```bash
curl https://g.ismayday.mobi/api/hello
```

浏览器测试：

```text
https://g.ismayday.mobi/api/hello
```

成功返回：

```json
{
  "ok": true,
  "message": "Hello, world!",
  "from": "SoulMate Node.js API",
  "time": "2026-05-22T17:08:19.265Z"
}
```

说明 Node.js API 已经通过正式域名访问成功。

## 9. 常见问题

### 9.1 返回 502

通常说明 Nginx 能收到请求，但后端 Node 服务不可用。

检查：

```bash
curl http://127.0.0.1:3001/api/hello
```

如果本机也不通，说明 Node 没启动或端口不对。

### 9.2 返回 404

可能原因：

- Nginx 的 `/api/` location 没生效。
- 配置文件不是当前站点实际使用的文件。
- `proxy_pass` 写法导致路径被改写。

建议确认：

```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:3001;
}
```

### 9.3 直接访问 `:3001` 不通

这是正常的。当前推荐架构是不让 Node 端口直接暴露公网，只通过 Nginx HTTPS 访问。

正确方式：

```text
https://g.ismayday.mobi/api/hello
```

### 9.4 浏览器显示“不安全”

如果地址栏显示“不安全”，但 URL 是 `https://g.ismayday.mobi/api/hello`，需要检查证书是否有效、是否是浏览器缓存、证书链是否完整。

API 本身返回 JSON 成功，说明反向代理链路已经通。

## 10. 下一步

当前已经完成 SoulMate v0.3.4 客户端/API 分离基础链路。

`POST /api/chat` 目标：

- 前端不再直连 DeepSeek，只请求同域 `/api/chat`。
- DeepSeek API Key 放在服务器 `api/.env` 或环境变量中。
- Node 后端统一组装 prompt，并以 SSE 返回 `delta` / `done`。
- 后续继续加入 Personality Pack、Memory、Correction。
