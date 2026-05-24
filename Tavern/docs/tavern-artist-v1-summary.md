# tavern-artist V1 美术交付总结

面向：tavern-designer  
项目：《武林小馆》V1  
交付目录：`images/`

## 1. 本轮目标

tavern-artist 按 `docs/tavern-artist-v1.md` 完成了 V1 Demo 所需的首批游戏图片素材，使 tavern-coder 可以直接从 `images/` 加载资源并完成单屏酒馆 Demo。

核心目标是先建立一套可运行、风格统一、适合横屏 H5 的 Q 版武侠酒馆素材，而不是终版精修。

## 2. 美术方向

本轮采用的主视觉方向：

- Q 版武侠酒馆。
- 2.5D 固定斜视角。
- 暖木色、灯笼红、米黄色为主。
- 用青蓝窗光打破单一黄褐色。
- 角色为 2.5 到 3 头身 Q 版比例。
- UI 走木牌、宣纸、黄铜装饰方向。

第一版程序绘制素材已经被后续 AI 生成高质量版替换。当前 `images/` 中主素材整体更接近官网截图与 Demo 演示需要。

## 3. 已交付素材

### 背景

- `images/background/tavern-hall-v1.png`
- `images/background/tavern-hall-v1.jpg`
- `images/background/tavern-walkable-mask-v1.png`
- `images/background/tavern-collision-guide-v1.png`

说明：

- 大厅背景尺寸保持 `1920x1080`。
- walkable mask 与 collision guide 与大厅背景同尺寸对齐。
- 背景中预留 4 个桌位区域，左侧为前台，右侧和中部为桌区。
- 前台区域已补入女老板娘，作为背景装饰烘托酒馆经营感。
- `tavern-hall-v1.png` 与 `tavern-hall-v1.jpg` 内容一致，仅格式不同。
- 为首屏性能，`tavern-hall-v1.png` 已压缩到 1MB 以内，`tavern-hall-v1.jpg` 已控制在约 300KB 内。

### 桌子与道具

- `images/props/table-a.png`
- `images/props/table-b.png`
- `images/props/table-c.png`
- `images/props/table-d.png`
- `images/props/counter.png`
- `images/props/event-food-stack.png`
- `images/props/event-love-petals.png`
- `images/props/event-sword-shadow.png`
- `images/props/event-poison-cocktail.png`
- `images/props/event-bgm-wave.png`

说明：

- 四张桌子保持独立透明 PNG，方便 coder 分层和碰撞。
- 每张桌子保留不同桌面道具和氛围，用于区分 A/B/C/D 桌。
- 事件道具用于特殊 NPC 组合的桌面增强。

### 玩家小虾米

- `images/player/xiaoxiami-idle-down.png`
- `images/player/xiaoxiami-idle-up.png`
- `images/player/xiaoxiami-idle-left.png`
- `images/player/xiaoxiami-idle-right.png`
- `images/player/xiaoxiami-walk-down.png`
- `images/player/xiaoxiami-walk-up.png`
- `images/player/xiaoxiami-walk-left.png`
- `images/player/xiaoxiami-walk-right.png`

说明：

- idle 为单帧透明 PNG。
- walk 为横向 4 帧 strip，保持 `640x220`，每帧 `160x220`。
- 当前 walk 动画是 V1 可用版，后续可补更细的逐帧动作。

### NPC

16 位 NPC 均已交付：

- 郭靖 `guojing`
- 乔峰 `qiaofeng`
- 杨过 `yangguo`
- 张无忌 `zhangwuji`
- 周伯通 `zhoubotong`
- 韦小宝 `weixiaobao`
- 洪七公 `hongqigong`
- 令狐冲 `linghuchong`
- 黄蓉 `huangrong`
- 小龙女 `xiaolongnv`
- 赵敏 `zhaomin`
- 周芷若 `zhouzhiruo`
- 王语嫣 `wangyuyan`
- 郭襄 `guoxiang`
- 阿紫 `azi`
- 蓝凤凰 `lanfenghuang`

每个 NPC 均包含：

- `images/npcs/{npcId}/sprite.png`
- `images/npcs/{npcId}/avatar.png`

说明：

- sprite 用于场景内坐姿或桌边姿态。
- avatar 用于对话窗口头像。
- 角色识别点主要来自服色、表情、姿态和道具。
- 已针对蓝凤凰、王语嫣、阿紫、郭襄修复 sprite 头顶被裁切问题，保持 `220x260` 透明 PNG 画布不变。
- 已针对乔峰修复场景主体偏小偏低问题，保持 `220x260` 透明 PNG 画布不变；可见主体高度已从约 `150px` 调整到约 `174px`，底部落点仍保持在 `y=252` 附近。

### UI

