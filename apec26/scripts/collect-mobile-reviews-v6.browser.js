async(page)=>{
 const t=TARGET_JSON,p=await page.context().newPage(),comments=[],pages=[];
 const slim=(c,kind,source)=>({id:String(c.commentId),author:c.userInfo?.userNick,content:c.content,date:c.publishTime,score:c.score,source:c.jumpH5Url||source,platform:c.fromTypeText==='来自Trip.com'?'Trip.com':'携程 / Ctrip',sourceVisibility:kind});
 try{
  const source='https://m.ctrip.com/webapp/you/commentWeb/commentList?businessId='+t.business+'&businessType=12';
  const nav=await p.goto(source,{timeout:25000});
  if([403,429,432].includes(nav.status()))return {...t,status:'access_restricted',httpStatus:nav.status(),comments:[]};
  const s=await p.evaluate(()=>window.__NEXT_DATA__?.props?.pageProps?.initialState);
  const identity=s?.poiInfo;const norm=x=>String(x||'').replace(/[\s（）()·]/g,'').toLowerCase();
  if(!identity||String(identity.resourceId)!==String(t.business)||String(identity.poiId)!==String(t.poi)||!t.nameTokens.every(x=>norm(identity.name).includes(norm(x)))||!t.addressTokens.every(x=>norm(identity.address).includes(norm(x))))return {...t,status:'identity_mismatch',comments:[],identity:identity?{name:identity.name,address:identity.address,poi:identity.poiId,business:identity.resourceId}:null};
  const ids=new Set();const accept=(entries,kind,url)=>{for(const c of entries||[]){if(!c.commentId||!c.content||String(c.resourceId)!==String(t.business)||ids.has(String(c.commentId)))continue;ids.add(String(c.commentId));comments.push(slim(c,kind,url));}};
  accept(s.commentList,'main',source);pages.push({kind:'main',source,ids:comments.map(c=>c.id)});
  // Only follow the visible folded-review link; it is a normal public UI route.
  const fold=p.getByText('已折叠部分对您帮助不大的点评',{exact:true});
  if(await fold.count()){
   await fold.click();await p.waitForLoadState('domcontentloaded');
   await p.waitForFunction(()=>window.__NEXT_DATA__?.props?.pageProps?.initialState?.listData?.length>0,{timeout:10000});
   const fs=await p.evaluate(()=>window.__NEXT_DATA__?.props?.pageProps?.initialState);
   accept(fs?.listData,'public_folded',p.url());pages.push({kind:'public_folded',source:p.url(),ids:(fs?.listData||[]).map(c=>String(c.commentId)),hasMore:fs?.hasMore});
   // Stop at the initially visible public batch; no inferred pagination/API calls.
  }
  return {...t,status:'verified',identity:{name:identity.name,address:identity.address,poi:identity.poiId,business:identity.resourceId},comments,pages,platformTotal:identity.commentCount,pagination:'Normal main page and visible folded-review link; initial public batch only, no synthetic pagination.'};
 }catch(e){return {...t,status:'unavailable',error:e.message,comments:[],pages}}finally{await p.close()}
}
