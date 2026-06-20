# Journey Ludo（西游记飞行棋）V0.1

以《西游记》取经路线为主题的 Q 版 2D 单线 72 格飞行棋（Godot 4.x）。玩家选 1 角色，其余 3 个 AI，先到第 72 格者胜。

## 文档导航

| 文档 | 作用 |
|---|---|
| [docs/JOURNEY_LUDO_V0_1_PLAN.md](docs/JOURNEY_LUDO_V0_1_PLAN.md) | 主方案（规则裁决 §3.4、事件总表 §5.1 为实现唯一准绳） |
| [docs/CLAUDE_TASKS.md](docs/CLAUDE_TASKS.md) | 编码任务手册（Task 1–8、autoload 规划、里程碑） |
| [CLAUDE.md](CLAUDE.md) | Claude Code 编码约束规范 |
| [AGENTS.md](AGENTS.md) | Claude Code（编码）与 Codex（美术）协作边界 |
| [prompts/imagegen/ART_ASSET_PROMPTS.md](prompts/imagegen/ART_ASSET_PROMPTS.md) | 美术生成手册 |
| [docs/ART_ASSET_LIST.md](docs/ART_ASSET_LIST.md) | 美术资产清单与状态 |

## 环境

- Godot **4.2+**（开发于 4.7 stable）
- 2D 项目，**Compatibility（GL Compatibility）** 渲染

## 运行

1. 用 Godot 4.x 打开本目录（选择 `project.godot`）。
2. 直接运行（F5），主场景为 `scenes/Main.tscn`。
3. 预期：控制台依次打印 GameRng 种子、GameManager 状态进入、Main/GameScene ready 日志；窗口显示标题占位文本。

命令行运行（无需打开编辑器）：

```bash
godot --path . scenes/Main.tscn
```

## 项目结构（当前 Task 1）

```text
journey/
├── project.godot          # 2D / Compatibility，autoload 注册
├── icon.svg
├── scenes/
│   ├── Main.tscn          # 入口场景
│   └── GameScene.tscn     # 主游戏场景（占位）
├── scripts/
│   ├── GameManager.gd     # 主状态机（§10.1）
│   ├── GameRng.gd         # 全局可复现随机数
│   ├── TurnManager.gd     # 占位（Task 4）
│   ├── BoardManager.gd    # 占位（Task 2）
│   ├── EventManager.gd    # 占位（Task 5）
│   ├── SkillManager.gd    # 占位（Task 6）
│   ├── AudioManager.gd    # 空接口占位
│   ├── Main.gd
│   └── GameScene.gd
├── data/
│   └── balance.json       # 平衡数值 + debug_seed（可复现随机）
└── assets/                # 美术素材（Codex 产出，已就绪）
```

## 可复现随机

全项目统一使用 `GameRng` 单例。固定随机序列以复现 bug：把 `data/balance.json` 的 `debug_seed` 设为整数（如 `12345`）；设为 `null` 则每次随机播种。

## 开发进度

- [x] **Task 1** 项目基础结构（本提交）
- [ ] Task 2 72 格棋盘
- [ ] Task 3 角色与移动
- [ ] Task 4 回合与骰子
- [ ] Task 5 事件系统
- [ ] Task 6 角色被动技能
- [ ] Task 7 结算界面
- [ ] Task 8 美术接入（素材已就绪，待场景接入）

## Web 导出说明

主方案要求 M0 即验证 Web（HTML5）导出可行。导出需在 Godot 编辑器安装对应 Export Templates 后，于 `Project > Export` 添加 Web 预设。命令行导出示例（模板就绪后）：

```bash
godot --headless --path . --export-release "Web" build/web/index.html
```

> 注：CI/headless 环境若未安装 Export Templates，导出会提示缺模板；本机验证以编辑器内导出为准。
