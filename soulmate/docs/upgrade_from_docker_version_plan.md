# SoulMate 服务器版本升级方案

## 基于 Docker 改造版本反向同步

文档日期：2026-06-06  
Docker 版本路径：`/Users/kk/Work/Workpace/GitHub/soulmate`  
服务器版本路径：`/Users/kk/Work/GameAI/soulmate`  
线上服务器：`ubuntu@211.159.177.55`  
线上域名：`https://g.ismayday.mobi/soulmate/`

---

## 1. 版本差异总结

| 维度 | Docker 版 (v0.3.4) | 服务器版 (v0.4.4) | 差异 |
|------|---------------------|-------------------|------|
| API 版本 | 0.2.0 | 0.4.4 | 服务器版更新 |
| 前端版本 | v0.3.4 | v0.4.4 | 服务器版更新 |
| 目录结构 | `frontend/` + `api/` 分离 | 前端在根目录，`api/` 子目录 | Docker 版更规范 |
| UID 系统 | 无 | 完整 uid 生成/绑定/迁移 | 服务器版独有 |
| Memory 系统 | 无 | SQLite + 完整记忆检索 | 服务器版独有 |
| 部署方式 | Docker Compose (nginx + node) | deploy.sh (rsync + 进程管理) | 差异大 |
| 设置页面 | 无 | settings.html + settings.js | 服务器版独有 |
| HOST 默认值 | 0.0.0.0 | 127.0.0.1 | Docker 需要 0.0.0.0 |

**结论：服务器版本功能更完整（uid、memory、settings），Docker 版是精简的容器化重构，目录结构更规范。**

---

## 2. 升级目标

将服务器版本改造为 Docker 版本的目录结构，同时保留服务器版独有的高级功能：

1. **目录结构对齐**：前端文件移入 `frontend/`，保持 `api/` 不变
2. **Docker 化支持**：添加 Dockerfile、docker-compose、nginx.conf
3. **保留高级功能**：uid 系统、memory 系统、settings 页面
4. **deploy.sh 适配**：同时支持 Docker 部署和当前 rsync 直接部署
5. **本地开发一键启动**：`local.sh` + Docker Compose

---

## 3. 具体改造步骤

### 3.1 目录结构重组

```
soulmate/                           (改造后)
├── frontend/                       ← 新建，聚合前端静态资源
│   ├── Dockerfile                  ← 新建
│   ├── .dockerignore               ← 新建
│   ├── nginx.conf                  ← 新建
│   ├── index.html                  ← 从根目录移入
│   ├── app.js                      ← 从根目录移入
│   ├── styles.css                  ← 从根目录移入
│   ├── settings.html               ← 从根目录移入（服务器版独有）
│   ├── settings.js                 ← 从根目录移入（服务器版独有）
│   └── images/                     ← 从根目录移入
├── api/                            ← 保持不变
│   ├── Dockerfile                  ← 新建
│   ├── .dockerignore               ← 新建
│   ├── .env.example                ← 已有
│   ├── package.json                ← 已有
│   ├── data/                       ← SQLite 数据（运行时生成）
│   └── src/
│       ├── config.js
│       ├── db.js
│       ├── deepseek.js
│       ├── fallback.js
│       ├── http.js
│       ├── memoryRetrieve.js
│       ├── memoryStore.js
│       ├── migrations.js
│       ├── prompt.js
│       └── server.js
├── docker/
│   ├── app.env                     ← 新建
│   └── app.yaml                    ← 新建 (docker-compose)
├── deploy.sh                       ← 适配新结构
├── local.sh                        ← 新建（Docker 本地启动）
├── docs/
├── design/
├── AGENTS.md
└── README.md
```

### 3.2 新建文件清单

