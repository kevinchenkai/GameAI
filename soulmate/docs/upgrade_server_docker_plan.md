# SoulMate 生产环境方案（API + Web 全部容器化）实施计划（先验）

## 1) 现网复核结果（只读确认）
- 服务器：`ubuntu@211.159.177.55` 可登录。
- Docker 可用：
  - `Docker version 29.5.1`
  - `Docker Compose version v5.1.3`
- 当前产线为**非容器化运行**：
  - Nginx 正常监听 `80/443`
  - Node API 直接启动：`/www/server/nodejs/v24.16.0/bin/node src/server.js`
  - Nginx 已有反向代理：`/api/` -> `127.0.0.1:3001`
- 生产目录 `/www/wwwroot/g.ismayday.mobi/soulmate` 当前无 docker 目录（未容器化）
- SQLite 数据已在生产存在且必须保留：
  - `/www/wwwroot/g.ismayday.mobi/soulmate/api/data/soulmate.sqlite*`
- 生产 API 配置文件：
  - `api/.env` 存在（权限 `0600`，属主 `www`），需保留且不改动
- 产线 Nginx 配置文件可见并可改：`/www/server/panel/vhost/nginx/g.ismayday.mobi.conf`
- 本地仓库已具备容器化基础文件：
  - [docker/app.yaml](/Users/kk/Work/GameAI/soulmate/docker/app.yaml)
  - [docker/app.env](/Users/kk/Work/GameAI/soulmate/docker/app.env)
  - [api/Dockerfile](/Users/kk/Work/GameAI/soulmate/api/Dockerfile)
  - [frontend/Dockerfile](/Users/kk/Work/GameAI/soulmate/frontend/Dockerfile)
  - [frontend/nginx.conf](/Users/kk/Work/GameAI/soulmate/frontend/nginx.conf)
- 关键约束已在 [AGENTS.md](/Users/kk/Work/GameAI/soulmate/AGENTS.md) 中确认：不得触碰父站 `/www/wwwroot/g.ismayday.mobi/`，不得覆盖 `api/.env` 与 `api/data/*`

## 2) 容器化目标
1. API 与 Web 全部由 docker compose 管理
2. API 对外仍保持 `/api/*` 兼容（不改前端 API 调用路径）
3. 采用宿主机目录挂载保留生产 SQLite 数据
4. 保持现有域名与路径行为不变：
   - 页面：`https://g.ismayday.mobi/soulmate/`
   - 接口：`https://g.ismayday.mobi/api/health`、`/api/chat`

## 3) 容器化方案设计（推荐）
### 3.1 生产 compose 目录布局（建议）
- 仍放在 `/www/wwwroot/g.ismayday.mobi/soulmate/`
- 新增：
  - `/www/wwwroot/g.ismayday.mobi/soulmate/docker/app.yaml`
  - `/www/wwwroot/g.ismayday.mobi/soulmate/docker/app.env`

### 3.2 API 服务策略
- 使用本地 `api/` 代码构建镜像（或打包镜像）
- `env_file` 挂载生产 `api/.env`
- `DB_PATH` 通过 `api/.env` 保持一致（`./data/soulmate.sqlite`）
- 为防止数据库丢失，挂载持久卷到容器内路径：
  - `./api/data:/app/data`
- 对外端口映射：
  - `3001:3001`
- 容器监听保留 `127.0.0.1:3001`（容器内）

### 3.3 Web 服务策略
- 使用本地 `frontend/` 构建镜像
- 对外端口映射：
  - `8080:80`
- `frontend/nginx.conf` 保持 `/api/` -> `api:3001`（容器内服务名）
- 在宿主机 Nginx 上新增 `/soulmate/` 入口转发到 `127.0.0.1:8080`，并重写 URI，确保请求到达容器根目录资源（例如 `/soulmate/index.html` -> `/index.html`）

### 3.4 Nginx 生产改造点（仅新增/替换 `location`）
- 保留现有：
  - `location /api/ { proxy_pass http://127.0.0.1:3001; ... }`
