# 深圳，见面吧 · APEC 2026 城市旅行指南 V7

中英双语静态 H5；线上：https://g.ismayday.mobi/apec26/ ，英文：https://g.ismayday.mobi/apec26/?lang=en 。

| 模块 | 本版功能 |
|---|---|
| 旅游 | 保留 60 条路线、五档各 12 条、每条至少 5 张有来源的照片；卡片地名去重；时长、步行类型、预算和 hashtag 同行；分享和找地陪并排 |
| 美食 | 两榜各 52 条，91 个不同门店来源；每店 5 图直接横滑、特色简介；列表最多 2 条短评，详情展示全部已取得真实评论 |
| 手信 | 茶叶、冰箱贴、丝巾、折扇、瓷器、熊猫、香薰、印章，每类 20 个真实京东 SKU，共 160 条；详情、分类、搜索、分页与联系购买 |
| 地陪 | 10 张生活化成年演示照片，学生、白领及文化爱好者的双语介绍；个人卡片移除地点；保留需求单 |

图片采用完整显示与放大交互；图片上的 AI 来源标签移除。页面无后端，不提交订单、不收款；表单和定位信息留在浏览器内存，只有语言偏好存入 localStorage。

## 内容边界

餐厅评论有真实作者与来源，展示摘要／译文。现有 102 条榜单记录取得 2+ 条，65 条取得 10+ 条（独立门店为89/91与56/91）；其余按实际可取得数量展示。完整京东详情页受访问限制，商品资料只展示取得的图片、SKU、款式及标题规格，价格和库存联系确认。榜单不伪造销量或投票名次。POI 仍为片区近似坐标。地陪档案均为虚构演示。

[内容来源](CONTENT_SOURCES_V5.md) · [验证记录](QA_V5.md) · [内置 Image Gen 资产与提示词](IMAGE_PROMPTS_V5.json)。此前版本资料保存在 CONTENT_SOURCES_V3.md、CONTENT_SOURCES_V4.md、QA_V2.md 至 QA_V4.md。

## 文件与预览

`v5.js` / `v5.css` 覆盖既有静态模块；`gifts-v5.js`、`reviews-v5.js`、`guides-v5.js` 提供新版数据。公开资料保存在 `research/v5/`，生成与采集脚本保存在 `scripts/`。完整评论正文缓存不提交；研究资料与文档不部署。

在 GameAI 根目录执行 `python3 -m http.server 8626 --bind 127.0.0.1`，打开 http://127.0.0.1:8626/apec26/ 。四个模块可通过 `#travel`、`#food`、`#gifts`、`#guide` 直达。

## 发布

先运行 `./apec26/deploy.sh` 核对 dry-run，再运行 `./apec26/deploy.sh --apply`。仅同步 `/www/wwwroot/g.ismayday.mobi/apec26/` 的入口、CSS、JS 与 assets，资源先于入口。不修改 Nginx，不删除其他目录文件；新图片使用新文件名，本轮变更资源使用 `?v=7`，其余沿用 `?v=5`。

V6 已于 2026-10-02 经用户授权提交、推送和部署。用户已明确授权本轮 V7 的 Git 提交、双远端推送和部署。推送目标为 GitHub `main` 和 Ezone `main:master`。保留用户 Git author／committer，每次提交附 `Co-authored-by: Codex <codex@openai.com>`。

## 数据补齐审核

[新增数量与逐店缺口](research/v6/REPORT.md) · [商品小样核对](research/v6/product-verification.json) · [测试记录](research/v6/tests-v6.json)。评论共751个独立键，净增265；仍有45家独立门店不足10条，累计缺192条。商品小样6个同SKU列表匹配、2个当前未确认，未取得完整官方参数页。原文缓存不入Git。

复现：`python3 apec26/scripts/build-reviews-v5.py`、`python3 apec26/scripts/build-gifts-v5.py`。公开采集适配器只跟随正常页面/按钮；遇403/429/432停止该域名。Tripadvisor可读缓存由离线解析器提取，并人工逐条写短摘要；不将缓存称为实时分页。

## V7 评论与商品补全

[本轮报告与逐店缺口](research/v7/REPORT.md) · [160 个 SKU 核对](research/v7/product-verification.json) · [测试记录](research/v7/tests-v7.json)。相对已部署 22c25fc：评论净增74至825个去重键；35家门店详情不足10条，共缺157条；列表仍有2家各缺1条。97款同SKU公开列表匹配、63款本次所查页面未出现；92款整理201个商家显式字段，完整官方详情确认数仍为0。实际商品类型、文化地域、规格与来源分别展示，未知参数留空。

无网络复现：`python3 apec26/scripts/build-product-verification-v7.py`、`python3 apec26/scripts/build-gifts-v5.py`、`python3 apec26/scripts/build-reviews-v5.py`；验证：`python3 apec26/scripts/test-data-v7.py`。报告：`python3 apec26/scripts/report-data-v7.py`。原文及公开列表原始HTML只在忽略的缓存内，不提交、不部署。
