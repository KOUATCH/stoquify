const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}});
await page.addInitScript(()=>{window.__shifts=[];new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__shifts.push({time:e.startTime,value:e.value,sources:e.sources.map(s=>({tag:s.node?.tagName,class:s.node?.className,previous:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))})}).observe({type:'layout-shift',buffered:true})});
await page.goto('http://127.0.0.1:4331/en',{waitUntil:'load',timeout:90000});await page.locator('.cinematic-home.motion-ready').waitFor();await page.waitForTimeout(1000);
results.push({width,shifts:await page.evaluate(()=>window.__shifts)});await page.close();}
}finally{await browser.close();fs.writeFileSync(__dirname+'/layout-shift-diagnostic.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results))}})().catch(e=>{console.error(e);process.exitCode=1});
