# tavern-coder V1 工作任务书

## 一、任务目标

根据 [tavern-design-v1.md](./tavern-design-v1.md) 实现《武林小馆》V1 横屏 H5 演示版。

V1 需要完成：

- 横屏单屏酒馆。
- 小虾米可在酒馆空闲区域上下左右移动。
- 小虾米不能与桌子、NPC、前台、墙体和边界重叠。
- 16 位 NPC 配置。
- 每轮随机 4 到 6 位 NPC 入座 4 张桌子。
- 特定 NPC 同桌触发特殊事件。
- 点击 NPC 弹出浮动对话窗口。
- 快捷话题和玩家自由输入。
- 后端调用 DeepSeek `deepseek-v4-flash` 生成 NPC 短回复。
- AI 失败时服务端降级回复。

前端与后端需要清晰分离。DeepSeek Key 只能存在后端 `.env` 或服务器环境变量中，禁止写入前端代码。

## 二、推荐技术方案

### 0. 与 tavern-artist 的协作契约

tavern-coder 的前端实现必须优先使用 tavern-artist 交付到 `images/` 目录的正式素材。`images/` 是游戏 V1 的唯一正式图片素材来源，coder 不应在 `web/` 内另建一套正式图片资源。

协作规则：

- 所有背景、桌子、NPC、小虾米、UI、事件道具都从项目根目录 `images/` 加载。
- 资源 key、文件路径和 NPC id 必须与 [tavern-artist-v1.md](./tavern-artist-v1.md) 保持一致。
- 如果某个素材暂未交付，可以临时使用代码生成占位图，但占位图的资源 key 必须与正式素材一致，方便后续无缝替换。
- 一旦 artist 提供正式素材，coder 应删除或停用对应占位图，改为加载 `images/` 下真实文件。
- coder 需要根据 `images/background/tavern-walkable-mask-v1.png` 和 `images/background/tavern-collision-guide-v1.png` 配置可行走区域、桌子碰撞、前台碰撞和场景边界。
- coder 需要把资源加载清单维护在代码里，缺失素材要在控制台给出清晰警告。
- 如果 coder 发现素材尺寸、锚点、透明边缘或命名不适合实现，应反馈给 artist 修改，不要在代码里长期写大量特例补丁。
- 前端 UI 文字必须由代码渲染，不依赖 artist 画死文字。

联动验收重点：

- 替换 `images/` 下同名素材后，前端无需改代码即可显示新图。
- NPC 坐标、点击热区和碰撞区域与 artist 的视觉表现基本对齐。
- 小虾米不会走进 artist 标注为不可行走的前台、桌子、墙体和 NPC 区域。

### 1. 前端

推荐：

- Vite。
- TypeScript。
- Phaser 3。

理由：

- 这是 H5 小游戏，有角色移动、碰撞和点击热区。
- Phaser 3 可以快速处理精灵、输入、碰撞、分层和坐标。
- TypeScript 便于维护 NPC、桌子、事件、碰撞等配置。

### 2. 后端

参考项目：

`/Users/kk/Documents/Codex/soulmate/api`

复用思路：

- Node.js 20+。
- ESM 模块。
- 原生 `node:http` 即可，不强依赖 Express。
- `.env` 读取配置。
- `/api/chat` 提供 SSE 流式回复。
- `/api/health` 提供健康检查。
- DeepSeek 请求失败时返回 fallback。

### 3. 建议项目结构

```text
Tavern/
  docs/
    tavern-design-v1.md
    tavern-artist-v1.md
    tavern-coder-v1.md
  images/
  web/
    package.json
    index.html
    src/
      main.ts
      game/
        TavernGame.ts
        scenes/
          BootScene.ts
          TavernScene.ts
        data/
          npcs.ts
          tables.ts
          events.ts
          collisions.ts
        systems/
          roundSystem.ts
          movementSystem.ts
          interactionSystem.ts
          dialogSystem.ts
          apiClient.ts
        ui/
          DialogPanel.ts
          Joystick.ts
        types.ts
  api/
    package.json
    .env.example
    src/
      config.js
      deepseek.js
      fallback.js
      http.js
      prompt.js
      server.js
```

## 三、前端实现任务

### 1. 初始化 H5 游戏工程

创建 `web/` 前端工程。

要求：

- 使用 Vite + TypeScript。
- 使用 Phaser 3。
- 支持 `npm run dev` 启动本地开发。
- 横屏 16:9 画布。
- 画布自适应浏览器窗口，保持比例，不拉伸变形。
- 移动端如果竖屏访问，显示横屏提示或自动适配为 letterbox。

