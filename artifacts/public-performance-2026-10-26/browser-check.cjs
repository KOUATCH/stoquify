const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const results=[],out=path.join(__dirname,'browser');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const locale of ['en','fr'])for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));
 await context.addInitScript(()=>{window.__routeRecoveryErrors=[];window.addEventListener('error',event=>window.__routeRecoveryErrors.push({message:event.message,digest:event.error?.digest}));});
 const item={locale,width,pages:[],rapidRecovery:[],errors};results.push(item);
 for(const route of ['','/products','/pricing','/workflows','/contact','/get-started']){
  const response=await page.goto('http://localhost:4332/'+locale+route,{waitUntil:'load',timeout:120000});await page.locator('.cinematic-home.motion-ready').waitFor();
  const state={route,status:response.status(),...await page.evaluate(()=>({lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,heading:document.querySelector('h1')?.textContent}))};assert.equal(state.status,200);assert.equal(state.lang,locale);assert.equal(state.overflow,0);
  if(route===''){state.workflowOptions=await page.locator('.workflow-module-select option').count();state.catalogEntries=await page.locator('.catalog-panel').count();assert.equal(state.workflowOptions,23);assert.equal(state.catalogEntries,18);}
  await page.addScriptTag({path:require.resolve('axe-core')});state.violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id));assert.deepEqual(state.violations,[]);
  await page.screenshot({path:path.join(out,`${locale}-${width}-${route.slice(1)||'home'}.png`),fullPage:true});item.pages.push(state);
 }
 // Deliberately act as soon as the recovery link is visible, without a network-idle wait.
 for(let repeat=0;repeat<3;repeat++)for(const route of ['/products/not-a-product','/offers/not-an-offer']){
  await page.goto('http://localhost:4332/'+locale+route,{waitUntil:'domcontentloaded',timeout:120000});const recovery=page.locator('.detail-start-actions a:visible').first();await recovery.waitFor();await recovery.click();await page.waitForURL('**/'+locale+'/products');await page.locator('.catalog-unit').waitFor();item.rapidRecovery.push({route,repeat,recovered:true,events:await page.evaluate(()=>window.__routeRecoveryErrors)});
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({locale,width,pages:item.pages.length,rapidRecoveries:item.rapidRecovery.length,errors}));await context.close();
}
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
assert.ok(results.every(r=>r.errors.length===0),'Browser errors recorded; review the evidence');})().catch(e=>{console.error(e);process.exitCode=1});
