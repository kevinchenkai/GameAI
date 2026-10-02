# -*- coding: utf-8 -*-
"""Only fill explicit merchant listing facts for exactly matched existing SKUs.
Brand labels use manually reviewed full names. No inferred manufacturer model or stock.
"""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
checks=json.loads((ROOT/'research/v7/product-listing-checks.json').read_text())
old={x['sku']:x for rows in json.loads((ROOT/'research/v5/products-public.json').read_text()).values() for x in rows}
previous={x['sku']:x for x in json.loads((ROOT/'research/v6/product-verification.json').read_text())}
brands=['景德镇（jdz）','威尔通（WELTSTON）','福澤天下（Blessing All）','得力（deli）','中国木雕博物馆','MOONCHILD','SunToMoon','GOTOVAN','DEATKN','MPPMCK','ROSHK','喆炜','吉朵芸','磁尚','随效','优学库','大猫日记','壹居长宁','万事利','杭丝路','上海故事','织锦楼','绣娘丝绸','杭丝府','极度空间','慕曦贝儿','繁夏','哥纶','齐选','密爱港湾','妙普乐','八千行','昌南','不拙','古笙记','陶相惠','兮元记','金镶玉','京东京造','富玉','美真香','普云','轩椽阁','香瑞鸿运','楠檀大师','京寻','六品堂','墨香荷','孔府印阁','卓达']
materials=[('100%桑蚕丝','100% mulberry silk'),('桑蚕丝','Mulberry silk'),('真丝','Silk'),('仿真丝','Silk imitation'),('宣纸','Xuan paper'),('青竹','Bamboo'),('亚克力','Acrylic'),('木质','Wood'),('金属','Metal'),('青田石','Qingtian stone'),('毛绒','Plush'),('骨瓷','Bone china'),('陶瓷','Ceramic'),('白瓷','White porcelain'),('沉香','Agarwood'),('檀香','Sandalwood'),('冰丝','Ice-silk label')]
techniques=[('苏绣','Suzhou embroidery'),('手绘','Hand painted'),('描金','Gold-detail painting'),('描银','Silver-detail painting'),('雕刻','Carving'),('影青','Yingqing glaze'),('玲珑','Linglong porcelain'),('釉里红','Underglaze red'),('青花','Blue-and-white decoration'),('扒花','Carved decoration')]
geo=[('海南','Hainan'),('芽庄','Nha Trang'),('惠安','Hui’an'),('景德镇','Jingdezhen'),('苏绣','Suzhou embroidery style'),('成都','Chengdu'),('西安','Xi’an'),('长春','Changchun')]
missingZh={'tea':['产地证明','配料及生产日期'],'magnet':['实际尺寸与材质标签'],'scarf':['成分与尺寸实物标签'],'fan':['扇骨与扇面实物材质'],'porcelain':['实际容量','生产厂家与检测资料'],'panda':['填充物与安全标签'],'incense':['配料','使用与安全说明'],'seal':['实物材料证明','刻字内容与交付时间']}
missingEn={'tea':['proof of origin','ingredients and production date'],'magnet':['actual size and material label'],'scarf':['composition and size label'],'fan':['actual frame and leaf material'],'porcelain':['capacity','manufacturer and test documentation'],'panda':['filling and safety label'],'incense':['ingredients','use and safety instructions'],'seal':['actual material documentation','engraving and lead time']}
out=[]
for c in checks:
 exact=c['status']=='same_sku_public_listing';row=old[c['sku']];title=c.get('title',row['title']);style=c.get('selectedSpec',row.get('selectedSpec') or '')
 v={**c,'verificationLevel':'same_sku_partial_listing' if exact else 'current_sku_unconfirmed','officialDetailVerified':False,'brand':{'value':None,'status':'not_publicly_verified'},'model':{'value':None,'status':'not_publicly_verified'},'style':{'value':style if exact else None,'status':'same_sku_selected_style' if exact and style else 'not_publicly_verified','source':c['source']},'specification':{'value':None,'status':'not_publicly_verified','source':c['source']},'attributes':[],'missingFields':missingZh[c['category']]+['厂家型号'],'missingFieldsEn':missingEn[c['category']]+['manufacturer model'],'rejectedSources':previous.get(c['sku'],{}).get('rejectedSources',[]),'lastVerification':previous.get(c['sku'])}
 if not exact:
  v['missingFields'].insert(0,'本次页面同SKU／同款对应');v['missingFieldsEn'].insert(0,'current page SKU/design match');out.append(v);continue
 brand=next((b for b in brands if title.startswith(b)),None)
 if brand:v['brand']={'value':brand,'status':'merchant_title_only','source':c['source'],'manufacturerVerified':False}
 def attribute(zh,en,value,valueEn=None):v['attributes'].append(dict(label={'zh':zh,'en':en},value={'zh':value,'en':valueEn or value},source=c['source'],status='merchant_listing_only'))
 # Exact design stays intact; these additional fields are explicitly merchant claims.
 candidate=style+' '+title
 # A ceramic holder bundled with incense does not make the incense ceramic.
 allowed={'incense':['沉香','檀香'],'fan':['宣纸','青竹','真丝','仿真丝'],'seal':['青田石']}.get(c['category'])
 mat=next(((z,e) for z,e in materials if z in candidate and (allowed is None or z in allowed)),None)
 if '仿真丝' in candidate:mat=('仿真丝','Silk imitation')
 if mat:attribute('标注材质','Listed material',mat[0],mat[1])
 craft=[(z,e) for z,e in techniques if z in candidate]
 if craft:attribute('标注工艺／纹样','Listed craft / motif',' / '.join(z for z,e in craft),' / '.join(e for z,e in craft))
 # A multi-city family title is not the location of every selected magnet.
 places=[(z,e) for z,e in geo if z in style] or [(z,e) for z,e in geo if z in title]
 place=places[0] if len(places)==1 else None
 if place:attribute('标题地域／文化标注','Listed location / cultural reference',place[0],place[1])
 # Prefer the selected design for numeric specification; do not transfer a different variant.
 unitPattern=r'(?:约)?\d+(?:\.\d+)?(?:\s*(?:cm|mm|厘米|毫米)?\s*[xX*×]\s*\d+(?:\.\d+)?){0,2}\s*(?:cm|厘米|mm|毫米|mL|寸|克|g|米|个|只|支|环|盘|筒|头|杯)'
 safeTitle=re.split(r'【收藏|【赠|赠品|赠送',title)[0]
 safeTitle=re.sub(r'建议身高[:：]?\s*\d+\s*[-–]\s*\d+\s*cm','',safeTitle,flags=re.I)
 units=re.findall(unitPattern,style,re.I)
 titleUnits=re.findall(unitPattern,safeTitle,re.I)
 # Style dimensions take priority, but quantities in the exact SKU title remain usable.
 families=lambda u:'dimension' if re.search(r'cm|mm|厘米|毫米|寸|米',u,re.I) else 'weight' if re.search(r'g|克',u,re.I) else 'volume' if re.search(r'ml',u,re.I) else 'quantity'
 styleFamilies={families(u) for u in units}
 units+= [u for u in titleUnits if families(u) not in styleFamilies]
 units=list(dict.fromkeys(units))
 if units:
  value=' / '.join(units)
  valueEn=value
  for z,e in [('厘米',' cm'),('毫米',' mm'),('克',' g'),('米',' m'),('个',' items'),('只',' pieces'),('支',' sticks'),('环',' coils'),('盘',' coils'),('筒',' tubes'),('头',' pieces'),('杯',' cups'),('约','approx. ')]:valueEn=valueEn.replace(z,e)
  v['specification']={'value':value,'valueEn':valueEn,'status':'title_or_selected_style_only','source':c['source']};attribute('标注尺寸／净量／数量','Listed size / weight / quantity',value,valueEn)
 if re.search(r'手串',title):v['productType']={'zh':'沉香手串','en':'Agarwood bracelet'};v['categoryNote']='Listed under fragrance previously; title describes a bracelet, not a room fragrance.'
 elif c['category']=='panda' and any(x in title for x in ['扩香石','画板','显示器']):
  v['productType']={'zh':'熊猫主题摆件／小物','en':'Panda-themed accessory'};v['categoryNote']='Panda motif, but merchant title does not establish a plush toy.'
 elif c['category']=='seal' and '幼儿园' in title:v['productType']={'zh':'姓名印章','en':'Name stamp'}
 else:v['productType']=None
 if v['productType'] and v['productType']['en']=='Agarwood bracelet':
  v['missingFields']=['木料来源证明','实物珠径与重量','护理方法','厂家型号'];v['missingFieldsEn']=['wood origin documentation','actual bead size and weight','care instructions','manufacturer model']
 elif v['productType'] and v['productType']['en']=='Panda-themed accessory':
  v['missingFields']=['材质与尺寸实物标签','用途说明','厂家型号'];v['missingFieldsEn']=['actual material and size label','use description','manufacturer model']
 out.append(v)
assert len(out)==160
(ROOT/'research/v7/product-verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Verified current listings',sum(x['verificationLevel']=='same_sku_partial_listing' for x in out),'of 160')
print('With explicit new attribute fields',sum(bool(x['attributes']) for x in out),'fields',sum(len(x['attributes']) for x in out))
