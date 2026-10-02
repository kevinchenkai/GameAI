# V5 内容与来源

整理日期：2026-10-01。V5 延续 V4 的 60 条路线和两个各 52 条的餐厅目录。

## 手信：8 个品类 × 20 个真实 SKU

公开京东列表的图片、SKU、商品标题、选中款式、可见款式和标题规格保存在 `research/v5/products-public.json`。`scripts/build-gifts-v5.py` 生成 160 条商品信息，不再使用 V4 的模拟规格咨询目录。

| 品类 | 数量 | 公开列表示例 |
|---|---:|---|
| 茶叶 | 20 | [茶礼](https://www.jd.com/chanpin/2598168.html) |
| 冰箱贴 | 20 | [文创冰箱贴](https://www.jd.com/chanpin/453761.html) |
| 丝巾 | 20 | [丝巾](https://www.jd.com/chanpin/2172974.html) |
| 折扇 | 20 | [折扇](https://www.jd.com/chanpin/451539.html) |
| 瓷器 | 20 | [瓷器](https://www.jd.com/chanpin/90600.html) |
| 熊猫玩偶 | 20 | [熊猫礼物](https://www.jd.com/chanpin/1164281.html) |
| 香薰 | 20 | [中式香气](https://www.jd.com/hprm/1620ae4015b348208c02.html) |
| 印章 | 20 | [印章石料](https://www.jd.com/chanpin/2258501.html) |

按品类过滤不相关商品后取前 20 个不同 SKU；不声称平台销量前 20、实时价格、库存或外国人购买排名。图片保留原始商品图片内容。产地、材质、净含量与尺寸只使用公开标题中的明确文字，未标明的内容不补造。标题标注不等于独立鉴定，购买联系时确认。

完整 `item.jd.com` 详情页在普通浏览器访问时返回频控页面。**本版未取得完整详情正文和参数表**。商品详情展示已取得的公开列表信息、原始商品标题与链接，并说明缺失参数需联系确认。没有绕过登录、验证码或访问限制。

## 餐厅评论

携程公开手机点评页和 Trip.com 公开餐厅页补充了点评资料。例：[新发茶餐厅点评](https://m.ctrip.com/webapp/you/commentWeb/commentList?businessId=5169366&businessType=12)、[香宫点评](https://m.ctrip.com/webapp/you/commentWeb/commentList?businessId=118823419&businessType=12)、[瑞吉秀餐厅点评](https://m.ctrip.com/webapp/you/commentWeb/commentList?businessId=8638944&businessType=12)。以名称、分店、酒店和地址核对门店，不混用同品牌其他分店。

- 104 条榜单记录对应 91 个不同门店来源；两个榜单允许同一门店重复收录。
- 合并得到 486 个有来源的评论记录 ID，跨榜同一门店复用同一批点评。
- 70 条榜单记录有至少 2 条已收录点评，列表最多显示 2 条。
- 24 条榜单记录有至少 10 条已收录点评，详情显示全部已取得记录。
- **其余门店目前不足 10 条；34 条榜单记录仅取得 1 条。** 不复制评论凑数，不生成虚构作者，也不把旅行帖子计作用户点评。
- 评论展示短摘要／译文，保留公开作者、原有评分、日期和原文链接。中立主题摘要不把星级自动解释为赞扬。保留真实负面意见。
- 公开字段与摘要保存在 `research/v5/reviews-*.json`；完整评论正文仅留在本地被 Git 忽略的 `.review-cache`，不发布或提交。脚本可根据摘要资料重建 `reviews-v5.js`。
- Tripadvisor 榜单的补充评论可能来自携程／Trip.com；每条链接指向实际评论来源，不伪装为 Tripadvisor 用户。

V4 的每店 5 张照片与一句话特色继续使用，来源见 `CONTENT_SOURCES_V4.md`。

## 地陪照片与档案

使用内置 Image Gen 独立生成 10 张成年生活场景照片（6 女 / 4 男），保存为新的 `guide-01-v5.webp` 至 `guide-10-v5.webp`。提示词及资产路径见 `IMAGE_PROMPTS_V5.json`。学生、白领及文化爱好者介绍均为虚构演示，页面保留该说明，不作为真实服务人员或资质证明；个人卡片不显示地点。

## 旅游与联系

路线地名在卡片中只出现一次。时长／步行类型、预算和 hashtag 同行展示；两操作按钮并排。预算删除指定说明文案。分享链接、复制、路线转地陪需求单及用户提供的二维码与联系配置沿用既有版本。没有将编辑路线冒充小红书转载。图片上的 AI 来源标签不显示。
