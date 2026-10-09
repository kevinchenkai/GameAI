# -*- coding: utf-8 -*-
"""Offline checks for provenance, deduplication, parsing and reproducible builds."""
import json,hashlib,importlib.util,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def loadjs(name):return json.loads((ROOT/name).read_text().split('=',1)[1].strip().rstrip(';'))
sp=importlib.util.spec_from_file_location('reviews_parser',ROOT/'scripts/parse-public-web-reviews-v6.py');m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
fixture='''L1: cite1†(10 reviews)
L2: ###
L3: cite2†(10 reviews)
L4: aggregate
L5: cite3†Alice
L6: 5.0 of 5 bubbles
L7: ###
L8: cite4†First visit
L9: Lovely pasta
L10: Written September 30, 2026
L11: Owner reply
L12: Thank you
L13: cite3†Alice
L14: ###
L15: cite5†Second visit
L16: Slow service
L17: Written 1 October 2026
L18: cite6†Bob
L19: ###
L20: cite7†Undated visit
L21: Good bread
L22: cite8†Carol
L23: ###
L24: cite9†Another visit
L25: Bad soup
L26: Written October 1, 2026'''
a=m.parse(fixture);assert len(a)==4;assert [c['author'] for c in a]==['Alice','Alice','Bob','Carol'];assert a[2]['content']=='Good bread';assert a[2]['date']=='';assert a[1]['score'] is None;assert a[0]['score']==5
reviews=loadjs('reviews-v5.js')
for venue,rows in reviews.items():
 assert len({c['id'] for c in rows})==len(rows),venue
 fp=[c['fingerprint'] for c in rows if c.get('fingerprint')];assert len(fp)==len(set(fp)),venue
 for c in rows:assert c['author'] and c['source'].startswith('https://') and all(c['text'][l] for l in ['zh','en']),c
 assert not any(c.get('content') or c.get('title') for c in rows)
for f in (ROOT/'research/v6').glob('reviews-*.json'):
 for r in json.loads(f.read_text()):
  for c in r.get('comments',[]):assert 'content' not in c and 'title' not in c,(f,c['id'])
for alias,rows in reviews.items():
 if alias.startswith('local-v4-'):assert rows==reviews[alias.replace('local-v4-','')]
for id,author in [('ta-32911125','Fedor K'),('ta-17783957','lloran2014'),('ta-27507270','Nicolas R'),('ta-3466912','Yan C'),('ta-3466912','Amrita H')]:assert not any(c['author']==author for c in reviews[id])
assert sum(c['author']=='Abouch Y' for c in reviews['ta-26837435'])==1
assert sum(c['author']=='cai213' for c in reviews['local-002'])==2
products=loadjs('gifts-v5.js');assert len(products)==160 and len({g['sku'] for g in products})==160
checks=json.loads((ROOT/'research/v6/product-verification.json').read_text());assert len(checks)==8
for v in checks:
 assert v['model']['value'] is None and not v['officialDetailVerified']
 if v['verificationLevel']=='same_sku_partial_listing':assert v['linkedSkuMatch'] and v['titleMatch'] and v['styleMatch']
assert sum(v['verificationLevel']=='same_sku_partial_listing' for v in checks)==6
# Prove the generated data does not depend on ignored full-text caches.
files=['reviews-v5.js','gifts-v5.js'];before={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files}
with tempfile.TemporaryDirectory(dir=ROOT/'research/v6') as tmp:
 moves=[]
 try:
  for cache in [ROOT/'research/v6/.raw-cache',ROOT/'research/v5/.review-cache']:
   if cache.exists():
    dest=Path(tmp)/cache.name;cache.rename(dest);moves.append((cache,dest))
  for script in ['build-reviews-v5.py','build-gifts-v5.py']:subprocess.run(['python3',str(ROOT/'scripts'/script)],check=True,capture_output=True)
 finally:
  for cache,dest in moves:
   if cache.exists():cache.rmdir()
   dest.rename(cache)
after={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files};assert before==after,(before,after)
subprocess.run(['node','--check',str(ROOT/'v5.js')],check=True)
subprocess.run(['git','diff','--check'],cwd=ROOT,check=True)
print('PASS: parser fixtures, attribution, dedup, branch exclusions, SKU identity, cache-independent builds and JS syntax')
