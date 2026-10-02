# -*- coding: utf-8 -*-
"""Produce short bilingual review summaries from attributed public records.
Topic summaries are deliberately neutral: a star rating is not a sentiment label.
"""
import json,re,datetime,hashlib,unicodedata
from pathlib import Path
root=Path(__file__).resolve().parents[1]
venues=json.loads((root/'restaurants-v4.js').read_text().split('=',1)[1].strip().rstrip(';'))
raw=[]
sourceFiles=sorted({f.name:f for f in (root/'research/v5').glob('reviews*public.json')}.values())
cache=root/'research/v5/.review-cache';cache.mkdir(exist_ok=True)
for f in sourceFiles:
 rows=json.loads((cache/f.name if (cache/f.name).exists() else f).read_text())
 raw.extend(rows)
# V6 sources are fully reproducible from committed summaries. Raw bodies are optional.
v6=root/'research/v6';v6Cache=v6/'.raw-cache'
v6Files=sorted({f.name:v6/f.name for f in list(v6.glob('reviews-*.json'))+list(v6Cache.glob('reviews-*.json'))}.values()) if v6.exists() else []
for f in v6Files:
 rows=json.loads((v6Cache/f.name if (v6Cache/f.name).exists() else f).read_text())
 raw.extend(rows)
topics=[('椰子鸡|椰子雞','椰子鸡汤','coconut chicken broth'),('乳鸽|乳鴿','乳鸽','roast pigeon'),('虾饺|蝦餃','虾饺','shrimp dumplings'),('烧鹅|燒鵝|卤鹅|鹵鵝','烧卤鹅','roast or braised goose'),('叉烧|叉燒','叉烧','char siu'),('肠粉|腸粉|红米肠|紅米腸','肠粉','rice rolls'),('奶茶','奶茶','milk tea'),('菠萝|菠蘿','菠萝包','pineapple buns'),('蛋挞|蛋撻','蛋挞','egg tarts'),('豆腐','豆腐','tofu'),('火腿','火腿','ham'),('海鲜|海鮮','海鲜','seafood'),('生蚝|生蠔|鲜蚝|鮮蠔','蚝鲜','oysters'),('鹅掌|鵝掌','鹅掌','goose feet'),('火锅|火鍋','火锅','hot pot'),('粥','粥品','congee'),('早茶|点心|點心','早茶点心','dim sum'),('烤鸭|燒鴨|烧鸭','烤鸭','roast duck'),('牛排|牛扒|牛肉','牛肉菜品','beef dishes'),('羊排|羊肉','羊肉菜品','lamb'),('披萨|披薩|pizza','披萨','pizza'),('意面|意粉|千层面|千層麵|pasta','意式面食','pasta'),('咖喱|curry','咖喱','curry'),('烤饼|烤餅|馕|naan','烤饼','naan'),('下午茶','下午茶','afternoon tea'),('蛋糕|甜品|甜点|甜點','甜品','desserts'),('自助','自助选择','buffet selection'),('服务|服務','服务','service'),('环境|環境|装修|裝修|氛围|氛圍','环境氛围','atmosphere'),('风景|風景|景色|海景|夜景|高空|视野|視野','景观','views'),('排队|排隊|等位|等候','排队等位','waiting times'),('贵|貴|价格|價格|价钱|價錢|性价比|性價比','价格感受','value')]
# Hand-edited summaries of the first visible records. Each is a paraphrase, not a quote.
curated={
'162845570':('推荐浓郁奶茶配鸡肉派与茶点。','Recommends rich milk tea with chicken pie and pastries.'),
'161326355':('环境服务不错，菠萝油的黄油未融。','Likes the setting and service; the bun butter stayed firm.'),
'161894603':('点心、烤乳鸽和粥都合口味。','Enjoys the dim sum, roast pigeon and congee.'),
'161993915':('停车方便，湖边环境与服务加分。','Appreciates easy parking, the lakeside setting and service.'),
'165183366':('出品稳定、卫生不错，建议提升服务。','Consistent food and cleanliness; suggests improving service.'),
'169847681':('食材新鲜，摆盘与服务令人满意。','Praises fresh ingredients, presentation and service.'),
'162593179':('肠粉不错，部分点心和座位间距欠佳。','Likes rice rolls; some dim sum and tight seating disappoint.'),
'162195585':('现烤乳鸽令人满意，服务到位。','Enjoys freshly roasted pigeon and attentive service.'),
'183291788':('空间虽小，适合朋友聚会和拍照。','A small, attractive setting for gathering with friends.'),
'770821332':('潮汕风味结合现代呈现，适合宴请。','Enjoys modern Chaozhou cooking and the occasion-worthy setting.'),
'770823397':('鹅掌、海参与菜脯粥令人印象深刻。','Goose feet, sea cucumber and preserved-radish congee stand out.'),
'167041265':('喜欢菜品做法与店内氛围。','Enjoys the cooking style and restaurant atmosphere.'),
'709570282':('环境安静，适合边用餐边交谈。','Finds the quiet setting good for conversation.'),
'183291025':('龙虾泡饭与油条是用餐亮点。','Highlights lobster rice soup and freshly fried dough sticks.'),
'204986258':('赞赏火腿与粤菜结合的创新。','Appreciates creative combinations of ham and Cantonese cooking.'),
'707209105':('赞赏厨师的细节创新和时令食材。','Praises technical creativity and seasonal ingredients.'),
'162030533':('喜欢豆浆油条、榴莲酥和绵滑粥。','Enjoys soy milk, dough sticks, durian pastries and congee.'),
'161958986':('乳鸽与榴莲酥不错，饭点需等位。','Likes pigeon and durian pastries; expects a peak-time wait.'),
'713300820':('建议油条趁热吃，口感更酥脆。','Suggests eating the dough sticks hot for their crispness.'),
'713300785':('粥底米香足，适合涮海鲜。','Enjoys the fragrant congee broth with seafood.'),
'186488240':('喜欢靠窗座位、阳光和绿植氛围。','Enjoys the window seats, sunlight and greenery.'),
'186616487':('景观漂亮，宫保虾球合口味。','Likes the views and kung pao prawns.'),
'706821095':('贝类与冰镇蚝鲜带来夏日风味。','Highlights shellfish and chilled oysters for a summer meal.'),
'246073458':('鳗鱼与不同做法的蚝鲜令人印象深刻。','Discusses memorable eel and several oyster preparations.'),
'162188586':('乳鸽皮脆肉香，环境较普通。','Enjoys crisp roast pigeon; finds the setting ordinary.'),
'163831134':('偏爱光明乳鸽，桑叶和米酒甜品加分。','Prefers Guangming pigeon; enjoys mulberry leaves and rice-wine dessert.'),
'192935219':('觉得菜品精致。','Finds the food carefully presented.'),
'169845920':('叉烧与胜瓜不错，服务热情。','Enjoys char siu and luffa, with attentive service.'),
'168369306':('庭院环境漂亮，炒饭与酥豆腐出色。','Enjoys the courtyard, fried rice and crisp tofu.'),
'171716814':('喜欢宝安这家店的特色主题。','Likes this Bao’an branch and its distinctive setting.'),
'709862791':('现炒湘菜下饭，建议多备米饭。','Freshly cooked spicy Hunan dishes pair well with rice.'),
'709862812':('大圆桌适合朋友聚餐，上菜快。','Large round tables and quick service suit group dining.'),
'711970589':('酿豆腐柔软入味，周末建议早到。','Enjoys tender stuffed tofu; suggests arriving early on weekends.'),
'711970610':('菜量足，适合家庭或朋友聚餐。','Generous portions suit a family or small group.'),
'709740725':('卤水与生腌不错，忙时上菜偏慢。','Likes braised goose and marinated shrimp; busy service is slower.'),
'709740746':('喜欢自制叉烧的入味与焦脆边。','Enjoys the house-made char siu and its crisp edges.'),
'710795450':('绿植与傍晚靠窗座位令人放松。','Greenery and evening window seats feel relaxing.'),
'710795429':('竹笙椰子鸡汤清甜，鸡肉嫩。','Enjoys sweet coconut broth, bamboo fungus and tender chicken.'),
'161889253':('菜品服务稳定，价格较高但觉得值得。','Finds the food and service polished despite higher prices.'),
'213962778':('看重粤菜基本功与稳定出品。','Appreciates solid Cantonese technique and consistent cooking.'),
'168087487':('复古装潢吸引人，脆皮豆腐推荐。','Likes the ornate retro setting and recommends crisp tofu.'),
'163183254':('喜欢中式庭院氛围与精致粤菜。','Enjoys the traditional-style setting and refined Cantonese dishes.'),
'193997693':('环境与服务体验令人满意。','Praises the setting and service.'),
'174663630':('凤爪与咸水角不错，肠粉和速度欠佳。','Likes chicken feet and dumplings; rice rolls and speed disappoint.'),
'166274178':('湘菜辣度可选，口味较地道。','Finds the Hunan cooking fairly authentic with varied heat levels.'),
'164994796':('湘菜味道与价格适中，店内干净。','Finds the Hunan dishes reasonably priced in a clean setting.'),
'162543732':('喜欢鹅的味道，分量足到打包。','Enjoys the goose; generous portions leave leftovers.'),
'161757853':('鹅肉味道不错，服务及时。','Likes the goose and prompt, responsive service.'),
'718344894':('关注潮菜传承与新派菜肴。','Discusses traditional and contemporary Chaozhou cooking.'),
'206945544':('服务专业热情，推荐贴合需求。','Appreciates warm, professional service and tailored recommendations.'),
'166446881':('一人早茶体验不错，人多更易分摊。','Enjoys solo dim sum; groups can share the cost.'),
'161504096':('茶点经典，节假日建议提前取号。','Likes classic dim sum; suggests joining the holiday queue early.'),
'180866759':('红米肠、虾饺与椰汁糕值得点。','Recommends red rice rolls, shrimp dumplings and coconut cake.'),
'160818361':('茶点有亮点，手机点餐不方便。','Some dim sum stands out; mobile ordering feels awkward.'),
'163637779':('乳鸽酥嫩，蚝仔泡饭鲜美。','Enjoys crisp pigeon and flavorful oyster rice soup.'),
'165092904':('喜欢趁热油条和鲍汁凤爪。','Enjoys hot dough sticks and chicken feet in abalone sauce.'),
'166100925':('点心选择多，茶位费和收碟声欠佳。','Likes dim sum variety; tea charges and clearing noise disappoint.'),
'162896338':('上菜快，建议人齐后点餐。','Service is quick; suggests ordering after everyone arrives.'),
'162208751':('火锅与服务不错，价格稍高。','Enjoys the hot pot and service despite higher prices.'),
'680190148':('服务热情周到，让人觉得贴心。','Finds the staff warm and attentive.'),
'163872416':('菜品新鲜、服务好，建议提前预约。','Praises fresh dishes and service; recommends a reservation.'),
'167422176':('喜欢汤与大块牛肉的搭配。','Enjoys the soup and generous beef pieces.'),
'161270166':('椰子鸡汤清甜，煲仔饭锅巴香。','Enjoys sweet coconut broth and crisp claypot-rice edges.'),
'166206203':('鸡肉配沙姜好吃，推荐香芋煲仔饭。','Likes chicken with sand ginger and taro claypot rice.'),
'161808659':('古典环境配川菜，价格可接受。','Enjoys Sichuan cooking in a traditional setting at acceptable prices.'),
'167166489':('对甜品体验评价尚可。','Finds the dessert experience acceptable.'),
'708394877':('市井氛围熟悉，桌椅干净。','Likes the everyday neighborhood feel and clean tables.'),
'708394856':('店铺较隐蔽，饭点建议早到。','Finds it tucked away; recommends arriving before lunch crowds.'),
'166928322':('环境适合家庭，觉得粥价格偏高。','Likes the family-friendly setting; finds the congee pricey.'),
'161162877':('户外环境舒服，人多时上菜偏慢。','Enjoys outdoor seating; service slows when busy.'),
'179729671':('虾饺与甜品好吃，服务热情。','Enjoys shrimp dumplings, desserts and attentive service.'),
'179642368':('推荐虾饺和松软马拉糕。','Recommends shrimp dumplings and soft steamed sponge cake.'),
'543620400':('牛羊扒与寿司选择丰富，服务热情。','Enjoys the steak, lamb and sushi selection with warm service.'),
'175144008':('品种丰富，可请服务员协助取饮品。','Likes the variety and staff help with drinks.'),
'168128333':('高空景观、蛋糕与家庭服务加分。','Appreciates high-floor views, cakes and family-friendly service.'),
'171780268':('景观服务出色，午餐没有刺身略遗憾。','Praises views and service; misses sashimi at weekday lunch.'),
'169421393':('喜欢京味烤鸭与川菜的融合。','Enjoys the combination of Beijing-style duck and Sichuan cooking.'),
'164920182':('烤鸭现场片切，虾球与鳕鱼也不错。','Enjoys carved roast duck, prawns and cod.'),
'773264913':('赞赏虾球、文思豆腐等创新。','Appreciates creative prawns and finely cut tofu.'),
'219875209':('关注淮扬手艺与潮汕食材的交流。','Discusses Huaiyang technique and Chaozhou ingredients.'),
'174441656':('上菜快、口味清爽，店员帮忙拍照。','Likes quick service, lighter flavors and staff help with photos.'),
'175938053':('高空景观与纪念日安排令人满意。','Enjoys the high-floor views and thoughtful anniversary touches.')}

