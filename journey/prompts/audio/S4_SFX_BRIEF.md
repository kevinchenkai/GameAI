# S4 任务清单：互动音效（SFX ×9）— Codex（CC0 音效库检索）

> 拥有方：**Codex**。第四阶段优化「互动音效 + 背景音」的 SFX 部分。
> 关联：方案 [`../../docs/UPGRADE_S4_AUDIO.md`](../../docs/UPGRADE_S4_AUDIO.md)、BGM 提示词（你 + Gemini）[`S4_BGM_PROMPTS.md`](./S4_BGM_PROMPTS.md)、风格基线 [`../imagegen/ART_ASSET_PROMPTS.md`](../imagegen/ART_ASSET_PROMPTS.md) §1（世界观一致）。
>
> **本次为音频检索任务（非图像生成）**：从 **CC0 / 公共领域**音效库检索、下载、转码，**不需自行合成**。

---

## 0. 一句话需求

为一款 Q 版《西游记》取经飞行棋准备 **9 个短促互动音效**，统一转 `.ogg`，按**给定文件名**落入 `assets/audio/sfx/`。

---

## 1. 授权与来源（硬约束）

- **只用 CC0 / Public Domain（或等价免署名商用）授权**的素材。**禁止**用 CC-BY 需署名 / 非商业 / 未知授权的资源。
- 推荐来源：
  - **Kenney** Audio packs（https://kenney.nl/assets ，全 CC0，UI/骰子/点击/通用游戏音效齐全，首选）。
  - **freesound.org** —— **仅筛选 License = "Creative Commons 0"**（搜索时勾选 CC0 过滤）。
  - **OpenGameArt.org** —— 仅 CC0 条目。
  - 其它明确标注 CC0 的游戏音效库。
- 在 §4 debug 清单里**逐条登记每个文件的来源 URL + 授权**，便于审核与合规留档。

---

## 2. 规格（每个 SFX 都遵守）

- **格式**：`.ogg`（Vorbis）。源文件若是 wav/mp3，转成 `.ogg`。
- **采样率**：44.1kHz；单声道或立体声均可（短音效单声道即可）。
- **时长**：短促，多为 0.1–1.0 秒（`sfx_win` 例外，可 1.5–2.5 秒）。
- **响度**：音效要清晰可辨、比 BGM 突出，但**不爆音不削波**（峰值留 ~-3dB headroom）。
- **风格**：明亮、卡通、Q 版、童趣；**不写实、不恐怖、不刺耳**。与中式国风世界观协调（偏木质 / 民乐质感者优先，但通用卡通音效也可）。
- **干净**：无明显底噪、无多余尾音、无版权语音。

---

## 3. 音效清单（9 个）

> 「文件名」必须**逐字一致**（编码侧已按此 id 在 `data/audio.json` 预留映射）。

| # | 文件名（`assets/audio/sfx/`） | 用途 | 期望音感 | CC0 搜索关键词 |
|---|---|---|---|---|
| 1 | `sfx_dice.ogg` | 掷骰子滚动+落定 | 骰子在桌面滚动后停下的「咔哒」 | dice roll, dice shake, roll dice |
| 2 | `sfx_step.ogg` | 棋子每走一格的脚步 | 轻、短、Q 弹的一下「哒/啵」（会被频繁连发，**务必短而轻**） | footstep light, hop, pop, blip, tap |
| 3 | `sfx_reward.ogg` | 正向事件（前进/获益/清除负面/再掷） | 明亮愉悦的「叮」上扬音、奖励感 | reward, coin, positive chime, power up, success ding |
| 4 | `sfx_negative.ogg` | 负面事件（后退/停留/随机负面） | 低沉、轻微挫败的「噔」下行音（卡通不吓人） | negative, fail soft, error soft, oops, downward |
| 5 | `sfx_warp.ogg` | 传送/交换/重排序（筋斗云/瞬移） | 「咻」的飞掠/魔法瞬移 whoosh | whoosh, teleport, magic swish, warp |
| 6 | `sfx_shield.ogg` | 护盾抵消/获得护盾（佛光格挡） | 清亮的「铛」金属格挡/护盾生效 | shield, block, magic ward, defend, bell ding |
| 7 | `sfx_knockback.ogg` | 击退碰撞（被撞后退） | 轻 Q 的「咚」撞击/弹开（卡通，不暴力） | bump, impact soft, thud cartoon, bonk |
| 8 | `sfx_win.ogg` | 胜利/取经成功（一次性） | 短促的庆祝号角/上扬胜利音（1.5–2.5s） | victory, win fanfare, success jingle, level complete |
| 9 | `sfx_click.ogg` | UI 按钮点击（开始/选角/重开） | 干净利落的 UI「嗒」点击 | ui click, button click, menu select, tap ui |

---

## 4. 交付物

| # | 文件 | 内容 |
|---|---|---|
| A | `assets/audio/sfx/*.ogg`（上表 9 个） | 检索下载、转码、按指定名命名 |
| B | `assets/raw/audio/S4_SFX/SOURCES.md`（来源登记） | 每个文件一行：文件名 / 来源 URL / 授权（须 CC0）/ 原始作者（如有） |

> 可另存原始下载件到 `assets/raw/audio/S4_SFX/` 便于复核（可选）。
> **不要触碰** `.gd` / `.tscn` / `.json` / `data/**`——音效映射由编码侧维护（见 AGENTS.md §2）。

---

## 5. 自检清单（交付前）

- [ ] 9 个文件名**逐字一致**、全部 `.ogg`、全在 `assets/audio/sfx/`
- [ ] 全部 **CC0 / 公共领域**授权，`SOURCES.md` 逐条登记来源 URL + 授权
- [ ] 短促、清晰、不爆音；`sfx_step` 足够短轻（会频繁连发）
- [ ] 风格明亮卡通、不刺耳、与 Q 版西游协调
- [ ] 采样率 44.1kHz，无明显底噪

## 6. 编码侧承诺（交付后由 Claude Code 完成）

- `data/audio.json` 已按这 9 个 id 预留映射，文件落位即生效。
- 在 §4 挂钩点接上（掷骰/脚步/事件正负/传送/护盾/击退/胜利/点击）。
- 音量在 `balance.json` 的 `audio.sfx_volume_db` 统一调节；`sfx_step` 做连发节流。
- 缺某个音：静默降级（该动作无声，其余照常）。