建议画布逻辑尺寸：

```ts
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
```

### 2. 资源加载

从项目根目录 `images/` 目录加载素材。该目录由 tavern-artist 负责产出和维护，coder 负责消费。

P0 阶段允许使用占位图，但路径和资源 key 必须与 [tavern-artist-v1.md](./tavern-artist-v1.md) 保持一致。占位图只能作为临时降级方案，正式演示必须尽量使用 artist 已交付素材。

需要加载：

- 背景：`images/background/tavern-hall-v1.png`
- 可行走遮罩参考：`images/background/tavern-walkable-mask-v1.png`
- 碰撞参考图：`images/background/tavern-collision-guide-v1.png`
- 四张桌子：`images/props/table-a.png` 到 `table-d.png`
- 前台和事件道具：`images/props/*`
- 小虾米：`images/player/xiaoxiami-*`
- 16 位 NPC：`images/npcs/{npcId}/sprite.png` 和 `avatar.png`
- 对话窗口、按钮、名字牌、事件标识 UI：`images/ui/*`
- 虚拟摇杆 UI：`images/ui/joystick-base.png` 和 `joystick-knob.png`

资源加载要求：

- 所有资源 key 使用稳定命名，例如 `npc-guojing-sprite`、`npc-guojing-avatar`、`table-a`。
- 缺失素材时打印警告，说明缺失路径和所属 artist 任务。
- 缺失 P0 素材时允许生成临时色块或简单文字占位，但不能改变业务逻辑。
- 不允许把正式素材复制到 `web/src/assets` 后再加载，避免与 artist 交付目录分叉。
- 若部署工具需要复制静态资源，应在构建脚本中从根目录 `images/` 复制或映射，而不是手动维护第二份。

### 3. 场景分层

建议 Phaser 层级：

```text
backgroundLayer
tableLayer
propLayer
npcLayer
playerLayer
effectLayer
uiLayer
```

渲染规则：

- 背景最底层。
- 桌子和道具在角色下方或部分前景层。
- NPC 与玩家需要按 y 坐标排序，保证视觉遮挡自然。
- UI 始终在最上层。

### 4. 小虾米移动

实现小虾米在酒馆内上下左右移动。

输入方式：

- 桌面端：方向键 + WASD。
- 移动端：左下角虚拟摇杆。
- 可选：点击空闲地面自动移动到目标点。

移动规则：

- 玩家只能在可行走区域移动。
- 玩家不能穿过桌子、前台、墙体、NPC、酒坛和场景边界。
- 玩家与 NPC 使用小圆形或胶囊形碰撞，避免靠近时卡住。
- 玩家脚底中心作为定位点。
- 移动时播放对应方向 walk 动画。
- 停止时播放对应方向 idle 动画。

优先实现：

- 键盘移动。
- 基础碰撞。
- 四方向朝向。

随后实现：

- 虚拟摇杆。
- 点击地面移动。

### 5. 碰撞系统

碰撞数据独立配置在：

`web/src/game/data/collisions.ts`

建议类型：

```ts
export type CollisionZone = {
  id: string;
  type: "wall" | "table" | "counter" | "npc" | "prop";
  shape:
    | { kind: "rect"; x: number; y: number; width: number; height: number }
    | { kind: "circle"; x: number; y: number; radius: number }
    | { kind: "polygon"; points: Array<{ x: number; y: number }> };
};
```

V1 可先使用矩形和圆形碰撞。多边形可保留类型，后续再实现。

碰撞配置需要参考 artist 交付的两张图：

- `images/background/tavern-walkable-mask-v1.png`
- `images/background/tavern-collision-guide-v1.png`

要求：

- 桌子、前台、墙体、酒坛等静态碰撞要贴合视觉边界。
- NPC 入座后要生成对应动态碰撞区域。
- 小虾米碰撞半径以脚底为准，不以整张角色图为准。
- 如果碰撞参考图与实际素材不一致，记录问题并反馈 artist。

### 6. NPC 配置

配置文件：

`web/src/game/data/npcs.ts`

每个 NPC 包含：

```ts
export type NpcConfig = {
  id: string;
  name: string;
  gender: "male" | "female";
  title: string;
  personalityTag: string;
  coreMeme: string;
  catchphrases: string[];
  speechStyle: string;
  visualKey: string;
  spriteKey: string;
  avatarKey: string;
  presetLines: string[];
};
```

必须配置 16 位 NPC：