def summarize(c):
 if c.get('summary'):return c['summary']
 key=str(c['id'])
 if key in curated:return dict(zip(['zh','en'],curated[key]))
 s=c.get('content','');found=[(z,e) for rx,z,e in topics if re.search(rx,s,re.I)][:2]
 if found:return {'zh':'点评提到'+ '、'.join(z for z,e in found)+'。','en':'Discusses '+ ' and '.join(e for z,e in found)+'.'}
 return {'zh':'分享了这家店的用餐体验。','en':'Shares a personal dining experience at this venue.'}
def date(s):
 if not s:return ''
 m=re.search(r'/Date\((\d+)',str(s))
 if m:return datetime.datetime.fromtimestamp(int(m[1])/1000,datetime.timezone(datetime.timedelta(hours=8))).date().isoformat()
 if re.fullmatch(r'\d{13}',str(s)):return datetime.datetime.fromtimestamp(int(s)/1000,datetime.timezone(datetime.timedelta(hours=8))).date().isoformat()
 return str(s)[:10]
records={};texts={}
for venue in raw:
 if not venue.get('comments'):continue
 items=records.setdefault(venue['id'],[]);seen={str(x['id']) for x in items}
 for c in venue['comments']:
  if not (c.get('content','').strip() or c.get('summary')) or str(c['id']) in seen:continue
  if c.get('content'):
   body=unicodedata.normalize('NFKC',c['content']).casefold()
   c['fingerprint']=hashlib.sha256(re.sub(r'[^\w]','',body).encode()).hexdigest()
  if c.get('fingerprint') and any(x.get('fingerprint')==c['fingerprint'] for x in items):continue
  seen.add(str(c['id']));items.append({'id':str(c['id']),'author':c.get('author') or 'Platform user','text':summarize(c),'score':c.get('score'),'date':date(c.get('date')),'source':c['source'],'fingerprint':c.get('fingerprint'),'idKind':c.get('idKind','platform_review_id'),'sourceVisibility':c.get('sourceVisibility','main'),'platform':c.get('platform') or ('Trip.com' if 'trip.com/' in c['source'] and 'ctrip.com' not in c['source'] else '携程 / Ctrip')})
