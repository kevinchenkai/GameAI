# -*- coding: utf-8 -*-
"""Produce review completeness and product-verification report from local source facts."""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def js(name,var=None):return json.loads((ROOT/name).read_text().split('=',1)[1].strip().rstrip(';'))
venues=js('restaurants-v4.js');current=js('reviews-v5.js')
base=json.loads(subprocess.check_output(['git','show','52398d6:apec26/reviews-v5.js'],cwd=ROOT,text=True).split('=',1)[1].strip().rstrip(';'))
ids=lambda d:{c['id'] for cs in d.values() for c in cs}
old,new=ids(base),ids(current)
sources={}
for p in (ROOT/'research/v6').glob('reviews-*.json'):
 for r in json.loads(p.read_text()):sources.setdefault(r['id'],[]).append(r)
for p in (ROOT/'research/v5').glob('reviews*public.json'):
 for r in json.loads(p.read_text()):sources.setdefault(r['id'],[]).append(r)
gaps=[]
unique={r['id']:r for r in venues if not r['id'].startswith('local-v4-')}
for id,r in unique.items():
 n=len(current[id]);
 if n>=10:continue
 rows=sources.get(id,[]);verified=[x for x in rows if x.get('status')=='verified']
 if id=='local-006':reason='门店 ID/地址已核对；公开主列表只有 1 条，滚动后无新增。'
 elif id=='local-008':reason='门店 ID/地址已核对；主列表 1 条，正常点击折叠点评入口取得 2 条，合计 3 条；无更多。'
 elif id=='local-002':reason='同名好日子分店、3 楼地址已核对；页面总量显示 5 条，但当前筛选仅公开 4 条，无下一页。'
 elif any(x.get('pages') and x.get('terminalNotice') for x in verified):
  x=verified[-1];reason='已验证正常分页；更多旧点评被平台隐藏：'+x['terminalNotice']
 elif id in ['ta-32911125','ta-17783957','ta-27507270','ta-26837435','ta-3466912']:reason='公开文档已读取；排除错分店、错餐厅、重复或酒店记录后不足 10 条。实时 Tripadvisor 浏览器访问受限，未绕过。'
 elif any(x.get('status')=='readable_public_document' for x in rows):reason='当前可读公开文档不足 10 条；未验证实时下一页，未把平台总量当作已取得评论。'
 else:reason='保留此前可核验评论；本轮无可靠新增记录，需可访问的同门店分页或授权评论导出。'
 gaps.append(dict(id=id,name=r['nameZh'],reviews=n,listGap=max(0,2-n),detailGap=10-n,source=r['reviewSource'],reason=reason,aliases=[v['id'] for v in venues if v['id']=='local-v4-'+id]))
