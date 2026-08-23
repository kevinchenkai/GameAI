# BUGFIX：手机端字体与图片模糊（DPR 缩放）

| 项 | 内容 |
|---|---|
| 报告人 | Kevin（iPhone 实测试玩） |
| 报告日期 | 2026-08-23 |
| 现象 | 「字体很模糊，图片也不清晰」 |
| 严重度 | **高** —— 影响全部移动端用户，且是上线后第一印象 |
| 影响范围 | 所有 DPR > 1 的设备（几乎全部手机） |
| 状态 | **已修复并上线** |

---

## 1. 现象

线上 https://g.ismayday.mobi/stack/ 在 iPhone 上：

- 文字笔画发虚，边缘有明显毛边
- 卡片图案不够锐利

桌面浏览器上**看不出问题**——这是它逃过 M4~M6 全部验收的原因。

---

## 2. 根因

Phaser 默认（含 `Scale.RESIZE` 模式）把 canvas 的**像素缓冲**设成 **CSS 尺寸**：

```
iPhone DPR=3：CSS 375×812  →  缓冲 375×812  →  浏览器拉伸 3 倍显示
```

等于用 1/3 分辨率画完再放大。

**为什么"文字比图片更明显"**：卡片是圆润插画、色块平缓，糊一点不易察觉；
**文字笔画是高对比的黑白边缘，一拉伸立刻发虚**。用户的直觉描述精准指向了根因。

### 这是第二次踩同一个坑

`garden/` 项目上线后收到过**一模一样**的用户反馈，其 `main.ts` 至今留着注释：

> 「用户实测反馈的『字体很模糊』就是这个」

StackPop 从零搭建时没有沿用 garden 的方案，于是重蹈覆辙。
**教训见 §7。**

---

## 3. 修复方案

沿用 garden 已验证的方案，保持两个项目一致以便互相参照。

### 3.1 缓冲区按 DPR 放大（`web/src/main.ts`）

```ts
const MAX_RENDER_SCALE = 2;
function renderScale(): number {
  const dpr = window.devicePixelRatio ?? 1;
  return Math.max(1, Math.min(MAX_RENDER_SCALE, dpr));
}

scale: {
  mode: Phaser.Scale.NONE,          // 不能用 RESIZE，它会覆盖这套设置
  zoom: 1 / renderScale(),          // CSS 显示尺寸保持不变
  width:  viewportSize().width  * renderScale(),   // 缓冲按物理像素
  height: viewportSize().height * renderScale(),
}
```

**为什么封顶 2x**：3x 屏意味着 **9 倍填充率**，老机器会掉帧。
2x 已足够让文字锐利，再往上肉眼收益很小，代价却是平方增长。

**转屏处理**：`setZoom` 与 `resize` 必须**同时**更新。
只改尺寸的话，转屏后 canvas 会按物理像素撑满屏幕（画面大一倍）。
iOS 转屏后视口尺寸要等一帧才准，故 `orientationchange` 延迟 100ms。

### 3.2 新增换算层（`web/src/game/ui/uiScale.ts`）

代价：**游戏内 1 单位 = 1 物理像素**，不再等于 1 CSS 像素。
直接写 `fontSize: '30px'` 在 DPR=2 上只有**视觉 15px**——字反而更小。

```ts
uiScale(scene)          // 从 canvas 实测倍率，而非重读 devicePixelRatio
px(scene, designPx)     // 设计尺寸 → 物理像素
fontPx(scene, designPx) // → "NNpx"
```

两个关键细节（均来自 garden 的实战教训）：

- **从 canvas 实测**（`canvas.width / canvas.clientWidth`），不重新读 `devicePixelRatio`。
  main.ts 对倍率做了封顶，两处各算各的会不一致。
- **`scene.game` 也要可选链**。场景在 `create()` 前或销毁后 `game` 可能是
  undefined；取不到时**返回 1 是正确的降级**（按设计像素画，尺寸偏小但画面完整），
  抛异常则整个画面都没了。

### 3.3 布局先按 CSS 求解再放大（`GameLayout.scaleLayout`）

**不能**直接把物理像素喂给 `calculateGameLayout`：

```
错误：calculateGameLayout(750, 1624, ...)
      → 算法以为屏幕变宽一倍 → 排出「更大的棋盘」而非「更清晰的棋盘」
      → tileSize 撞上 tileSizeMax=92 上限 → 与设计稿脱节

正确：scaleLayout(calculateGameLayout(375, 812, ...), 2)
      → 比例与设计稿完全一致，只是分辨率翻倍
```

`overlapRatio` 是**比值**，放大时保持不变。

`calculateGameLayout` 本身与其 11 项单测**一行未改**。

### 3.4 全部场景改用 px() / fontPx()

`GameScene` / `HomeScene` / `LevelSelectScene` / `SettingsScene` /
`HowToPlayScene` / **`PreloadScene`** 的字号、间距、圆角、描边、图标尺寸。

> ⚠️ `PreloadScene` 是**复扫时才发现的遗漏**——加载页的「正在准备花园…」
> 和进度条是用户看到的**第一屏**，最初两轮改动都漏了它。
> 见 §7「漏乘不报错」。

