# 提交给 Codex 的指令（**复制这里的内容**）

> 用法：下面每个 ⬛ 代码块**整块复制**给 Codex。
> **一次只发一条**，等交付并确认后再发下一条。

---

## 现在可以发的：**指令 1 与指令 2**（可并行）

| 指令 | 内容 | 前置 |
| --- | --- | --- |
| 🟢 **指令 1** | 旺财 Master（1 张）| 无 |
| 🟢 **指令 2** | 六个棋子（6 张）| 无 |
| 🔒 指令 3 | Puppet + 状态图（7 张）| 指令 1 已确认 |
| 🔒 指令 4 | 其余 Stage 0（16 张）| 指令 2 已确认 |

---

## 指令 1 —— 旺财 Master Reference（1 张）★ 卡点一

⬛

```
请执行 Garden Match 的第 0 批出图工单。

工单文件（请完整阅读后再动手）：
  garden/orders/codex-imagegen-order-batch0-wangcai-master.md

出图前必读的通用规范：
  garden/orders/LEGIBILITY-SPEC.md

要点：
1. 本批只出 1 张：pet-wangcai-master.png（1024×1024，透明 PNG）
2. 工单 §3 的 prompt 逐字使用，不要替换成你认为更好的描述
3. 出 3 个候选，保存到 garden/assets/pet/candidates/
   选定的一张放 garden/assets/pet/pet-wangcai-master.png
4. 交付前逐条过一遍工单 §4 的自检表
5. ★ 这是卡点一。交付后请停下等我确认「这就是旺财」，
   确认前不要画任何其它旺财素材（Puppet 分层、happy、hint 都不要）

最容易失败的一条是 §4.1 第 3 项「中华田园犬气质」——
模型对柴犬/柯基/金毛的先验很强。判断方法见工单。

若某条判据物理上做不到，或两条判据互相矛盾，请停下来报告，
不要二选一硬凑 —— 那是工单的问题，不是你的问题。
```

---

## 指令 2 —— 六个普通棋子（6 张）★ 卡点二

⬛

```
请执行 Garden Match 的第 1 批出图工单。

工单文件（请完整阅读后再动手）：
  garden/orders/codex-imagegen-order-batch1-pieces.md

出图前必读的通用规范：
  garden/orders/LEGIBILITY-SPEC.md

要点：
1. 本批出 6 张棋子（各 256×256，透明 PNG），文件名见工单
2. 工单 §3 的六段 prompt 逐字使用
3. 色值严格照抄，★ 不要"微调得更好看"——
   色板是重算过的（原色板有 4 对灰度冲突），一调就可能撞回冲突区
4. 每张出 2 个候选，保存到 garden/assets/pieces/candidates/
5. ★ 六张全部画完后，先做工单 §4.1 的 40px 灰度联合测试，
   再决定交付哪一组候选
6. ★ 这是卡点二。交付后请停下等我确认，确认前不要画第 3 批

本批有两条最容易漏：

· 高光阴影会吃掉明度差（工单 §0.3）
  全部 5 对相邻色的高光/阴影区间都是重叠的，
  所以高光与阴影各自不超过 30% 面积，主色要占大面积。
  这与"画得立体好看"的直觉相反，但立体感在本项目是次要目标。

· 橘子与苹果是最接近的一对（工单 §0.4）
  两个都偏圆，只靠明度差 60.7 拉开。
  橘子不能画亮、苹果不能画亮或偏橙。自检时重点看这一对。

40px 灰度联合测试是硬性的，不能因为"色值已经算过"就跳过 ——
算的是纯色块，实际图有高光阴影纹理，会把有效明度拉近。

若某一对怎么都分不清，请如实报告是哪一对并附 40px 灰度对比图。
那是最有价值的反馈：可能需要换造型或调色值，那是工单要改。
```

---

## 🔒 指令 3 —— Puppet 分层 + 状态图（7 张 + 1 验收件）

> **前置：指令 1 已确认。** 确认前不要发这条。

⬛

