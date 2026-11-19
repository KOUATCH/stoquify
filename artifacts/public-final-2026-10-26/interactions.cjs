const pw=require('playwright'),engine=process.env.REVIEW_BROWSER||'chrome';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base='http://localhost:4334',out=path.join(__dirname,'interactions-'+engine);fs.mkdirSync(out,{recursive:true});
const locales=process.env.REVIEW_LOCALE?[process.env.REVIEW_LOCALE]:['en','fr'];assert.ok(locales.every(locale=>['en','fr'].includes(locale)));
const results=fs.existsSync(path.join(out,'results.json'))?JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8')).filter(item=>item.authBackToPublic&&item.errors.length===0):[];
(async()=>{
 const browser=await (engine==='chrome'?pw.chromium:pw[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})});
 try{for(const locale of locales)for(const width of [1440,390]){
  if(results.some(item=>item.locale===locale&&item.width===width))continue;
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  const errors=[];page.on('console',m=>{if(/MISSING_MESSAGE|INVALID_MESSAGE|IntlError/.test(m.text()))errors.push({message:m.text(),url:page.url()});});page.on('pageerror',e=>errors.push({message:e.message,url:page.url()}));
  const go=async route=>{await page.waitForTimeout(3000);const response=await page.goto(base+'/'+locale+route,{waitUntil:'load',timeout:120000});assert.equal(response.status(),200,'Navigation HTTP status for '+route);await page.locator('.cinematic-home.motion-ready').waitFor();await page.evaluate(()=>document.fonts.ready);if(route.includes('/not-a'))await page.waitForLoadState('networkidle',{timeout:120000});else await page.waitForTimeout(200);return response;};
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
   const immediateLanguageHref=await page.locator('#language').getAttribute('href');
   await page.waitForFunction(expected=>document.querySelector('#language')?.getAttribute('href')?.endsWith(expected),'/contact?interest='+interest,{timeout:10000});
   item.planningHrefTransitions??=[];item.planningHrefTransitions.push({interest,immediate:immediateLanguageHref,settled:await page.locator('#language').getAttribute('href')});
   assert.ok((await page.locator('#language').getAttribute('href')).endsWith('/contact?interest='+interest));
  }item.planningLinks=3;
  await go('/pricing');const pricingTitles=[],pricingHeights=[],costHeights=[];
  for(const interest of ['operations','finance','people']){
   const radio=page.locator('input[name="offer-fit"][value="'+interest+'"]');await radio.locator('..').click();assert.ok(await radio.isChecked());
   pricingTitles.push(await page.locator('.offer-selection-panel[aria-hidden=false] h3').innerText());
   pricingHeights.push(await page.locator('.offer-selection').evaluate(e=>e.getBoundingClientRect().height));
   assert.equal(await page.locator('.offer-next-actions .primary').getAttribute('href'),'/'+locale+'/contact?interest='+interest);
  }
  assert.equal(new Set(pricingTitles).size,3);assert.ok(Math.max(...pricingHeights)-Math.min(...pricingHeights)<=1);
  assert.equal(await page.locator('.cost-trigger').count(),4);
  for(let i=0;i<4;i++){await page.locator('.cost-trigger').nth(i).click();assert.equal(await page.locator('.cost-trigger').nth(i).getAttribute('aria-expanded'),'true');assert.equal(await page.locator('.cost-details[aria-hidden=false] dd').count(),3);costHeights.push(await page.locator('.cost-expansion').evaluate(e=>e.getBoundingClientRect().height));}
  assert.ok(Math.max(...costHeights)-Math.min(...costHeights)<=1);
  await page.locator('.offer-comparison > summary').click();assert.equal(await page.locator('.offer-table-scroll').getAttribute('tabindex'),'0');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
  await page.locator('.decision-more > summary').click();const questions=page.locator('.decision-guide details:not(.decision-more)');assert.equal(await questions.count(),12);
  for(let i=0;i<12;i++){const question=questions.nth(i);await question.locator('summary').click();assert.ok(await question.evaluate(e=>e.open));assert.ok((await question.locator('.decision-answer p').innerText()).length>30);assert.ok((await question.locator('.decision-answer a').getAttribute('href')).startsWith('/'+locale));await question.locator('summary').click();}
  item.pricing={paths:3,costCategories:4,questions:12,selectionHeightRange:Math.max(...pricingHeights)-Math.min(...pricingHeights),costHeightRange:Math.max(...costHeights)-Math.min(...costHeights),comparisonOverflow:0};
  for(const route of ['/products/hris','/offers/finance','/get-started']){
   await go(route);await page.evaluate(()=>{const sizes=[...document.querySelectorAll('main h1,main h2,main h3,main p,main li,main a,main button,main label,main select,main dt,main dd,main span')].map(e=>({e,size:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight)}));for(const {e,size,line} of sizes){e.style.fontSize=size*2+'px';if(Number.isFinite(line))e.style.lineHeight=line*2+'px';}});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.equal(overflow,0);item.zoom.push({route,overflow});await page.screenshot({path:path.join(out,`${locale}-${width}-${route.slice(1).replaceAll('/','-')}-text200.png`),fullPage:true});
  }
  await go('/products/receivables');const login=page.locator('.detail-product-copy .outline:visible');assert.equal(await login.count(),1);const destination=await login.getAttribute('href');await login.click();await page.waitForURL('**/login?**',{timeout:60000});await page.waitForFunction(()=>document.querySelector('.auth-shell input[name="email"]')?.disabled===false);await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState('networkidle');const actual=new URL(page.url());assert.equal(actual.searchParams.get('callbackUrl'),destination);item.protectedDestination={destination,url:actual.pathname,callback:actual.searchParams.get('callbackUrl')};
  for(const route of ['/products/not-a-product','/offers/not-an-offer']){await go(route);const recovery=page.locator('.detail-start-actions a:visible').first();await recovery.waitFor();assert.ok((await recovery.getAttribute('href')).endsWith('/products'));await recovery.click();await page.waitForURL('**/'+locale+'/products');await page.locator('.catalog-unit').waitFor();await page.waitForLoadState('networkidle');}item.notFoundRecovery=2;
  if(width===390){await page.locator('#mobile-toggle').click();await page.locator('#mobile-menu a[href="/'+locale+'/login"]').click();}
  else await page.locator('.nav-actions a[href="/'+locale+'/login"]').click();
  await page.waitForURL('**/'+locale+'/login');await page.locator('a[href$="/forgot-password"]').first().click();await page.locator('section[aria-labelledby="recovery-request-title"]').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),locale);item.publicToAuthRecovery=true;
  assert.equal(await page.locator('section[aria-labelledby="recovery-request-title"] > a').getAttribute('href'),'/'+locale+'/login');
  const homeLinks=await page.locator('main a:has(svg[role="img"])').evaluateAll(els=>els.map(e=>e.getAttribute('href')));
  item.recoveryLinks={signIn:'/'+locale+'/login',homeLinks};assert.ok(!(await page.locator('a[href$="/ohada-os"],a[href$="/login-v2"]').count()));
  await page.locator('a[href="/'+locale+'"]:visible,a[href="/'+locale+'/"]:visible').first().click();await page.waitForURL(new RegExp('/'+locale+'/?$'));await page.locator('.cinematic-home.motion-ready').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),locale);await page.locator('.workflow-module-select option').nth(22).waitFor({state:'attached',timeout:60000});assert.equal(await page.locator('.workflow-module-select option').count(),23);item.authBackToPublic=true;
  assert.deepEqual(errors,[]);console.log(JSON.stringify({locale,width,catalog:18,heightRange:item.catalogHeightRange,planning:3,textResize:3,protectedRedirect:true}));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await context.close();
 }}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
