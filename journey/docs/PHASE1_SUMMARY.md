# 《Journey Ludo》一期项目总结

> 西游记取经主题 · Q 版 2D 单线 72 格飞行棋 · Godot 4.7
> 一期范围：从空项目到「可玩 + 可线上展示」的核心闭环 Demo
> 状态：✅ 已完成并上线 — **https://g.ismayday.mobi/journey/**
> 文档日期：2026-06-21

---

## 1. 一句话成果

玩家选 1 个角色、其余 3 个 AI，掷骰沿 72 格取经路线竞速，途中触发事件/技能/护盾博弈，先到第 72 格者胜。一期交付了**完整可玩的一局闭环**，并完成 **Web 发布、中文显示修复、加载提速、仓库瘦身**，可直接在浏览器展示。

---

## 2. 一期里程碑回顾

| 阶段 | 内容 | 状态 |
|---|---|---|
| **M0–M1** | Godot 项目骨架、autoload 单例体系、数据驱动地图加载与校验 | ✅ |
| **M2** | 72 格棋盘数据化生成、可复现随机（GameRng） | ✅ |
| **M3** | 角色棋子 + 逐格移动动画 | ✅ |
| **M4** | 核心回合循环：掷骰→移动→事件→技能/护盾→胜负判定 | ✅ |
| **S1** | 棋盘与背景美术融合 + 全屏自适应 | ✅ |
| **S2** | 角色棋子放大、选择/结算页背景接入 | ✅ |
| **S3** | 螺旋棋盘接入 | ✅ |
| **S4** | 音频系统实装（3 BGM + 9 SFX，数据驱动播放） | ✅ |
| **S5** | 选择页 / 结算页 UI 对齐 | ✅ |
| **发布** | Web 一体化部署、中文乱码修复、加载优化、仓库瘦身 | ✅ |

---

## 3. 核心玩法实现

**行动顺序**：悟空 → 八戒 → 唐僧 → 沙僧 循环，玩家所选角色插到首发。

**回合流程**：掷骰 → 逐格移动 → 落地触发事件 → 技能/护盾结算 → 每次位置变更即时判胜（`index >= 72` 立即中止本回合）。

**关键规则（全部数据驱动，代码不写死数值）**：
- 事件二次触发抑制（事件引发的移动落地不再触发，`re_roll` 除外）
- 再掷一次：单回合最多 1 次
- 击退后退 3 格，起点格 / 已到终点者豁免
- 护盾仅抵消负面且直接作用于自己的效果，上限 2 层；中性事件不可抵消
- 状态优先级：免疫负面 > 护盾

**4 名角色**：孙悟空、猪八戒、唐僧、沙僧，各带技能（`data/characters.json` 配置）。

**音频系统（S4 已实装）**：数据驱动（`data/audio.json` 映射 id→路径/音量），`AudioManager` 单例负责 BGM 循环+淡入淡出切段、SFX 播放池、静音开关。共 **3 段 BGM + 9 个 SFX = 12 个 .ogg**：
- BGM：`bgm_select` / `bgm_game` / `bgm_result`（选择/对局/结算分场景循环）
- SFX：`sfx_dice`（掷骰）/ `sfx_step`（移动）/ `sfx_reward`（奖励）/ `sfx_negative`（负面）/ `sfx_warp`（传送）/ `sfx_shield`（护盾）/ `sfx_knockback`（击退）/ `sfx_win`（胜利）/ `sfx_click`（点击）

---

## 4. 架构与工程

**单例（autoload）解耦**：`GameRng` / `BoardManager` / `EventManager` / `SkillManager` / `TurnManager` / `AudioManager` / `GameManager`。

**关键设计准则（已落地）**：
1. **规则唯一来源**：逻辑以主方案 §3.4 规则裁决表 + §5.1 事件总表为准
2. **数据驱动**：地图/事件/角色/平衡数值全部入 `data/*.json`
3. **可复现随机**：全局单一 `GameRng`，读 `balance.json.debug_seed`，杜绝散落 `randi()`
4. **数据校验前置**：`BoardManager` 加载时校验每个 `event_id` 必须存在于 `events.json`，否则 `push_error` 中止，禁止静默失败
5. **技能解耦**：`EventManager` 只算原始效果，技能/护盾由 `SkillManager` 以 hook 介入

**规模**：20 个脚本（~1960 行 GDScript）、4 个场景、6 个数据文件（72 格棋盘 + 35 个事件 + 4 角色 + 平衡/音频配置）。