- `guojing`
- `qiaofeng`
- `yangguo`
- `zhangwuji`
- `zhoubotong`
- `weixiaobao`
- `hongqigong`
- `linghuchong`
- `huangrong`
- `xiaolongnv`
- `zhaomin`
- `zhouzhiruo`
- `wangyuyan`
- `guoxiang`
- `azi`
- `lanfenghuang`

### 7. 桌子配置

配置文件：

`web/src/game/data/tables.ts`

类型：

```ts
export type TableConfig = {
  id: "A" | "B" | "C" | "D";
  name: string;
  theme: string;
  tableAssetKey: string;
  position: { x: number; y: number };
  seatPositions: Array<{ x: number; y: number; facing: "left" | "right" | "up" | "down" }>;
  eventAnchor: { x: number; y: number };
};
```

要求：

- A、B、C、D 以 2x2 展开。
- 每桌至少配置 2 个座位。
- V1 每桌最多实际入座 2 个 NPC。
- 座位坐标不能与玩家通道严重重叠。

### 8. 刷新与随机入座系统

配置文件：

`web/src/game/systems/roundSystem.ts`

规则：

- 每 4 小时一个刷新周期。
- 固定时段：00:00、04:00、08:00、12:00、16:00、20:00。
- 每轮随机抽取 4 到 6 位 NPC。
- 先保证 4 张桌子各 1 位。
- 多余 NPC 随机拼桌。
- 如果抽中特殊配对，优先安排同桌。
- 演示版本提供“立即重刷”按钮。

随机需要稳定：

- 同一时间段内刷新结果应稳定。
- 可用日期 + 刷新时段作为 seed。
- 演示重刷按钮可使用随机 seed。

### 9. 特殊事件系统

配置文件：

`web/src/game/data/events.ts`

类型：

```ts
export type TableEventConfig = {
  id: string;
  name: string;
  npcIds: string[];
  priority: number;
  preferredTableId?: "A" | "B" | "C" | "D";
  description: string;
  visualEffectKey: string;
  promptContext: string;
};
```

V1 至少实现 3 个事件：

- `guojing_huangrong_food`：郭靖 + 黄蓉，大漠金牌饲养员。
- `yangguo_xiaolongnv_love`：杨过 + 小龙女，古墓派秀恩爱现场。
- `zhangwuji_zhouzhiruo_ptsd`：张无忌 + 周芷若，婚礼现场 PTSD。

建议额外配置但可延后表现：

- `linghuchong_lanfenghuang_cocktail`
- `qiaofeng_azi_guard`
- `hongqigong_huangrong_food_review`

事件表现：

- 桌边显示事件 badge。
- 桌面叠加事件道具。
- 对话窗口显示事件标签。
- API 请求中带上事件上下文。

### 10. NPC 点击与对话窗口

实现：

- 点击 NPC 打开浮动对话窗口。
- 对话窗口出现在 NPC 附近。
- 如果 NPC 在右侧，窗口向左展开。
- 如果 NPC 在左侧，窗口向右展开。
- 窗口不能超出画布边界。
- 点击另一个 NPC 时切换内容。
- 点击空白处或关闭按钮关闭窗口。
- 玩家开始移动时自动关闭窗口。

窗口内容：

- NPC 头像。
- NPC 名称。
- NPC 性格标签。
- 桌位。
- 特殊事件标签。
- 回复文本。
- 3 个快捷话题。
- 文本输入框。
- 发送按钮。

快捷话题：

- 打个招呼。
- 问问同桌。
- 江湖八卦。

### 11. 前端 API 客户端

文件：

`web/src/game/systems/apiClient.ts`

接口：

```ts
export type ChatRequest = {
  npcId: string;
  npcName: string;
  message: string;
  topic?: "greeting" | "tablemate" | "rumor" | "free";
  tableId: "A" | "B" | "C" | "D";
  tablemates: Array<{ id: string; name: string; title: string }>;
  eventId?: string;
  eventName?: string;
  eventDescription?: string;
  recentMessages?: Array<{ role: "player" | "npc"; text: string }>;
  clientTime: string;
};
```

请求：

- POST `/api/chat`
- `Content-Type: application/json`
- 接收 `text/event-stream`

SSE 事件：

- `meta`：请求开始。
- `delta`：流式增量。
- `done`：完成，包含最终回复。

前端要求：

- 流式增量实时显示在对话框。
- 超时或异常时显示服务端 fallback。
- 发送中禁用按钮。
- 支持取消或切换 NPC 时忽略旧响应。

## 四、后端实现任务

### 1. 初始化 API 工程

