const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
 try{
  for(const locale of ['en','fr'])for(const route of ['pricing','workflows'])for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:width===1440?1000:844},reducedMotion:'reduce'});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(`http://127.0.0.1:4331/${locale}/${route}`,{waitUntil:'load',timeout:90000});
   await page.locator('.cinematic-home.motion-ready').waitFor();await page.evaluate(()=>document.fonts.ready);
   const item=await page.evaluate(()=>({title:document.title,lang:document.documentElement.lang,heading:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
   assert.equal(response.status(),200);assert.equal(item.lang,locale);assert.ok(item.heading);assert.equal(item.overflow,0);assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(__dirname,`${locale}-${width}-${route}-production.png`),fullPage:true});
   results.push({locale,route,width,...item,errors});console.log(`${locale} ${route} ${width}: passed`);await page.close();
  }
 }finally{await browser.close();fs.writeFileSync(path.join(__dirname,'related-pages.json'),JSON.stringify(results,null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
