# tavern-artist V1 工作任务书

## 一、任务目标

根据 [tavern-design-v1.md](./tavern-design-v1.md) 产出《武林小馆》V1 演示版所需的全部图片美术素材，并统一放入项目根目录的 `images/` 目录。

V1 美术目标不是追求终版精修，而是先完成一套风格统一、可直接接入游戏 Demo 的横屏 Q 版武侠酒馆素材。所有素材需要便于前端分层摆放、碰撞配置和点击交互。

## 二、与 tavern-coder 的协作契约

tavern-artist 的产出是 tavern-coder 实现游戏的唯一正式图片素材来源。coder 必须从 `images/` 目录加载本任务书定义的素材，因此 artist 交付时必须保证路径、命名、尺寸建议和透明背景规则稳定。

协作规则：

- artist 必须按本任务书的 `images/` 目录结构输出素材，不得临时改名或改路径。
- 如果素材需要调整命名、尺寸或拆分方式，必须同步更新本任务书，并通知 coder 更新资源加载清单。
- 背景、桌子、NPC、小虾米、UI 素材的坐标关系要服务于 coder 的碰撞与点击实现。
- `tavern-walkable-mask-v1.png` 和 `tavern-collision-guide-v1.png` 必须与 `tavern-hall-v1.png` 完全同尺寸、完全对齐，供 coder 配置可行走区域和碰撞区域。
- NPC 的 `sprite.png` 要留出清晰脚底或座位锚点，方便 coder 设置角色坐标、排序和点击热区。
- UI 素材不能画死文字，文字由 coder 前端动态渲染。
- artist 可以额外输出预览图，但正式游戏只依赖本任务书列出的素材路径。

交付给 coder 时，请附带一份简短素材清单，说明：

- 已完成哪些 P0/P1/P2 素材。
- 哪些素材仍是临时版。
- 哪些素材尺寸与任务书建议不同。
- 哪些素材需要 coder 特别设置锚点、缩放或碰撞区域。

## 三、统一美术风格

### 1. 关键词

- Q 版武侠。
- 横屏 H5。
- 温暖酒馆。
- 轻喜剧。
- 高辨识度角色。
- 2.5D 固定斜视角。
- 色彩温暖但不能糊成单一黄褐色。

### 2. 画风要求

- 场景采用手绘感 2D，固定 2.5D 斜视角。
- 角色采用 2.5 到 3 头身 Q 版比例。
- 角色轮廓必须清楚，缩小到手机横屏后仍能区分。
- 所有透明素材导出 PNG。
- 场景背景可导出 PNG 或 WebP，优先 PNG。
- UI 素材使用透明 PNG，方便前端叠加。

### 3. 色彩方向

- 主基调：暖木色、灯笼红、米黄色、茶色。
- 辅助色：青绿窗光、深棕阴影、菜品亮色、少量金色。
- 避免全画面只有黄棕一套颜色。
- NPC 服装颜色要区分明显，避免同桌时混在一起。

## 四、目录结构

请按以下结构输出素材：

```text
images/
  background/
    tavern-hall-v1.png
    tavern-walkable-mask-v1.png
    tavern-collision-guide-v1.png
  props/
    table-a.png
    table-b.png
    table-c.png
    table-d.png
    counter.png
    event-food-stack.png
    event-love-petals.png
    event-sword-shadow.png
    event-poison-cocktail.png
    event-bgm-wave.png
  player/
    xiaoxiami-idle-down.png
    xiaoxiami-idle-up.png
    xiaoxiami-idle-left.png
    xiaoxiami-idle-right.png
    xiaoxiami-walk-down.png
    xiaoxiami-walk-up.png
    xiaoxiami-walk-left.png
    xiaoxiami-walk-right.png
  npcs/
    guojing/
      sprite.png
      avatar.png
    qiaofeng/
      sprite.png
      avatar.png
    yangguo/
      sprite.png
      avatar.png
    zhangwuji/
      sprite.png
      avatar.png
    zhoubotong/
      sprite.png
      avatar.png
    weixiaobao/
      sprite.png
      avatar.png
    hongqigong/
      sprite.png
      avatar.png
    linghuchong/
      sprite.png
      avatar.png
    huangrong/
      sprite.png
      avatar.png
    xiaolongnv/
      sprite.png
      avatar.png
    zhaomin/
      sprite.png
      avatar.png
    zhouzhiruo/
      sprite.png
      avatar.png
    wangyuyan/
      sprite.png
      avatar.png
    guoxiang/
      sprite.png
      avatar.png
    azi/
      sprite.png
      avatar.png
    lanfenghuang/
      sprite.png
      avatar.png
  ui/
    dialog-panel.png
    dialog-tail.png
    button-normal.png
    button-pressed.png
    event-badge.png
    joystick-base.png
    joystick-knob.png
    nameplate.png
```