创建 `api/` 目录。

参考：

`/Users/kk/Documents/Codex/soulmate/api`

建议文件：

```text
api/
  package.json
  .env.example
  src/
    config.js
    deepseek.js
    fallback.js
    http.js
    prompt.js
    server.js
```

### 2. 环境变量

`.env.example`：

```env
HOST=127.0.0.1
PORT=3001
DEEPSEEK_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_TIMEOUT_MS=18000
```

要求：

- `DEEPSEEK_API_KEY` 只在后端读取。
- 前端禁止出现真实 key。
- 如果缺 key，后端 `/api/chat` 应走 fallback，不应崩溃。

### 3. DeepSeek 调用

参考 soulmate 的 `src/deepseek.js`。

请求地址：

```text
{DEEPSEEK_URL}/chat/completions
```

请求体建议：

```js
{
  model: config.deepseek.model,
  messages,
  temperature: 0.82,
  max_tokens: 160,
  extra_body: {
    thinking: {
      type: 'disabled'
    }
  },
  stream: true
}
```

要求：

- 使用 SSE 读取 DeepSeek 流。
- 将 DeepSeek delta 转发给前端。
- 完整回复为空、截断或异常时进入 fallback。
- 单次超时建议 18 秒。

### 4. API 路由

必须实现：

```text
GET  /api/health
GET  /api/hello
POST /api/chat
```

`POST /api/chat` 请求体：

```json
{
  "npcId": "huangrong",
  "npcName": "黄蓉",
  "message": "今天有什么好吃的？",
  "topic": "free",
  "tableId": "A",
  "tablemates": [
    { "id": "guojing", "name": "郭靖", "title": "大漠憨憨" }
  ],
  "eventId": "guojing_huangrong_food",
  "eventName": "大漠金牌饲养员",
  "eventDescription": "黄蓉疯狂夹菜，郭靖憨笑吃饭。",
  "recentMessages": [],
  "clientTime": "2026-05-23T15:30:00.000Z"
}
```

SSE 返回：

```text
event: meta
data: {"ok":true,"source":"deepseek"}

event: delta
data: {"delta":"这","fullText":"这"}

event: done
data: {"ok":true,"reply":"这道菜嘛，账先记郭靖头上。","source":"deepseek","time":"..."}
```

### 5. Prompt 构建

文件：

`api/src/prompt.js`

输出 messages：

```js
[
  { role: 'system', content: buildNpcSystemPrompt(payload, date) },
  ...history,
  { role: 'user', content: buildUserPrompt(payload, date) }
]
```

系统 Prompt 必须包含：

- 游戏名：《武林小馆》。
- NPC 名称。
- NPC 性格标签。
- NPC 核心梗。
- NPC 口头禅。
- 说话风格。
- 当前桌位。
- 同桌角色。
- 当前特殊事件。
- 输出限制。

输出限制：

- 直接以 NPC 口吻回复。
- 2 句话以内。
- 60 个汉字以内。
- 不要旁白。
- 不要括号动作。
- 不要 AI 客套话。
- 不要解释系统或模型。
- 保持轻松、Q 版、武侠反差喜剧风格。

### 6. NPC Prompt 配置

后端需要有一份 NPC 人设表，前端传 `npcId` 后，后端以自己的人设表为准，不完全信任前端。

建议文件：

`api/src/npcs.js`

包含 16 位 NPC：

```js
export const NPC_PROFILES = {
  huangrong: {
    name: '黄蓉',
    title: '天才主厨',
    coreMeme: '天才主厨 / 硬核会计',
    catchphrases: ['这笔账，我可记得清清楚楚。'],
    speechStyle: '机灵俏皮，常顺手把账算到别人头上。'
  }
};
```

### 7. Fallback 回复

文件：

`api/src/fallback.js`

要求：

- 根据 `npcId` 返回角色化短回复。
- 如果没有匹配 NPC，返回通用江湖回复。
- fallback 也要遵守 60 字以内。

示例：

```js
const fallbackLines = {
  huangrong: [
    '这事简单，不过账先记你名下。',
    '小虾米，嘴甜一点，今日茶钱可以少算半文。'
  ],
  zhangwuji: [
    '这个……要不你先替我选一个？',
    '我真不是不想答，只是这选择有点难。'
  ]
};
```

### 8. 安全与校验

后端校验：

- `message` 必须是非空字符串。
- `message` 最大 300 字。
- `npcId` 必须存在于后端 NPC 表。
- `recentMessages` 最多取最近 6 条。
- 不接受前端传入任意 system prompt。
- 统一 CORS，方便本地前端联调。

