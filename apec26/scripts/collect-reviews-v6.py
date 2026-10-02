#!/usr/bin/env python3
"""Collect only public Trip.com pages and normal UI pagination; never call APIs directly.
Explicit POI/restaurant mapping and branch/address checks are required per target.
Full text stays in ignored raw cache. Export brief summaries with build-reviews-v5.py.
"""
import argparse,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('targets');p.add_argument('--session',default='apec26v5');p.add_argument('--mobile',action='store_true');p.add_argument('--output',default='reviews-sample.json');args=p.parse_args()
js=(ROOT/'scripts'/('collect-mobile-reviews-v6.browser.js' if args.mobile else 'collect-reviews-v6.browser.js')).read_text()
rows=[];blocked=set()
for target in json.loads(Path(args.targets).read_text()):
 origin='m.ctrip.com' if args.mobile else target['source'].split('/')[2]
 if origin in blocked:
  rows.append({**target,'status':'origin_blocked_stop','comments':[]});continue
 code=js.replace('TARGET_JSON',json.dumps(target,ensure_ascii=False))
 run=subprocess.run(['/Users/kk/.codex/skills/playwright/scripts/playwright_cli.sh','-s='+args.session,'run-code',code],cwd=ROOT,capture_output=True,text=True)
 m=re.search(r'### Result\n(.*?)\n###',run.stdout,re.S)
 if not m:raise RuntimeError(run.stdout[-1200:])
 row=json.loads(m[1]);rows.append(row)
 if row.get('status')=='access_restricted':blocked.add(origin)
 print(target['id'],row.get('status'),len(row.get('comments',[])),len(row.get('pages',[])),flush=True)
 cache=ROOT/'research/v6/.raw-cache';cache.mkdir(exist_ok=True)
 (cache/args.output).write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
