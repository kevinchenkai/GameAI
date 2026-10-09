# -*- coding: utf-8 -*-
"""Audit this local batch against the deployed V6 commit, without network requests."""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'research/v7'
def js(text):return json.loads(text.split('=',1)[1].strip().rstrip(';'))
reviews=js((ROOT/'reviews-v5.js').read_text());venues=js((ROOT/'restaurants-v4.js').read_text())
baseline=js(subprocess.check_output(['git','show','22c25fc:apec26/reviews-v5.js'],cwd=ROOT,text=True))
keys=lambda d:{c['id'] for rows in d.values() for c in rows}
old,new=keys(baseline),keys(reviews);unique={r['id']:r for r in venues if not r['id'].startswith('local-v4-')}
mobile={r['id']:r for r in json.loads((R/'reviews-mobile-new.json').read_text())}
web={r['id']:r for r in json.loads((R/'reviews-web-new.json').read_text())}
prior=json.loads((ROOT/'research/v6/restaurant-gaps.json').read_text());prior={r['id']:r for r in prior}
exclusions=json.loads((R/'review-exclusions.json').read_text());gaps=[]
for id,r in unique.items():
 n=len(reviews[id])
 if n>=10:continue
 if id in mobile:
  m=mobile[id];count=m['publicRecordCount'];reason=f"本轮同分店ID和地址匹配，公开主批次可读{count}条；页面元数据总量{m['platformTotal']}，未见折叠／更多入口。"
  if not count:reason+='主批次为空，保留历史已核验记录；总量不能当作已采集记录。'
 elif id in web:
  w=web[id];excluded=sum(x['venue']==id for x in exclusions)
  reason=f"公开文档缓存可读，来源标注缓存时间：{w['cacheAgeLabel']}；本轮接受{len(w['comments'])}条，排除{excluded}条；未验证实时下一页。"
 else:reason='本轮未取得可靠新增；'+prior.get(id,{}).get('reason','需要同门店公开分页或授权导出。')
 gaps.append(dict(id=id,name=r['nameZh'],reviews=n,listGap=max(0,2-n),detailGap=10-n,source=r['reviewSource'],reason=reason,aliases=[v['id'] for v in venues if v['id']=='local-v4-'+id]))
