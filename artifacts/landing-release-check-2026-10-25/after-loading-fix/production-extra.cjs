const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = 'http://127.0.0.1:4331';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 const report = {environment:'Local production server; synthetic responsive Chrome checks, not field metrics or physical devices',results:[]};
 try {
  for (const locale of ['en','fr']) for (const width of [1440,390]) {
   const context = await browser.newContext({viewport:{width,height:1000},isMobile:width===390,hasTouch:width===390});
   const page = await context.newPage(), errors=[], badAssets=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400 && /\.(js|css|webp|png|svg|woff2?)(\?|$)/.test(r.url()))badAssets.push({url:r.url(),status:r.status()})});
   page.on('requestfailed',r=>{if(['script','stylesheet','image','font'].includes(r.resourceType()))badAssets.push({url:r.url(),failure:r.failure()?.errorText})});
   const cdp = await context.newCDPSession(page);
   await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   if(width===390) {
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});
   }
   await page.addInitScript(()=>{
    window.__reviewVitals={lcp:0,cls:0,shifts:[]};
    new PerformanceObserver(list=>{for(const e of list.getEntries())window.__reviewVitals.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput){window.__reviewVitals.cls+=e.value;window.__reviewVitals.shifts.push({time:e.startTime,value:e.value})}}).observe({type:'layout-shift',buffered:true});
   });
   const response=await page.goto(`${base}/${locale}`,{waitUntil:'load',timeout:120000});
   await page.locator('.cinematic-home.motion-ready').waitFor({timeout:90000});
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1500);
   const item={locale,width,status:response.status(),performance:await page.evaluate(()=>({
    ...window.__reviewVitals,ttfb:performance.getEntriesByType('navigation')[0].responseStart,
    resources:performance.getEntriesByType('resource').length,
    transferredBytes:performance.getEntriesByType('resource').reduce((n,e)=>n+e.transferSize,0),
   })),metadata:await page.evaluate(()=>({
    title:document.title,lang:document.documentElement.lang,
    canonical:document.querySelector('link[rel="canonical"]')?.href??null,
    alternates:[...document.querySelectorAll('link[hreflang]')].map(el=>({locale:el.hreflang,url:el.href})),
    ogTitle:document.querySelector('meta[property="og:title"]')?.content,
    twitterTitle:document.querySelector('meta[name="twitter:title"]')?.content,
    robots:document.querySelector('meta[name="robots"]')?.content??null,
    icon:document.querySelector('link[rel="icon"]')?.getAttribute('href'),
   })),errors,badAssets};
   assert.equal(item.status,200);assert.equal(item.metadata.lang,locale);
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
   await page.emulateMedia({reducedMotion:'reduce'});
   // Half-width CSS viewport verifies the reflow required by full-page zoom.
   // CSS zoom and text enlargement below are controlled simulations, not a native setting.
   await page.setViewportSize({width:720,height:500});
   item.zoomReflowOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.equal(item.zoomReflowOverflow,0);
   await page.setViewportSize({width,height:1000});
   if(width===1440) {
    await page.evaluate(()=>document.documentElement.style.zoom='2');
    item.cssZoomOverflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
    await page.screenshot({path:path.join(__dirname,`${locale}-${width}-page-zoom-200.png`)});
    assert.equal(item.cssZoomOverflow,0);
    await page.evaluate(()=>document.documentElement.style.zoom='');
   }
   await page.goto(`${base}/${locale}/contact?interest=finance`,{waitUntil:'load'});
   await page.locator('.cinematic-home.motion-ready').waitFor();
   await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('.enquiry-page *')];
    const sizes=nodes.map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));
    for(const {el,size} of sizes)el.style.setProperty('font-size',`${size*2}px`,'important');
   });
   item.enlargedTextOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   item.enlargedTextClips=await page.locator('.enquiry-page :is(label,button,p,h1,h2,a)').evaluateAll(els=>els.filter(el=>el.scrollHeight>el.clientHeight+2 && ['hidden','clip'].includes(getComputedStyle(el).overflowY)).map(el=>el.textContent));
   await page.screenshot({path:path.join(__dirname,`${locale}-${width}-contact-text-200.png`),fullPage:true});
   assert.equal(item.enlargedTextOverflow,0);assert.deepEqual(item.enlargedTextClips,[]);
   const first=page.locator('.enquiry-form select').first();await first.focus();
   item.keyboard=[];
   for(let i=0;i<8;i++) {
    item.keyboard.push(await page.evaluate(()=>({tag:document.activeElement.tagName,label:document.activeElement.closest('label')?.textContent.trim()??document.activeElement.textContent.trim(),outline:getComputedStyle(document.activeElement).outlineStyle})));
    await page.keyboard.press('Tab');
   }
   assert.deepEqual(errors,[]);assert.deepEqual(badAssets,[]);
   report.results.push(item);fs.writeFileSync(path.join(__dirname,'production-extra.json'),JSON.stringify(report,null,2));
   console.log(JSON.stringify({locale,width,performance:item.performance,zoom:item.zoomReflowOverflow,textZoom:item.enlargedTextOverflow}));
   await context.close();
  }
 } finally {await browser.close();fs.writeFileSync(path.join(__dirname,'production-extra.json'),JSON.stringify(report,null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
