const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const out=__dirname,base=path.dirname(out),checks=[],errors=[];
async function check(name,fn){await fn();checks.push({name,status:'passed'});}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 page.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.join(base,'prototype/index.html')).href;
 try {
 await page.goto(url);
 await check('Retailer includes explained finance dependency',async()=>{assert.equal(await page.locator('#module-finance').isChecked(),true);assert.equal(await page.locator('#module-finance').isDisabled(),true);assert.equal(await page.locator('#review').isEnabled(),true)});
 await page.screenshot({path:path.join(out,'builder-desktop.png'),fullPage:true});
 await check('Keyboard reaches skip link and main content',async()=>{await page.goto(url);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'#main');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main')});
 await check('Service business excludes inventory and POS',async()=>{await page.locator('#preset-services').click();assert.equal(await page.locator('#module-inventory').isChecked(),false);assert.equal(await page.locator('#module-pos').isChecked(),false)});
 await page.screenshot({path:path.join(out,'service-builder.png'),fullPage:true});
 const conditions=()=>page.locator('.plan details').last();
 async function openConditions(){await conditions().evaluate(el=>el.open=true)}
 await check('Conflicting ledger authority blocks review and has resolution',async()=>{await openConditions();await page.locator('#ledger').selectOption('external');assert.equal(await page.locator('#review').isDisabled(),true);assert.match(await page.locator('#compatibility').innerText(),/Two ledger authorities/);await page.locator('#resolve-ledger').click();assert.equal(await page.locator('#review').isEnabled(),true)});
 await check('Missing operating setup prevents multi-location activation',async()=>{await page.locator('#preset-multisite').click();assert.equal(await page.locator('#review').isDisabled(),true);await openConditions();await page.locator('#setup').check();assert.equal(await page.locator('#review').isEnabled(),true)});
 await check('Commercial eligibility is independent from configuration',async()=>{await openConditions();await page.locator('#licensed').uncheck();assert.equal(await page.locator('#review').isDisabled(),true);await openConditions();await page.locator('#licensed').check();assert.equal(await page.locator('#review').isEnabled(),true)});
 await check('Impact dialog contains additions, retained access and historical protection',async()=>{await page.locator('#review').click();assert.equal(await page.locator('dialog').isVisible(),true);assert.match(await page.locator('dialog').innerText(),/Keep/);assert.match(await page.locator('dialog').innerText(),/never deletes/)});
 await check('Native dialog keeps tab focus inside and Escape returns to review',async()=>{for(let i=0;i<5;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog')),true)}await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'review')});
 await check('Provisioning failure preserves observed configuration and retry succeeds',async()=>{await openConditions();await page.locator('#fail').check();const before=await page.evaluate(()=>JSON.stringify(PrototypeState.observed));await page.locator('#review').click();await page.locator('#simulate').click();await page.locator('dialog [role="alert"]').waitFor();assert.equal(await page.evaluate(()=>JSON.stringify(PrototypeState.observed)),before);assert.equal(await page.evaluate(()=>PrototypeState.revision),1);await page.locator('#simulate').click();await page.locator('#role').waitFor();assert.equal(await page.evaluate(()=>PrototypeState.revision),2);assert.equal(await page.evaluate(()=>PrototypeState.history.length),1)});
 await page.screenshot({path:path.join(out,'workspace-desktop.png'),fullPage:true});
 await check('Role workspace narrows visible capabilities',async()=>{const owner=await page.locator('[data-open-module]').count();await page.locator('#role').selectOption('operator');assert.ok(await page.locator('[data-open-module]').count()<owner);assert.equal(await page.locator('[data-open-module="payroll"]').count(),0)});
 await check('Loading, empty, denied, unavailable, partial and error states are distinct',async()=>{const outputs=[];for(const value of ['loading','empty','denied','unavailable','partial','error']){await page.locator('#screen').selectOption(value);outputs.push(await page.locator('#main').innerText())}assert.equal(new Set(outputs).size,6);assert.match(outputs[1],/No activity/);assert.match(outputs[5],/query failure, not an empty/);await page.locator('#screen').selectOption('ready')});
 await check('French translation updates document language and controls',async()=>{await page.locator('#language').click();assert.equal(await page.locator('html').getAttribute('lang'),'fr');assert.match(await page.locator('#nav-history').innerText(),/Historique/);await page.locator('#language').click()});
 await check('History restores a draft without changing observed configuration',async()=>{await page.locator('#nav-history').click();const before=await page.evaluate(()=>JSON.stringify(PrototypeState.observed));await page.locator('[data-restore]').click();assert.equal(await page.evaluate(()=>JSON.stringify(PrototypeState.observed)),before);assert.equal(await page.evaluate(()=>PrototypeState.history.length),1)});
 await check('Search keeps focus and shows an honest empty result',async()=>{await page.locator('#search').fill('no-such-capability');assert.match(await page.locator('#cards').innerText(),/No capabilities match/);assert.equal(await page.evaluate(()=>document.activeElement.id),'search');await page.locator('#search').fill('')});
 await check('Desktop has no horizontal overflow',async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false));
 await page.setViewportSize({width:390,height:844});await page.locator('#preset-retailer').click();
 await check('390px mobile EN has no horizontal overflow',async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false));
 await page.screenshot({path:path.join(out,'builder-mobile.png'),fullPage:true});
 await page.locator('#language').click();
 await check('390px mobile FR has no horizontal overflow',async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false));
 await page.screenshot({path:path.join(out,'builder-mobile-fr.png'),fullPage:true});
 await page.locator('#mobile-review').click();
 await check('Mobile review shortcut opens readable impact within viewport',async()=>{const b=await page.locator('dialog').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=391&&b.y>=0&&b.y+b.height<=845);assert.equal(await page.locator('dialog').evaluate(el=>el.scrollTop),0)});
 await page.screenshot({path:path.join(out,'impact-mobile-fr.png'),fullPage:false});
 await check('No browser JavaScript errors',async()=>assert.deepEqual(errors,[]));
 }catch(error){checks.push({name:'Browser run failure',status:'failed',message:error.stack});throw error}
 finally{fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({recordedAt:new Date().toISOString(),scope:'Isolated static prototype in headless Chromium; synthetic data only; no application server or database',checks,errors,limitations:['No screen-reader assessment','No production authorization test','No browser-engine matrix','No measured production latency']},null,2));await browser.close();console.log(JSON.stringify({passed:checks.filter(x=>x.status==='passed').length,failed:checks.filter(x=>x.status==='failed').length,errors},null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
