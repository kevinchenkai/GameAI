# 武林小馆 V1 本地启动

## API

```bash
cd /Users/kk/Work/GameAI/Tavern/api
cp .env.example .env
npm install
npm run dev
```

未配置 `DEEPSEEK_API_KEY` 时，`/api/chat` 会自动返回角色化 fallback。

本地 API 默认端口：`3002`。

## Web

```bash
cd /Users/kk/Work/GameAI/Tavern/web
npm install
npm run dev
```

Vite 开发服务会把项目根目录 `images/` 映射为 `/images/`，前端不会复制或改写正式素材目录。

## 部署

线上 H5 访问地址：

```text
https://g.ismayday.mobi/tavern/
```

默认部署 API 到 `https://g.ismayday.mobi/tavern-api/`：

```bash
cd /Users/kk/Work/GameAI/Tavern
chmod +x deploy.sh
./deploy.sh
```

可通过环境变量覆盖服务器和路径：

```bash
REMOTE_HOST=ubuntu@example.com REMOTE_APP_DIR=/www/wwwroot/g.ismayday.mobi/tavern ./deploy.sh
```