- 新增（或替换）以下逻辑，负责 `/soulmate/*` 到 Web 容器：
  - `location = /soulmate { return 301 /soulmate/; }`
  - `location ^~ /soulmate/ { rewrite ^/soulmate/?(.*)$ /$1 break; proxy_pass http://127.0.0.1:8080; ... }`

## 4) 端口与监听关系（明细）
- Nginx 宿主机：80/443（对外）
- API 容器：3001（宿主机映射）
- Web 容器：8080（宿主机映射，供 Nginx 子路径代理）
- 与现有关系匹配：
  - 访问 `https://g.ismayday.mobi/api/...` 仍由宿主 Nginx 统一转发到 API

## 5) 发布与配置文件计划（不执行，仅计划）
### 5.1 compose 配置
- 以生产版 `docker/app.yaml` 为主（可参考本地版本结构）
- 建议使用 `volumes` 方式挂载 `api/data` 到容器
- 建议使用 `restart: unless-stopped`

### 5.2 app.env（生产值）
- `API_PORT=3001`
- `WEB_PORT=8080`
- `PROJECT_NAME=soulmate`
- 如本地与生产网络冲突，固定 `PROJECT_SUBNET`

### 5.3 deploy 脚本与流程
- 生产原有 [deploy.sh](/www/wwwroot/g.ismayday.mobi/soulmate/deploy.sh) 是传统进程部署脚本，方案 2 下不应继续直接用于启动服务进程
- 执行计划时新增“Docker 发布手册”或改造 `deploy.sh` 支持 compose 模式
- 但在你确认前，不直接改脚本

## 6) 数据安全与不变更边界
1) 数据库目录不进镜像、只作为挂载目录：
   - `/www/wwwroot/g.ismayday.mobi/soulmate/api/data`
2) `api/.env` 不同步、不替换、不入镜像层
3) `/www/wwwroot/g.ismayday.mobi/` 父站不改
4) 资产路径保持 `/soulmate/` 前缀规则不变（避免破坏首页/子路径）

## 7) 验证清单（上线前）
1) 容器层面
   - `docker ps -a` 看到 api/web 两个服务 `Up`
   - `docker logs` 能看到 api 正常启动与数据库初始化
   - `curl -fsS http://127.0.0.1:3001/api/health`
   - `curl -s http://127.0.0.1:8080/ | head`
2) 反代层面
   - `curl -I https://g.ismayday.mobi/soulmate/`
   - `curl -fsS https://g.ismayday.mobi/api/health`
   - `curl -N -X POST https://g.ismayday.mobi/api/chat ...`（返回 `event: done`）
3) 功能层面
   - 主界面加载
   - `/soulmate/settings.html` 可访问
   - UID 功能与聊天请求链路正常
4) 回归检查
   - 确认 `api/data/soulmate.sqlite*` 保留且服务可读写
   - 确认父站首页 `https://g.ismayday.mobi/` 正常

## 8) 回滚方案（必须预置）
1) 停止容器：
   - `docker compose down`
2) 恢复传统 Node 启动脚本（现有 deploy 流程）或手动启动旧进程
3) Nginx 去掉 `/soulmate/ -> 8080` 代理，恢复原静态目录模式
4) 验证：
   - `https://g.ismayday.mobi/soulmate/` 与 `/api/health` 正常

## 9) 实施注意事项（关键风险）
1) 反代重写必须先于上线测试完成，避免 `/soulmate/` 路径资源 404
2) `api/data` 挂载是容器化成功与否的关键；若仅建新 volume 会导致生产数据库“空库”
3) compose 构建要优先用 `--no-cache` 做一次首次，后续可用 build 再构建
4) 执行时按“先 build 并验收，再切换 Nginx”，降低服务抖动窗口

## 10) 估计执行顺序（确认后再做）
1) 备份：`api/data`、当前运行配置快照
2) 部署 compose 到 `/www/wwwroot/g.ismayday.mobi/soulmate/docker`（不改当前服务）
3) 预检容器服务（本地端口）
4) 修改 Nginx `/soulmate/` 代理并重载
5) 全链路验证（页面 + API + chat）
6) 观察 30~60 分钟无异常后，更新正式操作手册