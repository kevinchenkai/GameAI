# 第四阶段优化方案：互动音效 + 背景音乐

> 状态：**已完成**（① AudioManager + 挂钩已实装 → ② Gemini 3 段 BGM / Codex 9 个 CC0 SFX 已交付 → ③ 已 import、全链路 headless 回归通过）。
> 关联：BGM 提示词 [`../prompts/audio/S4_BGM_PROMPTS.md`](../prompts/audio/S4_BGM_PROMPTS.md)、SFX 清单 [`../prompts/audio/S4_SFX_BRIEF.md`](../prompts/audio/S4_SFX_BRIEF.md)、协作边界 [`../AGENTS.md`](../AGENTS.md) §2。

---

## 1. 需求

给游戏加上**互动音效（SFX）**与**背景音乐（BGM）**，让选择→对局→事件→胜利全链路有声，且 Web 导出可播。

## 2. 现状

- `AudioManager`（autoload）是 V0.1 故意预留的**空壳单例**：`play_sfx` / `play_bgm` / `stop_bgm` 三个空方法，**零调用点**（CLAUDE.md §6）。S4 把它填实并在各处挂触发点。
- 无任何音频资源、无 `assets/audio/` 目录——干净起步。

## 3. 架构（数据驱动 + 信号解耦，延续项目铁律）

- **资源格式统一 `.ogg`**（HTML5 友好、循环无缝）：BGM 流式循环、SFX 内存播放。
- **`data/audio.json`**：逻辑音效 id → `{ path, volume_db, bus }`，BGM 段 → `{ path, volume_db, loop }`。**代码不写死文件名/音量**。
- **`balance.json` 新增音量键**：`audio: { bgm_volume_db, sfx_volume_db, muted }`（无 UI，纯配置；符合「数值入 balance」规范）。
- **`AudioManager` 实装**：
  - `_bgm_player: AudioStreamPlayer`（循环 + 淡入淡出切段）。
  - SFX 播放器池（3–4 个 `AudioStreamPlayer`，轮转，防同时多音互相打断）。
  - 启动时读 `audio.json` + `balance.audio`；**缺文件静默降级**（`push_warning` 不崩，逻辑照跑）。
- **挂钩全走现有信号 / 数据，逻辑零侵入**（见 §4）。

## 4. 挂钩点表（全部为已有信号 / outcome 字段）

| 逻辑音效 id | 触发点 | 说明 |
|---|---|---|
| `bgm_select` | `CharacterSelect._ready()` | 选择界面 BGM |
| `bgm_game` | `GameScene._ready()` | 对局 BGM（取经主题循环） |
| `bgm_result` | `ResultScene._ready()` | 结算/胜利 BGM |
| `sfx_dice` | `DiceController.rolled` 滚动动画 | 掷骰滚动 + 落定 |
| `sfx_step` | `CharacterPiece.stepped_on`（**节流**） | 每格脚步，节流避免连发炸耳 |
| `sfx_reward` | `outcome.negative==false` 且 effect ∈ move_forward / gain_status / clear_negative / clear_then_forward / re_roll | 正向「叮」 |
| `sfx_negative` | `outcome.negative==true`（move_backward / stay / random_negative / dice_gate_stay…） | 负向「噔」 |
| `sfx_warp` | effect ∈ warp_to / swap_front / swap_random / reorder_all | 筋斗云「咻」/ 瞬移 |
| `sfx_shield` | `SkillManager.try_negate_negative(...).negated==true` 或 gain_status(shield) | 护盾「铛」 |
| `sfx_knockback` | `GameManager` 击退结算（RESOLVE_COLLISION 实际后退时） | 撞击 |
| `sfx_win` | `GameManager.game_over` | 取经成功号角（一次性） |
| `sfx_click` | 按钮 `pressed`（开始 / 选角 / 重开） | UI 点击 |

> 共 **3 段 BGM + ~9 个 SFX**。映射表由编码侧在 `audio.json` 维护；新增声音优先复用已有 id，只换映射。

## 5. 逻辑影响评估

**逻辑零改动。** 全部声音由信号 / `outcome` 驱动，不改任何规则、移动、判胜代码。`EventManager` 仍只算原始效果；声音是 `GameManager` / 各场景**消费信号时的副作用**，不进 Manager 内部判断（符合 CLAUDE.md §6 技能解耦同理）。缺资源时静默降级，不阻塞对局。

## 6. 执行步骤

| 步 | 负责 | 产出 |
|---|---|---|
| S4-1 | **Claude Code** | 实装 `AudioManager.gd` + 新建 `data/audio.json` + `balance.json` 加 `audio` 键 + 全挂钩点接好（缺资源静默降级，**框架先跑通**） |
| S4-2a | **你 + Gemini Pro** | 按 [`S4_BGM_PROMPTS.md`](../prompts/audio/S4_BGM_PROMPTS.md) 生成 3 段 BGM `.ogg` → `assets/audio/bgm/` |
| S4-2b | **Codex** | 按 [`S4_SFX_BRIEF.md`](../prompts/audio/S4_SFX_BRIEF.md) 从 CC0 库检索下载 ~9 个 SFX，转 `.ogg` → `assets/audio/sfx/` |
| S4-3 | **Claude Code** | 资源落位后 import、调音量平衡、实机全链路验证、Web 导出可播确认 |

> S4-1 与 S4-2 可并行：框架先接好（哪怕没声音也不卡），你和 Codex 并行产音，互不阻塞——延续 S1/S3 协同节奏。

## 7. 目录约定（拥有权见 AGENTS.md §2）

```
assets/audio/
  bgm/   bgm_select.ogg   bgm_game.ogg   bgm_result.ogg      ← 你 + Gemini
  sfx/   sfx_dice.ogg sfx_step.ogg sfx_reward.ogg            ← Codex
         sfx_negative.ogg sfx_warp.ogg sfx_shield.ogg
         sfx_knockback.ogg sfx_win.ogg sfx_click.ogg
data/audio.json          ← Claude Code（id→路径/音量映射）
balance.json (audio 键)  ← Claude Code
scripts/AudioManager.gd  ← Claude Code
```

## 8. 风险

- Web 导出音频自动播放策略：浏览器需用户首次交互后才放音——选择界面有「开始」按钮点击作为首次交互，BGM 在点击后启动即可规避。
- 音量平衡需 S4-3 实机听调（BGM 压低、SFX 突出）；数值在 `balance.audio` 可改，不动代码。
- 资源缺失：静默降级已覆盖，单独缺某个音不影响其余。
