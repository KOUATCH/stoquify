const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
 try{
  for(const locale of ['en','fr'])for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:1000}});
   await page.goto(`http://127.0.0.1:4331/${locale}`,{waitUntil:'load',timeout:90000});
   await page.locator('.cinematic-home.motion-ready').waitFor();
   await page.locator('#product').evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
   await page.waitForTimeout(2500);
   const viewport=page.locator('#product .product-workflow .workflow-viewport');
   const visible=()=>viewport.evaluate(el=>[...el.querySelectorAll('.workflow-card,.workflow-item,.workflow-receipt')].filter(n=>n.getBoundingClientRect().height>0&&getComputedStyle(n).visibility!=='hidden'&&Number(getComputedStyle(n).opacity)>0).length);
   const movingVisible=await visible();assert.ok(movingVisible>0);
   await page.screenshot({path:path.join(__dirname,`${locale}-${width}-workflow-natural.png`)});
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);
   const staticVisible=await visible();assert.ok(staticVisible>0);
   await page.screenshot({path:path.join(__dirname,`${locale}-${width}-workflow-reduced.png`)});
   results.push({locale,width,movingVisible,staticVisible});console.log(JSON.stringify(results.at(-1)));await page.close();
  }
 }finally{await browser.close();fs.writeFileSync(path.join(__dirname,'preview-visual-check.json'),JSON.stringify(results,null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
