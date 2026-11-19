const pw=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const results=[];
(async()=>{for(const engine of ['chrome','firefox','webkit']){
 const browser=await(engine==='chrome'?pw.chromium:pw[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})});
 try{for(const locale of ['en','fr'])for(const [width,height,touch] of [[1440,1000,false],[1280,720,false],[1920,1080,false],[390,844,true],[320,720,true],[760,1000,true],[844,390,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,reducedMotion:'reduce',...(engine!=='firefox'?{isMobile:touch}:{})}),page=await context.newPage();
  await page.goto('http://localhost:4334/'+locale,{waitUntil:'load'});await page.locator('.cinematic-home.motion-ready').waitFor();await page.evaluate(()=>document.fonts.ready);
  // The previous build does not set the new handoff marker; retain its measured
  // dimensions before applying the prototype CSS for this comparison.
  await page.locator('.zoom-preview').evaluate(el=>el.setAttribute('data-positioned',''));
  await page.addStyleTag({path:'components/landing/cinematic.css'});
  await page.addStyleTag({path:'components/landing/landing-production.css'});await page.waitForTimeout(150);
  const geometry=await page.evaluate(()=>{const el=document.querySelector('.zoom-preview');const rect=()=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};const measured=rect();el.removeAttribute('style');el.removeAttribute('data-positioned');const initial=rect();return{measured,initial,visible:getComputedStyle(el).visibility,delta:Math.max(...Object.keys(initial).map(k=>Math.abs(initial[k]-measured[k])))}});
  const item={engine,locale,width,height,touch,...geometry};results.push(item);console.log(JSON.stringify(item));assert.equal(item.visible,'visible');assert.ok(item.delta<1,JSON.stringify(item));await context.close();
 }}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'initial-geometry.json'),JSON.stringify(results,null,2));}
}})().catch(e=>{console.error(e);process.exitCode=1});