---

## 4. 验证

### 4.1 浏览器实测（DPR=2 环境）

```
buffer 750×1624   CSS 375×812   ratio 2.000   ✅
```

修复前 buffer 会是 375×812 并被拉伸。

### 4.2 布局未被破坏（关键）

| 量 | 修复前 | 修复后 | |
|---|---|---|---|
| 6 列 `tileSize` | 52.17 | 52.17 | 逐位相同 ✅ |
| 6 列 `rowStep` | 44.34 | 44.34 | 逐位相同 ✅ |
| `contentWidth`(CSS) | 343 | 343 | = 375−16×2 ✅ |
| `overlapRatio` | 0.850 | 0.850 | 比值不变 ✅ |

11 项布局单测未改动即全过。

### 4.3 新增回归测试（`tests/uiScale.test.ts`，9 项）

- 倍率换算、降级为 1（canvas 缺失 / clientWidth=0 / NaN）
- **DPR=2 时字号必须翻倍**（`fontPx(46) === '92px'`）
- DPR=1 桌面维持设计值，不被放大
- **★ 先按 CSS 求解 ≠ 直接喂物理像素**（证明 §3.3 的必要性）

**反向验证**：把 `uiScale` 写死成 1（即回到模糊版本），**4 项立刻变红**；
还原后全绿。确认测的不是空气。

### 4.4 门禁

`lint` / **94 项测试** / `build` 全部通过。

---

## 5. 附带修复：WebP 缓存响应头

nginx 的 30 天图片缓存规则未包含 `webp`，22 张资源（173 KB）每次访问都重新下载。
**不影响清晰度**，属独立的性能问题。经授权已在服务器直接修改。

```nginx
# /www/server/panel/vhost/nginx/g.ismayday.mobi.conf:117
-  location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$
+  location ~ .*\.(gif|jpg|jpeg|png|bmp|svg|ico|webp)$
   {
       expires      30d;
```

顺带补上 `svg` / `ico`（同样是静态图，之前也漏了）。

操作纪律：

1. 先备份 `g.ismayday.mobi.conf.bak-webp-20260823`
2. 改前确认该规则在文件中**只出现 1 处**、`server_name` 只含 `g.ismayday.mobi`
3. `sudo nginx -t` 通过后才 `nginx -s reload`（graceful，不断连接，比 restart 安全）
4. 改后逐个验证 9 个站点均 200 —— **含 mimo / mystock 两个非本仓库项目**

验证：

```
cache-control: max-age=2592000   ✅
expires: Tue, 22 Sep 2026 ...     ✅
```

> ⚠️ 该配置由 `g.ismayday.mobi` 下**所有项目共享**。
> 本次改动是**追加扩展名**（纯增量），不影响既有行为；
> 若日后需要改动其它规则，仍须先确认影响范围。

---

## 6. 部署

按 `stack/deploy.sh`（默认 `DRY_RUN=1`）。

> 静态图 `expires 30d`：**改图必须换文件名**，否则用户 30 天内看到旧图。
> 本次只改 JS，不涉及图片替换。

---

## 7. 教训

### 7.1 同一个坑栽两次

garden 已经解决过、注释里写明了用户原话，StackPop 仍从零搭建并重蹈覆辙。

**改进**：已写入长期记忆（`phaser-dpr-blurry-text-on-mobile`）。
新起 Phaser 项目**直接照抄这套**，不要等用户反馈。

### 7.2 桌面验收挡不住移动端问题

M4~M6 的全部验收（含我做的多轮）都在桌面/无头环境完成，
而该 bug **在 DPR=1 上不存在**。83~94 项单测全绿、构建通过、线上 200 —— 全部无效。

**改进**：移动端专属问题必须有**可量化的检查**，而不是靠肉眼看截图：

```js
canvas.width / canvas.clientWidth === min(devicePixelRatio, 2)
```

这条已固化为单测。

### 7.3 漏乘 px() 不会报错

换算层的固有风险：**漏掉一处不会报错、不会崩溃**，
只是那个元素小一半——很难一眼看出来。`PreloadScene` 就是这么漏的。

**改进**：用全库正则复扫，而非逐文件肉眼检查：

```bash
grep -rnE "fontSize: *['\`][0-9]" src/game/scenes/
```

应无输出。建议后续加入 lint 规则或 CI 检查。

### 7.4 用户的直觉描述往往精准指向根因

「字体很模糊，图片也不清晰」——**先说字体、后说图片**，
这个顺序本身就是线索：文字比图片先暴露拉伸，因为笔画是高对比边缘。

---

## 8. 相关文件

| 文件 | 改动 |
|---|---|
| `web/src/main.ts` | Scale.NONE + zoom + 转屏同步 |
| `web/src/game/ui/uiScale.ts` | **新增** 换算层 |
| `web/src/game/layout/GameLayout.ts` | **新增** `scaleLayout()` |
| `web/src/game/scenes/*.ts` | 6 个场景改用 px() / fontPx() |
| `web/tests/uiScale.test.ts` | **新增** 9 项回归测试 |
