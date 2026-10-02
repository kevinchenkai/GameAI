# APEC26 数据补齐审核报告

本轮只修改 apec26。数据审核阶段未提交、推送或部署；2026-10-02 用户已明确授权发布。数据基线为 52398d6。

## 数量与口径

- 独立评论键：486 → 751，净增 265；新增 294 个键，移除 29 个被同源署名记录替换的旧摘录键。移除项均为 legacy，未删除平台评论 ID。
- 104 个榜单条目对应 91 家独立门店，13 个跨榜别名共享数据，不重复计评论。
- 列表 ≥2：70/104 → 102/104（独立门店 89/91）。
- 详情 ≥10：24/104 → 51/104（独立门店 46/91）。
- 剩余 45 家独立门店详情不足 10 条，缺 192 条；其中 2 家列表不足 2 条，各缺 1 条。

评论展示有来源的双语短摘要，非复制原文。原文缓存被 Git 忽略。缺失评分或发表日期保持空值。复合评论键明确标记为来源＋作者＋日期，不冒充平台原生 ID。

## 三家小样与分页证据

| 门店 | Ctrip business / Trip POI | 同分店地址核对 | 公开分页 | 整合后 |
|---|---|---|---|---|
| 鼎泰丰万象城 | 5184593 / 11334307 | 当前携程/Trip：宝安南路1881号万象城一期5层568铺；旧 Tripadvisor 写3楼，楼层冲突保留，未宣称实地核实 | 正常 Next page 已禁用，仅3条；116总量中113隐藏 | 4 → 12 |
| 海底捞卓越店 | 5178103 / 11327817 | 卓越INTOWN东区4楼；核对门店ID、分店名与地址 | Trip正常2页5条；携程主页面6条，与Trip去重；540总量中535隐藏 | 7 → 15 |
| 陶陶居海岸城 | 22404263 / 56563705 | 海岸城5层517号一致；两来源分别写文心三路与文心五路，保留街道差异 | Trip正常3页8条；携程主列表7条，与Trip去重；14总量中6隐藏 | 8 → 17 |

Tripadapter仅读取正常页面状态和按钮触发的响应；去重依据评论ID及原文规范化指纹。Ctripadapter仅跟随真实可见折叠点评入口，等待实际列表渲染；不合成API请求、不解锁隐藏内容。

Tripadvisor补充使用可读的公开文档缓存，不冒充实时分页。共人工审核后排除6条：错分店、错餐厅、同作者近似复用内容、酒店体验记录。详见 review-exclusions.json。地址匹配只证明来源归属，不能确认当前经营状态。

## 逐店缺口

