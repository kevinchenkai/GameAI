# V4 内容与来源

整理日期：2026-09-24。

## 路线
60 条路线保持五档时长各 12 条。正文是双语编辑整理，没有复制或冒充小红书笔记。公开检索没有取得可核验、可读取的小红书原帖，访问需要登录。小红书内容要求本版未实现；使用有来源的实景相册改善展示。

`scenes-v4.js` 保存景点原始资料页、原图链接与展示链接；每条路线按实际途经景点取图，至少 5 张。主要来源为携程、Trip.com 景点相册；OCT-LOFT 补充 Sohu 与 Baba Goes China 的对应实景照片，分别保存单图来源。未宣称本网站拥有来源图片版权。相册外链依赖来源站的可用性；失败时提示查看原始相册，不替换成不相关图片。

## 餐厅
`restaurants-v4.js` 各榜 52 条、合计 104 个榜单条目，对应 91 个不同原门店条目；13 家可同时进入本地风味与 Tripadvisor 榜。不是平台官方排名或本地人投票榜。`CONTENT_SELECTION_V4.json` 记录照片不足的排除项。

`media-v4.js` 每条至少 5 个不同照片链接，来自对应携程／Tripadvisor 店铺相册。店铺特色是依据菜系、片区和公开资料的编辑概括；用户短评、作者及来源沿用 V3 经过检索的记录，见 CONTENT_SOURCES_V3.md。照片包含店内环境与菜品，不保证每张都是菜品或由消费者拍摄。展示链接调整图片尺寸以降低移动端流量，保留原始链接便于追溯。

## 手信
用户将数量调整为 200。数据为 50 个具体产地品类的 4 种规格咨询选项，不是 200 个已核验的在售 SKU。价格和库存未编造，联系后确认。产地是选购主题描述，不是对某个商品的认证。排序分数是编辑判断。9 张新图使用内置 Image Gen，图为品类示意；全部提示词和路径见 IMAGE_PROMPTS_V4.json。

文化与分类参考：
- 中国茶分类：https://www.dpm.org.cn/subject_tea/single/detail/260827.html
- 洞庭山碧螺春：https://nyncj.suzhou.gov.cn/nlj/ywdt/201906/7f51f04d99824ee898c11192521d514e.shtml
- 盛泽丝绸：https://dfzb.suzhou.gov.cn/dfzb/szdq/201901/721d45f8f9af474a8d09eec869a2c7fd.shtml
- 宋锦：https://dfzb.suzhou.gov.cn/dfzb/szdq/201901/504ebd4362c0479d91e5768f167a7aaa.shtml
- 香云纱标准条目：https://std.samr.gov.cn/db/search/stdDBDetailed?id=D7B6988FD960AABEE05397BE0A0A1B36
- 地方陶瓷文化：https://ccianet.cn/home/content/detail?cate_id=46&id=2129

完整规格和双语描述维护在 scripts/build-gifts-v4.py，运行后生成 gifts-v4.js。
