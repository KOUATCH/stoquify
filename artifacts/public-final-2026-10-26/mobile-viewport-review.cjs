const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const out=path.join(__dirname,'visual-review','fr-mobile-viewports');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
 await page.goto('http://localhost:4334/fr',{waitUntil:'load',timeout:120000});await page.locator('.cinematic-home.motion-ready').waitFor();await page.evaluate(()=>document.fonts.ready);
 const report=await page.evaluate(()=>({height:document.documentElement.scrollHeight,heroCount:document.querySelectorAll('.hero-aio').length,h1Count:document.querySelectorAll('h1').length,footerCount:document.querySelectorAll('footer').length,footerTop:document.querySelector('footer').getBoundingClientRect().top+scrollY}));report.views=[];
 for(let y=14500;y<report.height;y+=750){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(150);const actual=await page.evaluate(()=>scrollY);await page.screenshot({path:path.join(out,`${Math.round(actual)}.png`)});report.views.push(actual);if(actual+844>=report.height)break;}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
