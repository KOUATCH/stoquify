const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base='http://localhost:4331',out=path.join(__dirname,'interactions');fs.mkdirSync(out,{recursive:true});
const locales=process.env.REVIEW_LOCALE?[process.env.REVIEW_LOCALE]:['en','fr'];assert.ok(locales.every(locale=>['en','fr'].includes(locale)));
const results=process.env.REVIEW_LOCALE?JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8')).filter(item=>!locales.includes(item.locale)):[];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const locale of locales)for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push({message:e.message,url:page.url()}));
  const go=async route=>{const response=await page.goto(base+'/'+locale+route,{waitUntil:'load',timeout:120000});await page.locator('.cinematic-home.motion-ready').waitFor();await page.evaluate(()=>document.fonts.ready);if(route.includes('/not-a'))await page.waitForLoadState('networkidle',{timeout:120000});else await page.waitForTimeout(200);return response;};
  await go('/products');const item={locale,width,catalog:[],zoom:[],errors};results.push(item);
  const heights=[];assert.equal(await page.locator('.catalog-panel').count(),18);
  for(let i=0;i<18;i++){
   if(width===1440)await page.locator('.catalog-menu [role=tab]').nth(i).click();else await page.locator('.catalog-select select').selectOption(String(i));
   const panel=page.locator('.catalog-panel[aria-hidden=false]');
   const entry={title:await panel.locator('h3').innerText(),capabilities:await panel.locator('.catalog-capabilities li').count(),adoption:await panel.locator('.catalog-actions a').last().getAttribute('href'),height:await page.locator('.catalog-unit').evaluate(e=>e.getBoundingClientRect().height)};
   assert.equal(entry.capabilities,3);assert.match(entry.adoption,new RegExp('^/'+locale+'/offers/(operations|finance|people)$'));heights.push(entry.height);item.catalog.push(entry);
  }
  item.catalogHeightRange=Math.max(...heights)-Math.min(...heights);assert.ok(item.catalogHeightRange<=1);
  if(width===1440){const tab=page.locator('.catalog-menu [role=tab][aria-selected=true]');await tab.focus();await page.keyboard.press('Home');assert.equal(await page.locator('.catalog-menu [role=tab]').first().getAttribute('aria-selected'),'true');await page.keyboard.press('End');assert.equal(await page.locator('.catalog-menu [role=tab]').last().getAttribute('aria-selected'),'true');item.keyboard=true;}
  await page.locator('#language').click();await page.waitForURL('**/'+(locale==='en'?'fr':'en')+'/products');item.languagePreserved=true;
  for(const interest of ['operations','finance','people']){
   await go('/offers/'+interest);await page.locator('.detail-quote .primary').click();await page.waitForURL('**/contact?interest='+interest);assert.equal(await page.locator('.enquiry-form select').first().inputValue(),interest);
   assert.ok((await page.locator('#language').getAttribute('href')).endsWith('/contact?interest='+interest));
  }item.planningLinks=3;
  for(const route of ['/products/hris','/offers/finance','/get-started']){
   await go(route);await page.evaluate(()=>{const sizes=[...document.querySelectorAll('main h1,main h2,main h3,main p,main li,main a,main button,main label,main select,main dt,main dd,main span')].map(e=>({e,size:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight)}));for(const {e,size,line} of sizes){e.style.fontSize=size*2+'px';if(Number.isFinite(line))e.style.lineHeight=line*2+'px';}});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.equal(overflow,0);item.zoom.push({route,overflow});await page.screenshot({path:path.join(out,`${locale}-${width}-${route.slice(1).replaceAll('/','-')}-text200.png`),fullPage:true});
  }
  await go('/products/receivables');const login=page.locator('.detail-product-copy .outline:visible');assert.equal(await login.count(),1);const destination=await login.getAttribute('href');await login.click();await page.waitForURL('**/login?**',{timeout:60000});await page.waitForFunction(()=>document.querySelector('.auth-shell input[name="email"]')?.disabled===false);await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState('networkidle');const actual=new URL(page.url());assert.equal(actual.searchParams.get('callbackUrl'),destination);item.protectedDestination={destination,url:actual.pathname,callback:actual.searchParams.get('callbackUrl')};
  for(const route of ['/products/not-a-product','/offers/not-an-offer']){await go(route);const recovery=page.locator('.detail-start-actions a:visible').first();await recovery.waitFor();assert.ok((await recovery.getAttribute('href')).endsWith('/products'));await recovery.click();await page.waitForURL('**/'+locale+'/products');await page.locator('.catalog-unit').waitFor();await page.waitForLoadState('networkidle');}item.notFoundRecovery=2;
  await page.goto(base+'/'+locale+'/forgot-password',{waitUntil:'load',timeout:120000});
  assert.equal(await page.locator('section[aria-labelledby="recovery-request-title"] > a').getAttribute('href'),'/'+locale+'/login');
  const homeLinks=await page.locator('main a:has(svg[role="img"])').evaluateAll(els=>els.map(e=>e.getAttribute('href')));
  item.recoveryLinks={signIn:'/'+locale+'/login',homeLinks};assert.ok(!(await page.locator('a[href$="/ohada-os"],a[href$="/login-v2"]').count()));
  assert.deepEqual(errors,[]);console.log(JSON.stringify({locale,width,catalog:18,heightRange:item.catalogHeightRange,planning:3,textResize:3,protectedRedirect:true}));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await context.close();
 }}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
