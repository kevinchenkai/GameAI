# MiniMax-H3 作品展示页

线上地址：**https://g.ismayday.mobi/h3/**

开源版 MiniMax-H3 视频生成模型的复现作品集。每个案例展示成片、完整 prompt 原文、
以及逐条判定结论 —— **包括没做到的部分**。

---

## 1. 这个页面的定位

这不是一个"精选作品集"，而是**复现记录的展示层**。因此有两条硬规矩：

1. **prompt 必须是实际跑通的原文，一字不改。**
   页面上的 prompt 由构建脚本从 `prompts/*.txt` 原样读入，不手打、不润色、不翻译。
   每条都标 sha256 前 12 位，与复现仓库的记录一一对应。
2. **结论如实写，失败项不隐藏。**
   `部分成功` 的案例必须在说明里写清**具体是哪一项没达成**。
   例如 C-004 写的是"身份未迁移 + 尾段乱码字幕 + 语音不可辨识"，不是笼统的"效果一般"。

> 数据来源仓库：`/Users/kk/Work/chenkai_airepo/Juscent/`
> （`h3-oss-REPRODUCTION-LOG.md` 是逐案例记录，`h3-oss-FINDINGS.md` 是踩坑记录）

---

## 2. 目录结构

```
h3/
├── README.md          ← 本文件
├── build.py           ← 读 prompts/*.txt → 生成 cases.json（含 sha256、字符数）
├── build_html.py      ← 读 cases.json → 生成 index.html
├── cases.json         ← 中间产物，**不要手改**，改了会被 build.py 覆盖
├── index.html         ← 最终页面（单文件，无外部依赖、无 CDN）
├── deploy.sh          ← 部署脚本（带边界断言）
├── prompts/           ← ★ 唯一的 prompt 真源，11 个 .txt
├── posters/           ← 视频封面图，由 ffmpeg 从成片第 1 秒抽帧生成
└── videos/            ← 成片 mp4（**不入 git**，见 §6）
```

**改内容只改两个地方**：`prompts/*.txt`（prompt 原文）和 `build.py` 里的 `CASES` 表（元信息与结论）。
`index.html` 是产物，**不要直接编辑** —— 下次构建会被覆盖。

---

## 3. 页面结构

| 区块 | 内容 |
|---|---|
| Hero | 标题 + 统计（案例数 / 复现成功 / 部分成功 / NaN 数） |
| 关于 MiniMax-H3 | 模型简介 + 四张特性卡 + H3-Context-IR 说明 |
| 官方基准案例 | H3-001 ~ H3-003，来自官方可复现脚本 |
| 社区案例复现 | C-001 ~ C-008 |

每个案例卡包含：案例号徽章、标题、结论徽章、元信息（模式/分辨率/帧数/时长）、
视频播放器、一段说明、可折叠的 prompt 原文（带复制按钮）。

### 主题

**默认深色**，右上角按钮可切换深/浅色，选择存在 `localStorage['h3-theme']`。

- 深色是 `:root` 的默认值；浅色只在 `html[data-theme="light"]` 时生效。
- **不跟随系统** —— 系统是浅色的用户打开也是深色，除非手动切。
- `<head>` 里有一段**同步执行**的脚本先设好 `data-theme` 再首次绘制，
  避免深色用户看到白屏闪一下。🔴 **这段脚本必须留在 `<style>` 附近的 head 内，不能挪到 body 末尾。**

---

## 4. 新增 / 修改一个案例

### 4.1 新增案例

```bash
cd /Users/kk/Work/GameAI/h3

# ① 放 prompt 原文（从复现仓库拷，不要手打）
cp /Users/kk/Work/chenkai_airepo/Juscent/assets/prompts/C-009-xxx.txt prompts/

# ② 放成片，文件名必须是 <案例号>.mp4
cp /Users/kk/Work/chenkai_airepo/Juscent/output/C-009-seed0_00001_.mp4 videos/C-009.mp4

# ③ 生成封面（第 1 秒抽帧，宽 640）
ffmpeg -v error -y -ss 1.0 -i videos/C-009.mp4 -frames:v 1 \
       -vf "scale=640:-2" -q:v 4 posters/C-009.jpg
```

④ 在 `build.py` 的 `CASES` 列表里加一行（**顺序即页面顺序**）：

```python
("C-009", "案例标题", "C-009-xxx.txt", "Ref2VA",
 "1344×768", 192, "8.000s", "复现成功", "ok",
 "一句话说明：命中了什么、用什么数据支撑。部分成功的话写清哪项没达成。"),
```

字段依次是：
`案例号, 标题, prompt文件名, 模式, 分辨率, 帧数, 时长, 结论文字, 结论级别, 说明`

- **结论级别**只有两个值：`ok`（绿色徽章）/ `warn`（黄色徽章）
- **竖屏自动识别**：分辨率以 `768×` 开头即判为竖屏，播放器会限宽居中。
  这是 `build.py` 里的 `"vertical": res.startswith("768×")` —— 注意是**全角 ×**，
  与 `CASES` 表里写的必须一致。

⑤ 重新构建并部署（见 §5）。

### 4.2 只改文字说明 / 结论

改 `build.py` 的 `CASES` 表 → 重新构建 → 部署。

### 4.3 修改 prompt