# Preserve the earlier attributed review when it is a different author.
for r in venues:
 sourceId=r['id'].replace('local-v4-','')
 items=records.setdefault(sourceId,[])
 if r.get('reviewTextEn') and not any(x['author']==r['reviewAuthor'] for x in items):
  items.insert(0,{'id':'legacy-'+sourceId,'author':r['reviewAuthor'],'text':{'zh':r['reviewTextZh'],'en':r['reviewTextEn']},'score':None,'date':r.get('reviewDate',''),'source':r['reviewSource'],'platform':'Tripadvisor' if 'tripadvisor' in r['reviewSource'] else 'Ctrip / Trip.com'})
 if r['id'].startswith('local-v4-'):records[r['id']]=items
(root/'reviews-v5.js').write_text('/* Public review summaries with author/date/score/source. No synthetic reviewers. */\nconst V5_REVIEWS='+json.dumps(records,ensure_ascii=False,separators=(',',':'))+';\n')
counts=[len(records[r['id']]) for r in venues]
print('Venues',len(venues),'with 2+ reviews',sum(n>=2 for n in counts),'with 10+ reviews',sum(n>=10 for n in counts),'unique review IDs',len({c['id'] for rs in records.values() for c in rs}))
# Commit attribution facts and brief summaries, without republishing full review bodies.
for f in sourceFiles+v6Files:
 rawDir=cache if f.parent.name=='v5' else v6Cache
 rows=json.loads((rawDir/f.name if (rawDir/f.name).exists() else f).read_text())
 for v in rows:
  v.pop('taComments',None)
  for c in v.get('comments',[]):
   c['summary']=summarize(c);c['date']=date(c.get('date'));
   if c.get('content'):c['fingerprint']=hashlib.sha256(re.sub(r'[^\w]','',unicodedata.normalize('NFKC',c['content']).casefold()).encode()).hexdigest()
   c.pop('content',None);c.pop('translated',None);c.pop('title',None)
 f.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
