# -*- coding: utf-8 -*-
"""One request per actual public listing URL; exact SKU/link/style comparison.
Never request item pages or repeat rate-limited requests. Different variants are not merged.
"""
import json,re,html,hashlib,urllib.request,urllib.error,argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser();p.add_argument('--saved',action='store_true');args=p.parse_args()
data=json.loads((ROOT/'research/v5/products-public.json').read_text());groups={};out=[];blocked=False
for cat,rows in data.items():
 for row in rows:groups.setdefault(row['listing'],[]).append((cat,row))
cache=ROOT/'research/v7/.raw-cache';cache.mkdir(exist_ok=True)
clean=lambda s:html.unescape(re.sub('<[^>]*>','',s)).strip()
norm=lambda s:re.sub(r'\s+','',s or '')
for source,group in groups.items():
 file=cache/('jd-'+source.split('/')[-1]);categoryRows=[]
 try:
  if blocked:raise RuntimeError('origin_blocked_stop')
  if file.exists():b=file.read_bytes();retrieval='saved public response from 2026-10-02'
  elif args.saved:raise RuntimeError('saved_response_missing')
  else:
   response=urllib.request.urlopen(urllib.request.Request(source,headers={'User-Agent':'Mozilla/5.0'}),timeout=20)
   if 'frequent' in response.url or 'captcha' in response.url:blocked=True;raise RuntimeError('access_restricted_redirect')
   b=response.read();file.write_bytes(b);retrieval='normal public HTTP request, once per listing'
  doc=b.decode('utf-8','replace')
  if not re.search(r'<li\s+data-sku=',doc):raise RuntimeError('catalog_structure_missing; no absence conclusions')
  for cat,row in group:
   sku=row['sku'];m=re.search(r'<li\s+data-sku="'+re.escape(sku)+r'"[^>]*>(.*?)(?=<li\s+data-sku=|\Z)',doc,re.S)
   v=dict(category=cat,sku=sku,source=source,checked='2026-10-02',httpStatus=200,documentSha256=hashlib.sha256(b).hexdigest(),retrieval=retrieval,status='not_in_inspected_listing',scope='Only the inspected public listing, not stock or product availability')
   if m:
    part=m[0];title=re.search(r'<div class="p-name[^"]*">.*?<em>(.*?)</em>',part,re.S);style=re.search(r'class="curr" title="([^"]*)"',part)
    title=clean(title[1]) if title else '';style=html.unescape(style[1]) if style else ''
    linked='item.jd.com/'+sku+'.html' in part
    v.update(title=title,selectedSpec=style,spu=(re.search(r'data-spu="([^"]+)"',part)[1] if re.search(r'data-spu="([^"]+)"',part) else None),linkedSkuMatch=linked,titleMatch=norm(title)==norm(row['title']),styleMatch=norm(style)==norm(row['selectedSpec']))
    v['status']='same_sku_public_listing' if linked and v['titleMatch'] and v['styleMatch'] else 'identity_or_style_conflict'
   categoryRows.append(v)
  out.extend(categoryRows);print(source.split('/')[-1],len(group),sum(x['status']=='same_sku_public_listing' for x in categoryRows),'matches',flush=True)
 except urllib.error.HTTPError as e:
  blocked=e.code in [403,429,432]
  out.extend(dict(category=cat,sku=row['sku'],source=source,checked='2026-10-02',status='access_restricted' if blocked else 'unavailable',httpStatus=e.code) for cat,row in group)
 except Exception as e:out.extend(dict(category=cat,sku=row['sku'],source=source,checked='2026-10-02',status='unavailable',reason=str(e)) for cat,row in group)
assert len(out)==160 and len({r['sku'] for r in out})==160
(ROOT/'research/v7/product-listing-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
