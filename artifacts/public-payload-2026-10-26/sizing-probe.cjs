const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];try{
 for(const locale of ['en','fr']){
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await page.goto('http://localhost:4332/'+locale,{waitUntil:'load',timeout:120000});await page.locator('.cinematic-home.motion-ready').waitFor();await page.evaluate(()=>document.fonts.ready);
 for(const width of [1440,1024,768,390,320]){
 await page.setViewportSize({width,height:1000});
 for(const module of [0,1,2,3,4,5,6,7]){
 const tab=page.locator('.flow-tab').nth(module);
 if(await tab.isVisible())await tab.click();else await page.locator('.workflow-module-select select').selectOption(String(module));
 const item=await page.evaluate(()=>{
 const root=document.querySelector('.workflow-showcase'),placeholder=root.querySelector('.workflow-demo-placeholder'),demo=root.querySelector('.product-workflow:not(.workflow-demo-placeholder)');
 const measure=()=>({unit:root.querySelector('.showcase-inner').getBoundingClientRect().height,preview:root.querySelector('.module-preview').getBoundingClientRect().height,live:demo.getBoundingClientRect().height,placeholder:placeholder.getBoundingClientRect().height});
 const before=measure(),guide=placeholder.querySelector('.workflow-size-guide'),parent=guide.parentNode;const removedNodes=guide.querySelectorAll('*').length;guide.remove();
 const hint=placeholder.querySelector('.workflow-playback-indicator').cloneNode(true);hint.style.visibility='hidden';hint.setAttribute('aria-hidden','true');demo.querySelector('.workflow-interaction').prepend(hint);
 const after=measure();hint.remove();parent.append(guide);return {before,after,removedNodes};
 });results.push({locale,width,module,...item});
 }
 }await page.close();console.log(locale+' measured');
 }
}finally{fs.writeFileSync(path.join(__dirname,'sizing-probe.json'),JSON.stringify(results,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
