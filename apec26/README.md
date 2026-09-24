# 深圳，见面吧 · APEC 2026 城市旅行指南 V2

面向来深国际旅客的中英双语静态 H5 Demo，延续 V1 视觉与交互。

- 线上：https://g.ismayday.mobi/apec26/
- 英文：https://g.ismayday.mobi/apec26/?lang=en
- 原生 HTML / CSS / JavaScript；无后端、外部字体或运行时 CDN。

## 第二版功能

| 模块 | 实现 |
|---|---|
| 深圳旅游 | 半日、1 / 2 / 3 / 7 日五档图文笔记，逐日时间安排、交通提醒、编辑预算、地图、攻略复制、路线带入地陪需求 |
| 深圳美食 | 4 家本地文旅推荐、3 家 Tripadvisor 收录餐厅；四个预设出发点、浏览器定位、Haversine 近似距离排序、门店地图和来源链接 |
| 深圳手信 | 8 种选礼方向；食品 / 茶礼 / 茶具 / 服饰 / 文创分类，送礼适配 / 便携 / 文化三榜；预算与收礼人筛选、空状态、京东搜索 |
| 私人地陪 | 10 个虚构档案（6 女 / 4 男），独立 Image Gen 成年人头像，按性别 / 特色 / 城市筛选；选择风格后生成可编辑、可复制需求单 |

WhatsApp / Telegram 联系区按用户要求留白。每条攻略后保留两个空白框，未伪造二维码或联系方式。后续接入入口位于 `v2.js` 的 `contactBlank()`。

## 数据边界

- 本地美食来自深圳文旅 **2023 年**粤菜路线，并非本地人真实投票。当前门店经营情况未逐一确认。
- Tripadvisor 为有可查来源的收录店精选，按距离重排，不伪造平台名次、实时评分或热度。
- POI 坐标为 **WGS84 片区近似点**，用 Haversine 算法算直线距离；不是道路里程或实测门店入口。导航使用店名搜索，避免把近似点当精确入口。
- 浏览器位置仅存在页面内存，不上传、不写入存储；拒绝/超时/不支持定位时保留手动起点。手动选区会使未完成的定位请求失效。
- 手信参考京东类目与中国文化主题。预算和 1–5 分均为编辑判断，不是实际报价、平台销量或外国游客购买统计。规则在页面可展开查看。
- 地陪姓名、头像、语言和服务介绍是**虚构演示**。Travel China 仅为文化主题参考，不是人物来源、资质证明或官方合作方。无真实预约与支付。
- 路线为编辑规划，不是 APEC 官方行程。日期、预约与交通管制请查实时官方公告。

## 文件

- `index.html`：入口，按顺序载入 `app.js` → `data-v2.js` → `v2.js`。
- `app.js`：V1 双语骨架、标签导航、来源对话框与需求表单。
- `data-v2.js`：双语路线、POI、选礼、地陪档案与来源。
- `v2.js`：V2 模块渲染、筛选、排序、定位及需求交接。
- `style.css`：响应式样式；后半段为 V2 模块。
- `assets/guide-01-v2.webp` 至 `guide-10-v2.webp`：十张独立生成头像，640×640。
- [IMAGE_PROMPTS.md](IMAGE_PROMPTS.md)：内置 Image Gen 最终提示词与图片映射。
- [QA_V2.md](QA_V2.md)：验证范围和限制。

只有语言偏好存入 localStorage。表单草稿在切换语言/模块时保留，刷新后清空。筛选状态不跨刷新保存。

## 本地预览

在 GameAI 根目录执行：

```bash
python3 -m http.server 8626 --bind 127.0.0.1
```

打开 http://127.0.0.1:8626/apec26/ 。`#travel` / `#food` / `#gifts` / `#guide` 可直达模块。

## 发布

```bash
./apec26/deploy.sh          # 核对 dry-run
./apec26/deploy.sh --apply  # 正式发布
```

仅同步 `/www/wwwroot/g.ismayday.mobi/apec26/`。部署 allowlist 包括入口、CSS、三个 JS 和 assets；先同步资源，最后发布入口。不修改 Nginx、不写其他项目目录、不删除站点根文件。资源修改时更新 HTML 查询版本；图片使用新文件名避免 30 天缓存。

Git 保留用户 author / committer，附 `Co-authored-by: Codex <codex@openai.com>`。用户已授权本版提交并推送：GitHub `main` 和 Ezone `master`。
