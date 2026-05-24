# tavern-coder V1 工作总结

面向：tavern-designer  
项目：江湖小酒馆 / 武林小馆 V1  
线上地址：https://g.ismayday.mobi/tavern/

## 1. 总体完成情况

tavern-coder 已完成 V1 第一版 H5 游戏的前端、后端、资源接入和部署链路。

当前版本已经可以在手机横屏中访问，玩家可进入酒馆大厅，操控小虾米移动，查看随机入座的 NPC，点击 NPC 打开对话框，并通过 DeepSeek SSE 流式接口进行角色化聊天。

项目结构已按任务书区分：

- `web/`：Vite + TypeScript + Phaser 3 前端。
- `api/`：Node.js 20 ESM 后端。
- `images/`：正式美术资源目录，由 artist 维护，前端仅引用，不复制到 `web/src/assets`。

## 2. 前端实现内容

前端使用 Phaser 3 实现了 1920x1080 横屏固定画布，并通过 `FIT + CENTER_BOTH` 适配手机横屏 WebView。

已实现的核心模块：

- 酒馆大厅背景、前台、四张桌子、事件道具、NPC、玩家角色分层渲染。
- 小虾米键盘和虚拟摇杆移动。
- 基于可走区域、多边形边界、前台、桌子、NPC 的碰撞限制。
- NPC 随机入座，每轮根据随机种子选择 4 到 6 位 NPC。
- 特殊桌局事件匹配，例如郭靖黄蓉、杨过小龙女、令狐冲蓝凤凰等组合。
- NPC 名字牌、桌子名称、事件标识、刷新倒计时。
- 点击 NPC 打开全局唯一对话框。
- 快捷话题按钮：打个招呼、问问同桌、江湖八卦。
- 自由输入框和发送按钮。
- 对话框内 SSE 流式更新回复文本。
- BGM 加载和右上角静音切换按钮。

主要前端文件：

- `web/src/game/scenes/BootScene.ts`：资源预加载与缺失资源占位图生成。
- `web/src/game/scenes/TavernScene.ts`：主场景、角色、桌局、BGM、交互。
- `web/src/game/ui/DialogPanel.ts`：DOM 对话框、输入框、快捷话题、SSE 对接。
- `web/src/game/ui/Joystick.ts`：移动端虚拟摇杆。
- `web/src/game/data/assets.ts`：正式资源路径、素材版本号参数。
- `web/src/game/data/tables.ts`：桌子位置、NPC 座位点、事件锚点。
- `web/src/game/data/collisions.ts`：可走区域和碰撞配置。
- `web/src/game/systems/apiClient.ts`：聊天接口流式客户端。

## 3. 后端实现内容

后端采用 Node.js 20+ ESM，实现了 V1 所需 API。

已实现接口：

- `GET /api/health`：服务健康检查。
- `GET /api/hello`：基础连通测试。
- `POST /api/chat`：NPC 聊天接口，SSE 流式输出。

聊天接口特性：

- 调用 DeepSeek `deepseek-v4-flash`。
- 使用 SSE 返回 `meta`、`delta`、`done`、`error` 事件。
- 未配置或调用失败时自动降级为 NPC 风格 fallback。
- Prompt 已按江湖小酒馆 NPC 场景重写，没有复用参考项目的恋爱 Prompt。
- 前端不包含 DeepSeek API Key，Key 仅在后端 `.env` 中配置。

主要后端文件：

- `api/src/server.js`：HTTP 服务和路由。
- `api/src/deepseek.js`：DeepSeek 调用和流式解析。
- `api/src/prompt.js`：武侠酒馆 NPC Prompt。
- `api/src/fallback.js`：降级回复。
- `api/src/npcs.js`：NPC 人设数据。
- `api/src/config.js`：环境变量配置。

## 4. 美术资源接入

前端已接入 artist 输出的正式资源，均从项目根目录 `images/` 加载。

已接入资源类型：

- 背景：`images/background/tavern-hall-v1.jpg` 作为首屏优化加载版本，`tavern-hall-v1.png` 保留为源图。
- 碰撞参考：`images/background/tavern-collision-guide-v1.png`、`tavern-walkable-mask-v1.png` 保留为开发参考图，正式首屏不再 preload。
- 桌子：`images/props/table-a.png` 到 `table-d.png`
- NPC 坐姿和头像：`images/npcs/{npcId}/sprite.png`、`avatar.png`
- 小虾米待机和行走帧：`images/player/*`
- UI：对话框、按钮、名字牌、摇杆、BGM icon
- BGM：`images/bgm/bgm.mp3`

为了解决浏览器旧图片缓存，部署脚本里加入了独立素材版本号：

```bash
ASSET_VERSION="${ASSET_VERSION:-art-v6-qiaofeng-nameplate-20260524}"
```