- `images/ui/dialog-panel.png`
- `images/ui/dialog-tail.png`
- `images/ui/button-normal.png`
- `images/ui/button-pressed.png`
- `images/ui/event-badge.png`
- `images/ui/joystick-base.png`
- `images/ui/joystick-knob.png`
- `images/ui/nameplate.png`
- `images/ui/icon-bgm-on.png`
- `images/ui/icon-bgm-off.png`

说明：

- UI 素材均无固定文字，文字由前端动态渲染。
- BGM 开关 icon 已按后续需求补充，透明 PNG，`96x96`。
- `nameplate.png` 已按手机横屏可读性重新压缩横向长度，当前尺寸为 `136x52`，透明 PNG，无固定文字。
- dialog panel 适合做九宫格拉伸，建议 coder 避免直接粗暴拉伸整图。

### 宣传图

- `images/promo/wulin-tavern-homepage.jpg`
- `images/promo/tavern-dev-flow-v1.jpg`
- `images/promo/ai-dev-flow-en.jpg`
- `images/promo/ai-dev-flow-cn.jpg`

说明：

- 官网首页用 4:3 宣传图。
- 尺寸 `1200x900`。
- JPG，约 291KB。
- 无 UI、无文字、无黑边，便于官网叠加标题或按钮。
- 开发流程宣传图均为 JPG，用于官网开发过程展示。
- `ai-dev-flow-en.jpg` 为英文版 Tavern AGI-native 开发流程图，尺寸 `1600x900`，二维码指向 `https://g.ismayday.mobi/tavern/`。
- `ai-dev-flow-cn.jpg` 为中文版参考风格宣传图，尺寸 `1600x900`，二维码指向 `https://g.ismayday.mobi/soulmate/`。

## 4. 性能处理

已做过一轮图片体积优化：

- 主背景压缩到 1MB 内。
- 主背景 JPG 版本同步输出，用于需要更快加载或非透明展示的场景。
- NPC、道具、UI 保持 PNG 透明格式并压缩体积。
- 宣传图使用 JPG 输出，适合官网首页加载。

设计侧需要注意：

- 背景如果继续追求更细腻渐变，PNG 体积会明显回升。
- 若官网只展示宣传图，优先使用 `images/promo/wulin-tavern-homepage.jpg`，不要直接拿游戏背景图当首页大图。
- 游戏内透明素材不建议转 JPG，否则会丢失透明通道。
- 如果游戏运行时已经切到 `tavern-hall-v1.jpg`，需要确认 walkable mask 和 collision guide 仍按同一套 `1920x1080` 坐标使用。

## 5. 给 designer 的评估点

建议 designer 重点确认：

- 当前 Q 版程度是否足够，尤其 NPC 是否需要更夸张、更萌化。
- 四张桌子的风格差异是否符合 A/B/C/D 桌定位。
- 当前酒馆整体是否偏暗，是否需要再提高手机端亮度。
- NPC 是否需要做专属事件姿势，例如郭靖+黄蓉、杨过+小龙女、张无忌+周芷若。
- UI 面板是否需要更轻，避免遮挡游戏主画面。
- 宣传图是否要加入正式 logo 或 slogan；当前版本刻意不画死文字。

## 6. 给 coder 的协作注意

- `tavern-hall-v1.png`、walkable mask、collision guide 均保持 `1920x1080`。
- `tavern-hall-v1.jpg` 与 PNG 内容一致，可按加载性能选择其一；若代码已经加载 JPG，重新部署静态资源即可。
- 前台女老板娘是烘托氛围的背景内嵌元素，不是独立 NPC，不需要新增碰撞、点击区域或 NPC 配置。
- NPC sprite 建议脚底锚点使用 `(110, 240)` 附近。
- 蓝凤凰、王语嫣、阿紫、郭襄只替换同路径 sprite 资源，代码侧通常只需刷新缓存。
- 乔峰 sprite 已在同一画布内放大并保持底部落点，代码侧通常只需重新部署；如果视觉仍略偏大，可仅微调该 NPC 显示 scale。
- 小虾米 idle 建议脚底锚点使用 `(80, 200)` 附近。
- 小虾米 walk 每帧 `160x220`，横向 4 帧。
- `nameplate.png` 从旧版 `240x78` 调整为 `136x52`，代码侧需要重新校准名字牌 scale、文字居中和字号匹配。
- 桌子应按新版背景桌位重新校准坐标和碰撞，不建议沿用最早程序绘制版坐标。
- `tavern-collision-guide-v1.png` 仅供开发参考，不建议正式首屏加载。
- NPC avatar 可在打开对话时懒加载，以减少首屏压力。

## 7. 当前临时/后续项

当前无纯色占位素材。以下内容属于 V1 后续可提升项：

- 小虾米 walk 动画可补真正连续 4 帧。
- NPC 可增加表情差分和事件专属姿态。
- 背景可补日夜变体或节日变体。
- UI 可补 hover/disabled 状态。
- 宣传图可根据官网最终版式补 logo 版、无 logo 版、横版和竖版多规格。
