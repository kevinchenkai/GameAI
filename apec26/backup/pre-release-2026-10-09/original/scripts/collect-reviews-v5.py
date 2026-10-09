# -*- coding: utf-8 -*-
"""Read public restaurant review pages through the normal browser UI; no login or challenge bypass."""
import json,re,subprocess,argparse
from pathlib import Path
root=Path(__file__).resolve().parents[1]
cache=root/'research/v5/.review-cache';cache.mkdir(parents=True,exist_ok=True)
rs=json.loads((root/'restaurants-v4.js').read_text().split('=',1)[1].strip().rstrip(';'))
media=json.loads((root/'media-v4.js').read_text().split('=',1)[1].strip().rstrip(';'))
targets=[]
for r in rs:
 u=media[r['id']]['source'];m=re.search(r'/(\d+)(?:-[^/]*)?\.html',u) if 'ctrip.com' in u else re.search(r'-(\d+)/',u) if 'trip.com' in u else None
 if m:targets.append({'id':r['id'],'business':m[1],'expected':r['nameZh']})
parser=argparse.ArgumentParser();parser.add_argument('--targets');parser.add_argument('--output',default='reviews-public.json');args=parser.parse_args()
if args.targets:targets=json.loads(Path(args.targets).read_text())
pw='/Users/kk/.codex/skills/playwright/scripts/playwright_cli.sh';out=[]
for start in range(0,len(targets),4):
 batch=targets[start:start+4]
 code='''async (page)=>{const targets=TARGETS; return await Promise.all(targets.map(async t=>{const p=await page.context().newPage();try{await p.goto('https://m.ctrip.com/webapp/you/commentWeb/commentList?businessId='+t.business+'&businessType=12',{waitUntil:'domcontentloaded',timeout:20000});await p.waitForFunction(()=>window.__NEXT_DATA__?.props?.pageProps?.initialState?.commentList,{timeout:10000});return await p.evaluate(t=>{const s=__NEXT_DATA__.props.pageProps.initialState;return {...t,source:location.href,poiName:s.poiInfo?.name||s.commentList[0]?.poiInfo?.name,comments:s.commentList.slice(0,14).map(c=>({id:c.commentId,author:c.userInfo?.userNick||'平台用户',content:c.content,score:c.score,date:c.publishTime,source:c.jumpH5Url||location.href}))}},t)}catch(e){return {...t,error:e.message,comments:[]}}finally{await p.close()}}))}'''.replace('TARGETS',json.dumps(batch,ensure_ascii=False))
 proc=subprocess.run([pw,'-s=apec26v5','run-code',code],capture_output=True,text=True)
 match=re.search(r'### Result\n(.*?)\n###',proc.stdout,re.S)
 if match:
  d=json.loads(match[1]);out.extend(d);print([(x['id'],x.get('poiName'),len(x['comments'])) for x in d],flush=True)
 else:print('Batch error',proc.stdout[-250:],flush=True)
 (cache/args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Collected',len(out),'records',flush=True)