前端构建时会把图片和音频路径变成：

```text
/images/...png?v=art-v6-qiaofeng-nameplate-20260524
```

后续如果 artist 更新正式图片，只需要显式更新 `deploy.sh` 中的 `ASSET_VERSION`，再发布即可让浏览器重新拉取新素材。

最近一次资源联调中，artist 替换了 `images/npcs/qiaofeng/sprite.png` 和 `images/ui/nameplate.png`：

- 乔峰坐姿精灵仍保持 `220x260` 透明 PNG，同路径替换后可见主体高度约从 `150px` 提升到 `170px`，和其他 NPC 更接近。
- 名字牌仍使用 `images/ui/nameplate.png`，新版尺寸为 `136x52`，代码继续动态绘制 NPC 名字。
- coder 已更新素材版本号，确保线上浏览器绕过旧缓存。

## 5. 已根据联调反馈修正的问题

V1 开发过程中，根据 designer / artist / 移动端截图反馈，已修正以下问题：

- 移动端首屏灰色遮罩影响操作。
- 点击虚拟摇杆导致小虾米残影或多实例错觉。
- NPC 对话框尺寸过小。
- 输入框无法聚焦，点击输入框误触发其他 NPC。
- 全局多个对话框叠加，已改为全局唯一对话框。
- 新版背景后桌子和 NPC 座位错位，已按新版地毯和碰撞 guide 重新校准。
- NPC 脚底锚点和点击热区按新版角色素材调整。
- 对话框九宫格拉伸和 padding 优化。
- 对话框底部白边，已改为透明容器背景，避免 CSS 背景透出。
- BGM 默认开启，首次用户触摸后播放，循环播放。
- BGM 静音按钮改为 artist 提供的 `icon-bgm-on/off.png`。
- 页面标题从 `武林小馆 V1` 改为 `江湖小酒馆`。
- 对话框头像尺寸调大，增强角色识别。
- 首屏加载速度优化：背景改用优化后的 JPG，碰撞 guide / walkable mask / NPC avatar / BGM 不再阻塞 BootScene 首屏 preload。
- NPC sprite 加载策略优化：首屏只加载当前轮次 NPC，后续刷新时按需加载新 NPC sprite。
- 桌子碰撞范围收窄，NPC 碰撞半径降低，避免 C 桌坐满时小虾米被 NPC 和桌子碰撞夹住而无法左右移动。
- 新版 `nameplate.png` 适配：名牌横向缩短，NPC 头顶姓名字号调大，并在最近一次修正中把姓名文字向下微调、减轻描边，让文字上下更居中。
- 乔峰新版素材上线：保持代码统一缩放，不再额外放大，依赖 artist 新图解决乔峰视觉偏小问题。

## 6. 部署与验证

部署脚本：

```bash
./deploy.sh
```

线上配置：

- H5：https://g.ismayday.mobi/tavern/
- API：https://g.ismayday.mobi/tavern-api/
- Node API 端口：`3002`

部署脚本会执行：

- 前端依赖检查和生产构建。
- 后端语法检查。
- rsync 同步项目。
- 发布 `web/dist` 到线上 H5 目录。
- 重启 Node API。
- `/api/health` 健康检查。
- `/api/chat` SSE smoke test。

最近一次发布检查结果：

- Web build 通过。
- API health 通过。
- Chat SSE smoke test 通过。
- DeepSeek 来源返回正常。
- 线上 H5 `https://g.ismayday.mobi/tavern/` 返回 `200`。
- 线上构建包确认包含 `art-v6-qiaofeng-nameplate-20260524`。
- 线上乔峰 sprite 与名字牌资源均返回 `200`。

## 7. 给 designer 的后续建议

当前版本已经具备 V1 演示主链路。后续如果继续迭代，建议 designer 优先关注：

- NPC 在四张桌子的视觉拥挤度，是否需要每桌更明确的“前排/后排/侧坐”规范。
- 对话框信息层级，目前头像、姓名、称号、性格标签、桌号、事件都已展示，后续可决定是否精简。
- 移动端横屏顶部浏览器栏会占用可视空间，重要 UI 应继续避开最上缘。
- 是否需要把“立即重刷”包装成更符合世界观的按钮文案，例如“换一拨客”。
- 是否需要在对话框中加入 NPC 关系提示或桌局事件摘要，让玩家更快理解为什么这一桌有梗。

## 8. 当前边界

V1 仍保持轻量演示范围：

- 暂未实现存档、任务、经营数值、背包、菜品系统。
- NPC 入座逻辑为本地随机，不依赖服务端状态。
- 碰撞使用手工配置的多边形、矩形、圆形区域。
- 对话历史只保存在当前前端会话内。
- BGM 播放受移动浏览器策略限制，需要用户首次触摸后才能出声。
