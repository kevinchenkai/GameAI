# 深圳，见面吧 · APEC 2026 城市旅行指南 V5

中英双语静态 H5；线上：https://g.ismayday.mobi/apec26/ ，英文：https://g.ismayday.mobi/apec26/?lang=en 。

| 模块 | 本版功能 |
|---|---|
| 旅游 | 保留 60 条路线、五档各 12 条、每条至少 5 张有来源的照片；卡片地名去重；时长、步行类型、预算和 hashtag 同行；分享和找地陪并排 |
| 美食 | 两榜各 52 条，91 个不同门店来源；每店 5 图直接横滑、特色简介；列表最多 2 条短评，详情展示全部已取得真实评论 |
| 手信 | 茶叶、冰箱贴、丝巾、折扇、瓷器、熊猫、香薰、印章，每类 20 个真实京东 SKU，共 160 条；详情、分类、搜索、分页与联系购买 |
| 地陪 | 10 张生活化成年演示照片，学生、白领及文化爱好者的双语介绍；个人卡片移除地点；保留需求单 |

图片采用完整显示与放大交互；图片上的 AI 来源标签移除。页面无后端，不提交订单、不收款；表单和定位信息留在浏览器内存，只有语言偏好存入 localStorage。

## 内容边界

餐厅评论有真实作者与来源，展示摘要／译文。现有 70 条榜单记录取得 2+ 条，24 条取得 10+ 条；其余按实际可取得数量展示。完整京东详情页受访问限制，商品资料只展示取得的图片、SKU、款式及标题规格，价格和库存联系确认。榜单不伪造销量或投票名次。POI 仍为片区近似坐标。地陪档案均为虚构演示。

[内容来源](CONTENT_SOURCES_V5.md) · [验证记录](QA_V5.md) · [内置 Image Gen 资产与提示词](IMAGE_PROMPTS_V5.json)。此前版本资料保存在 CONTENT_SOURCES_V3.md、CONTENT_SOURCES_V4.md、QA_V2.md 至 QA_V4.md。

## 文件与预览

`v5.js` / `v5.css` 覆盖既有静态模块；`gifts-v5.js`、`reviews-v5.js`、`guides-v5.js` 提供新版数据。公开资料保存在 `research/v5/`，生成与采集脚本保存在 `scripts/`。完整评论正文缓存不提交；研究资料与文档不部署。

在 GameAI 根目录执行 `python3 -m http.server 8626 --bind 127.0.0.1`，打开 http://127.0.0.1:8626/apec26/ 。四个模块可通过 `#travel`、`#food`、`#gifts`、`#guide` 直达。

## 发布

先运行 `./apec26/deploy.sh` 核对 dry-run，再运行 `./apec26/deploy.sh --apply`。仅同步 `/www/wwwroot/g.ismayday.mobi/apec26/` 的入口、CSS、JS 与 assets，资源先于入口。不修改 Nginx，不删除其他目录文件；新图片使用新文件名，HTML 资源版本为 `?v=5`。

用户授权提交与推送：GitHub `main` 和 Ezone `main:master`。保留用户 Git author／committer，每次提交附 `Co-authored-by: Codex <codex@openai.com>`。