| 门店 | 已有 | 距10条 | 原因及来源 |
|---|---:|---:|---|
| 佳宁娜潮州菜（福田好日子店） | 4 | 6 | 同名好日子分店、3 楼地址已核对；页面总量显示 5 条，但当前筛选仅公开 4 条，无下一页。 [原始来源](https://www.tripadvisor.com.tw/Restaurant_Review-g297415-d10586362-Reviews-Jianingna_GuiBin_Lou_HaoRi_Zi-Shenzhen_Guangdong.html) |
| 丹桂轩（天安店） | 3 | 7 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://you.ctrip.com/food/shenzhen26/7381170-food.html) |
| 谭厨中山传家菜（红岭店） | 1 | 9 | 门店 ID/地址已核对；公开主列表只有 1 条，滚动后无新增。 [原始来源](https://you.ctrip.com/food/26/136215478.html) |
| 吴·现代潮菜（深圳店） | 4 | 6 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://you.ctrip.com/food/26/130408983.html) |
| 火玺（福田店） | 3 | 7 | 门店 ID/地址已核对；主列表 1 条，正常点击折叠点评入口取得 2 条，合计 3 条；无更多。 [原始来源](https://you.ctrip.com/food/shenzhen26/78089971-dianping.html) |
| 悦景酒家（福田店） | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://you.ctrip.com/food/shenzhen26/90682459.html) |
| 米煮鲜·毋米粥（侨城一号店） | 5 | 5 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://you.ctrip.com/food/shenzhen26/134790102.html) |
| 譽八仙（万象天地店） | 8 | 2 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://tw.trip.com/restaurant/china/shenzhen/detail/sense-8-cantonese-cuisine-42122305/) |
| 蚝门九式（莲花店） | 3 | 7 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://gs.ctrip.com/html5/you/foods/fooddetail/26/130139313.html) |
| 客语（海岸城店） | 2 | 8 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://us.trip.com/restaurant/china/shenzhen/detail/hakka-yu-118848364/) |
| 陶陶居·庭院（宝安壹方城店） | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://au.trip.com/restaurant/china/shenzhen/detail/restaurant-118847026/) |
| 小辣椒·湖南乡里菜（文锦花园店） | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-122690649/) |
| 宇德隆记客家食府（宝安店） | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-130379198/) |
| 爱碗亭·鲜炒湖南菜（粤商中心店） | 5 | 5 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-26635743/) |
| 浅海小厨·潮汕小排档（深圳湾店） | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.trip.com/restaurant/china/shenzhen/detail/restaurant-118843067/) |
| 陈鹏鹏潮汕菜（天利店） | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://tw.trip.com/restaurant/china/shenzhen/detail/restaurant-31152571/) |
| 点都德（卓悦汇店） | 3 | 7 | 已验证正常分页；更多旧点评被平台隐藏：4 older review has been hidden 4 older review has been hidden [原始来源](https://www.trip.com/restaurant/china/shenzhen/detail/restaurant-36997218/) |
| 点都德（A8店） | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://tw.trip.com/restaurant/china/shenzhen/detail/restaurant-50501552/) |
| 点都德（龙华优城店） | 9 | 1 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-42165106/) |
| 海底捞火锅（天玑城店） | 6 | 4 | 已验证正常分页；更多旧点评被平台隐藏：1 older review has been hidden [原始来源](https://us.trip.com/restaurant/china/shenzhen/detail/restaurant-57317543/) |
| 润园四季椰子鸡火锅（科兴店） | 7 | 3 | 已验证正常分页；更多旧点评被平台隐藏：1 older review has been hidden [原始来源](https://www.trip.com/restaurant/china/shenzhen/detail/restaurant-127770113/) |
| 炳胜私厨（万象前海店） | 1 | 9 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://hk.trip.com/restaurant/china/shenzhen/detail/bingsheng-private-kitchen-133677667/) |
| 高三姐豆花店 | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://hk.trip.com/restaurant/china/shenzhen/detail/si-chuan-lu-zhou-dou-hua-26012436/) |
| 金稻园砂锅粥（壹海城店） | 9 | 1 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://hk.trip.com/restaurant/china/shenzhen/detail/restaurant-15562053/) |
| Alla Torre（海上世界） | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com/Restaurant_Review-g297415-d9989898-Reviews-Alla_Torre_seaworld-Shenzhen_Guangdong.html) |
| Doors 土耳其餐厅 | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com/Restaurant_Review-g297415-d32991374-Reviews-Doors_Turkish_Restaurant-Shenzhen_Guangdong.html) |
| 宝安 JW 万豪大堂酒廊 | 9 | 1 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com/Restaurant_Review-g297415-d7701549-Reviews-The_Lounge_JW_Marriott_Hotel_Shenzhen_Bao_an-Shenzhen_Guangdong.html) |
| Pamukkale Mutfak 土耳其餐厅 | 9 | 1 | 公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [原始来源](https://www.tripadvisor.com/Restaurant_Review-g297415-d32911125-Reviews-Pamukkale_Mutfak-Shenzhen_Guangdong.html) |
| Sugo 意大利餐厅 | 7 | 3 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com/Restaurant_Review-g297415-d7050208-Reviews-Sugo-Shenzhen_Guangdong.html) |
| Golden Olives 希腊餐厅 | 9 | 1 | 当前可读公开文档不足 10 条；未验证实时下一页，未把平台总量当作已取得评论。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d27508794-Reviews-Golden_Olives_greek_Resturant_In_Shenzhen-Shenzhen_Guangdong.html) |
| Il Faro 意大利餐厅 | 7 | 3 | 当前可读公开文档不足 10 条；未验证实时下一页，未把平台总量当作已取得评论。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d25560152-Reviews-Il_Faro-Shenzhen_Guangdong.html) |
| 繁楼（振华路） | 5 | 5 | 公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d17783957-Reviews-Fanlou-Shenzhen_Guangdong.html) |
| 深圳君悦 1881 中餐厅 | 5 | 5 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d4008332-Reviews-1881_Chinese_Restaurant_Grand_Hyatt_Shenzhen-Shenzhen_Guangdong.html) |
| 富苑中餐厅 | 2 | 8 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d6754166-Reviews-Fortune_Court_Chinese_Restaurant-Shenzhen_Guangdong.html) |
| 中发源清真餐厅（春风路） | 2 | 8 | 当前可读公开文档不足 10 条；未验证实时下一页，未把平台总量当作已取得评论。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d2514786-Reviews-ZhongFa_Yuan_QingZhen_Restaurant_ChunFeng_Road-Shenzhen_Guangdong.html) |
| 深圳瑞吉闲逸廊及瑞吉吧 | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d4962484-Reviews-The_Drawing_Room_St_Regis_Bar-Shenzhen_Guangdong.html) |
| Birol 土耳其牛排餐厅 | 9 | 1 | 公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d27507270-Reviews-Birol_Turkish_Steakhouse-Shenzhen_Guangdong.html) |
| Toro Toro 柴火厨房 | 9 | 1 | 公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d26837435-Reviews-Toro_Toro_WoodFire_Kitchen-Shenzhen_Guangdong.html) |
| 香乐园 | 9 | 1 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d3457031-Reviews-Shang_Garden-Shenzhen_Guangdong.html) |
| Mercado 餐厅及咖啡馆 | 8 | 2 | 公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d3466912-Reviews-Mercado_Restaurant_Cafe-Shenzhen_Guangdong.html) |
| 南山威斯汀 Five Sen5es 中餐厅 | 6 | 4 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d3512826-Reviews-Five_Sen5es_at_The_Westin_Shenzhen_Nanshan-Shenzhen_Guangdong.html) |
| 华侨城洲际 El Chino 中餐厅 | 4 | 6 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d3467079-Reviews-El_Chino-Shenzhen_Guangdong.html) |
| Prego 意大利餐厅 | 7 | 3 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d4422188-Reviews-Prego_Italian_Restaurant-Shenzhen_Guangdong.html) |
| 探鱼（金光华） | 3 | 7 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d8754601-Reviews-Tanju_Jin_guanghua-Shenzhen_Guangdong.html) |
| 海底捞火锅（金光华） | 9 | 1 | 保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。 [原始来源](https://www.tripadvisor.com.sg/Restaurant_Review-g297415-d12624178-Reviews-Hai_Di_Lao_Hot_Pot_Jinguanghua-Shenzhen_Guangdong.html) |

## 每类一个现有 SKU

无新增商品；仍为8类×20款=160个SKU。6个同SKU公开列表匹配，2个当前列表未找到；0个取得可确认同款的完整官方参数页。品牌仅为商家标题标注，不能证明生产厂家。其余152个尚未逐SKU复核。移除旧品牌截字推断。

| 品类 / SKU | 核对结果 | 仍缺参数 | 来源 |
|---|---|---|---|
| 茶叶 / 100198750905 | 同SKU＋名称＋已选款式匹配，仅列表参数 | 产地证明、生产日期、厂家型号、配料及等级证明 | [公开列表](https://www.jd.com/chanpin/2598168.html) |
| 冰箱贴 / 10182313418433 | 同SKU＋名称＋已选款式匹配，仅列表参数 | 材质、尺寸、厂家型号 | [公开列表](https://www.jd.com/chanpin/453761.html) |
| 丝巾 / 100292565772 | 同SKU＋名称＋已选款式匹配，仅列表参数 | 长宽尺寸、成分比例及标签、厂家型号 | [公开列表](https://www.jd.com/chanpin/2172974.html) |
| 折扇 / 100197841286 | 同SKU＋名称＋已选款式匹配，仅列表参数 | 扇骨材质、扇面材质、厂家型号 | [公开列表](https://www.jd.com/chanpin/451539.html) |
| 瓷器 / 10079354862002 | 同SKU＋名称＋已选款式匹配，仅列表参数 | 实际容量、生产厂家、材质检测、厂家型号 | [公开列表](https://www.jd.com/chanpin/90600.html) |
| 熊猫玩偶 / 10093805312718 | 同SKU＋名称＋已选款式匹配，仅列表参数 | 填充物、安全标签、赠品内容、厂家型号 | [公开列表](https://www.jd.com/chanpin/1164281.html) |
| 香薰 / 100099651991 | 当前列表无该SKU，同款未确认 | 同款 SKU／条码对应、容量、配料、使用说明、厂家型号 | [公开列表](https://www.jd.com/chanpin/2625641.html) |
| 印章 / 100134886877 | 当前列表无该SKU，同款未确认 | 同款 SKU／条码对应、石料证明、刻字选项、厂家型号 | [公开列表](https://www.jd.com/chanpin/2258501.html) |

丝巾的粉色款资料不套用至蓝色SKU；宋朝满陇桂雨候选资料没有匹配SKU/条码，容量、商户重量与型号不合并。京东完整商品页此前频控/403，本轮未重复请求。候选来源与拒绝原因保留在 product-verification.json。

## 需要协助

- 对缺口门店提供允许使用的同分店评论导出，包含平台门店ID、作者、日期、评论ID及原文链接；或可正常访问的公开分页链接。不会用其他分店、重复评论或编造用户补数。
- 对8个商品小样提供同SKU官方详情页、商家参数表或实物标签/条码。香薰和印章尤其需要SKU/条码关联；其余款需要对应颜色、尺寸、容量等规格，不能用相似款替代。
- 鼎泰丰楼层与陶陶居街道地址的历史来源冲突，需要门店确认最新地址。

## 验证

测试结果见 tests-v6.json；源码与数据均只在 apec26 修改。2026-10-02 用户已授权 Git 提交、推送和部署，发布范围仅限 apec26。