**通常不该改。** prompt 是"实际跑通的原文"，改了就与成片对不上了。
只有在**重新跑过**并确认成片对应新 prompt 时才改，同时更新成片与封面。

---

## 5. 构建与部署

```bash
cd /Users/kk/Work/GameAI/h3

# 本地预览（先构建）
python3 build.py && python3 build_html.py
python3 -m http.server 8777      # 然后开 http://127.0.0.1:8777/

# 部署：先 dry-run 看影响范围
./deploy.sh

# 确认无误后实际执行
DRY_RUN=0 ./deploy.sh
```

`deploy.sh` 会自动重新构建，所以部署前不必手动跑 build。

### 部署脚本做的检查

| 阶段 | 检查 |
|---|---|
| 部署前 | 目标目录必须是 `$REMOTE_ROOT/h3`，等于站点根或指向别的项目一律中止 |
| 构建后 | 页面引用的每个 `src`/`poster` 资源在本地都存在 |
| 构建后 | **页面里嵌的 prompt 与 `prompts/*.txt` 逐字节一致**（防止贴出被改过的 prompt） |
| 同步后 | `index.html` 本地与远端 md5 一致 |
| 同步后 | 页面返回 200；抽查一条视频可访问（支持 Range 请求，进度条才能拖） |

### 🔴 部署红线

服务器上 `/www/wwwroot/g.ismayday.mobi/` 是**多个项目共用的站点根**，
同级还有非本仓库的 `mimo/` 和 `mystock/`。

- 本项目**唯一可写目录**是 `h3/`
- `deploy.sh` 带 `rsync --delete`，**绝不能**指向站点根，否则会删掉其它所有项目
- 脚本里有两道断言拦这件事，**不要删**

详见仓库根 `CLAUDE.md` §1.1。

---

## 6. 关于 videos/ 不入 git

`videos/*.mp4` 共约 21 MB，**不提交到 git**（`.gitignore` 已排除）。

原因：二进制大文件进 git 会让仓库体积不可逆地膨胀，而成片的真源在复现仓库
`/Users/kk/Work/chenkai_airepo/Juscent/output/`，那里也有完整的 sha256 记录。

**后果**：新克隆的仓库跑 `build_html.py` 能生成页面，但**本地预览没有视频**。
需要先从复现仓库拷贝：

```bash
cd /Users/kk/Work/GameAI/h3
SRC=/Users/kk/Work/chenkai_airepo/Juscent/output
for f in H3-001 H3-002 H3-003 C-001 C-002 C-003 C-004 C-005 C-006 C-007 C-008; do
  cp "$SRC/${f}-seed0_00001_.mp4" "videos/${f}.mp4"
done
```

`posters/*.jpg` 体积小（共约 316 KB），**入 git**，所以克隆后页面至少有封面可看。

> ⚠️ 服务器上的 `videos/` 是已经部署上去的，`deploy.sh` 的 `--delete` 只作用于 `h3/` 内部。
> 如果本地 `videos/` 是空的就执行部署，**会把服务器上的视频删掉**。
> 部署前先确认 `ls videos/` 有 11 个 mp4。

---

## 7. 当前案例一览

| 案例 | 标题 | 模式 | 帧数 | 结论 |
|---|---|---|---|---|
| H3-001 | 太空舰长 Space Captain | T2VA | 243 | ✅ 复现成功 |
| H3-002 | 拉面变焦 Ramen Focus Pull | I2VA | 192 | ✅ 复现成功 |
| H3-003 | 羊羔与人声 Lamb + Voice | Ref2VA | 124 | ✅ 复现成功 |
| C-001 | 咖啡漩涡 → 沙漠 | FL2VA | 243 | ✅ 复现成功 |
| C-002 | 希区柯克变焦 | Ref2VA | 124 | ⚠️ 部分成功（身份未迁移） |
| C-003 | 武侠竹林夜戏 | T2VA | 192 | ✅ 复现成功 |
| C-004 | 竖屏吸血鬼短剧 | Ref2VA | 362 | ⚠️ 部分成功（身份未迁移 / 乱码字幕 / 语音不可辨识） |
| C-005 | 仙侠分镜控制 | Ref2VA | 192 | ⚠️ 部分成功（身份未迁移） |
| C-006 | 第一人称射击 | Ref2VA | 192 | ✅ 复现成功 |
| C-007 | 双圆望远镜遮罩 | Ref2VA | 243 | ✅ 复现成功 |
| C-008 | 六素材节奏迁移 | Ref2VA | 192 | ⚠️ 部分成功（节奏未迁移） |

全部 seed=0，未挑选、未重跑择优。**0 条出现 NaN 或黑帧。**

> 📌 三条"参考图绑身份"的案例（C-002 / C-004 / C-005）**全部失败**。
> 这是目前数据里方向最一致的一个结论，但都是单 seed，
> 复现仓库正在跑 seed1 复核，结论确定后再考虑要不要写进页面。

---

## 8. 已知限制

- **无人脸识别**：身份是否迁移由人工并排比对参考图与成片判定，页面只呈现结论。
- **音频不可自动判**：音色/曲风是否接近参考需要人耳，页面里标为"不可验"的项不计入通过率。
- **视频未压缩**：按原生分辨率直出，21 MB 全量。若以后案例变多需要考虑转码或懒加载分页
  （目前 `preload="none"` + 封面图已保证首屏不下载视频）。
