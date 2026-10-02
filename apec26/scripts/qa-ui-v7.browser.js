async(page)=>{
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.setViewportSize({width:QA_WIDTH,height:900});
 const overflow=async()=>await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 for(const language of ['zh','en']){
  await page.getByRole('button',{name:language==='zh'?'简中':'EN',exact:true}).click();
  await page.getByRole('tab',{name:language==='zh'?/深圳手信/:/Local gifts/}).click();
  await page.getByRole('searchbox').fill('');
  const labels=language==='zh'?['茶叶','冰箱贴','丝巾','折扇','瓷器','熊猫礼物','香薰','印章']:['Tea','Magnets','Scarves','Folding fans','Porcelain','Panda gifts','Fragrance','Seals'];
  for(const label of labels){
   await page.getByRole('button',{name:label,exact:true}).click();
   const cards=await page.locator('#panel-gifts article').count();if(cards!==20)throw Error(label+' has '+cards+' cards');
   const listOverflow=await overflow();await page.getByRole('button',{name:language==='zh'?'商品详情':'Details',exact:true}).first().click();
   const dialog=page.getByRole('dialog');const text=await dialog.innerText();
   const facts=await dialog.evaluate(el=>({overflow:el.scrollWidth>el.clientWidth,links:[...el.querySelectorAll('.product-verification-v6 a')].map(a=>a.href),images:el.querySelectorAll('img').length}));
   if(!text.includes('SKU')||!text.includes('2026-10-02')||!facts.links.length||facts.overflow||listOverflow)throw Error('Product detail/list regression '+label);
   results.push({language,width:QA_WIDTH,category:label,cards,detailImages:facts.images,listingSource:facts.links[0],overflow:false});
   await dialog.getByRole('button',{name:language==='zh'?'关闭':'Close',exact:true}).click();
  }
  // Select a corrected product through the visible search and verify its actual type.
  await page.getByRole('button',{name:language==='zh'?'全部':'All',exact:true}).click();
  const search=page.getByRole('searchbox');await search.fill('100353514106');await search.press('Enter');await page.waitForFunction(()=>document.querySelectorAll('#panel-gifts article').length===1);
  await page.getByRole('button',{name:language==='zh'?'商品详情':'Details',exact:true}).click();
  const bracelet=page.getByRole('dialog');const braceletText=await bracelet.innerText();
  if(!braceletText.includes(language==='zh'?'沉香手串':'Agarwood bracelet'))throw Error('Wrong product type');
  await bracelet.getByRole('button',{name:language==='zh'?'联系购买 ↗':'Contact to buy ↗',exact:true}).click();
  const contactText=await page.locator('dialog[open]').last().getByRole('textbox').inputValue();if(!contactText.includes('100353514106'))throw Error('Contact missing SKU');
  const contact=await page.locator('dialog[open]').last().evaluate(el=>({images:el.querySelectorAll('img').length,links:[...el.querySelectorAll('a[href]')].map(a=>a.href),overflow:el.scrollWidth>el.clientWidth}));
  if(contact.images<2||!contact.links.some(x=>x.includes('wa.me'))||!contact.links.some(x=>x.includes('t.me'))||contact.overflow)throw Error('Contact regression');
  results.push({language,width:QA_WIDTH,correctedType:true,contact});
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');await search.fill('');
  await page.getByRole('tab',{name:language==='zh'?/深圳美食/:/Eat & drink/}).click();
  const food=await page.locator('#panel-food article').first().evaluate(el=>({comments:el.querySelectorAll('.review-row-v5').length,photos:el.querySelectorAll('.venue-slider-v5 img').length,sliderWidth:el.querySelector('.venue-slider-v5').scrollWidth,viewport:el.querySelector('.venue-slider-v5').clientWidth}));
  if(food.comments!==2||food.photos!==5||food.sliderWidth<=food.viewport||await overflow())throw Error('Food list regression');
  await page.locator('#panel-food article').filter({has:page.locator('[data-id="local-004"]')}).getByRole('button',{name:language==='zh'?'店铺详情与点评 ↗':'Venue & reviews ↗',exact:true}).click();
  const detail=await page.getByRole('dialog').evaluate(el=>({comments:el.querySelectorAll('.review-row-v5').length,photos:el.querySelectorAll('img').length,overflow:el.scrollWidth>el.clientWidth,sources:[...el.querySelectorAll('.review-row-v5')].map(a=>a.href)}));
  if(detail.comments<10||detail.photos<5||detail.overflow||!detail.sources.every(x=>x.startsWith('https://')))throw Error('Food detail regression');
  results.push({language,width:QA_WIDTH,food,detail});await page.keyboard.press('Escape');
 }
 if(errors.length)throw Error(errors.join('; '));return {results,errors};
}
