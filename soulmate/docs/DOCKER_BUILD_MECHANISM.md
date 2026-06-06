# H5 Game Docker 构建机制与复用指南

## 1. 文档目的

本文将 H5 Game 的 Docker 构建机制抽象为一套可迁移方案，方便在新项目中快速复用。

适用场景：
- 单页静态站点
- 轻量前端发布
- 需要本地一键启动、停止、日志和清理

---

## 2. 当前项目的构建链路

### 2.1 入口层：脚本统一管理生命周期

入口脚本：local.sh

职责：
- 启动前检查 Docker 环境
- 加载环境变量文件
- 统一拼接 Docker Compose 参数
- 提供 start/stop/restart/status/logs/clean 命令

核心动作：
- start: docker compose up --build -d
- stop: docker compose down
- logs: docker compose logs -f --tail=200
- clean: docker compose down --rmi all --remove-orphans

价值：
- 减少手工输入复杂命令
- 提供稳定的团队操作入口
- 把环境差异收敛到 env 文件

### 2.2 编排层：Compose 声明构建与运行

文件：docker/app.yaml

核心声明：
- 服务 web 同时声明 image 与 build
- 构建上下文 context 指向 frontend 目录
- 容器端口 80 暴露到宿主机 WEB_PORT
- 自定义网络名和子网，避免项目之间冲突

价值：
- 把“镜像构建”和“容器运行”放到同一声明中
- 参数化后可按环境快速切换

### 2.3 构建层：Dockerfile 最小化

文件：frontend/Dockerfile

当前策略：
- 以 Nginx 作为基础镜像
- 工作目录设为静态资源目录
- 直接复制前端文件到镜像中

价值：
- 结构简单，发布稳定
- 非常适合纯静态页面

边界：
- 不包含前端编译步骤
- 若后续引入打包工具，需要升级为多阶段构建

### 2.4 上下文控制层：.dockerignore

文件：frontend/.dockerignore

策略：
- 排除 node_modules、缓存、日志、版本控制目录等无关内容
- 保留运行所需静态资源（如 index.html、image 目录）

价值：
- 减少构建上下文体积
- 提升构建速度
- 降低缓存失效率

### 2.5 配置注入层：app.env

文件：docker/app.env

关键参数：
- ENVIRONMENT: 环境标识
- WEB_PORT: 宿主机暴露端口
- PROJECT_NAME: 项目名
- WEB_TAG: 镜像标签
- WEB_IMAGE: 镜像名
- PROJECT_SUBNET: 网络子网

价值：
- 环境参数集中管理
- 无需改 YAML 即可切换端口、镜像标签和网络命名

---

## 3. 机制抽象：可复用的五层模型

推荐把新项目 Docker 机制拆成以下五层：

1. 操作入口层（脚本）
- 负责命令统一和预检查

2. 服务编排层（Compose）
- 负责服务、端口、网络、镜像策略

3. 镜像构建层（Dockerfile）
- 负责基础镜像、构建流程、运行时文件布局

4. 上下文治理层（.dockerignore）
- 负责只让必要文件进入构建上下文

5. 参数注入层（.env）
- 负责端口、标签、环境名、网络段等可变配置

---

## 4. 新项目可直接套用的落地步骤

### Step 1：先定基础镜像策略

- 静态站点：Nginx
- Node 服务：Node 运行时
- Python 服务：Python slim + gunicorn/uvicorn

建议：
- 若依赖私有镜像仓库，提前写清登录要求

### Step 2：先写 Compose，再写脚本

先确保以下最小项齐全：
- 服务名
- build.context 与 dockerfile
- image 命名规则
- ports 映射
- restart 策略
- 网络和子网（可选）

然后再用脚本封装：
- start
- stop
- logs
- clean

### Step 3：把变量放入 env 文件

建议至少有：
- ENVIRONMENT
- PROJECT_NAME
- SERVICE_PORT 或 WEB_PORT
- IMAGE_TAG
- IMAGE_NAME

原则：
- 能参数化就参数化
- 配置与逻辑分离

### Step 4：尽早完善 .dockerignore

默认先排除：
- 依赖目录
- 构建产物目录
- IDE/系统垃圾文件
- 日志与缓存
- VCS 元数据

再按需显式保留：
- 运行必需静态资源

### Step 5：补齐运维动作

在脚本中至少具备：
- 健康检查前置（docker、compose、daemon）
- 清理命令带确认开关
- 日志跟踪命令

---

## 5. 推荐命令规范（可直接沿用）

- 启动并重建：
  ./local.sh start

- 停止：
  ./local.sh stop

- 查看状态：
  ./local.sh status

- 查看日志：
  ./local.sh logs

- 清理容器与镜像：
  ./local.sh clean --yes

---

## 6. 常见问题与规避建议

1. 缺少 Nginx 自定义行为
- 现象：缓存头、压缩、路由回退不满足需求
- 建议：补充 nginx 配置并复制到镜像

2. 私有基础镜像拉取失败
- 现象：构建阶段无法拉取基础镜像
- 建议：在 README 增加仓库登录与替代公共镜像方案

3. 构建缓存频繁失效
- 现象：微小变动导致整层重建
- 建议：优化 COPY 粒度；必要时拆分多阶段


---

## 7. 何时升级为多阶段构建

当项目出现以下条件时，建议从当前最小方案升级：
- 引入 React/Vue 等打包流程
- 需要在镜像中执行 npm run build
- 需要更小运行时镜像
- 需要更可控的依赖安装和缓存层

升级方向：
- Stage 1: 构建阶段（node 安装依赖并编译）
- Stage 2: 运行阶段（nginx 仅承载 dist 静态产物）

---

## 8. 一句话复用原则

把“命令入口、编排定义、镜像构建、上下文控制、变量注入”五件事分开管理，再通过脚本串联成一条稳定发布链路，新项目可快速复制并长期维护。