| 文件 | 来源 | 说明 |
|------|------|------|
| `frontend/Dockerfile` | 参考 Docker 版 | nginx:alpine + 静态文件 |
| `frontend/.dockerignore` | 参考 Docker 版 | 排除不需要的文件 |
| `frontend/nginx.conf` | 参考 Docker 版 | 添加 `/api/` 反代 + settings 路由 |
| `api/Dockerfile` | 参考 Docker 版 | node:20-alpine + src/ + data volume |
| `api/.dockerignore` | 参考 Docker 版 | 排除 .env、node_modules、data |
| `docker/app.env` | 参考 Docker 版 | 环境变量（端口、镜像名） |
| `docker/app.yaml` | 参考 Docker 版 | Compose 编排，增加 volume 映射 data/ |
| `local.sh` | 参考 Docker 版 | Docker 一键启动/停止/日志/清理 |

### 3.3 需要修改的文件

| 文件 | 修改内容 |
|------|---------|
| `api/src/config.js` | HOST 默认值改为 `0.0.0.0`（兼容 Docker） |
| `deploy.sh` | 适配 `frontend/` 子目录结构 |

### 3.4 文件移动清单

```bash
# 前端文件移入 frontend/
mkdir -p frontend
mv index.html frontend/
mv app.js frontend/
mv styles.css frontend/
mv settings.html frontend/
mv settings.js frontend/
mv images/ frontend/
```

---

## 4. 关键文件内容设计

### 4.1 `frontend/Dockerfile`

```dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY settings.html /usr/share/nginx/html/
COPY settings.js /usr/share/nginx/html/
COPY images/ /usr/share/nginx/html/images/

EXPOSE 80
```

### 4.2 `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:3001;
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
}
```

### 4.3 `api/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY src/ ./src/

RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 3001

CMD ["node", "src/server.js"]
```

### 4.4 `docker/app.yaml`

```yaml
services:
  api:
    image: ${API_IMAGE}:${API_TAG}
    build:
      context: ../api
      dockerfile: Dockerfile
    ports:
      - "${API_PORT}:3001"
    env_file:
      - ../api/.env
    volumes:
      - api-data:/app/data
    restart: unless-stopped
    networks:
      - soulmate-net

  web:
    image: ${WEB_IMAGE}:${WEB_TAG}
    build:
      context: ../frontend
      dockerfile: Dockerfile
    ports:
      - "${WEB_PORT}:80"
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - soulmate-net

volumes:
  api-data:
    name: ${PROJECT_NAME}-api-data

networks:
  soulmate-net:
    name: ${PROJECT_NAME}-net
    ipam:
      config:
        - subnet: ${PROJECT_SUBNET}
```

### 4.5 `docker/app.env`

```env
ENVIRONMENT=local
PROJECT_NAME=soulmate
API_PORT=3001
WEB_PORT=8080
API_IMAGE=soulmate-api
API_TAG=latest
WEB_IMAGE=soulmate-web
WEB_TAG=latest
PROJECT_SUBNET=172.30.0.0/16
```

### 4.6 `api/src/config.js` 修改

```diff
- host: readEnv('HOST', '127.0.0.1'),
+ host: readEnv('HOST', '0.0.0.0'),
```

> 说明：Docker 容器需要监听 0.0.0.0 才能被外部访问。服务器直接部署时可通过 .env 覆盖为 127.0.0.1。

### 4.7 `deploy.sh` 适配

改造 deploy.sh，让 rsync 同步 `frontend/` 目录到服务器的 `$REMOTE_APP_DIR/`：

```bash
# 同步前端（从 frontend/ 子目录）
rsync -avz --delete \
  --rsync-path="sudo rsync" \
  --no-owner --no-group --no-times --no-perms \
  --exclude ".DS_Store" \
  --exclude "Dockerfile" \
  --exclude ".dockerignore" \
  --exclude "nginx.conf" \
  "$LOCAL_DIR/frontend/" "$REMOTE_HOST:$REMOTE_APP_DIR/"