## 五、场景素材任务

### 1. 酒馆大厅背景

路径：

`images/background/tavern-hall-v1.png`

规格：

- 尺寸：1920 x 1080。
- 横屏 16:9。
- 2.5D 固定斜视角。
- 画面左侧为前台，中央和右侧为 4 张八仙桌 2x2 区域。
- 背景内可以包含墙面、窗户、灯笼、酒旗、木地板、后厨布帘等。
- 不要把 NPC 画进背景。
- 桌子如果采用独立道具层，背景中只画地面和环境，不画桌子。

构图要求：

```text
┌────────────────────────────────────────────┐
│ 墙面/窗/灯笼                               │
│ 前台/柜台       A 桌区域        B 桌区域    │
│ 酒坛/菜口                                  │
│ 掌柜区          C 桌区域        D 桌区域    │
│ 可行走地面与 UI 安全区                     │
└────────────────────────────────────────────┘
```

生成提示词建议：

```text
Q版武侠酒馆大厅，横屏16:9，2.5D斜视角，温暖木质室内，左侧木质前台和酒坛账本，中央和右侧预留四张八仙桌区域，灯笼、窗户、酒旗、后厨布帘，手绘游戏场景，干净轮廓，适合H5小游戏，no characters, no text, high readability
```

### 2. 可行走区域遮罩

路径：

`images/background/tavern-walkable-mask-v1.png`

规格：

- 尺寸：1920 x 1080。
- 黑白或透明遮罩。
- 白色代表小虾米可行走区域。
- 黑色代表不可行走区域。
- 需要避开前台、墙体、桌子、酒坛、大型道具。

说明：

这个素材主要给 coder 参考，实际碰撞可用坐标配置实现。遮罩必须和大厅背景严格对齐。

### 3. 碰撞参考图

路径：

`images/background/tavern-collision-guide-v1.png`

规格：

- 尺寸：1920 x 1080。
- 在背景图上用半透明色块标注前台、桌子、墙体、NPC 推荐座位、可行走通道。
- 仅供开发参考，不进入正式游戏。

## 六、桌子与道具素材任务

### 1. 四张八仙桌

路径：

- `images/props/table-a.png`
- `images/props/table-b.png`
- `images/props/table-c.png`
- `images/props/table-d.png`

规格：

- 每张桌子透明 PNG。
- 约 360 x 260。
- 2.5D 斜视角，与背景透视一致。
- 每张桌子需有 2 到 4 个可坐视觉位置，但 V1 实际最多坐 2 人。

差异：

- A 桌：靠前台，桌上可有点菜单、算盘小纸条。
- B 桌：靠窗雅座，桌面更清爽，有茶杯。
- C 桌：热闹酒局，酒碗、花生、酒坛。
- D 桌：暗角桌，颜色略深，有阴影和剑痕。

### 2. 前台独立层

路径：

`images/props/counter.png`

规格：

- 透明 PNG。
- 约 520 x 460。
- 木质柜台、账本、算盘、酒坛、菜牌。
- 如果背景已包含完整前台，此素材可作为前景增强层。

### 3. 特殊事件道具

路径：

