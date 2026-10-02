"""Brief bilingual paraphrases of the saved public review blocks; no copied review bodies."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
pairs={}
def add(id,s):pairs[id]=[dict(zip(['zh','en'],x.split('~'))) for x in s.strip().split('\n')]
add('ta-10787269',"""
喜欢意面、披萨与店主交流。~Enjoys pasta, pizza and owner conversations.
生日安排贴心，酒单丰富。~Appreciates birthday touches and wine choices.
食物不错，露台天气偏凉。~Enjoys food; terrace feels cool.
披萨平淡，觉得价格偏高。~Finds pizza average and prices high.
音乐吵，食物服务令人失望。~Dislikes loud music, food and service.
常来吃披萨，店主友善。~Returns for pizza and friendly hospitality.
食物好，晚间音乐太响。~Good food; evening music too loud.
喜欢芝士面疙瘩与甜品。~Enjoys cheese gnocchi and desserts.
赞赏食物、空间与服务。~Praises food, space and service.
前菜好吃，主菜较普通。~Likes starters; main courses average.
""")
add('ta-32764734',"""
肉类丰富，部分出品不稳定。~Varied meats; some dishes inconsistent.
肉质嫩，服务友好。~Enjoys tender meats and friendly staff.
英文沟通顺畅，喜欢烤肉海鲜。~English assistance complements meats and seafood.
巴西客人喜欢烤肉与家乡甜品。~Brazilian guest enjoys meats and familiar desserts.
带孩子用餐也获热情帮助。~Helpful staff welcome families.
喜欢肉质与沙拉吧。~Praises meats and salad choices.
多次回访，喜欢烤肉自助。~Repeated visits for barbecue and buffet.
不吃肉，获协助准备海鲜意面。~Staff arrange seafood pasta for non-meat eater.
喜欢烤菠萝与快速上肉。~Enjoys grilled pineapple and prompt barbecue.
食物充足，店员沟通友善。~Generous food and welcoming communication.
""")
add('ta-32911125',"""
喜欢烤肉、薄饼与酸奶酱。~Enjoys roast meats, flatbread and yogurt sauce.
肉香浓，茶与薄饼合口味。~Likes spiced meat, tea and flatbread.
菜肴与装潢带来土耳其氛围。~Enjoys Turkish flavors and décor.
喜欢烤串与鹰嘴豆泥。~Enjoys kebabs and hummus.
喜欢食物和服务，关注清真选项。~Enjoys food, service and halal options.
烤肉多汁，甜品配红茶不错。~Enjoys juicy roast meats and tea.
喜欢汤与牛肉馅饼。~Likes soup and beef pastries.
喜欢鹰嘴豆泥与果仁蜜饼。~Enjoys hummus and baklava.
环境适合与朋友聚餐。~Enjoys the setting for friends.
土耳其羊肉体验；分店归属待核对。~Turkish lamb experience; branch attribution uncertain.
""")
add('ta-26731850',"""
喜欢调味奶酪与炒饭。~Enjoys spiced paneer and fried rice.
喜欢印度厨师制作的素食。~Enjoys vegetarian dishes by Indian chef.
喜欢奶酪、豆类与用餐氛围。~Enjoys paneer, lentils and atmosphere.
员工友善，但菜品调味欠佳。~Friendly staff; seasoning disappoints.
小吃不错，建议提供辣度选择。~Enjoys snacks; wants adjustable heat.
烤炉前菜好，部分主菜待改善。~Good tandoori starters; some mains disappoint.
喜欢烤虾、咖喱与温暖氛围。~Enjoys prawns, curries and warm atmosphere.
喜欢食物，厨师协助选菜。~Enjoys food and chef recommendations.
菜肴有风味，价格合理。~Flavorful cooking at reasonable prices.
食物有家乡感，经理热心。~Home-style flavors and helpful management.
""")
add('ta-3491165',"""
对饮品、分量和价格失望。~Disappointed with drinks, portions and prices.
乐队出色，部分服务态度欠佳。~Enjoys band; some hospitality disappoints.
喜欢食物、啤酒与友好氛围。~Enjoys food, beer and friendly atmosphere.
午餐和饮品的用餐体验。~Describes a lunch-and-drinks visit.
喜欢乐队和看球氛围。~Enjoys the band and sports viewing.
认为英式装潢与生啤不错。~Likes British décor and draught beer.
喜欢冰啤酒、食物与服务。~Enjoys cold beer, food and service.
喜欢摇滚乐队与酒吧管理。~Praises the rock band and hospitality.
食物、啤酒和氛围合心意。~Enjoys food, beer and atmosphere.
认为新址恢复了熟悉体验。~Welcomes the experience at the newer location.
""")
add('ta-4419424',"""
服务热情，菜肴呈现用心。~Warm service and careful food presentation.
喜欢安静环境与合理价格。~Enjoys quiet surroundings and reasonable prices.
喜欢这家店的宁静氛围。~Enjoys the peaceful setting.
认为法式菜肴和服务不错。~Likes French cooking and friendly service.
对甜点与后续服务不满。~Disappointed with dessert and follow-up service.
喜欢鹅肝与松露意面。~Enjoys foie gras and truffle pasta.
等候太久，未能用餐便离开。~Long wait leads to leaving without eating.
多年后回访仍有好体验。~Enjoys a return visit after years.
再次用餐仍有不愉快体验。~Reports disappointment on a return visit.
食物新鲜，员工努力照顾客人。~Fresh food and attentive staff.
""")
add('ta-17423944',"""
外卖素食让人有家乡感。~Vegetarian delivery brings familiar Indian flavors.
环境干净，价格实惠，员工有礼。~Clean setting, affordable food and courteous staff.
喜欢素食种类与特色披萨。~Enjoys vegetarian variety and specialty pizza.
食物品质与分量令其满意。~Satisfied with food quality and portions.
喜欢印度风味与亲切服务。~Enjoys Indian flavors and warm service.
关注水贝分店的纯素食选项。~Describes vegetarian options at Shuibei branch.
多次到访，喜欢印度菜。~Returns for enjoyable Indian cooking.
在罗湖吃到熟悉的印度味道。~Finds familiar Indian flavors in Luohu.
初次到访，喜欢印度风味。~Enjoys familiar flavors on a first visit.
分享印度素食用餐体验。~Shares an Indian vegetarian dining experience.
""")
add('ta-14790113',"""
菜单有创意，华夫饼令人失望。~Creative menu; waffles disappoint.
位置低调，菜肴风味大胆。~Hidden setting with bold flavors.
露台宽敞，店主友好。~Spacious patio and friendly owners.
喜欢时令菜单与贴心服务。~Enjoys seasonal creativity and personal service.
回访仍喜欢独特菜肴。~Enjoys distinctive food on a return visit.
环境优雅，晚餐体验满意。~Enjoys dinner in an elegant setting.
喜欢美式早午餐选择。~Enjoys American-style brunch choices.
食物、饮品和服务都不错。~Praises food, drinks and service.
关注中西融合的菜单。~Discusses Chinese-European fusion cooking.
早午餐未达期待。~Brunch falls short of expectations.
""")
add('ta-10749988',"""
喜欢披萨，部分配菜和体验待改善。~Likes pizza; some details need improvement.
好莱坞披萨有熟悉的美式味道。~Enjoys familiar American-style pizza.
等候久，披萨与薯条欠佳。~Long wait; pizza and fries disappoint.
喜欢厚底披萨、酒和爵士氛围。~Enjoys deep pizza, wine and jazz.
披萨好吃，店主热情。~Enjoys pizza and welcoming owner.
喜欢深盘披萨与葡萄酒。~Enjoys deep-dish pizza and wine.
喜欢酸面团披萨与精酿。~Enjoys sourdough pizza and craft beer.
认为披萨原料品质不错。~Praises the pizza ingredients.
分享对美式披萨的体验。~Describes an American-pizza dining experience.
过去常来，仍喜欢披萨。~Fond memories of repeated pizza visits.
""")
add('ta-10666363',"""
三天连续来吃，喜欢味道。~Returns three evenings for enjoyable food.
菜肴不合其口味。~Food does not suit this diner.
食物不错，但位置较难找。~Enjoys food; location is harder to find.
喜欢食物，建议旅行时到访。~Enjoys the food during a visit.
菜肴、服务速度和环境不错。~Enjoys food, quick service and atmosphere.
认为印度菜品质不错。~Praises the Indian cooking.
喜欢市中心的印度风味。~Enjoys Indian flavors in the city center.
喜欢旁遮普风味的菜肴。~Enjoys Punjabi-style dishes.
认为豆类与奶酪菜调味欠佳。~Disappointed with lentil and paneer dishes.
喜欢北印度菜与馕。~Enjoys North Indian cooking and naan.
""")
add('ta-27508794',"""
希腊菜、甜品和服务令人满意。~Enjoys Greek food, desserts and service.
认为希腊风味地道。~Enjoys authentic-seeming Greek flavors.
关注希腊菜与葡萄酒。~Discusses Greek cooking and wine.
喜欢菜肴呈现与用餐氛围。~Enjoys presentation and atmosphere.
认为品质价格相称。~Finds good food and value.
喜欢酸奶黄瓜酱与环境。~Enjoys tzatziki and the setting.
喜欢希腊菜与特色鸡尾酒。~Enjoys Greek dishes and cocktails.
气氛舒服，酒类选择多。~Comfortable atmosphere and varied drinks.
赞赏厨师的烹饪表现。~Praises the chef's cooking.
""")
add('ta-25560152',"""
认为披萨有意大利风味。~Enjoys Italian-style pizza.
觉得蛇口店适合亲友聚餐。~Finds Shekou branch suited to friends and families.
喜欢披萨、意面与酒单。~Enjoys pizza, pasta and wine choices.
多年居住后认可这里的意餐。~Resident appreciates the Italian cooking.
喜欢意大利厨师的菜肴。~Enjoys dishes by the Italian chef.
试过多种菜，品质满意。~Enjoys several dishes and food quality.
喜欢那不勒斯风味披萨与甜品。~Enjoys Naples-style pizza and desserts.
""")
add('ta-17783957',"""
喜欢华强北店的传统点心。~Enjoys traditional dim sum in Huaqiangbei.
图文菜单有帮助，手机点餐不便。~Illustrated menu helps; app ordering frustrates.
分享蛇口分店的体验。~Describes a different Shekou branch.
喜欢传统早茶体验。~Enjoys traditional yum cha.
认为粤菜出品品质不错。~Praises the Cantonese cooking.
周五午餐较拥挤，服务礼貌。~Busy Friday lunch with polite service.
""")
add('ta-32846849',"""
认可意大利菜的品质。~Praises the Italian cooking.
大学城附近安静的小店。~A quiet find near University Town.
多次回访，喜欢披萨。~Returns for the pizza.
喜欢意面、披萨与提拉米苏。~Enjoys pasta, pizza and tiramisu.
喜欢肉类拼盘、葡萄酒和环境。~Enjoys meat platters, wine and atmosphere.
户外环境舒服，服务友好。~Enjoys outdoor seating and friendly service.
披萨好吃，店铺干净。~Enjoys pizza in a clean setting.
服务快捷专业，意餐不错。~Quick, professional service and Italian food.
喜欢意面、披萨与咖啡。~Enjoys pasta, pizza and coffee.
适合家庭用餐，气氛不错。~Enjoys a family meal and atmosphere.
""")
add('ta-12816703',"""
酒店楼下用餐，喜欢食物与服务。~Enjoys food and service beneath the hotel.
喜欢三文鱼与饮品。~Enjoys salmon and drinks.
喜欢音乐与食物。~Enjoys the music and food.
服务友好，菜肴热腾腾。~Friendly staff serve hot food.
食物与服务令人满意。~Enjoys the food and service.
四人聚餐体验令人失望。~A disappointing meal for four diners.
等待菜肴很久，体验欠佳。~Long food waits disappoint.
乐队不错，意面价格偏高。~Enjoys the band; pasta seems expensive.
喜欢现场摇滚，食物尚可。~Enjoys live rock; food is acceptable.
美式菜分量足，英文菜单不便。~Generous American dishes; English menu problems.
""")
add('ta-2514786',"""
喜欢招牌羊肉，菜单丰富。~Enjoys signature lamb and varied choices.
分享朴素环境中的维吾尔风味。~Describes Uyghur cooking in a simple setting.
""")
add('ta-7050174',"""
再次来吃墨西哥菜。~Returns for Mexican food.
认为墨西哥风味地道。~Enjoys authentic-seeming Mexican flavors.
偶然到访，体验愉快。~Enjoys an unplanned visit.
店主协助安排团体菜单。~Owner helps arrange a group menu.
喜欢拉美风味。~Enjoys Latin American flavors.
熟悉的墨西哥味道，服务不错。~Familiar Mexican flavors and good service.
出差期间喜欢这里的食物与人情。~Enjoys food and hospitality while traveling.
酸橘汁腌鱼不错，地道程度存疑。~Enjoys ceviche; questions authenticity.
喜欢墨西哥菜与聚餐氛围。~Enjoys Mexican food and a pleasant visit.
晚间景观让用餐更愉快。~Enjoys the evening setting and views.
""")
add('ta-11916999',"""
旅行期间喜欢这里的食物。~Enjoys the food while traveling.
对服务体验非常失望。~Very disappointed with service.
喜欢土耳其风味用餐。~Enjoys a Turkish dining experience.
喜欢肉类拼盘与面包。~Enjoys meat platters and bread.
为清真菜而来，体验满意。~Enjoys finding halal food.
认可食物品质与用餐体验。~Enjoys food quality and the visit.
喜欢清真菜肴。~Enjoys the halal cooking.
氛围舒服，服务及时。~Enjoys atmosphere and quick service.
喜欢前菜、烤肉与羊肩。~Enjoys mezze, grills and lamb shoulder.
食材新鲜，服务不错。~Enjoys fresh food and good service.
""")
add('ta-3511968',"""
食物未达预期，体验欠佳。~Food falls below expectations.
海边环境、食物与服务不错。~Enjoys food, service and beach setting.
喜欢牛柳，傍晚不太拥挤。~Enjoys tenderloin during a quiet evening.
周日早午餐选择与音乐不错。~Enjoys Sunday brunch choices and music.
对预约安排体验不满意。~Disappointed with reservation arrangements.
多次回访，仍然喜欢这里。~Enjoys repeated visits.
服务热情，令人舒服。~Appreciates welcoming service.
喜欢牛柳和服务。~Enjoys tenderloin and service.
海景漂亮，员工友善。~Enjoys sea views and friendly staff.
景观不错，食物较普通。~Good views; food seems ordinary.
""")
add('ta-7701171',"""
喜欢意大利菜和葡萄酒。~Enjoys Italian food and wine.
牛排与披萨令人满意。~Enjoys steak and pizza.
欢迎热情，菜肴不错。~Warm welcome and enjoyable dishes.
食材新鲜，鸡尾酒不错。~Enjoys fresh ingredients and cocktails.
出品不稳定，价格感受欠佳。~Inconsistent food and disappointing value.
难以获得服务员关注。~Struggles to get staff attention.
牛排海鲜不错，价格偏高。~Enjoys steak and seafood despite higher prices.
喜欢食物与店内氛围。~Enjoys food and atmosphere.
晚间用餐愉快，员工友好。~Enjoys an evening with friendly staff.
食物与招待令人满意。~Enjoys food and hospitality.
""")
add('ta-27507270',"""
多年居住后仍认可家庭般的招待。~Resident appreciates consistent, family-like hospitality.
喜欢土耳其风味食物。~Enjoys Turkish food.
鸡肉串与烤羊肉不错。~Enjoys chicken shish and grilled lamb.
店主友善，菜肴好吃。~Friendly owner and enjoyable food.
喜欢热情招待和菜肴。~Enjoys warm hospitality and food.
分享另一个餐厅的体验。~Describes a different restaurant.
喜欢菜肴呈现与风味。~Enjoys presentation and flavors.
喜欢烤肉与土耳其沙拉。~Enjoys kebab and Turkish salad.
食物不错，店主友善。~Enjoys food and a friendly owner.
分享土耳其菜用餐体验。~Describes a Turkish dining experience.
""")
add('ta-10235035',"""
食物好吃，环境温馨。~Enjoys food and a cozy setting.
喜欢味道与用餐氛围。~Enjoys flavors and atmosphere.
景观漂亮，饮品贵但值得。~Enjoys views despite expensive drinks.
鸡尾酒不错，汉堡偏干。~Enjoys cocktails; burgers seem dry.
喜欢和牛汉堡。~Enjoys the wagyu burger.
喜欢海上世界景观与汉堡。~Enjoys Sea World views and burgers.
食物不错，忙时需再次提醒。~Enjoys food; busy service needs reminders.
位置、食物和员工令人满意。~Enjoys location, food and staff.
喜欢汉堡，包括素食款。~Enjoys burgers, including vegetarian options.
居民喜欢这里的新鲜汉堡。~Resident enjoys the fresh burgers.
""")
add('ta-33357734',"""
喜欢烤肉品质。~Enjoys the meat quality.
肉类与服务令人满意。~Enjoys meats and service.
认可厨师的巴西烤肉。~Praises the chef's Brazilian barbecue.
认为巴西烧烤风味地道。~Enjoys authentic-seeming Brazilian barbecue.
喜欢自助肉类与服务。~Enjoys buffet meats and service.
对肉类品质感到失望。~Disappointed with meat quality.
喜欢巴西风味与肉类选择。~Enjoys Brazilian flavors and meat choices.
纪念日用餐，服务专业。~Appreciates professional anniversary service.
喜欢烤肉与用餐环境。~Enjoys barbecue and the setting.
牛肉鲜嫩，水果沙拉不错。~Enjoys tender beef and fruit salad.
""")
add('ta-26837435',"""
喜欢食物与用餐氛围。~Enjoys food and atmosphere.
食物新鲜，呈现与员工不错。~Enjoys fresh food, presentation and staff.
喜欢鹰嘴豆泥与中东风味。~Enjoys hummus and Middle Eastern flavors.
多语服务与装潢令人满意。~Appreciates multilingual staff and decor.
西餐价格合理。~Finds the Western food reasonably priced.
食物新鲜，炭烤与招待不错。~Enjoys fresh grills and hospitality.
喜欢清真地中海风味。~Enjoys halal Mediterranean flavors.
喜欢清真地中海风味。~Enjoys halal Mediterranean flavors.
环境安静，清真用餐体验愉快。~Enjoys a quiet, welcoming halal meal.
喜欢摩洛哥与地中海风味。~Enjoys Moroccan and Mediterranean flavors.
""")
add('ta-3466912',"""
认为早餐品质不错。~Enjoys the breakfast quality.
亚洲与欧洲菜选择多，服务快。~Enjoys Asian-European choices and quick service.
西班牙海鲜饭未达预期。~Seafood rice falls below expectations.
改期安排灵活，食物新鲜。~Flexible booking changes and fresh food.
早餐多样，环境宽敞。~Enjoys breakfast variety and the setting.
主要分享酒店住宿体验。~Primarily describes the hotel stay.
分享另一家咖啡厅体验。~Describes a different cafe.
服务与英语沟通表现不错。~Appreciates service and English communication.
喜欢丰富的菜肴选择。~Enjoys varied food choices.
西餐选择多，价格偏高。~Varied Western food at higher prices.
""")
add('ta-2357477',"""
高层全景与日落令人印象深刻。~Enjoys panoramic views and sunset.
喜欢城市景观与服务。~Enjoys city views and service.
全景视野是到访亮点。~Panoramic views stand out.
景观服务不错，环境需要翻新。~Enjoys views; setting needs refreshing.
查看菜单与景观，未用餐。~Visits for the menu and views; no meal.
晚餐与景观令人满意。~Enjoys dinner and views.
对酒店餐厅的变化感到失望。~Disappointed with changes at the restaurant.
安静地喝一杯，客人较少。~Enjoys a quiet drink with few guests.
氛围平静，景观服务不错。~Enjoys calm atmosphere, views and service.
十八人聚餐，服务令人满意。~Appreciates service for a large group.
""")
add('ta-13919321',"""
再次来喝饮品，招待热情。~Returns for drinks and a warm welcome.
家庭用餐，食物环境不错。~Enjoys family dining, food and setting.
服务有待改善，氛围不如以往。~Service and atmosphere need improvement.
饮品划算，汉堡令人失望。~Good drink value; burger disappoints.
喜欢汉堡与纽约客牛排。~Enjoys burgers and New York strip.
认可员工对细节的关注。~Appreciates attentive service details.
分享当年的欢乐时光体验。~Describes a historical happy-hour visit.
牛排柔嫩，菜单选择有限。~Enjoys tender steak; menu seems limited.
认可牛排品质。~Praises the steak quality.
连锁牛排出品比较稳定。~Finds the steak cooking consistent.
""")
add('ta-3786961',"""
贝果新鲜好吃。~Enjoys fresh bagels.
贝果和配送不错，店内朴素。~Enjoys bagels and delivery; setting is simple.
早餐贝果选择丰富。~Enjoys varied breakfast bagels.
喜欢煎蛋、贝果与鲜榨果汁。~Enjoys omelettes, bagels and fresh juice.
喜欢早餐贝果。~Enjoys breakfast bagels.
贝果与薯饼令人满意。~Enjoys bagels and hash browns.
喜欢每日新鲜制作的贝果。~Enjoys freshly made daily bagels.
喜欢土豆沙拉。~Enjoys the potato salad.
喜欢纽约风味贝果与涂酱。~Enjoys New York bagels and spreads.
店内制作新鲜，带纽约感觉。~Enjoys house-made bagels and New York atmosphere.
""")

rows=json.loads((ROOT/'research/v6/.raw-cache/reviews-web-bulk.json').read_text())
exclusions=[]
reject={('ta-32911125','Fedor K'): 'Review explicitly describes Futian, whereas the selected venue is Hongshan.',
 ('ta-17783957','lloran2014'): 'Review explicitly describes Shekou, whereas the selected branch is Zhenhua/Huaqiangbei.',
 ('ta-27507270','Nicolas R'): 'Review names Bus Grill, a different restaurant.',
 ('ta-3466912','Amrita H'): 'Primarily hotel amenities; insufficient restaurant-specific evidence.',
 ('ta-3466912','Yan C'): 'Review names The Plaza Cafe; same restaurant identity is unconfirmed.'}
for row in rows:
 comments=row['comments'];assert len(pairs[row['id']])==len(comments),(row['id'],len(comments),len(pairs[row['id']]))
 keep=[]
 for c,summary in zip(comments,pairs[row['id']]):
  reason=reject.get((row['id'],c['author']))
  if row['id']=='ta-26837435' and c['author']=='Abouch Y' and c['date']=='2025-10-26':reason='Near-identical text by the same author on another date; retain only one copy.'
  if reason:
   exclusions.append(dict(venue=row['id'],author=c['author'],date=c['date'],source=c['source'],reason=reason));continue
  c['summary']=summary
  if not c['date']:c['idKind']='source_author_body_fingerprint'
  c.pop('title',None)
  keep.append(c)
 row['comments']=keep
(ROOT/'research/v6/.raw-cache/reviews-web-bulk.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
(ROOT/'research/v6/review-exclusions.json').write_text(json.dumps(exclusions,ensure_ascii=False,indent=2)+'\n')
print('Curated',sum(len(r['comments']) for r in rows),'records; excluded',len(exclusions))