---

## 5. 目录结构

```
journey/
├── project.godot           # Godot 4.7, GL Compatibility, 全局主题
├── scenes/                 # Main / CharacterSelect / GameScene / ResultScene
├── scripts/                # 20 个 .gd（单例 + 场景控制 + UI 组件）
├── data/                   # board_72 / events / characters / balance / audio
├── assets/
│   ├── fonts/              # NotoSansSC 子集（中文显示）
│   ├── themes/             # default_theme.tres（全局默认字体）
│   ├── sprites/ backgrounds/
│   ├── audio/              # bgm/ (3) + sfx/ (9) .ogg
│   └── raw/                # Codex 出图中间件（已移出版本库，本地保留）
├── docs/                   # 主方案 / 任务手册 / 升级记录 / 本总结
├── deploy.sh               # Web 一体化部署脚本
└── export_presets.cfg      # Web 导出预设（gitignore）
```

---

## 6. Web 发布链路（deploy.sh）

一条命令完成 **导出 → 压缩 → 上传 → 验证**：

```
定位 Godot → 校验 Web 模板 → (可选)重建中文字体子集 → 刷新导入缓存
  → 导出 Web → pngquant 近无损压图 → gzip -9 预压 wasm/pck/js
  → rsync 增量同步到 journey/ 子目录 → chown www:www → curl 验证 200
```

**安全约束（严守）**：
- 仅写部署路径 `/www/wwwroot/g.ismayday.mobi/journey/`，`--delete` 只限该子目录，绝不波及同级站点
- 线程关闭导出（thread off）→ 无需 SharedArrayBuffer / COOP-COEP → **纯静态托管，零 nginx 主配置改动**
- nginx 仅通过宝塔扩展 include 增加 `gzip_static on`（独立 conf，不动主 vhost），改前已申请确认

**参数**：`--no-deploy`（只本地导出自检）/ `--skip-export`（复用已有产物直接部署）。

---

## 7. 关键问题与修复

| 问题 | 根因 | 修复 |
|---|---|---|
| **中文乱码（豆腐块）** | 引擎默认字体仅 Latin，Web 无系统回退，CJK 渲染成码点框 | 子集化 Noto Sans SC（fonttools 扫描实际用字）→ 设为全局默认主题 |
| **Web 加载慢** | wasm 38M、pck 大、未引用图入包 | 关线程减体积 + 剔除未引用图 + 背景 lossy 0.85 + gzip_static 预压 |
| **导出报"配置错误"** | PWA 启用但图标字段空 + vram 压缩 | 关 PWA、关 vram 纹理压缩 |
| **仓库臃肿** | raw 出图中间件 + .DS_Store 入库 | `raw/` 移出版本库（磁盘保留）+ 清 12 个 .DS_Store + 加 gitignore |

**加载体积**：首屏约 **60M → 20M（−67%）**；wasm 传输 38M → ~10M（gzip）；30 天缓存头。

---

## 8. 协作边界（严格遵守）

- **编码线（Claude Code）**：只负责 `*.gd` / `*.tscn` / `data/*.json` / `docs/` / 部署工程
- **美术线（Codex + imagegen）**：拥有 `assets/raw/**`、`prompts/imagegen/**`、`docs/ART_ASSET_LIST.md`；编码线**不生成/修改任何图片像素、不写美术提示词**（调整 `.import` 压缩参数不改源 PNG 像素，合规）
- 仓库根 `/Users/kk/Work/GameAI` 下与 soulmate / Tavern / DanRL 等同仓项目互不干涉

---

## 9. 验证状态（线上实测）

- ✅ HTTP 200，`content-encoding: gzip` 生效
- ✅ 中文文案正常显示（无豆腐块）
- ✅ 一局完整可玩，回合无卡死，胜负正常判定
- ✅ 服务器属主 www:www，`nginx -t` 通过并 reload，同级站点零影响
- ✅ 仓库瘦身后提交并推送（commit `4a0d877`）

---

## 10. 后续可选方向（非一期范围）

- 纯逻辑模拟脚本：固定种子跑 1000 局验证平衡，再调数值（主方案 §16.4）
- 音频资源调优（音量平衡、更多事件音效、混音）
- 移动端触控/适配打磨
- 更多事件/技能扩展（复用现有 `effect_type`，只换 id/文案）

---

*一期闭环完成。线上地址：https://g.ismayday.mobi/journey/*
