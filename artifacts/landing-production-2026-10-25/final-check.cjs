const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[],routes=[];
 try {
  for(const locale of ['en','fr']) for(const width of [1440,390,320,768]) {
   const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},isMobile:width<769,hasTouch:width<769});
   const page=await context.newPage();
   await page.goto(`http://127.0.0.1:4321/${locale}`,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('.cinematic-home.motion-ready').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
   const item=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};return {width:innerWidth,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,hero:rect('#overview'),note:rect('.hero-note'),actions:rect('.hero-actions'),images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),metadata:{title:document.title,lang:document.documentElement.lang,description:document.querySelector('meta[name="description"]')?.content}}});
   item.locale=locale;item.disclosureClear=item.note.top>=item.actions.bottom;
   if(!item.disclosureClear||item.overflow>0)throw Error(JSON.stringify(item));
   await page.screenshot({path:path.join(__dirname,`${locale}-${width}-hero-final.png`)});
   if(width<=760){await page.locator('button[aria-controls="mobile-menu"]').click();await page.locator('.mobile-motion-toggle').click();}else await page.locator('.motion-toggle').click();item.pausedHeight=await page.locator('#overview').evaluate(el=>el.getBoundingClientRect().height);
   if(width===1440 && item.pausedHeight!==1000)throw Error('Reduced-motion hero retains empty scroll space');
   if(width===1440||width===390) {
    await page.addScriptTag({path:require.resolve('axe-core')});
    item.accessibility=[];
    for(const theme of ['dark','light']) {if(theme==='light')await page.locator('.theme-toggle').click();const audit=await page.evaluate(async()=>{const r=await axe.run('.cinematic-home',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.map(v=>v.id),passes:r.passes.length}});item.accessibility.push({theme,...audit});}
    await page.locator('.theme-toggle').click();
    item.photoPreviews=[];
    for(const [name,selector] of [['operations','#business-operations'],['payments','#business-payments'],['firm','#accounting-firm']]) {
     const section=page.locator(selector);await section.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
     await section.locator('img').evaluate(async img=>{if(!img.complete)await new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true})});await img.decode()});
     await page.waitForTimeout(250);await page.screenshot({path:path.join(__dirname,`${locale}-${width}-${name}-final.png`)});
     item.photoPreviews.push({name,loaded:await section.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0)});
    }
    const trigger=page.locator('#accounting-firm .photo-screen-enlarge');await trigger.click();await page.getByRole('dialog').waitFor();
    item.dialogText=await page.getByRole('dialog').innerText();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
    item.dialogClosed=await page.getByRole('dialog').count()===0;item.dialogFocusRestored=await trigger.evaluate(el=>document.activeElement===el);
   }
   results.push(item);fs.writeFileSync(path.join(__dirname,'final-evidence.json'),JSON.stringify({results,routes},null,2));console.log(JSON.stringify({locale,width,height:item.height,disclosureClear:item.disclosureClear,pausedHeight:item.pausedHeight}));
   if(width===390) {
    await page.goto(`http://127.0.0.1:4321/${locale}/contact?interest=accounting-firm`,{waitUntil:'domcontentloaded',timeout:90000});await page.locator('.cinematic-home.motion-ready').waitFor();await page.screenshot({path:path.join(__dirname,`${locale}-390-contact-final.png`),fullPage:true});
    item.contactFields=await page.locator('.enquiry-form input').evaluateAll(els=>els.map(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor})));
    await page.locator('.theme-toggle').click();await page.screenshot({path:path.join(__dirname,`${locale}-390-contact-light-final.png`),fullPage:true});
   }
   if(width===1440)for(const route of ['/pricing','/workflows','/get-started','/products/hris','/products/payroll','/offers/finance','/contact?interest=finance']) {
    const response=await page.request.get(`http://127.0.0.1:4321/${locale}${route}`,{timeout:90000});routes.push({locale,route,status:response.status()});
   }
   await context.close();
  }
 }finally{await browser.close();fs.writeFileSync(path.join(__dirname,'final-evidence.json'),JSON.stringify({results,routes},null,2))}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
