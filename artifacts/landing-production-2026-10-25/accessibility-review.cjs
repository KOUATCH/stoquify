const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}); const results=[];
 try {
  for(const locale of ['en','fr']) for(const width of [1440,390]) {
   const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},reducedMotion:'reduce',isMobile:width===390,hasTouch:width===390});
   const page=await context.newPage();
   await page.goto(`http://127.0.0.1:4321/${locale}`,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('.cinematic-home.motion-ready').waitFor();
   for(const theme of ['dark','light']) {
    if(theme==='light') await page.locator('.theme-toggle').click();
    await page.addScriptTag({path:require.resolve('axe-core')});
    const result=await page.evaluate(async()=>{const r=await axe.run('.cinematic-home',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})),passes:r.passes.length,heroHeight:document.querySelector('#overview').getBoundingClientRect().height,viewport:innerHeight}});
    results.push({locale,width,theme,...result});fs.writeFileSync(path.join(__dirname,'accessibility-evidence.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({locale,width,theme,violations:result.violations.map(v=>v.id)}));
   }
   await context.close();
  }
 } finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