products=json.loads((R/'product-verification.json').read_text());matched=[v for v in products if v['verificationLevel']=='same_sku_partial_listing']
metrics=dict(baselineCommit='22c25fc',before=len(old),after=len(new),newKeys=len(new-old),removedLegacyKeys=len(old-new),netAdded=len(new)-len(old),uniqueVenues=len(unique),boardEntries=len(venues),listComplete=sum(len(reviews[r['id']])>=2 for r in venues),detailComplete=sum(len(reviews[r['id']])>=10 for r in venues),uniqueListComplete=sum(len(reviews[id])>=2 for id in unique),uniqueDetailComplete=sum(len(reviews[id])>=10 for id in unique),remainingDetailVenues=len(gaps),remainingDetailRecords=sum(g['detailGap'] for g in gaps),remainingListRecords=sum(g['listGap'] for g in gaps),productCount=len(products),listingMatched=len(matched),unconfirmed=len(products)-len(matched),productsWithAttributes=sum(bool(v['attributes']) for v in products),structuredAttributeFields=sum(len(v['attributes']) for v in products),officialCompleteDetails=sum(v['officialDetailVerified'] for v in products))
assert all(id.startswith('legacy-') for id in old-new)
for name,data in [('final-metrics.json',metrics),('restaurant-gaps.json',gaps),('product-gaps.json',[dict(sku=v['sku'],category=v['category'],status=v['verificationLevel'],missingFields=v['missingFields'],source=v['source']) for v in products])]:
 (R/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
labels={'tea':'茶叶','magnet':'冰箱贴','scarf':'丝巾','fan':'折扇','porcelain':'瓷器','panda':'熊猫礼物','incense':'香文化','seal':'印章'}
lines=['# APEC26 V7 数据补全审核','', '核对日期：2026-10-02。基线：已部署的 22c25fc。本轮只修改 apec26；用户已明确授权新的 Git 提交、双远端推送与部署。','', '## 评论数量','',
 f"- 去重评论键：{len(old)} → {len(new)}，净增 {len(new)-len(old)}；新增 {len(new-old)} 个有来源署名键，替换 {len(old-new)} 个旧 legacy 摘录键。没有移除平台原生评论 ID。",
 '- 104 个榜单条目对应 91 家独立门店，13 个跨榜别名共享同源记录，数量不重复计。',
 f"- 列表 ≥2 条：102/104（89/91 独立门店），仍缺 2 条。详情 ≥10 条：51/104 → {metrics['detailComplete']}/104（46/91 → {metrics['uniqueDetailComplete']}/91 独立门店）。",
 f"- 详情缺口：45 → {len(gaps)} 家独立门店，192 → {metrics['remainingDetailRecords']} 条。未用重复、错分店、酒店体验或编造记录补数。",'',
 '评论只发布短双语摘要，保留作者、日期、已公开评分和原文链接。复合键明确标记来源＋作者＋发表日期，不当作平台原生 ID。缺失值留空；原文缓存被 Git 忽略。','',
 '## 采集与审核','',
 '- 本轮检查 13 个此前未在 V6 批次处理的 Tripadvisor 餐厅文档。页面有对应餐厅 ID、名称和地址；使用可读缓存，不称为实时浏览器分页。4 页标注缓存年龄 5–11 个月，9 页标注 last week，时间标签原样保存。未从平台总评论数推算可取得条数。',
 '- 16 个携程移动页核对了 business ID、Trip POI、分店名及地址，普通主批次共取得 77 条记录，与已收录的平台 ID 重复，本轮没有新增。未出现可见折叠入口，未合成请求或绕过限制。',
 '- 炳胜万象前海页面元数据写 1 条，本次主批次为空，正常页面复查仍未读到正文；保留此前 1 条。客语海岸城也只显示总量 2，主批次为空；保留此前 2 条。空批次不能据此解释为停业或平台零评论。',
 '- 人工排除 16 条：5 条 JW 万豪住宿／另一行政酒廊，1 条 1881 价格问题，2 条香乐园附近酒吧，7 条 El Chino 国际自助／早餐，1 条 Prego 未确认归属的酒店自助。名单见 review-exclusions.json。',
 '- [IHG 官方餐饮介绍](https://www.ihg.com/intercontinental/hotels/us/en/shenzhen/szxha/hoteldetail/dining)分别列出粤菜 El Chino 和国际自助 Mercado，因此没有把未确认的自助记录移入任何一家。',
 '- 修复解析器：拆开同行的页面行标记、拒绝透明度报告等导航署名、严格模式要求用户投稿标记。替换旧摘录要求同来源、同作者，且旧摘录在原始正文中匹配，不仅凭作者去重。采集器保留已核实的部分结果，并区分身份匹配与空评论批次。','',
 '## 本轮餐厅来源','', '| 门店 | 原文 | 缓存年龄标签 | 接受条数 |','|---|---|---|---:|']
for id,w in web.items():lines.append(f"| {w['name']} | [餐厅页面]({w['source']}) | {w['cacheAgeLabel']} | {len(w['comments'])} |")
lines+=['','## 逐店剩余缺口','', '| 门店 | 已收录 | 缺至10条 | 原因与来源 |','|---|---:|---:|---|']
for g in gaps:lines.append(f"| {g['name']} | {g['reviews']} | {g['detailGap']} | {g['reason']} [来源]({g['source']}) |")
lines+=['','## 商品核对','',
 f"无新增商品，仍为 8 类 × 20 款 = 160 个现有 SKU。本轮检查全部 SKU 对应的 15 个原始公开列表 URL，97 个匹配 SKU、详情链接、名称与已选款式，63 个在本次所检查页面未出现。仅据所查列表判断，不代表下架、缺货或整个京东无该商品。",
 f"92 款整理出 {metrics['structuredAttributeFields']} 个显式列表字段（材质、纹样、文化地域、尺寸／净量／数量），均标为商家标注，不当作厂商认证。厂家型号保持空值，官方完整详情页确认数仍为 0。",
 '- 商家标题有多个城市时，优先已选款式的城市；不把成都系列标题套给西安或长春款。尺寸按已选款式优先，赠品尺寸与建议身高不计入商品规格。不能证明的产地不写成生产地。',
 '- 沉香手串不当作室内香薰；熊猫画板、显示器饰品和扩香摆件不当作毛绒玩偶；儿童姓名印章不写成石料篆刻。卡片和详情展示实际类型与用途。',
 '- 京东商品详情页此前频控／403，本轮不重复请求。蓝色与粉色牡丹时、不同 75/63/88cm 规格不互套；宋朝香薰候选没有同 SKU／条码关联，容量和礼盒参数不合并。','',
 '| 类目 | 同款匹配 | 当前页面未确认 |','|---|---:|---:|']
for cat,label in labels.items():
 rows=[v for v in products if v['category']==cat];n=sum(v['verificationLevel']=='same_sku_partial_listing' for v in rows);lines.append(f'| {label} | {n} | {len(rows)-n} |')
lines+=['','全部 SKU 的缺项与来源见 product-gaps.json；匹配证据、选中款式、显式字段与拒绝合并的候选来源见 product-verification.json。','',
 '## 需要协助','',
 '- 两个列表不足 2 条的门店：谭厨红岭、炳胜万象前海。请提供同分店可公开访问的评论分页，或允许使用的评论导出（门店 ID、评论 ID、作者、日期、原文链接）。其余 33 家详情缺口可按上表继续补。',
 '- 商品需与具体 SKU 对应的商家参数表、官方详情或实物标签／条码。63 个当前列表未找到的款式优先提供同款链接；香薰容量、丝绸尺寸成分、石料及生产信息都需要款式关联。不能用同系列相似商品替代。','',
 '## 复现与验证','',
 '无网络构建：build-product-verification-v7.py → build-gifts-v5.py，build-reviews-v5.py。test-data-v7.py 验证忽略原文缓存后仍可逐字重建，检查去重、跨榜映射、署名解析、规格归属和未知字段。浏览器验证记录见 tests-v7.json。',
 '如本机仍保留原始公开文档，可用 parse-public-web-reviews-v6.py --research-dir v7 --strict --output reviews-web-new.json，再运行 curate-web-reviews-v7.py 和 build-reviews-v5.py。原文不参与部署，构建不依赖原文。','']
(R/'REPORT.md').write_text('\n'.join(lines))
print(json.dumps(metrics,ensure_ascii=False))