## 五、前后端联调

### 1. 本地启动

API：

```bash
cd /Users/kk/Work/GameAI/Tavern/api
cp .env.example .env
npm install
npm run dev
```

Web：

```bash
cd /Users/kk/Work/GameAI/Tavern/web
npm install
npm run dev
```

### 2. 代理配置

Vite 开发环境将 `/api` 代理到：

```text
http://127.0.0.1:3001
```

生产或演示部署时可由 Nginx 反代：

```text
https://your-domain.example/api/chat -> http://127.0.0.1:3001/api/chat
```

### 3. 测试命令

健康检查：

```bash
curl http://127.0.0.1:3001/api/health
```

聊天接口：

```bash
curl -N -X POST http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "npcId":"huangrong",
    "npcName":"黄蓉",
    "message":"今天有什么好吃的？",
    "topic":"free",
    "tableId":"A",
    "tablemates":[{"id":"guojing","name":"郭靖","title":"大漠憨憨"}],
    "eventId":"guojing_huangrong_food",
    "eventName":"大漠金牌饲养员",
    "eventDescription":"黄蓉疯狂夹菜，郭靖憨笑吃饭。",
    "recentMessages":[],
    "clientTime":"2026-05-23T15:30:00.000Z"
  }'
```

## 六、开发里程碑

### 阶段 1：基础工程和静态场景

交付：

- `web/` 和 `api/` 工程可启动。
- 横屏画布显示酒馆背景。
- 4 张桌子显示在正确位置。
- 小虾米显示在初始位置。

验收：

- `npm run dev` 可启动前端。
- `npm run dev` 可启动后端。
- 打开页面能看到酒馆和小虾米。

### 阶段 2：移动与碰撞

交付：

- 小虾米支持键盘移动。
- 小虾米支持虚拟摇杆。
- 小虾米不能穿过桌子、前台、墙体和 NPC。
- 角色 y 排序正常。

验收：

- 玩家能在空闲区域流畅移动。
- 桌角和 NPC 附近没有明显卡死。

### 阶段 3：NPC 随机入座与特殊事件

交付：

- 16 位 NPC 配置完成。
- 每轮随机 4 到 6 位。
- 4 张桌子各至少 1 位 NPC。
- 特殊组合可触发事件。
- 演示重刷按钮可用。

验收：

- 连续重刷能看到不同 NPC 组合。
- 抽中特定组合时能同桌并显示事件。

### 阶段 4：浮动对话窗口

交付：

- 点击 NPC 弹出对话窗口。
- 窗口位置不越界。
- 显示 NPC 信息、预设台词、快捷话题和输入框。
- 玩家移动时窗口关闭。

验收：

- 左右两侧 NPC 的窗口都能正确展开。
- 多 NPC 切换无残留窗口。

### 阶段 5：DeepSeek 后端对话

交付：

- `/api/chat` SSE 可用。
- DeepSeek `deepseek-v4-flash` 调用可用。
- 前端能流式展示回复。
- fallback 可用。

验收：

- 输入自由文本后，NPC 能按人设回复。
- 拔掉或缺失 API Key 时，仍返回 fallback。
- 前端代码中没有 DeepSeek Key。

### 阶段 6：演示打磨

交付：

- 刷新倒计时。
- 重刷按钮。
- 点击反馈。
- 基础音效可选。
- 移动端横屏适配。

验收：

- 内部演示人员能在 1 分钟内看懂玩法。
- 能快速展示随机入座、特殊事件和 AI 对话三件事。

## 七、V1 验收清单

- 横屏单屏酒馆完整展示。
- 游戏画面使用 `images/` 目录中 tavern-artist 交付的正式素材。
- 同名替换 `images/` 素材后，前端无需改代码即可更新显示。
- 小虾米可上下左右移动。
- 小虾米无法穿过桌子、NPC、前台和边界。
- 小虾米可行走区域与 artist 的遮罩/碰撞参考图基本一致。
- 16 位 NPC 均有配置。
- 每轮随机 4 到 6 位 NPC。
- 4 张桌子 2x2 分布并自动入座。
- 至少 3 个特殊事件可触发。
- 点击 NPC 弹浮动对话窗口。
- 快捷话题可用。
- 自由输入可用。
- `/api/chat` 使用 SSE。
- 后端调用 `deepseek-v4-flash`。
- AI 失败或无 key 时有 fallback。
- 前端不包含任何 API Key。
- 本地 README 或启动说明清楚。
