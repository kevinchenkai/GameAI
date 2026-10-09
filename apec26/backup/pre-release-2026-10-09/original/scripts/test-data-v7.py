# -*- coding: utf-8 -*-
"""Regression checks for source identity, extraction and offline reproducibility."""
import json,hashlib,importlib.util,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def js(name):return json.loads((ROOT/name).read_text().split('=',1)[1].strip().rstrip(';'))
spec=importlib.util.spec_from_file_location('parser',ROOT/'scripts/parse-public-web-reviews-v6.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
fixture='''L1: cite1†Alice L2: 12 contributions
L3: 5.0 of 5 bubbles
L4: ###
L5: cite2†First meal
L6: Fresh pasta, slow service.
L7: Written October 1, 2026
L8: Owner response
L9: Thank you for visiting.
L10: cite3†transparency report
L11: ###
L12: cite4†Nearby restaurant
L13: Recommendation text
L14: Written October 1, 2026'''
parsed=m.parse(fixture,strict=True);assert len(parsed)==1 and parsed[0]['author']=='Alice';assert parsed[0]['date']=='2026-10-01';assert parsed[0]['content']=='Fresh pasta, slow service.'
assert m.parse('L1: cite1†Nearby shop\nL2: 5.0 of 5 bubbles\nL3: cite2†Title\nL4: Recommendation',strict=True)==[]
reviews=js('reviews-v5.js');venues=js('restaurants-v4.js')
for id,rows in reviews.items():
 assert len({r['id'] for r in rows})==len(rows),id
 fps=[r['fingerprint'] for r in rows if r.get('fingerprint')];assert len(fps)==len(set(fps)),id
 for r in rows:
  assert r['author'].lower()!='transparency report' and r['source'].startswith('https://')
  assert all(r['text'][l] for l in ['zh','en']) and 'content' not in r and 'title' not in r
 if id.startswith('local-v4-'):assert rows==reviews[id.removeprefix('local-v4-')]
excluded=json.loads((ROOT/'research/v7/review-exclusions.json').read_text());assert len(excluded)==16
web=json.loads((ROOT/'research/v7/reviews-web-new.json').read_text())
for r in web:
 assert r['sourceAddress'] and r['cacheAgeLabel']
 for c in r['comments']:assert not any(x['venue']==r['id'] and x['author']==c['author'] and x['date']==c['date'] for x in excluded)
assert sum(len(r['comments']) for r in web)==87
assert sum(bool(c.get('replacesLegacy')) for r in web for c in r['comments'])==13
for r in web:
 for c in r['comments']:
  if c.get('replacesLegacy'):assert c['replacesLegacy']=='legacy-'+r['id'] and 'excerpt occurs' in c['legacyMatchEvidence']
for research in ['v6','v7']:
 for f in (ROOT/'research'/research).glob('reviews-*.json'):
  for r in json.loads(f.read_text()):
   for c in r.get('comments',[]):assert 'content' not in c and 'title' not in c
products=js('gifts-v5.js');bySku={g['sku']:g for g in products};assert len(bySku)==len(products)==160
for g in products:
 v=g['verification'];assert v['sku']==g['sku'] and v['model']['value'] is None and not v['officialDetailVerified']
 if v['verificationLevel']=='same_sku_partial_listing':assert v['linkedSkuMatch'] and v['titleMatch'] and v['styleMatch']
 else:assert not g['material'] and not g['dimensions'] and not v['attributes']
 for a in v['attributes']:assert a['source']==v['source'] and a['status']=='merchant_listing_only'
assert sum(g['verification']['verificationLevel']=='same_sku_partial_listing' for g in products)==97
assert bySku['10226513693233']['region']['en']=='Xi’an'
assert bySku['10226513693238']['region']['en']=='Changchun'
assert bySku['100369245260']['material']=='沉香'
assert bySku['100195200354']['material']=='仿真丝'
assert bySku['100292565772']['dimensions'] is None
assert bySku['100188328420']['dimensions']=='75*75cm'
assert '3个' in bySku['10182305299203']['dimensions']
assert '20' not in bySku['10093805312718']['dimensions']
assert bySku['100353514106']['verification']['productType']['en']=='Agarwood bracelet'
assert '手串' in bySku['100353514106']['desc']['zh']
checks=json.loads((ROOT/'research/v7/product-listing-checks.json').read_text())
assert len(checks)==160 and len({v['source'] for v in checks})==15
for r in json.loads((ROOT/'research/v7/reviews-mobile-new.json').read_text()):
 assert r['publicRecordCount']==len(r['comments']);assert r['identity']['business']==int(r['business']) and r['identity']['poi']==int(r['poi'])
 assert r['foldedLinkVisible'] is False
# Builds must work identically after all ignored source bodies have been removed.
files=['reviews-v5.js','gifts-v5.js','research/v7/product-verification.json']
hashes=lambda:{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files}
before=hashes()
with tempfile.TemporaryDirectory(dir=ROOT/'research/v7') as tmp:
 moves=[]
 try:
  for version,folder in [('v5','.review-cache'),('v6','.raw-cache'),('v7','.raw-cache')]:
   cache=ROOT/'research'/version/folder
   if cache.exists():dest=Path(tmp)/version;cache.rename(dest);moves.append((cache,dest))
  for name in ['build-reviews-v5.py','build-product-verification-v7.py','build-gifts-v5.py']:subprocess.run(['python3',str(ROOT/'scripts'/name)],check=True,capture_output=True)
 finally:
  for cache,dest in moves:
   if cache.exists():cache.rmdir()
   dest.rename(cache)
assert before==hashes()
for f in ROOT.glob('*.js'):subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
subprocess.run(['git','diff','--check'],cwd=ROOT,check=True)
print('PASS: strict parser, inline markers, attribution, exclusions, dedup, alias mapping, SKU/variant/quantity/material identity, empty batches, offline builds, JS syntax')