- `images/props/event-food-stack.png`
- `images/props/event-love-petals.png`
- `images/props/event-sword-shadow.png`
- `images/props/event-poison-cocktail.png`
- `images/props/event-bgm-wave.png`

用途：

- `event-food-stack.png`：郭靖 + 黄蓉、洪七公 + 黄蓉事件。
- `event-love-petals.png`：杨过 + 小龙女事件。
- `event-sword-shadow.png`：张无忌 + 周芷若事件。
- `event-poison-cocktail.png`：令狐冲 + 蓝凤凰、乔峰 + 阿紫事件。
- `event-bgm-wave.png`：乔峰事件或乔峰同桌特效。

要求：

- 透明 PNG。
- 可以叠加在桌面上。
- 不遮挡 NPC。
- 视觉上能一眼表达事件主题。

## 七、小虾米素材任务

### 1. 主角设定

小虾米是玩家在酒馆中的化身，形象应朴素、亲和、带一点初入江湖的少年感。

关键词：

- Q 版小侠客。
- 普通布衣。
- 小木剑或短包袱。
- 颜色与 NPC 区分。
- 不抢主角 NPC 的戏。

### 2. 输出素材

路径：

- `images/player/xiaoxiami-idle-down.png`
- `images/player/xiaoxiami-idle-up.png`
- `images/player/xiaoxiami-idle-left.png`
- `images/player/xiaoxiami-idle-right.png`
- `images/player/xiaoxiami-walk-down.png`
- `images/player/xiaoxiami-walk-up.png`
- `images/player/xiaoxiami-walk-left.png`
- `images/player/xiaoxiami-walk-right.png`

规格：

- 透明 PNG。
- 单张建议 160 x 220。
- 如果 walk 文件使用帧图，建议横向 4 帧，单帧 160 x 220，总图 640 x 220。
- 脚底中心要适合作为碰撞点。

## 八、NPC 素材任务

### 1. 统一规格

每个 NPC 输出两类素材：

- `sprite.png`：场景内坐姿或桌边姿态小人，透明 PNG。
- `avatar.png`：对话窗口头像或半身像，透明 PNG 或方形 PNG。

规格：

- `sprite.png`：建议 220 x 260，透明背景。
- `avatar.png`：建议 512 x 512，适合裁成圆角头像。
- 所有 NPC 坐姿方向应能自然面向桌子或玩家。
- 每个 NPC 必须有一个强识别道具。

### 2. 男性 NPC

#### 郭靖 guojing

路径：

- `images/npcs/guojing/sprite.png`
- `images/npcs/guojing/avatar.png`

要求：

- 塞外皮裘。
- 憨厚表情。
- 手边有朴素酒碗。
- 气质老实、慢半拍。

#### 乔峰 qiaofeng

要求：

- 大酒碗。
- 披风。
- 豪迈坐姿。
- 可带音浪符号装饰。

#### 杨过 yangguo

要求：

- 黑色重剑必须明显。
- 忧郁眼神。
- 单臂或披风处理。
- 坐姿偏孤独。

#### 张无忌 zhangwuji

要求：

- 温和少年气。
- 头顶问号或纠结符号。
- 双手略慌张。
- 适合修罗场事件。

#### 周伯通 zhoubotong

要求：

- 老顽童感。
- 可倒立、盘腿或玩闹坐姿。
- 表情夸张。
- 道具可用玩具或小球。

#### 韦小宝 weixiaobao

要求：

- 花衣、机灵表情。
- 骰盅和银票。
- 油滑但可爱。

#### 洪七公 hongqigong

要求：

- 破衣、打狗棒。
- 手拿烧鸡。
- 傲娇吃货表情。

#### 令狐冲 linghuchong

要求：

- 酒壶。
- 歪坐或懒散姿态。
- 浪子感。
- 微醺表情。

### 3. 女性 NPC

#### 黄蓉 huangrong

要求：

- 小粉花围裙或厨娘元素。
- 玉竹算盘。
- 机灵表情。
- 可兼具掌柜和主厨气质。

#### 小龙女 xiaolongnv

要求：

- 白衣。
- 清冷、少言。
- 可带绳子元素。
- 表情淡定。

