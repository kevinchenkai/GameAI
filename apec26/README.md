# 深圳，见面吧 · APEC 2026 城市旅行指南 V3

面向来深国际旅客的中英双语静态 H5 Demo，延续既有视觉与交互。

- 线上：https://g.ismayday.mobi/apec26/
- 英文：https://g.ismayday.mobi/apec26/?lang=en
- 原生 HTML / CSS / JavaScript；无后端、外部字体或运行时 CDN。

## 第三版功能

| 模块 | 实现 |
|---|---|
| 深圳旅游 | 五档时长各 12 条，共 60 条路线；手机双列、逐日攻略、地图、WhatsApp / Telegram 分享、复制链接与全文 |
| 深圳美食 | 本地风味 53 家、Tripadvisor 55 家；每家包含可追溯的真实用户短评、作者及原文链接；距离、菜系、搜索、分页 |
| 深圳手信 | 8 种商品图文卡片；保留分类、多维度选礼；联系购买、复制咨询内容、两平台二维码和联系链接 |
| 私人地陪 | 10 个虚构演示档案（6 女 / 4 男），保留筛选与需求单 |

手机图片完整显示，点击可查看大图。22 张新增 Image Gen 场景 / 菜品 / 商品示意图，二维码使用用户原始图片。`contacts-v3.js` 集中维护两平台链接；按二维码实际内容识别平台，非附件顺序。

## 数据边界

- 本地风味是有来源的编辑选店，不是投票排名。108 家餐厅均附真实用户短评来源，英文/中文翻译明确标注；检索记录见 CONTENT_SOURCES_V3.md。菜品图片为 AI 菜系示意，不是实拍门店菜品。
- Tripadvisor 为有可查来源的收录店精选，按距离重排，不伪造平台名次、实时评分或热度。
- POI 坐标为 **WGS84 片区近似点**，用 Haversine 算法算直线距离；不是道路里程或实测门店入口。导航使用店名搜索，避免把近似点当精确入口。
- 浏览器位置仅存在页面内存，不上传、不写入存储；拒绝/超时/不支持定位时保留手动起点。手动选区会使未完成的定位请求失效。
- 手信参考京东类目与中国文化主题。预算和 1–5 分均为编辑判断，不是实际报价、平台销量或外国游客购买统计。规则在页面可展开查看。
- 地陪姓名、头像、语言和服务介绍是**虚构演示**。Travel China 仅为文化主题参考，不是人物来源、资质证明或官方合作方。无真实预约与支付。
- 路线为编辑规划，不是 APEC 官方行程。日期、预约与交通管制请查实时官方公告。

## 文件

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

仅同步 `/www/wwwroot/g.ismayday.mobi/apec26/`。部署 allowlist 包括入口、CSS、七个 JS 和 assets；先同步资源，最后发布入口。不修改 Nginx、不写其他项目目录、不删除站点根文件。资源修改时更新 HTML 查询版本；图片使用新文件名避免 30 天缓存。

Git 保留用户 author / committer，附 `Co-authored-by: Codex <codex@openai.com>`。用户已授权本版提交并推送：GitHub `main` 和 Ezone `master`。