# 同步 API（不变）
rsync -avz --delete \
  --rsync-path="sudo rsync" \
  --no-owner --no-group --no-times --no-perms \
  --exclude "node_modules/" \
  --exclude ".DS_Store" \
  --exclude ".env" \
  --exclude ".checks/" \
  --exclude "Dockerfile" \
  --exclude ".dockerignore" \
  --exclude "package-lock.json" \
  --exclude "*.log" \
  --exclude "data/" \
  --exclude "*.sqlite" \
  --exclude "*.sqlite-wal" \
  --exclude "*.sqlite-shm" \
  "$LOCAL_DIR/api/" "$REMOTE_HOST:$REMOTE_APP_DIR/api/"
```

---

## 5. 执行顺序

### Phase 1: 目录重组（本地）

```bash
cd /Users/kk/Work/GameAI/soulmate

# 1. 创建 frontend 目录
mkdir -p frontend

# 2. 移动前端文件
mv index.html frontend/
mv app.js frontend/
mv styles.css frontend/
mv settings.html frontend/
mv settings.js frontend/
mv images/ frontend/

# 3. 创建 Docker 相关文件
#    - frontend/Dockerfile
#    - frontend/.dockerignore
#    - frontend/nginx.conf
#    - api/Dockerfile
#    - api/.dockerignore
#    - docker/app.env
#    - docker/app.yaml
#    - local.sh
```

### Phase 2: 代码修改

```bash
# 4. 修改 api/src/config.js HOST 默认值
# 5. 重写 deploy.sh 适配新结构
# 6. 确保服务器 .env 设置 HOST=127.0.0.1（非 Docker 部署仍监听本地）
```

### Phase 3: 本地验证

```bash
# 7. Docker 本地启动
./local.sh start

# 8. 验证
#    - http://localhost:8080        → 前端页面
#    - http://localhost:8080/settings.html → 设置页
#    - http://localhost:3001/api/health    → API 健康检查
#    - 聊天功能测试

# 9. 停止
./local.sh stop
```

### Phase 4: 服务器部署验证

```bash
# 10. 部署到服务器（rsync 方式，与之前一致）
./deploy.sh

# 11. 验证
#    - https://g.ismayday.mobi/soulmate/
#    - https://g.ismayday.mobi/soulmate/settings.html
#    - https://g.ismayday.mobi/api/health
```

---

## 6. 风险与注意事项

| 风险 | 应对 |
|------|------|
| 服务器 nginx 配置依赖根目录结构 | deploy.sh 把 `frontend/` 内容 rsync 到服务器 `$REMOTE_APP_DIR/`，服务器 nginx 无感知 |
| SQLite 数据文件在 Docker volume 中 | 用 named volume，升级/重建不丢数据 |
| 服务器 `.env` 中 HOST=127.0.0.1 | deploy.sh 不同步 .env，服务器保留原值；Docker 用 0.0.0.0 |
| 前端引用路径变化 | 没有变化，前端内部都是相对路径（`images/xxx`） |
| settings 按钮链接 | settings.html 和 index.html 同目录，href 不变 |
| 数据库备份 | deploy.sh 已 exclude data/、*.sqlite，不会覆盖服务器数据 |

---

## 7. 回滚方案

如果升级后出问题：

```bash
# 回滚文件结构
cd /Users/kk/Work/GameAI/soulmate
mv frontend/index.html .
mv frontend/app.js .
mv frontend/styles.css .
mv frontend/settings.html .
mv frontend/settings.js .
mv frontend/images/ .
rm -rf frontend/Dockerfile frontend/.dockerignore frontend/nginx.conf
rmdir frontend

# 恢复 deploy.sh 为原版（git checkout）
git checkout deploy.sh
```

服务器端无需回滚，因为 rsync 部署到服务器的结构不变（deploy.sh 负责把 `frontend/` 内容展平到远端根目录）。

---

## 8. 总结

本方案的核心思路是 **「目录整理 + Docker 化支持」**，不改动任何业务逻辑代码：

- 前端文件集中到 `frontend/`
- 添加 Docker 容器化支持（Dockerfile + Compose + nginx 反代）
- 保留 rsync 直接部署能力（deploy.sh 适配）
- 保留服务器版所有高级功能（uid、memory、settings）

**等你确认后我开始执行。**
