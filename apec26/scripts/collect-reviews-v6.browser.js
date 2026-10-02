async (page) => {
 const t=TARGET_JSON,p=await page.context().newPage(),comments=[],pages=[];
 const slim=c=>({id:String(c.reviewId),author:c.username,content:c.content,score:c.userRating,date:c.createTime,source:c.reviewOnlineUrl||c.reviewH5Url||t.source});
 try {
  let mobile=null;
  if(t.confirmMobile){
   const m=await p.goto('https://m.ctrip.com/webapp/you/commentWeb/commentList?businessId='+t.business+'&businessType=12');
   if([403,429,432].includes(m?.status()))return {...t,status:'access_restricted',httpStatus:m.status(),comments};
   mobile=await p.evaluate(()=>window.__NEXT_DATA__?.props?.pageProps?.initialState?.poiInfo);
   if(!mobile?.address)return {...t,status:'identity_missing_address',comments:[]};
  }
  const nav=await p.goto(t.source,{waitUntil:'domcontentloaded',timeout:25000});
  if([403,429,432].includes(nav?.status()))return {...t,status:'access_restricted',httpStatus:nav.status(),comments};
  await p.waitForFunction(()=>window.__NEXT_DATA__?.props?.pageProps?.initialState?.poiData,{timeout:10000});
  const s=await p.evaluate(()=>{const s=window.__NEXT_DATA__.props.pageProps.initialState;return {poi:s.poiData,reviews:s.reviewSearchData}});
  const identity={poi:String(s.poi.poiId),business:String(s.poi.restaurantId),name:s.poi.secondName||s.poi.poiName,address:s.poi.translatedLocalAddress||s.poi.poiAddress};
  const normalized=x=>String(x||'').replace(/[\s（）()·]/g,'').toLowerCase();
  const pair=t.approvedAddressPair;
  const approvedPair=mobile&&pair&&normalized(pair.mobile)===normalized(mobile.address)&&normalized(pair.trip)===normalized(identity.address);
  const ok=identity.poi===String(t.poi)&&identity.business===String(t.business)&&t.nameTokens.every(x=>normalized(identity.name).includes(normalized(x)))&&t.addressTokens.every(x=>normalized(identity.address).includes(normalized(x)));
  if(mobile&&(String(mobile.resourceId)!==identity.business||String(mobile.poiId)!==identity.poi||(normalized(mobile.address)!==normalized(identity.address)&&!approvedPair)))return {...t,status:'address_or_id_conflict',identity,mobileIdentity:{poi:mobile.poiId,business:mobile.resourceId,name:mobile.name,address:mobile.address},comments:[]};
  if(!ok)return {...t,status:'identity_mismatch',identity,comments:[]};
  let current=s.reviews;comments.push(...(current.reviewList||[]).map(slim));
  pages.push({page:1,ids:(current.reviewList||[]).map(c=>String(c.reviewId)),platformTotal:current.reviewscount,hiddenTotal:current.totalHideCount});
  for(let i=2;i<=12;i++){
   const next=p.getByRole('button',{name:'Next page',exact:true});
   if(!await next.count()||!await next.isEnabled())break;
   // This is the response to the public button click, not a scripted API request.
   const pending=p.waitForResponse(async r=>{try{return r.request().method()==='POST'&&r.url().includes('getReviewSearch')}catch{return false}},{timeout:10000});
   await next.click();const response=await pending;
   if([403,429,432].includes(response.status()))return {...t,status:'access_restricted',identity,pages,comments,httpStatus:response.status()};
   current=await response.json();const entries=current.reviewList||[];
   if(!entries.length)break;
   const previous=new Set(comments.map(c=>String(c.id)));
   const added=entries.filter(c=>!previous.has(String(c.reviewId)));
   pages.push({page:current.pageIndex||i,ids:entries.map(c=>String(c.reviewId)),platformTotal:current.reviewscount,hiddenTotal:current.totalHideCount});
   comments.push(...added.map(slim));
   if(!added.length)break;
   await p.waitForTimeout(700);
  }
  const terminal=await p.locator('body').innerText();
  return {...t,status:'verified',identity,mobileIdentity:mobile?{poi:mobile.poiId,business:mobile.resourceId,name:mobile.name,address:mobile.address}:null,pages,comments,terminalNotice:terminal.split('\n').filter(s=>/older review.*hidden/.test(s)).join(' '),pagination:'normal Next page button; stop on disabled, no new IDs, empty page or access restriction'};
 }catch(e){return {...t,status:'unavailable',error:e.message,pages,comments:[]}}finally{await p.close()}
}
