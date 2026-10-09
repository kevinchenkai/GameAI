"""Build 200 origin-specific gift options: 50 craft/food families × 4 meaningful specifications.
These are inquiry options, not merchant SKUs, inventory or certified-origin claims.
"""
from pathlib import Path
import json
rows='''tea|浙江杭州西湖|West Lake, Hangzhou, Zhejiang|西湖龙井|West Lake Longjing|扁平绿茶，选购时核对西湖产区与采摘季。|Flat-leaf green tea; verify the West Lake origin and harvest season.
tea|江苏苏州洞庭山|Dongting Hills, Suzhou, Jiangsu|洞庭山碧螺春|Dongting Biluochun|卷曲细嫩的绿茶，核对东山或西山产区。|Curled green tea; ask for its Dongshan or Xishan growing area.
tea|安徽黄山|Huangshan, Anhui|黄山毛峰|Huangshan Maofeng|条形绿茶，适合从清淡冲泡开始认识徽茶。|Slender green tea; begin with a light infusion to explore Anhui tea.
tea|安徽六安|Lu’an, Anhui|六安瓜片|Lu’an Guapian|以单片叶形见长的绿茶，可比较叶片完整度。|Leaf-shaped green tea; compare leaf integrity when choosing.
tea|安徽黄山太平|Taiping, Huangshan, Anhui|太平猴魁|Taiping Houkui|叶片宽长的绿茶，选择能保护完整叶形的包装。|Long, broad green-tea leaves need packaging that prevents breakage.
tea|河南信阳|Xinyang, Henan|信阳毛尖|Xinyang Maojian|细紧条索的绿茶，询问采摘时节和储存方式。|Fine green-tea strands; ask about harvest timing and storage.
tea|贵州都匀|Duyun, Guizhou|都匀毛尖|Duyun Maojian|贵州山地绿茶，先比较干茶香与冲泡口感。|A Guizhou green tea; compare dry-leaf aroma and brewed taste.
tea|四川雅安名山|Mingshan, Ya’an, Sichuan|蒙顶甘露|Mengding Ganlu|四川卷曲型绿茶，适合小份试饮后再选大包装。|Curled Sichuan green tea; try a small pack before a larger purchase.
tea|四川峨眉山|Emeishan, Sichuan|峨眉山绿茶|Emeishan green tea|以峨眉山产区为选购线索，核对实际品种而非只看景区名。|Choose by growing area and verify the variety, not just the scenic name.
tea|江西庐山|Lushan, Jiangxi|庐山云雾|Lushan Yunwu|江西绿茶，适合喜爱清爽茶汤的收礼人。|Jiangxi green tea for someone who enjoys a light, fresh infusion.
tea|福建安溪|Anxi, Fujian|安溪铁观音|Anxi Tieguanyin|乌龙茶，先说明偏好清香型还是浓香型。|Oolong tea; specify whether you prefer light or stronger roasting.
tea|福建武夷山|Wuyishan, Fujian|武夷肉桂|Wuyi Rougui|武夷岩茶品种，焙火程度影响口感，先询问再选购。|A Wuyi oolong variety; ask about roast level before choosing.
tea|福建武夷山|Wuyishan, Fujian|武夷水仙|Wuyi Shuixian|武夷乌龙茶，适合比较不同焙火风格。|Wuyi oolong for exploring different roasting styles.
tea|广东潮州凤凰镇|Fenghuang, Chaozhou, Guangdong|凤凰单丛|Fenghuang Dancong|潮州乌龙茶，询问具体香型，避免把香型名称当香精添加。|Chaozhou oolong; ask for the aroma cultivar and ingredient label.
tea|福建福鼎|Fuding, Fujian|福鼎白牡丹|Fuding Bai Mudan|芽叶相间的白茶，核对年份与储存条件。|Bud-and-leaf white tea; verify production year and storage.
tea|福建福鼎|Fuding, Fujian|福鼎寿眉|Fuding Shoumei|以叶片为主的白茶，可比较散茶与紧压形式。|Leaf-forward white tea; compare loose and compressed formats.
tea|安徽祁门|Qimen, Anhui|祁门红茶|Qimen black tea|安徽红茶，适合从原味清饮开始体验。|Anhui black tea; start without milk or sugar to explore its flavor.
tea|云南凤庆|Fengqing, Yunnan|凤庆滇红|Fengqing Dianhong|云南大叶种红茶，适合喜欢较饱满茶汤的人。|Yunnan large-leaf black tea for a fuller-bodied infusion.
tea|云南普洱|Pu’er, Yunnan|云南普洱熟茶|Yunnan ripe pu’er|后发酵茶，确认原料产地、生产日期与储存说明。|Post-fermented tea; check leaf origin, production date and storage.
tea|广西梧州六堡|Liubao, Wuzhou, Guangxi|梧州六堡茶|Wuzhou Liubao tea|广西黑茶，先小份试饮，不以年份故事替代品质判断。|Guangxi dark tea; taste first rather than relying on age claims.
style|江苏苏州吴江盛泽|Shengze, Wujiang, Suzhou|盛泽桑蚕丝素色方巾|Shengze solid silk scarf|以吴江丝绸产地为线索，核对桑蚕丝比例与织造信息。|Explore Wujiang silk and verify mulberry-silk content and weaving details.
style|江苏苏州|Suzhou, Jiangsu|苏绣花卉丝巾|Suzhou floral embroidery scarf|花卉刺绣题材，核对手工或机绣及丝巾面料。|Floral embroidery; confirm hand or machine stitching and scarf fabric.
style|江苏苏州|Suzhou, Jiangsu|宋锦纹样丝巾|Song-brocade motif scarf|选择宋锦纹样灵感配饰，区分印花与真正织锦。|Song-brocade-inspired motifs; distinguish printed designs from woven brocade.
style|浙江杭州|Hangzhou, Zhejiang|杭州西湖印花真丝巾|Hangzhou West Lake print scarf|把西湖风景化作印花，核对设计授权与洗护标签。|West Lake-inspired print; check design rights and care instructions.
style|浙江杭州|Hangzhou, Zhejiang|杭州双绉真丝巾|Hangzhou silk crepe scarf|双绉有细微绉感，适合偏爱柔和垂坠质感的人。|Silk crepe has a lightly textured drape for understated styling.
style|浙江湖州|Huzhou, Zhejiang|湖州桑蚕丝缎面巾|Huzhou satin silk scarf|缎面有光泽，购买时比较面料厚薄与边缘处理。|Glossy satin; compare fabric weight and edge finishing.
style|四川成都|Chengdu, Sichuan|蜀锦纹样丝巾|Shu-brocade motif scarf|成都织锦题材，确认是织锦面料还是印花再现。|Chengdu brocade motifs; verify woven fabric versus printed reproduction.
style|四川成都|Chengdu, Sichuan|蜀绣花鸟丝巾|Shu floral-and-bird embroidery scarf|花鸟题材绣饰，询问绣法、成分与反面做工。|Bird-and-flower embroidery; ask about stitching, fibers and reverse finishing.
style|广东佛山顺德|Shunde, Foshan, Guangdong|顺德香云纱小巾|Shunde gambiered silk scarf|香云纱工艺题材，核对薯莨染整与真实面料信息。|Gambiered-silk tradition; verify yam-dye finishing and fabric composition.
style|江苏南京|Nanjing, Jiangsu|南京云锦纹样丝巾|Nanjing cloud-brocade motif scarf|云锦纹样主题配饰，印花款不等同于手工云锦。|Cloud-brocade-inspired accessories; a print is not handwoven yunjin.
home|江西景德镇|Jingdezhen, Jiangxi|景德镇青花瓷|Jingdezhen blue-and-white porcelain|蓝白纹样的瓷器选礼，核对釉面、落款与包装。|Blue-and-white porcelain; inspect glaze, maker marks and packaging.
home|江西景德镇|Jingdezhen, Jiangxi|景德镇玲珑瓷|Jingdezhen rice-grain porcelain|透光玲珑装饰，轻照查看细节与器壁状态。|Translucent rice-grain decoration; inspect it against the light.
home|江西景德镇|Jingdezhen, Jiangxi|景德镇粉彩瓷|Jingdezhen famille-rose porcelain|粉彩题材细腻，手绘与贴花应由卖家明确说明。|Famille-rose decoration; ask whether it is hand-painted or transferred.
home|浙江龙泉|Longquan, Zhejiang|龙泉青瓷|Longquan celadon|青釉器物，可比较釉色、器型和触感。|Celadon ware; compare glaze color, form and feel.
home|福建德化|Dehua, Fujian|德化白瓷|Dehua white porcelain|以白瓷质感呈现简洁茶席，运输需防震。|White porcelain for a quiet tea setting; request protective packing.
home|江苏宜兴|Yixing, Jiangsu|宜兴紫砂茶器|Yixing clay teaware|宜兴陶作选购方向，不以名家或稀有泥料作未经证实的承诺。|Yixing clay teaware; avoid unverified master-maker or rare-clay claims.
home|云南建水|Jianshui, Yunnan|建水紫陶|Jianshui purple pottery|建水陶艺题材，比较刻填装饰与打磨效果。|Jianshui pottery; compare carved-inlay decoration and polished finish.
home|广西钦州|Qinzhou, Guangxi|钦州坭兴陶|Qinzhou Nixing pottery|地方陶艺茶器，窑变色泽因具体器物而异。|Regional pottery; firing colors vary from piece to piece.
home|广东潮州枫溪|Fengxi, Chaozhou, Guangdong|潮州工夫茶瓷器|Chaozhou gongfu porcelain|适合工夫茶小份多泡的用茶方式，先确认容量。|Compact teaware for repeated gongfu infusions; confirm capacity.
home|湖南醴陵|Liling, Hunan|醴陵釉下彩瓷|Liling underglaze-color porcelain|釉下彩纹样茶器，询问工艺与食品接触适用性。|Underglaze-decorated teaware; verify technique and food-contact suitability.
food|广东深圳|Shenzhen, Guangdong|深圳云片糕|Shenzhen cloud cake|薄片糕点适合分享，核对配料和独立包装。|Thin sweet slices for sharing; check ingredients and individual wrapping.
food|广东中山|Zhongshan, Guangdong|中山杏仁饼|Zhongshan almond-style biscuits|传统酥饼，名称不代表只有杏仁原料，需读过敏原标签。|Traditional crumbly biscuits; read the actual ingredients and allergen label.
food|广东潮州|Chaozhou, Guangdong|潮州腐乳饼|Chaozhou fermented-beancurd pastry|咸甜风味较鲜明，配料可能含肉类，先确认目的地携带要求。|Distinctive savory-sweet pastry; some recipes contain meat, so check ingredients.
food|广东佛山|Foshan, Guangdong|佛山盲公饼|Foshan mung-bean biscuits|岭南饼食，比较原味与馅料款并核对保质期。|Lingnan biscuits; compare fillings and check shelf life.
food|广东惠州|Huizhou, Guangdong|惠州梅菜|Huizhou preserved mustard greens|适合喜欢下厨的朋友，选密封干货并确认盐度。|A cooking gift; choose sealed packs and ask about salt content.
food|广东江门新会|Xinhui, Jiangmen, Guangdong|新会陈皮|Xinhui dried mandarin peel|柑皮干货，核对产区、年份与储存信息。|Dried mandarin peel; verify region, age and storage details.
food|江苏苏州|Suzhou, Jiangsu|苏州枣泥麻饼|Suzhou date-paste sesame pastry|枣泥与芝麻风味，适合短途携带，注意坚果和芝麻过敏原。|Date paste and sesame pastry; check freshness and allergens.
food|浙江杭州|Hangzhou, Zhejiang|杭州桂花糕|Hangzhou osmanthus cake|桂花题材糕点，常温保质期与冷藏要求依实际商品确认。|Osmanthus-flavored cakes; verify storage and shelf life for the actual product.
food|四川成都|Chengdu, Sichuan|成都灯影牛肉|Chengdu thin-sliced beef snack|薄片牛肉零食，确认辣度、成分与目的地肉制品携带规定。|Thin beef snacks; confirm spice level, ingredients and destination import rules.
food|云南昆明|Kunming, Yunnan|云南鲜花饼|Yunnan flower pastries|食用玫瑰题材酥饼，核对馅料、生产日期与运输防压。|Rose-filled pastries; check filling, production date and crush protection.'''
bi=lambda z,e:{'zh':z,'en':e}
variants={
 'tea':[('试饮装 25g','25g tasting pack'),('随行装 50g','50g travel pack'),('分享装 100g','100g sharing pack'),('家用装 200g','200g home pack')],
 'style':[('小方巾 53×53cm','53×53cm pocket square'),('中方巾 70×70cm','70×70cm square'),('大方巾 90×90cm','90×90cm square'),('长巾 160×35cm','160×35cm long scarf')],
 'home':[('品茗杯 约50ml','Tasting cup · about 50ml'),('茶杯 约100ml','Tea cup · about 100ml'),('公道杯 约180ml','Serving pitcher · about 180ml'),('带盖杯 约250ml','Lidded cup · about 250ml')],
 'food':[('尝鲜装 100g','100g tasting pack'),('分享装 200g','200g sharing pack'),('家庭装 300g','300g family pack'),('礼赠装 500g','500g gift pack')]}