#### 赵敏 zhaomin

要求：

- 华丽男装。
- 折扇。
- 贵气和掌控感。
- 像要买下酒馆的大东家。

#### 周芷若 zhouzhiruo

要求：

- 倚天剑必须明显。
- 温柔表面，眼神有压迫感。
- 可带暗色阴影。

#### 王语嫣 wangyuyan

要求：

- 秘籍和书卷。
- 文雅、认真。
- 人形百科感。

#### 郭襄 guoxiang

要求：

- 元气少女。
- 小青驴或应援旗元素。
- 追星迷妹气质。

#### 阿紫 azi

要求：

- 彩色毒药瓶，做成现代饮料感。
- 坏笑。
- 小恶魔气质。

#### 蓝凤凰 lanfenghuang

要求：

- 银饰、五毒酒。
- Q 版小蛇必须可爱。
- 泼辣御姐感。

## 九、UI 素材任务

### 1. 对话窗口

路径：

- `images/ui/dialog-panel.png`
- `images/ui/dialog-tail.png`

要求：

- 木牌 + 宣纸质感。
- 横屏浮动窗口使用。
- 面板应可九宫格拉伸，边缘不要太复杂。
- 不能过度遮挡场景。

### 2. 按钮

路径：

- `images/ui/button-normal.png`
- `images/ui/button-pressed.png`

要求：

- 用于快捷话题、发送、重刷。
- 木质或宣纸风格。
- 文字由前端渲染，不要画死文字。

### 3. 事件标识与名字牌

路径：

- `images/ui/event-badge.png`
- `images/ui/nameplate.png`

要求：

- 事件标识用于桌边小标签。
- 名字牌用于 NPC 靠近或悬停显示。
- 不要带固定文字。

### 4. 虚拟摇杆

路径：

- `images/ui/joystick-base.png`
- `images/ui/joystick-knob.png`

要求：

- 移动端控制小虾米。
- 透明 PNG。
- 放在左下角时不能过度抢画面。

## 十、交付标准

### 1. 必须交付

- 1 张完整横屏酒馆背景。
- 1 张可行走区域遮罩。
- 1 张碰撞参考图。
- 4 张独立八仙桌。
- 1 套前台增强素材。
- 5 个特殊事件道具素材。
- 小虾米 4 方向待机 + 4 方向走路素材。
- 16 位 NPC 的 `sprite.png` 和 `avatar.png`。
- 对话窗口、按钮、事件标识、名字牌、虚拟摇杆 UI 素材。

### 2. 命名要求

- 文件名必须使用英文小写和短横线。
- NPC 文件夹必须使用本任务书规定的 id。
- 不要使用空格和中文文件名。
- 不要把多个 NPC 合成在一张图里，除非是额外预览图。

### 3. 质量检查

- 所有透明 PNG 边缘干净，没有白边。
- 场景和角色透视一致。
- NPC 缩小到游戏尺寸后仍可识别。
- 小虾米不会和 NPC 混淆。
- UI 素材没有固定文字，方便前端动态渲染。
- 所有素材路径与任务书一致。
- coder 可以不改资源路径，直接从 `images/` 加载素材。
- coder 可以根据碰撞参考图配置小虾米的移动边界。

## 十一、优先级

### P0：开发必须依赖

- `background/tavern-hall-v1.png`
- `background/tavern-walkable-mask-v1.png`
- `background/tavern-collision-guide-v1.png`
- `props/table-a.png` 到 `props/table-d.png`
- `player/xiaoxiami-*`
- 16 个 NPC 的 `sprite.png`
- `ui/dialog-panel.png`
- `ui/joystick-base.png`
- `ui/joystick-knob.png`

### P1：演示观感增强

- 16 个 NPC 的 `avatar.png`
- 事件道具素材。
- 按钮、名字牌、事件标识。
- 前台增强素材。

### P2：后续可补

- 更多动画帧。
- 角色表情差分。
- 特殊事件专属 NPC 姿势。
- 背景日夜变体。
