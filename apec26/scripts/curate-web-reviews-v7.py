# -*- coding: utf-8 -*-
"""Human-reviewed short paraphrases. Run after parsing cached public documents."""
import json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];pairs={}
def add(id,s):pairs[id]=[dict(zip(['zh','en'],line.split('~'))) for line in s.strip().split('\n')]
add('ta-9989898',"""
喜欢披萨与意面，服务偏慢。~Enjoys pizza and pasta; service slow.
喜欢披萨、啤酒与临水景观。~Enjoys pizza, beer and waterfront views.
食物尚可，员工动作偏慢。~Acceptable food; slow staff.
露台适合欣赏水景。~Enjoys the terrace and water views.
对服务与食物失望。~Disappointed with service and food.
喜欢汉堡与露台，服务需提速。~Enjoys burgers and terrace; service slow.
景观漂亮，服务体验欠佳。~Good views; disappointing service.
等待很久，食物与价格欠佳。~Long waits, disappointing food and value.
食物普通，服务过慢。~Average food and very slow service.
菜品供应与服务未达预期。~Dish availability and service disappoint.
""")
add('ta-32991374',"""
出品稳定，喜欢持续更新的环境。~Consistent food and changing decor.
食物新鲜，价格与服务不错。~Fresh food, good value and service.
喜欢牛排与热情招待。~Enjoys steak and attentive hospitality.
服务欠佳，分量与价格不相称。~Poor service and disappointing portion value.
临近打烊仍获热情接待。~Warm hospitality near closing time.
节日聚餐，食物服务令人满意。~Enjoys festive dining and service.
""")
add('ta-7701549',"""
喜欢下午茶与员工服务。~Enjoys afternoon tea and service.
主要描述住宿，未确认用餐。~Primarily describes the hotel stay.
喝咖啡时，服务关注不足。~Insufficient attention during a coffee visit.
喜欢休息空间与咖啡选择。~Enjoys the lounge and coffee selection.
描述行政酒廊，非本店。~Describes a different executive lounge.
适合同事聊天、饮品和轻食。~Enjoys drinks and snacks with colleagues.
仅描述酒店住宿。~Describes only the hotel stay.
主要描述客房与住宿。~Primarily discusses rooms and accommodation.
赞赏寿司，适合商务午餐。~Praises sushi for business lunches.
仅描述酒店设施与体验。~Describes hotel facilities and experience.
""")
add('ta-7050208',"""
环境温馨，喜欢鸡尾酒选择。~Cozy setting and enjoyable cocktails.
喜欢披萨、沙拉与店主交流。~Enjoys pizza, salads and owner conversations.
披萨沙拉好吃，员工细心。~Enjoys pizza, salads and attentive staff.
喜欢薄脆披萨与亲切招待。~Enjoys crisp pizza and friendly hospitality.
披萨、意面与饮品令人失望。~Disappointed with pizza, pasta and drinks.
小店披萨不错，店主友好。~Good pizza and friendly owner.
喜欢帕尼尼与沙拉。~Enjoys panini and salads.
认可意餐品质与用心经营。~Appreciates Italian cooking and care.
喜欢食物品质与合理定价。~Enjoys food quality and value.
再次到访，喜欢披萨与提拉米苏。~Returns for pizza and tiramisu.
""")
add('ta-4008332',"""
喜欢脆皮烤鸭，价格较高。~Enjoys crisp roast duck despite higher prices.
喜欢菜肴与细致服务。~Enjoys food and careful service.
烤鸭与开放厨房是亮点。~Roast duck and open kitchen stand out.
提前预订烤鸭，体验不错。~Enjoys preordered roast duck.
员工照顾食物不耐受需求。~Staff accommodates food intolerances.
食物环境不错，英语沟通有限。~Enjoys food; English communication limited.
午餐推荐烤鸭，服务不错。~Enjoys roast duck and lunch service.
生日聚餐，烤鸭与饺子出色。~Enjoys birthday duck and dumplings.
仅询问价格，非用餐体验。~A price question, not a dining review.
喜欢装潢、摆盘和服务。~Enjoys decor, presentation and service.
""")
add('ta-6754166',"""
喜欢粤菜、葡萄酒与安静环境。~Enjoys Cantonese food, wine and quiet atmosphere.
菜肴不错，茶水服务及时。~Enjoys food and prompt tea service.
招待热情，点菜建议有帮助。~Warm welcome and helpful menu advice.
认可中餐品质与细致服务。~Enjoys Chinese food and attentive service.
""")
add('ta-4962484',"""
喜欢高层全景与鸡尾酒。~Enjoys panoramic views and cocktails.
喜欢夜景与特色血腥玛丽。~Enjoys night views and signature cocktails.
沙拉不错，咖啡奶泡令人失望。~Good salad; cappuccino foam disappoints.
全景、菜肴与服务令人满意。~Enjoys panoramic views, food and service.
喜欢下午茶与鸡尾酒服务。~Enjoys afternoon tea and cocktail service.
早餐鲍鱼粥出色，服务热情。~Enjoys abalone congee and warm service.
喜欢金汤力、芝士盘与景观。~Enjoys gin, cheese and skyline views.
饮品与服务不错，景观加分。~Enjoys drinks, service and views.
咖啡蛋糕好吃，噪声与服务欠佳。~Good coffee and cake; noise and service disappoint.
喜欢下午茶与专业接待。~Enjoys afternoon tea and professional hospitality.
""")
add('ta-3457031',"""
喜欢淮扬菜与创新呈现。~Enjoys Huaiyang cooking and creative presentation.
熏鱼与鳝鱼出色，服务细致。~Enjoys smoked fish, eel and attentive service.
喜欢红烧肉与酥饼。~Enjoys braised pork and crisp pastries.
多次回访，认可创新与服务。~Returns for creative cooking and service.
喜欢蔬菜与素鸭。~Enjoys vegetable dishes and vegan duck.
喜欢早茶与服务安排。~Enjoys dim sum and accommodating service.
食物与服务令人失望。~Disappointed with food and service.
描述酒店附近酒吧，店铺不明。~Describes an unidentified nearby hotel bar.
明确描述酒吧，非中餐厅用餐。~Describes a bar, not Chinese restaurant dining.
认可餐厅与英语服务。~Enjoys dining and English-speaking service.
""")
add('ta-3512826',"""
喜欢菜肴与摆盘。~Enjoys dishes and presentation.
点心味道与呈现未达预期。~Dim sum taste and presentation disappoint.
家庭聚餐，喜欢点心。~Enjoys dim sum with family.
环境偏暗，食物与招待欠佳。~Dark setting, bland food and poor welcome.
环境漂亮，喜欢蘑菇与服务。~Enjoys decor, mushrooms and service.
点心不错，后上菜肴变凉。~Enjoys dim sum; later dishes cool.
员工不够主动，菜肴不够热。~Inattentive staff and insufficiently hot dishes.
""")
add('ta-3467079',"""
描述酒店国际自助，店铺归属不明。~Describes an unidentified international hotel buffet.
描述酒店早餐，店铺归属不明。~Describes an unidentified hotel breakfast.
喜欢点心、环境与员工服务。~Enjoys dim sum, atmosphere and staff.
描述西班牙海鲜饭自助，非已核对粤菜。~Describes an unconfirmed Spanish buffet.
描述会议自助餐，店铺归属不明。~Describes an unidentified conference buffet.
描述国际早餐自助，店铺归属不明。~Describes an unidentified international breakfast buffet.
喜欢点心与开放厨房。~Enjoys dim sum and the open kitchen.
图文英文菜单方便，点心好吃。~Illustrated English menu helps; enjoyable dim sum.
描述国际自助，店铺归属不明。~Describes an unidentified international buffet.
描述自助晚餐，店铺归属不明。~Describes an unidentified buffet dinner.
""")
add('ta-4422188',"""
沙拉与肉酱意面用料令人意外。~Unexpected ingredients in salad and bolognese.
上菜慢，食物平淡且贵。~Slow service, bland food and high prices.
套餐的牛肉与鱼不错。~Enjoys beef and fish in the set meal.
喜欢安静环境、菜肴与服务。~Enjoys quiet atmosphere, food and service.
描述酒店自助，未确认本店。~Describes an unidentified hotel buffet.
喜欢披萨与细致服务。~Enjoys pizza and attentive service.
认可意大利风味菜肴。~Enjoys the Italian cooking.
环境平静，食物与价格较普通。~Calm setting; average food and value.
意面调味与意式风味未达预期。~Pasta seasoning and Italian flavors disappoint.
喜欢意大利套餐与晚餐氛围。~Enjoys Italian set dining and atmosphere.
""")
add('ta-8754601',"""
服务不错，烤鱼偏咸油腻。~Good service; grilled fish salty and oily.
""")
add('ta-12624178',"""
喜欢火锅服务与现场拉面。~Enjoys hotpot service and fresh noodle-making.
员工关注周到，服务出色。~Attentive staff and excellent service.
喜欢番茄辣汤与细致招待。~Enjoys tomato-spicy broths and hospitality.
食物不错，服务令其印象深刻。~Enjoys food and memorable service.
等位较久，员工服务有条理。~Long queues with organized, friendly service.
""")
rows=json.loads((ROOT/'research/v7/.raw-cache/reviews-web-new.json').read_text());excluded=[]
venues=json.loads((ROOT/'restaurants-v4.js').read_text().split('=',1)[1].strip().rstrip(';'));venues={v['id']:v for v in venues}
norm=lambda s:re.sub(r'[^\w]','',unicodedata.normalize('NFKC',s).casefold())
for r in rows:
 cs=r['comments'];assert len(cs)==len(pairs[r['id']]),r['id'];keep=[]
 for c,summary in zip(cs,pairs[r['id']]):
  reason=None
  if r['id']=='ta-7701549' and c['author'] in ['jy j','YVR-BTR-BRC','Shawn S','trafalgar169','Curious816440']:reason='Hotel stay or separate executive lounge, not the selected dining venue.'
  if r['id']=='ta-4008332' and c['author']=='Nauman Q':reason='Price question; no personal dining experience.'
  if r['id']=='ta-3457031' and c['author'] in ['rlutz','Frederico C']:reason='Bar or unidentified nearby venue; selected Chinese restaurant unconfirmed.'
  if r['id']=='ta-3467079' and not (c['author']=='djeenergy' or c['author']=='familyfoodfun' or (c['author']=='PTrew' and c['date']=='2017-02-22')):reason='International hotel buffet/breakfast is not clearly El Chino; official IHG distinguishes Cantonese El Chino from international Mercado buffet.'
  if r['id']=='ta-4422188' and c['author']=='gae d':reason='Hotel buffet, selected Italian restaurant unconfirmed.'
  if reason:excluded.append(dict(venue=r['id'],author=c['author'],date=c['date'],source=c['source'],reason=reason));continue
  # Author alone cannot establish that this is the earlier excerpt's review.
  old=venues[r['id']]
  if c['author']==old.get('reviewAuthor') and norm(old.get('reviewTextEn','')) and norm(old['reviewTextEn']) in norm(c.get('content','')):
   c['replacesLegacy']='legacy-'+r['id'];c['legacyMatchEvidence']='same source and author; normalized original excerpt occurs in this review body'
  c['summary']=summary;c.pop('title',None);keep.append(c)
 r['comments']=keep
(ROOT/'research/v7/.raw-cache/reviews-web-new.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
(ROOT/'research/v7/review-exclusions.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2)+'\n')
print('Accepted',sum(len(r['comments']) for r in rows),'records; excluded',len(excluded))
