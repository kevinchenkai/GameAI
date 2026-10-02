#!/usr/bin/env python3
"""Recheck one saved SKU per category on its public JD listing; no item-page retries.
Identity is exact data-sku + linked item ID, not a similar-name or search match.
"""
import urllib.request,urllib.error,json,hashlib,re,time,html,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'research/v5/products-public.json').read_text());out=[];blocked=False
clean=lambda s:html.unescape(re.sub('<[^>]*>','',s)).strip()
for cat,rows in data.items():
 row=rows[0];u=row['listing'];r={'category':cat,'sku':row['sku'],'source':u,'checked':'2026-10-01'}
 if blocked:r['status']='origin_blocked_stop';out.append(r);continue
 try:
  if '--saved' in sys.argv:
   b=(ROOT/'research/v6/.raw-cache'/f'jd-{cat}.html').read_bytes();http=200
  else:
   response=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20);b=response.read();http=response.status
  s=b.decode('utf-8','replace');(ROOT/'research/v6/.raw-cache'/f'jd-{cat}.html').write_text(s)
  r.update(httpStatus=http,sha256=hashlib.sha256(b).hexdigest())
  m=re.search(r'<li\s+data-sku="'+row['sku']+r'"[^>]*class="gl-item"[^>]*>(.*?)(?=<li\s+data-sku=|\Z)',s,re.S)
  if m:
   part=m[1];title=re.search(r'<div class="p-name[^"]*">.*?<em>(.*?)</em>',part,re.S);spec=re.search(r'class="curr" title="([^"]*)"',part)
   title=clean(title[1]) if title else '';spec=html.unescape(spec[1]) if spec else ''
   r.update(status='same_sku_public_listing',title=title,selectedSpec=spec,linkedSkuMatch=('item.jd.com/'+row['sku']+'.html' in part),titleMatch=re.sub(r'\s+','',title)==re.sub(r'\s+','',row['title']),styleMatch=spec==row['selectedSpec'])
  else:r['status']='sku_missing_from_current_listing'
 except urllib.error.HTTPError as e:
  r.update(status='access_restricted' if e.code in [403,429,432] else 'unavailable',httpStatus=e.code);blocked=e.code in [403,429,432]
 except Exception as e:r.update(status='unavailable',error=str(e))
 out.append(r);print(cat,r.get('status'),r.get('titleMatch'),r.get('styleMatch'),flush=True);time.sleep(.6)
(ROOT/'research/v6/product-sample-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
