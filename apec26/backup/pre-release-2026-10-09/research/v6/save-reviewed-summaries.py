"""Manually reviewed, brief paraphrases from readable public source pages.
Composite keys below are local provenance keys, not claimed platform review IDs.
"""
import json,hashlib
from pathlib import Path
P=Path(__file__).parent
rows=[]
def add(venue,source,items,sourceDate):
 comments=[]
 for author,date,score,zh,en in items:
  comments.append(dict(id='ta-web-'+hashlib.sha256((source+author+date).encode()).hexdigest()[:16],idKind='source_author_written_date',author=author,date=date,score=score,source=source,summary=dict(zh=zh,en=en),platform='Tripadvisor',retrieval='Public readable web document; cached snapshot',sourceSnapshotAge=sourceDate))
 rows.append(dict(id=venue,source=source,status='manually_verified_public_document',comments=comments))
add('ta-6001897','https://www.tripadvisor.com/Restaurant_Review-g297415-d6001897-Reviews-Din_Tai_Fung-Shenzhen_Guangdong.html',[
 ('Anne-Marie W','2019-01-15',4,'点心好吃，晚到部分菜售罄。','Enjoys dim sum; late choices limited.'),
 ('Leonhkny','2017-05-16',5,'喜欢蟹肉小笼包与芋泥甜点。','Praises crab dumplings and taro sweets.'),
 ('RayitoSnivi','2015-10-29',5,'喜欢饺子，店员协助看菜单。','Enjoys dumplings and menu assistance.'),
 ('richardnK7990KH','2019-10-27',4,'喜欢辣面、小笼包与馄饨。','Enjoys spicy noodles and dumplings.'),
 ('-this-is-me-123456','2017-01-27',4,'觉得食物多样，服务细心。','Finds variety and attentive service.'),
 ('Tom Y','2016-11-16',4,'觉得饺子面食保持连锁水准。','Dumplings and noodles meet expectations.'),
 ('Inirap','2016-07-27',4,'多次用餐，认为价格合理。','Consistent meals at reasonable prices.'),
 ('Theresa P','2015-10-11',5,'一家人喜欢粽子、馄饨与甜品。','Family enjoys wontons and desserts.')], '11 months at retrieval')
add('ta-4964616','https://www.tripadvisor.com/Restaurant_Review-g297415-d4964616-Reviews-Haidilao_Hotpot-Shenzhen_Guangdong.html',[
 ('Denis C','2019-07-27',5,'喜欢服务，提醒辣汤很辣。','Excellent service; spicy broth intense.'),
 ('hellobanana','2018-04-05',5,'图片菜单和耐心店员方便外国客人。','Picture menus help non-Chinese speakers.'),
 ('MichelleMet','2018-05-17',5,'多次回访，赞赏英文沟通。','Returns often; appreciates English assistance.'),
 ('Gloson','2017-02-26',5,'等位有小食，服务贴心。','Snacks soften waits; attentive staff.'),
 ('superintendent75','2016-12-23',4,'服务友善，排号广播略吵。','Friendly staff; queue announcements noisy.'),
 ('jtaylor946','2019-02-11',5,'菜上得快，服务细致。','Quick food and thoughtful service.'),
 ('siu y','2018-12-07',4,'喜欢调料选择与周到服务。','Enjoys sauce choices and hospitality.'),
 ('edwin989','2018-05-02',5,'喜欢食物，建议提前订位。','Enjoys food; recommends reserving ahead.')], '3 months at retrieval')
add('ta-15264134','https://cn.tripadvisor.com/Restaurant_Review-g297415-d15264134-Reviews-Taotaoju_Haiancheng-Shenzhen_Guangdong.html',[
 ('Stanley C','2020-02-02',5,'环境、茶壶与细节让人惊喜。','Appreciates décor and tea-service details.'),
 ('Mok E','2020-01-13',5,'点心不错，大厅偏吵。','Enjoys dim sum; dining room noisy.'),
 ('Gary C','2019-10-08',5,'喜欢虾饺、肠粉与汤圆。','Enjoys dumplings, rice rolls and sweets.'),
 ('Tripadvisor会员','2019-07-09',3,'鹅掌不错，菠萝包不合口味。','Likes goose feet; bun disappoints.'),
 ('Wendy','2019-09-25',5,'现代环境保留粤式点心口味。','Modern setting with traditional flavors.'),
 ('Mabel A','2019-09-22',5,'虾饺分量大，午餐等位久。','Generous dumplings; lengthy lunch queue.'),
 ('Piyobb','2019-08-26',5,'临近打烊仍上菜快、够热。','Quick, hot dishes near closing.'),
 ('ChanHin','2019-01-10',5,'菜味不错，但觉得价格高。','Enjoys dishes but finds prices high.')], '9 months at retrieval')
(P/'reviews-editor-verified.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
