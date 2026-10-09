# APEC26 V7 数据补全审核

数据批次核对日期：2026-10-02。原始发布基线：22c25fc。目录归档日期：2026-10-09。本轮只修改 apec26；用户已明确授权新的 Git 提交、双远端推送与部署。

## 评论数量

- 去重评论键：751 → 825，净增 74；新增 87 个有来源署名键，替换 13 个旧 legacy 摘录键。没有移除平台原生评论 ID。
- 104 个榜单条目对应 91 家独立门店，13 个跨榜别名共享同源记录，数量不重复计。
- 列表 ≥2 条：102/104（89/91 独立门店），仍缺 2 条。详情 ≥10 条：51/104 → 65/104（46/91 → 56/91 独立门店）。
- 详情缺口：45 → 35 家独立门店，192 → 157 条。未用重复、错分店、酒店体验或编造记录补数。

评论只发布短双语摘要，保留作者、日期、已公开评分和原文链接。复合键明确标记来源＋作者＋发表日期，不当作平台原生 ID。缺失值留空；原文缓存被 Git 忽略。

## 采集与审核

- 本轮检查 13 个此前未在 V6 批次处理的 Tripadvisor 餐厅文档。页面有对应餐厅 ID、名称和地址；使用可读缓存，不称为实时浏览器分页。4 页标注缓存年龄 5–11 个月，9 页标注 last week，时间标签原样保存。未从平台总评论数推算可取得条数。
- 16 个携程移动页核对了 business ID、Trip POI、分店名及地址，普通主批次共取得 77 条记录，与已收录的平台 ID 重复，本轮没有新增。未出现可见折叠入口，未合成请求或绕过限制。
- 炳胜万象前海页面元数据写 1 条，本次主批次为空，正常页面复查仍未读到正文；保留此前 1 条。客语海岸城也只显示总量 2，主批次为空；保留此前 2 条。空批次不能据此解释为停业或平台零评论。
- 人工排除 16 条：5 条 JW 万豪住宿／另一行政酒廊，1 条 1881 价格问题，2 条香乐园附近酒吧，7 条 El Chino 国际自助／早餐，1 条 Prego 未确认归属的酒店自助。名单见 review-exclusions.json。
- [IHG 官方餐饮介绍](https://www.ihg.com/intercontinental/hotels/us/en/shenzhen/szxha/hoteldetail/dining)分别列出粤菜 El Chino 和国际自助 Mercado，因此没有把未确认的自助记录移入任何一家。
- 修复解析器：拆开同行的页面行标记、拒绝透明度报告等导航署名、严格模式要求用户投稿标记。替换旧摘录要求同来源、同作者，且旧摘录在原始正文中匹配，不仅凭作者去重。采集器保留已核实的部分结果，并区分身份匹配与空评论批次。

## 本轮餐厅来源

| 门店 | 原文 | 缓存年龄标签 | 接受条数 |
|---|---|---|---:|
| Alla Torre（海上世界） | [餐厅页面](https://www.tripadvisor.com/Restaurant_Review-g297415-d9989898-Reviews-Alla_Torre_seaworld-Shenzhen_Guangdong.html) | 5 months ago | 10 |
| Doors 土耳其餐厅 | [餐厅页面](https://www.tripadvisor.com/Restaurant_Review-g297415-d32991374-Reviews-Doors_Turkish_Restaurant-Shenzhen_Guangdong.html) | 6 months ago | 6 |
| 宝安 JW 万豪大堂酒廊 | [餐厅页面](https://www.tripadvisor.com/Restaurant_Review-g297415-d7701549-Reviews-The_Lounge_JW_Marriott_Hotel_Shenzhen_Bao_an-Shenzhen_Guangdong.html) | 11 months ago | 5 |
| Sugo 意大利餐厅 | [餐厅页面](https://www.tripadvisor.com/Restaurant_Review-g297415-d7050208-Reviews-Sugo-Shenzhen_Guangdong.html) | 6 months ago | 10 |
| 深圳君悦 1881 中餐厅 | [餐厅页面](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d4008332-Reviews-1881_Chinese_Restaurant_Grand_Hyatt_Shenzhen-Shenzhen_Guangdong.html) | last week | 9 |
| 富苑中餐厅 | [餐厅页面](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d6754166-Reviews-Fortune_Court_Chinese_Restaurant-Shenzhen_Guangdong.html) | last week | 4 |
| 深圳瑞吉闲逸廊及瑞吉吧 | [餐厅页面](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d4962484-Reviews-The_Drawing_Room_St_Regis_Bar-Shenzhen_Guangdong.html) | last week | 10 |
| 香乐园 | [餐厅页面](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d3457031-Reviews-Shang_Garden-Shenzhen_Guangdong.html) | last week | 8 |
| 南山威斯汀 Five Sen5es 中餐厅 | [餐厅页面](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d3512826-Reviews-Five_Sen5es_at_The_Westin_Shenzhen_Nanshan-Shenzhen_Guangdong.html) | last week | 7 |
| 华侨城洲际 El Chino 中餐厅 | [餐厅页面](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d3467079-Reviews-El_Chino-Shenzhen_Guangdong.html) | last week | 3 |
| Prego 意大利餐厅 | [餐厅页面](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d4422188-Reviews-Prego_Italian_Restaurant-Shenzhen_Guangdong.html) | last week | 9 |
| 探鱼（金光华） | [餐厅页面](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d8754601-Reviews-Tanju_Jin_guanghua-Shenzhen_Guangdong.html) | last week | 1 |
| 海底捞火锅（金光华） | [餐厅页面](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d12624178-Reviews-Hai_Di_Lao_Hot_Pot_Jinguanghua-Shenzhen_Guangdong.html) | last week | 5 |

## 逐店剩余缺口

| 门店 | 已收录 | 缺至10条 | 原因与来源 |
|---|---:|---:|---|
| 佳宁娜潮州菜（福田好日子店） | 4 | 6 | 本轮未取得可靠新增；同名好日子分店、3 楼地址已核对；页面总量显示 5 条，但当前筛选仅公开 4 条，无下一页。 [来源](https://www.tripadvisor.com.tw/Restaurant_Review-g297415-d10586362-Reviews-Jianingna_GuiBin_Lou_HaoRi_Zi-Shenzhen_Guangdong.html) |
| 丹桂轩（天安店） | 3 | 7 | 本轮同分店ID和地址匹配，公开主批次可读3条；页面元数据总量10，未见折叠／更多入口。 [来源](https://you.ctrip.com/food/shenzhen26/7381170-food.html) |
| 谭厨中山传家菜（红岭店） | 1 | 9 | 本轮未取得可靠新增；门店 ID/地址已核对；公开主列表只有 1 条，滚动后无新增。 [来源](https://you.ctrip.com/food/26/136215478.html) |
| 吴·现代潮菜（深圳店） | 4 | 6 | 本轮未取得可靠新增；保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [来源](https://you.ctrip.com/food/26/130408983.html) |
| 火玺（福田店） | 3 | 7 | 本轮未取得可靠新增；门店 ID/地址已核对；主列表 1 条，正常点击折叠点评入口取得 2 条，合计 3 条；无更多。 [来源](https://you.ctrip.com/food/shenzhen26/78089971-dianping.html) |
| 悦景酒家（福田店） | 6 | 4 | 本轮未取得可靠新增；保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [来源](https://you.ctrip.com/food/shenzhen26/90682459.html) |
| 米煮鲜·毋米粥（侨城一号店） | 5 | 5 | 本轮未取得可靠新增；保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [来源](https://you.ctrip.com/food/shenzhen26/134790102.html) |
| 譽八仙（万象天地店） | 8 | 2 | 本轮同分店ID和地址匹配，公开主批次可读7条；页面元数据总量11，未见折叠／更多入口。 [来源](https://tw.trip.com/restaurant/china/shenzhen/detail/sense-8-cantonese-cuisine-42122305/) |
| 蚝门九式（莲花店） | 3 | 7 | 本轮未取得可靠新增；保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [来源](https://gs.ctrip.com/html5/you/foods/fooddetail/26/130139313.html) |
| 客语（海岸城店） | 2 | 8 | 本轮同分店ID和地址匹配，公开主批次可读0条；页面元数据总量2，未见折叠／更多入口。主批次为空，保留历史已核验记录；总量不能当作已采集记录。 [来源](https://us.trip.com/restaurant/china/shenzhen/detail/hakka-yu-118848364/) |
| 陶陶居·庭院（宝安壹方城店） | 6 | 4 | 本轮未取得可靠新增；保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [来源](https://au.trip.com/restaurant/china/shenzhen/detail/restaurant-118847026/) |
| 小辣椒·湖南乡里菜（文锦花园店） | 6 | 4 | 本轮同分店ID和地址匹配，公开主批次可读5条；页面元数据总量5，未见折叠／更多入口。 [来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-122690649/) |
| 宇德隆记客家食府（宝安店） | 6 | 4 | 本轮同分店ID和地址匹配，公开主批次可读5条；页面元数据总量5，未见折叠／更多入口。 [来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-130379198/) |
| 爱碗亭·鲜炒湖南菜（粤商中心店） | 5 | 5 | 本轮同分店ID和地址匹配，公开主批次可读4条；页面元数据总量589，未见折叠／更多入口。 [来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-26635743/) |
| 浅海小厨·潮汕小排档（深圳湾店） | 6 | 4 | 本轮同分店ID和地址匹配，公开主批次可读5条；页面元数据总量5，未见折叠／更多入口。 [来源](https://www.trip.com/restaurant/china/shenzhen/detail/restaurant-118843067/) |
| 陈鹏鹏潮汕菜（天利店） | 6 | 4 | 本轮同分店ID和地址匹配，公开主批次可读6条；页面元数据总量160，未见折叠／更多入口。 [来源](https://tw.trip.com/restaurant/china/shenzhen/detail/restaurant-31152571/) |
| 点都德（卓悦汇店） | 3 | 7 | 本轮同分店ID和地址匹配，公开主批次可读2条；页面元数据总量7，未见折叠／更多入口。 [来源](https://www.trip.com/restaurant/china/shenzhen/detail/restaurant-36997218/) |
| 点都德（A8店） | 6 | 4 | 本轮同分店ID和地址匹配，公开主批次可读5条；页面元数据总量9，未见折叠／更多入口。 [来源](https://tw.trip.com/restaurant/china/shenzhen/detail/restaurant-50501552/) |
| 点都德（龙华优城店） | 9 | 1 | 本轮同分店ID和地址匹配，公开主批次可读9条；页面元数据总量11，未见折叠／更多入口。 [来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-42165106/) |
| 海底捞火锅（天玑城店） | 6 | 4 | 本轮同分店ID和地址匹配，公开主批次可读6条；页面元数据总量6，未见折叠／更多入口。 [来源](https://us.trip.com/restaurant/china/shenzhen/detail/restaurant-57317543/) |
| 润园四季椰子鸡火锅（科兴店） | 7 | 3 | 本轮同分店ID和地址匹配，公开主批次可读6条；页面元数据总量6，未见折叠／更多入口。 [来源](https://www.trip.com/restaurant/china/shenzhen/detail/restaurant-127770113/) |
| 炳胜私厨（万象前海店） | 1 | 9 | 本轮同分店ID和地址匹配，公开主批次可读0条；页面元数据总量1，未见折叠／更多入口。主批次为空，保留历史已核验记录；总量不能当作已采集记录。 [来源](https://hk.trip.com/restaurant/china/shenzhen/detail/bingsheng-private-kitchen-133677667/) |
| 高三姐豆花店 | 6 | 4 | 本轮同分店ID和地址匹配，公开主批次可读5条；页面元数据总量5，未见折叠／更多入口。 [来源](https://hk.trip.com/restaurant/china/shenzhen/detail/si-chuan-lu-zhou-dou-hua-26012436/) |
| 金稻园砂锅粥（壹海城店） | 9 | 1 | 本轮同分店ID和地址匹配，公开主批次可读9条；页面元数据总量62，未见折叠／更多入口。 [来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-15562053/) |
| Pamukkale Mutfak 土耳其餐厅 | 9 | 1 | 本轮未取得可靠新增；公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [来源](https://www.tripadvisor.com/Restaurant_Review-g297415-d32911125-Reviews-Pamukkale_Mutfak-Shenzhen_Guangdong.html) |
| Golden Olives 希腊餐厅 | 9 | 1 | 本轮未取得可靠新增；当前可读公开文档不足 10 条；未验证实时下一页，未把平台总量当作已取得评论。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d27508794-Reviews-Golden_Olives_greek_Resturant_In_Shenzhen-Shenzhen_Guangdong.html) |
| Il Faro 意大利餐厅 | 7 | 3 | 本轮未取得可靠新增；当前可读公开文档不足 10 条；未验证实时下一页，未把平台总量当作已取得评论。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d25560152-Reviews-Il_Faro-Shenzhen_Guangdong.html) |
| 繁楼（振华路） | 5 | 5 | 本轮未取得可靠新增；公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d17783957-Reviews-Fanlou-Shenzhen_Guangdong.html) |
| 富苑中餐厅 | 5 | 5 | 公开文档缓存可读，来源标注缓存时间：last week；本轮接受4条，排除0条；未验证实时下一页。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d6754166-Reviews-Fortune_Court_Chinese_Restaurant-Shenzhen_Guangdong.html) |
| 中发源清真餐厅（春风路） | 2 | 8 | 本轮未取得可靠新增；当前可读公开文档不足 10 条；未验证实时下一页，未把平台总量当作已取得评论。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d2514786-Reviews-ZhongFa_Yuan_QingZhen_Restaurant_ChunFeng_Road-Shenzhen_Guangdong.html) |
| Birol 土耳其牛排餐厅 | 9 | 1 | 本轮未取得可靠新增；公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d27507270-Reviews-Birol_Turkish_Steakhouse-Shenzhen_Guangdong.html) |
| Toro Toro 柴火厨房 | 9 | 1 | 本轮未取得可靠新增；公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d26837435-Reviews-Toro_Toro_WoodFire_Kitchen-Shenzhen_Guangdong.html) |
| Mercado 餐厅及咖啡馆 | 8 | 2 | 本轮未取得可靠新增；公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d3466912-Reviews-Mercado_Restaurant_Cafe-Shenzhen_Guangdong.html) |
| 华侨城洲际 El Chino 中餐厅 | 6 | 4 | 公开文档缓存可读，来源标注缓存时间：last week；本轮接受3条，排除7条；未验证实时下一页。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d3467079-Reviews-El_Chino-Shenzhen_Guangdong.html) |
| 探鱼（金光华） | 3 | 7 | 公开文档缓存可读，来源标注缓存时间：last week；本轮接受1条，排除0条；未验证实时下一页。 [来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d8754601-Reviews-Tanju_Jin_guanghua-Shenzhen_Guangdong.html) |

## 商品核对

无新增商品，仍为 8 类 × 20 款 = 160 个现有 SKU。本轮检查全部 SKU 对应的 15 个原始公开列表 URL，97 个匹配 SKU、详情链接、名称与已选款式，63 个在本次所检查页面未出现。仅据所查列表判断，不代表下架、缺货或整个京东无该商品。
92 款整理出 201 个显式列表字段（材质、纹样、文化地域、尺寸／净量／数量），均标为商家标注，不当作厂商认证。厂家型号保持空值，官方完整详情页确认数仍为 0。
- 商家标题有多个城市时，优先已选款式的城市；不把成都系列标题套给西安或长春款。尺寸按已选款式优先，赠品尺寸与建议身高不计入商品规格。不能证明的产地不写成生产地。
- 沉香手串不当作室内香薰；熊猫画板、显示器饰品和扩香摆件不当作毛绒玩偶；儿童姓名印章不写成石料篆刻。卡片和详情展示实际类型与用途。
- 京东商品详情页此前频控／403，本轮不重复请求。蓝色与粉色牡丹时、不同 75/63/88cm 规格不互套；宋朝香薰候选没有同 SKU／条码关联，容量和礼盒参数不合并。

| 类目 | 同款匹配 | 当前页面未确认 |
|---|---:|---:|
| 茶叶 | 0 | 20 |
| 冰箱贴 | 20 | 0 |
| 丝巾 | 20 | 0 |
| 折扇 | 2 | 18 |
| 瓷器 | 20 | 0 |
| 熊猫礼物 | 14 | 6 |
| 香文化 | 16 | 4 |
| 印章 | 5 | 15 |

全部 SKU 的缺项与来源见 [product-gaps.json](product-gaps.json)；匹配证据、选中款式、显式字段与拒绝合并的候选来源见 [product-verification.json](../../../data/sources/v7/product-verification.json)。

## 需要协助

- 两个列表不足 2 条的门店：谭厨红岭、炳胜万象前海。请提供同分店可公开访问的评论分页，或允许使用的评论导出（门店 ID、评论 ID、作者、日期、原文链接）。其余 33 家详情缺口可按上表继续补。
- 商品需与具体 SKU 对应的商家参数表、官方详情或实物标签／条码。63 个当前列表未找到的款式优先提供同款链接；香薰容量、丝绸尺寸成分、石料及生产信息都需要款式关联。不能用同系列相似商品替代。

## 复现与验证

当前运行文件位于 public/；审核事实位于 data/sources/；本报告及缺口清单位于 docs/data-quality/v7/。原文缓存与历史工具归档于 backup/pre-release-2026-10-09/，不参与网站发布。

无网络构建：build-product-verification-v7.py → build-gifts-v5.py，build-reviews-v5.py。test-data-v7.py 验证忽略原文缓存后仍可逐字重建，检查去重、跨榜映射、署名解析、规格归属和未知字段。浏览器验证记录见 tests-v7.json。
如本机仍保留原始公开文档，可用 parse-public-web-reviews-v6.py --research-dir v7 --strict --output reviews-web-new.json，再运行 curate-web-reviews-v7.py 和 build-reviews-v5.py。原文不参与部署，构建不依赖原文。
