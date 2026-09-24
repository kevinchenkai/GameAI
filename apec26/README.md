# 深圳，见面吧 · APEC 2026 城市旅行指南 V4

面向来深国际旅客的中英双语静态 H5 Demo，延续既有视觉与交互。

- 线上：https://g.ismayday.mobi/apec26/
- 英文：https://g.ismayday.mobi/apec26/?lang=en
- 原生 HTML / CSS / JavaScript；无后端、外部字体或 JavaScript 运行时 CDN；实景相册依赖来源站图片 CDN。

## 第四版功能

| 模块 | 实现 |
|---|---|
| 深圳旅游 | 五档时长各 12 条，共 60 条编辑路线；每条至少 5 张有来源的景点照片；双列卡片、逐日攻略、分享与复制；移除旅行笔记与卡片 AI 标签 |
| 深圳美食 | 本地风味与 Tripadvisor 各 52 条，允许跨榜重合（91 个不同门店来源）；每店 5 张独立照片、一句话特色与有来源的用户短评；移除餐厅搜索及菜系筛选 |
| 深圳手信 | 50 个具体地方品类 × 4 个规格咨询选项，共 200 条；类别、产地、搜索、多维排序及每页 24 条分页；联系购买 |
| 私人地陪 | 保留 10 个虚构演示档案（6 女 / 4 男）及需求单 |

相册手机端完整显示照片，可左右滑动、点击放大，并查看来源。新增 9 张 Image Gen 手信品类图；联系二维码与链接保持原配置。

V4 数据与来源见 [CONTENT_SOURCES_V4.md](CONTENT_SOURCES_V4.md)，验证见 [QA_V4.md](QA_V4.md)，图片提示词与资产映射见 [IMAGE_PROMPTS_V4.json](IMAGE_PROMPTS_V4.json)。

## 数据边界

- 本地风味是有来源的编辑选店，不是投票排名。两榜餐厅均附真实用户短评来源，英文/中文翻译明确标注；检索记录见 CONTENT_SOURCES_V3.md。V4 展示来源相册中的门店／菜品照片，含来源链接。
- Tripadvisor 为有可查来源的收录店精选，按距离重排，不伪造平台名次、实时评分或热度。
- POI 坐标为 **WGS84 片区近似点**，用 Haversine 算法算直线距离；不是道路里程或实测门店入口。导航使用店名搜索，避免把近似点当精确入口。
- 浏览器位置仅存在页面内存，不上传、不写入存储；拒绝/超时/不支持定位时保留手动起点。手动选区会使未完成的定位请求失效。
- 手信参考京东类目与中国文化主题。排序分数为编辑判断，不是实际报价、平台销量或外国游客购买统计。200 条为选购咨询规格，不是已确认的在售 SKU。
- 地陪姓名、头像、语言和服务介绍是**虚构演示**。Travel China 仅为文化主题参考，不是人物来源、资质证明或官方合作方。无真实预约与支付。
- 路线为编辑规划，不是 APEC 官方行程。日期、预约与交通管制请查实时官方公告。

## 文件

- `v4.js` / `v4.css`：实景相册、店铺详情、200 条选礼目录。
- `gifts-v4.js` / `scripts/build-gifts-v4.py`：手信数据与生成脚本。
- `restaurants-v4.js` / `media-v4.js` / `scenes-v4.js`：入榜门店、照片与来源。

- `index.html`：入口；V2 基础脚本后载入 contacts-v3.js、routes-v3.js、restaurants-v3.js 与 v3.js。
- `v3.js` / `v3.css`：第三版卡片、分享、购买联系、图片放大及响应式覆盖。
- `routes-v3.js` / `restaurants-v3.js`：双语路线及可追溯的餐厅评论。
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

仅同步 `/www/wwwroot/g.ismayday.mobi/apec26/`。部署 allowlist 包括入口、CSS、各版 JS 和 assets；先同步资源，最后发布入口。不修改 Nginx、不写其他项目目录、不删除站点根文件。资源修改时更新 HTML 查询版本；图片使用新文件名避免 30 天缓存。

Git 保留用户 author / committer，附 `Co-authored-by: Codex <codex@openai.com>`。用户已授权本版提交并推送：GitHub `main` 和 Ezone `master`。