```
请执行 Garden Match 的第 2 批出图工单。

工单文件（请完整阅读后再动手）：
  garden/orders/codex-imagegen-order-batch2-wangcai-puppet.md

前置：pet-wangcai-master.png 已定稿并确认。

要点：
1. 本批出 Puppet 5 层 + preview-composite + happy + hint
2. ★ 全部基于 Master 编辑派生（图生图 / 局部编辑），
   不要从纯文本 prompt 重新生成 —— 那会产生耳朵/眼距/毛色/头型漂移，
   而漂移无法靠 prompt 一致性解决，这正是先做 Master 的全部理由
3. 每张出 2 个候选
4. 交付前逐条过工单 §2.5 与 §4 的自检表

三条最容易漏：

· body.png 必须含头部（Stage 0 不拆 head，这是有意的取舍）
· 各层单独看必须画完整 —— body 被 tail/ears 遮挡的部分也要画，
  因为这些层会旋转，那里是空的就会露白
· eyes-open 与 eyes-blink 必须同尺寸同位置，切换不能位移

关于旋转锚点：PNG 存不了 pivot 数据，所以你只需保证
「根部朝向合理的一侧」（tail 朝一侧、ears 朝上）并交付拼合预览图。
精确坐标由我在代码侧标定。★ 不需要你标注锚点或提供坐标。

本批只要 happy 与 hint 两个状态。
watching / thinking / excited / skill / encourage / victory 推迟到 V1 Full，
现在不要画。

若分层拼不回 Master 的样子，请如实报告并附 preview-composite.png。
若角色漂移了（不像同一只狗），不要交付 —— 漂移会一直留在游戏里。
```

---

## 🔒 指令 4 —— 补全 Stage 0（16 张）

> **前置：指令 2 已确认。** 确认前不要发这条。

⬛

```
请执行 Garden Match 的第 3 批出图工单。

工单文件（请完整阅读后再动手）：
  garden/orders/codex-imagegen-order-batch3-stage0-rest.md

前置：6 个棋子已通过 40px 灰度联合测试。

要点：
1. 本批出 16 张：3 叠加层 + 2 冰块 + 5 UI + 2 背景 + 4 院门
2. 各段 prompt 逐字使用，每张出 2 个候选
3. ★ 院门 4 张建议一次生成一组，或以 gate-0 为参考图编辑出后三张
4. 交付前逐条过各节的自检表

四条最容易漏：

· 叠加层与冰块必须半透明
  叠加层：不透明就退化成"18 张的效果 + 3 张的信息量"，反而更糟
  冰块：玩家要能看见冰下面是什么棋子，否则无法规划下一步 ——
       这是"挑战来自思考"这条核心承诺的硬要求
  ★ 请实际叠在 6 色棋子上各试一遍再判断，不要只看叠加层本身

· level-bg 画得太漂亮反而是失败的
  它的唯一职责是不抢棋盘。要 soft blurred / low contrast / desaturated。
  验收方法：叠上 6 个棋子看，第一眼看到的必须是棋子。
  不要担心它看起来平淡。

· 院门 4 张必须严格同视角同构图，只改内容与色调
  玩家看到的是「同一个地方变好了」，视角一变成长感就毁了。
  检查方法：4 张叠成半透明，门框轮廓应基本对齐。

· 按钮与底框上不要画任何文字或数字
  文字由代码渲染，要支持多字号与后续多语言。
  ui-panel-bg 还要九宫格可拉伸：中心必须平坦无装饰，四角装饰不超过 48px。

若叠加层/冰块做不到半透明，或院门 4 张视角对不齐，
请如实报告并附对比图 —— 不透明的版本和对不齐的版本都不要交付。
```

---

## 通用：投放与命名（可附在任一指令后）

⬛

```
■ 投放路径
garden/assets/
├── pieces/      piece-*.png, overlay-*.png
├── pet/         pet-wangcai-master.png, pet-wangcai-happy.png, pet-wangcai-hint.png
│   └── wangcai/ body.png tail.png ears.png eyes-open.png eyes-blink.png
│                preview-composite.png
├── obstacles/   obstacle-ice-1.png, obstacle-ice-2.png
├── ui/          ui-panel-bg.png ui-btn-primary.png ui-moves-badge.png
│                ui-objective-slot.png ui-btn-pause.png
└── garden/      garden-gate-0~3.png, level-bg.jpg, garden-bg-spring.jpg

■ 命名纪律
· 全小写，连字符分隔；不用中文、不用空格、不用下划线
· 状态/阶段用数字后缀：-0 -1 -2
· ★ 开发期直接用规范文件名，不要自己加 -v2
  线上更新的版本号由代码侧 Manifest 一处管理，自行改名会让两套名字对不上

■ 文件名必须一字不差
代码侧 web/src/config/assets.ts 已按这些名字写好，投放即自动接上。
缺图时该路径返回 404，游戏不会崩 —— 所以美术与代码可以完全并行。

■ 做不到怎么办
如实报告，不要凑数。报告一个失败比交付一张"看起来还行"的图有用得多。
若两条判据互相矛盾，停下来报告 —— 那是工单的问题。
```