images={'tea':'02','style':'04','home':'03','food':'01'}
items=[]
for n,line in enumerate(rows.splitlines()):
 c,oz,oe,nz,ne,dz,de=line.split('|')
 image=f'assets/product-{images[c]}-v3.webp'
 if c=='tea': image='assets/'+('tea-green' if n<10 else 'tea-oolong' if n<14 else 'tea-dark' if n>=18 else 'product-02')+('-v3.webp' if 14<=n<18 else '-v4.webp')
 if c=='style' and n in [22,26,29]:image='assets/silk-brocade-v4.webp'
 if c=='style' and n==28:image='assets/silk-dark-v4.webp'
 if c=='home' and n==33:image='assets/ceramic-celadon-v4.webp'
 if c=='home' and n in [35,36,37]:image='assets/ceramic-clay-v4.webp'
 if c=='food' and n in [41,42,43,46,47,49]:image='assets/food-pastry-v4.webp'
 if c=='food' and n==45:image='assets/food-peel-v4.webp'
 for j,(sz,se) in enumerate(variants[c]):
  items.append(dict(id=f'gift-{n+1:02d}-{j+1}',name=bi(nz+' · '+sz,ne+' · '+se),category=c,origin=bi(oz,oe),desc=bi(dz,de),spec=bi(sz,se),tip=bi('咨询时确认实际产地、规格、材质／配料、价格与交付。目录为选购方向，非现货承诺。','Confirm actual origin, specification, materials/ingredients, price and delivery. This is an inquiry option, not an in-stock listing.'),image=image,audience=['friends','family','business','family'][j],scores={'portable':5-j//2,'culture':5,'gift':3+j//2},family=n+1,region=bi(oz.split('省')[0] if '省' in oz else oz[:2],oe.split(', ')[-1]),price=None))
assert len(items)==200 and len({i['name']['zh'] for i in items})==200
Path(__file__).resolve().parents[1].joinpath('gifts-v4.js').write_text('/* 200 inquiry specifications; 50 regional families. No fabricated inventory or prices. */\nconst V4_GIFTS='+json.dumps(items,ensure_ascii=False,separators=(',',':'))+';\n')