metrics=dict(baselineCommit='52398d6',before=len(old),after=len(new),newKeys=len(new-old),removedLegacyKeys=len(old-new),netAdded=len(new)-len(old),uniqueVenues=len(unique),boardEntries=len(venues),listComplete=sum(len(current[r['id']])>=2 for r in venues),detailComplete=sum(len(current[r['id']])>=10 for r in venues),uniqueListComplete=sum(len(current[id])>=2 for id in unique),uniqueDetailComplete=sum(len(current[id])>=10 for id in unique),remainingDetailRecords=sum(g['detailGap'] for g in gaps),remainingListRecords=sum(g['listGap'] for g in gaps))
(ROOT/'research/v6/final-metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')
(ROOT/'research/v6/restaurant-gaps.json').write_text(json.dumps(gaps,ensure_ascii=False,indent=2)+'\n')
lines=['# APEC26 数据补齐审核报告','', '本轮只修改 apec26。数据审核阶段未提交、推送或部署；2026-10-02 用户已明确授权发布。数据基线为 52398d6。','', '## 数量与口径','',f"- 独立评论键：{len(old)} → {len(new)}，净增 {len(new)-len(old)}；新增 {len(new-old)} 个键，移除 {len(old-new)} 个被同源署名记录替换的旧摘录键。移除项均为 legacy，未删除平台评论 ID。",f"- 104 个榜单条目对应 91 家独立门店，13 个跨榜别名共享数据，不重复计评论。",f"- 列表 ≥2：70/104 → {metrics['listComplete']}/104（独立门店 {metrics['uniqueListComplete']}/91）。",f"- 详情 ≥10：24/104 → {metrics['detailComplete']}/104（独立门店 {metrics['uniqueDetailComplete']}/91）。",f"- 剩余 {len(gaps)} 家独立门店详情不足 10 条，缺 {metrics['remainingDetailRecords']} 条；其中 2 家列表不足 2 条，各缺 1 条。",'', '评论展示有来源的双语短摘要，非复制原文。原文缓存被 Git 忽略。缺失评分或发表日期保持空值。复合评论键明确标记为来源＋作者＋日期，不冒充平台原生 ID。','', '## 三家小样与分页证据','', '| 门店 | Ctrip business / Trip POI | 同分店地址核对 | 公开分页 | 整合后 |','|---|---|---|---|---|','| 鼎泰丰万象城 | 5184593 / 11334307 | 当前携程/Trip：宝安南路1881号万象城一期5层568铺；旧 Tripadvisor 写3楼，楼层冲突保留，未宣称实地核实 | 正常 Next page 已禁用，仅3条；116总量中113隐藏 | 4 → 12 |','| 海底捞卓越店 | 5178103 / 11327817 | 卓越INTOWN东区4楼；核对门店ID、分店名与地址 | Trip正常2页5条；携程主页面6条，与Trip去重；540总量中535隐藏 | 7 → 15 |','| 陶陶居海岸城 | 22404263 / 56563705 | 海岸城5层517号一致；两来源分别写文心三路与文心五路，保留街道差异 | Trip正常3页8条；携程主列表7条，与Trip去重；14总量中6隐藏 | 8 → 17 |','', 'Tripadapter仅读取正常页面状态和按钮触发的响应；去重依据评论ID及原文规范化指纹。Ctripadapter仅跟随真实可见折叠点评入口，等待实际列表渲染；不合成API请求、不解锁隐藏内容。','', 'Tripadvisor补充使用可读的公开文档缓存，不冒充实时分页。共人工审核后排除6条：错分店、错餐厅、同作者近似复用内容、酒店体验记录。详见 review-exclusions.json。地址匹配只证明来源归属，不能确认当前经营状态。','', '## 逐店缺口','', '| 门店 | 已有 | 距10条 | 原因及来源 |','|---|---:|---:|---|']
for g in gaps:lines.append(f"| {g['name']} | {g['reviews']} | {g['detailGap']} | {g['reason']} [原始来源]({g['source']}) |")
products=json.loads((ROOT/'research/v6/product-verification.json').read_text())
labels={'tea':'茶叶','magnet':'冰箱贴','scarf':'丝巾','fan':'折扇','porcelain':'瓷器','panda':'熊猫玩偶','incense':'香薰','seal':'印章'}
lines+=['','## 每类一个现有 SKU','', '无新增商品；仍为8类×20款=160个SKU。6个同SKU公开列表匹配，2个当前列表未找到；0个取得可确认同款的完整官方参数页。品牌仅为商家标题标注，不能证明生产厂家。其余152个尚未逐SKU复核。移除旧品牌截字推断。','', '| 品类 / SKU | 核对结果 | 仍缺参数 | 来源 |','|---|---|---|---|']
for v in products:lines.append(f"| {labels[v['category']]} / {v['sku']} | {'同SKU＋名称＋已选款式匹配，仅列表参数' if v['verificationLevel']=='same_sku_partial_listing' else '当前列表无该SKU，同款未确认'} | {'、'.join(v['missingFields'])} | [公开列表]({v['source']}) |")
lines+=['','丝巾的粉色款资料不套用至蓝色SKU；宋朝满陇桂雨候选资料没有匹配SKU/条码，容量、商户重量与型号不合并。京东完整商品页此前频控/403，本轮未重复请求。候选来源与拒绝原因保留在 product-verification.json。','', '## 需要协助','', '- 对缺口门店提供允许使用的同分店评论导出，包含平台门店ID、作者、日期、评论ID及原文链接；或可正常访问的公开分页链接。不会用其他分店、重复评论或编造用户补数。','- 对8个商品小样提供同SKU官方详情页、商家参数表或实物标签/条码。香薰和印章尤其需要SKU/条码关联；其余款需要对应颜色、尺寸、容量等规格，不能用相似款替代。','- 鼎泰丰楼层与陶陶居街道地址的历史来源冲突，需要门店确认最新地址。','', '## 验证','', '测试结果见 tests-v6.json；源码与数据均只在 apec26 修改。2026-10-02 用户已授权 Git 提交、推送和部署，发布范围仅限 apec26。','']
(ROOT/'research/v6/REPORT.md').write_text('\n'.join(lines))
print(json.dumps(metrics,ensure_ascii=False))
assert all(x.startswith('legacy-') for x in old-new),old-new
