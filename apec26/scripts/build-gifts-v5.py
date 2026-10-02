# -*- coding: utf-8 -*-
"""Build 8 × 20 source-backed product cards from saved public listing facts."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'research/v5/products-public.json').read_text());out=[]
verified={r['sku']:r for r in json.loads((root/'research/v6/product-verification.json').read_text())}
labels={'tea':('中国茶叶','Chinese tea'),'magnet':('文创冰箱贴','Souvenir magnets'),'scarf':('丝巾','Silk scarves'),'fan':('折扇','Folding fans'),'porcelain':('中国瓷器','Chinese porcelain'),'panda':('熊猫玩偶','Panda plush'),'incense':('东方香薰','Chinese fragrance'),'seal':('篆刻印章','Carved seals')}
terms=[('金骏眉','Jin Jun Mei'),('龙井','Longjing'),('碧螺春','Biluochun'),('铁观音','Tieguanyin'),('正山小种','Lapsang Souchong'),('普洱','Pu’er'),('白茶','White tea'),('绿茶','Green tea'),('红茶','Black tea'),('苏绣','Suzhou embroidery'),('牡丹','Peony'),('荷花','Lotus'),('牡丹时','Peony Time'),('中国风','Chinese motif'),('千里江山','A Thousand Miles of Rivers and Mountains'),('宁静致远','Quiet contemplation'),('水墨竹','Ink bamboo'),('清风翠竹','Bamboo breeze'),('上善若水','Water-inspired calligraphy'),('青田石','Qingtian stone'),('寿山石','Shoushan stone'),('玉石','Jade-style stone'),('青花','Blue-and-white'),('影青','Yingqing glaze'),('青瓷','Celadon'),('白瓷','White porcelain'),('鹅梨','Pear-inspired incense'),('桂花','Osmanthus'),('桂雨','Osmanthus rain'),('檀香','Sandalwood'),('沉香','Agarwood'),('茶清','Tea scent'),('母子熊猫','Parent & baby panda'),('花花熊猫','Huahua panda'),('趴趴','Lying panda'),('挂件','Bag charm'),('抱枕','Cushion')]
notes={
 'tea':('从口味、包装与净含量选茶礼。茶类和产地描述取自商家公开名称，询价时确认实际产地与生产日期。','Compare flavor, packaging and weight. Ask the contact to confirm origin and production date.'),
 'magnet':('用一个小物件带走城市与文化图案。款式以公开商品图片与名称为参考，确认材质和实际尺寸。','A small keepsake with a city or cultural motif. Confirm the material and dimensions of the selected design.'),
 'scarf':('从苏绣、花卉与国风图案挑选日常可用的礼物。丝绸成分以实际商品标签为准。','Choose embroidery or floral motifs for an everyday gift. Confirm the fabric composition on the actual label.'),
 'fan':('折叠后方便收纳，可选择水墨、书法或传统花卉图案。购买时核对扇骨、扇面材质与尺寸。','A folding keepsake with ink art, calligraphy or floral motifs. Confirm frame, leaf material and size.'),
 'porcelain':('把茶器与器物之美带回家。选择合适容量，联系确认包装防护与运输安排。','Bring home a practical piece of ceramic design. Confirm capacity, protective packaging and delivery.'),
 'panda':('国宝熊猫主题的柔软礼物。挂件适合轻装旅行，较大玩偶请先确认行李空间和实际尺寸。','A soft panda-themed gift. Charms suit light packing; check the size and luggage space for larger plush toys.'),
 'incense':('东方香气与茶歇氛围。按香型和形态选礼，联系确认配料、使用方式和包装。','Choose an Eastern-inspired scent for a quiet tea break. Confirm ingredients, use and packaging.'),
 'seal':('让姓名或一句喜欢的话成为纪念。确认石料、印面尺寸、刻字内容与制作时间。','Turn a name or a favorite phrase into a keepsake. Confirm stone, size, inscription and production time.')}
for cat,rows in data.items():
 assert len(rows)==20,(cat,len(rows))
 for rank,row in enumerate(rows,1):
  title=row['title'];spec=row['selectedSpec'] or '款式请联系确认';brand=verified.get(row['sku'],{}).get('brand',{}).get('value')
  materials={'tea':[],'scarf':['桑蚕丝','真丝'],'fan':['绢布','宣纸','竹','木质'],'magnet':['金属','陶瓷'],'porcelain':['陶瓷','瓷'],'seal':['青田石','寿山石'],'panda':['毛绒'],'incense':[]}
  material=next((w for w in materials[cat] if w in title),None)
  keywords=[en for zh,en in terms if zh in title+' '+spec][:2]
  size=' / '.join(dict.fromkeys(re.findall(r'\d+(?:\.\d+)?\s*(?:[xX*×]\s*\d+(?:\.\d+)?)*\s*(?:cm|厘米|mm|毫米|ml|mL|g|克|寸|件|只|个|支)',title+spec,re.I)))
  short=re.sub(r'【[^】]+】','',title)
  short=re.sub(r'(生日|中秋节|国庆节|教师节|七夕|情人节|六一|儿童节|毕业季).*','',short)
  short=re.sub(r'送老外|送长辈|送妈妈|领导|老丈人|伴手礼|送礼|礼品|高端|高级|特级|高档|正宗|天然|新款|2026新茶|2026新款|新茶','',short).strip()
  short=short[:30]

  nameEn=(keywords[0] if keywords else labels[cat][1])+' · '+(keywords[1] if len(keywords)>1 else 'Style '+str(rank))+((' · '+size[:25]) if size else '')
  nameZh=short+(' · '+spec[:20] if spec not in short else '')
  region=next(((zh,en) for zh,en in [('苏州','Suzhou'),('杭州','Hangzhou'),('武夷','Wuyi'),('景德镇','Jingdezhen'),('成都','Chengdu'),('海南','Hainan'),('青田','Qingtian'),('寿山','Shoushan')] if zh in title),('未标明产地','Origin not specified'))
  descriptionZh=' / '.join(x for x in [region[0] if region[0]!='未标明产地' else '',material,size] if x)+(' · ' if material or size or region[0]!='未标明产地' else '')+spec+'。'+notes[cat][0]
  matEn={'桑蚕丝':'Mulberry silk','真丝':'Silk','绢布':'Fabric','宣纸':'Xuan paper','竹':'Bamboo','青田石':'Qingtian stone','寿山石':'Shoushan stone','陶瓷':'Ceramic','瓷':'Porcelain','金属':'Metal','木质':'Wood','毛绒':'Plush'}.get(material,'')
  descriptionEn=' / '.join(x for x in [region[1] if region[1]!='Origin not specified' else '',matEn,size,' & '.join(keywords)] if x)+'. '+notes[cat][1]
  out.append({'id':'jd-'+row['sku'],'sku':row['sku'],'category':cat,'rank':rank,'name':{'zh':nameZh,'en':nameEn},'merchantTitle':title,'origin':{'zh':region[0],'en':region[1]},'region':{'zh':region[0],'en':region[1]},'desc':{'zh':descriptionZh,'en':descriptionEn},'tip':dict(zip(['zh','en'],notes[cat])),'spec':{'zh':spec,'en':size or 'Design '+str(rank)+' · confirm exact specification'},'image':row['images'][0],'images':row['images'],'brand':brand,'verification':verified.get(row['sku']),'material':material,'dimensions':size or None,'variants':row['variants'],'price':None,'source':row['detailUrl'],'listingSource':row['listing'],'collected':row['collected'],'detailStatus':row['detailStatus'],'scores':{'gift':5,'portable':4 if cat not in ['porcelain','panda'] else 3,'culture':5},'audience':'friends','family':rank})
assert len({g['id'] for g in out})==160
(root/'gifts-v5.js').write_text('/* Public JD listing facts, not a live sales ranking or verified stock. */\nconst V5_GIFTS='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print('Built',len(out),'source-backed products')
