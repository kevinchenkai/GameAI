# -*- coding: utf-8 -*-
"""Collect public Trip.com restaurant IDs and review facts without user-private fields."""
import json,re,urllib.request,concurrent.futures
from pathlib import Path
root=Path(__file__).resolve().parents[1]
cache=root/'research/v5/.review-cache';cache.mkdir(parents=True,exist_ok=True)
rs=json.loads((root/'restaurants-v4.js').read_text().split('=',1)[1].strip().rstrip(';'));media=json.loads((root/'media-v4.js').read_text().split('=',1)[1].strip().rstrip(';'))
targets=[r for r in rs if 'trip.com/' in media[r['id']]['source'] and 'ctrip.com' not in media[r['id']]['source']]
def f(r):
 u=media[r['id']]['source']
 try:
  h=urllib.request.urlopen(u,timeout=20).read().decode('utf8','replace');m=re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',h,re.S);s=json.loads(m[1])['props']['pageProps']['initialState'];p=s['poiData'];reviews=s.get('reviewSearchData',{}).get('reviewList',[])
  return {'id':r['id'],'expected':r['nameZh'],'business':str(p['restaurantId']),'poiName':p['poiName'],'source':u,'comments':[{'id':c['reviewId'],'author':c.get('username','Platform user'),'content':c.get('content',''),'translated':c.get('translatedContent'),'score':c.get('userRating'),'date':c.get('createTime'),'source':u} for c in reviews], 'taComments':s.get('taCommentInfo')}
 except Exception as e:return {'id':r['id'],'source':u,'error':str(e),'comments':[]}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:out=list(ex.map(f,targets))
(cache/'reviews-trip-public.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print([(r['id'],r.get('business'),len(r['comments'])) for r in out])
