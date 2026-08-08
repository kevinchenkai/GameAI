# assets/ —— 美术素材投放目录

> **这个目录是 Codex 的。** Claude 只读，不生成也不修改任何图片像素。
>
> 🔴 **出图工单在 [`../orders/`](../orders/README.md)** —— 那里是**可执行的当前版本**：
> 逐张 prompt、自检表、卡点顺序。开工前先看那份索引。
>
> [`../docs/美术素材工单 V1.1（Codex image-2）.md`](../docs/) 是**设计说明**（为什么这么定），
> 与 orders/ 冲突时**以 orders/ 为准**。

## 怎么投放

按下面的路径把 PNG / JPG 丢进对应子目录即可，**文件名必须一字不差**——
代码侧的 [`web/src/config/assets.ts`](../web/src/config/assets.ts) 已按这些名字写好了。

```
assets/
├── pieces/          piece-*.png, overlay-*.png, special-rainbow.png
├── pet/
│   ├── pet-wangcai-master.png      ← 第 0 批，★ 不进游戏，只作角色基准
│   ├── wangcai/                    ← Puppet 分层
│   │   ├── body.png  tail.png  ears.png
│   │   ├── eyes-open.png  eyes-blink.png
│   │   └── preview-composite.png   ← ★ 验收用拼合预览，不进游戏
│   └── pet-wangcai-*.png           ← 整图状态
├── obstacles/       obstacle-*.png
├── ui/              ui-*.png
├── garden/          garden-*.png / .jpg, level-bg.jpg
├── fx/              fx-*.png（第 5 批）
└── audio/           （另行安排）
```

## Stage 0 清单（30 张，实际入游戏 29 张）

| 批次 | 内容 | 张数 |
|---|---|---|
| **第 0 批** | `pet-wangcai-master.png` ★ **卡点一** | 1 |
| **第 1 批** | 6 个棋子 ★ **卡点二** | 6 |
| 第 2 批 | Puppet 5 层 + happy + hint | 7 |
| 第 3 批 | 3 叠加层 + 2 冰块 + 5 UI + 2 背景 + 4 院门 | 16 |
| **小计** | | **30** |

`1 + 6 + 7 + 16 = 30`，其中 `pet-wangcai-master.png` 不进游戏 → **入游戏 29 张**。

> `preview-composite.png` 是第 2 批的**验收附件**（用来核对 5 层能拼回
> Master 的样子），不计入上表，也不进游戏。

**两个卡点不过，不要继续。** 这两处返工的代价，远小于画完 30 张才发现风格不对。

## 命名与格式纪律

- 全小写，连字符分隔。**不用中文、不用空格、不用下划线**
- 一律 PNG；`garden-bg-spring` 与 `level-bg` 无透明需求，用 **JPG 质量 85**
- 状态 / 阶段用数字后缀：`-0` `-1` `-2`
- ★ **开发期直接用规范文件名，不要主动加 `-v2`**。线上更新时的版本号由
  `config/assets.ts` 一处管理——你自己改名会让两套名字对不上

## 为什么这里空着代码也能跑

`web/vite.config.ts` 把 `/assets/*` 映射到本目录。文件缺失时该路径返回 404，
Phaser 会用占位纹理——**不会崩**。所以美术与代码可以完全并行推进。
