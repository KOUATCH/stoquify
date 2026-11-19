const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({reducedMotion:'reduce'}),results=[];
await page.addInitScript(()=>{window.__routeErrors=[];window.addEventListener('error',e=>window.__routeErrors.push({message:e.message,digest:e.error?.digest}));});
try{for(const route of ['/en/products/not-a-product','/en/offers/not-an-offer','/fr/products/not-a-product','/fr/offers/not-an-offer']){
await page.goto('http://localhost:4331'+route,{waitUntil:'load'});await page.locator('.detail-start-actions a:visible').first().waitFor();await page.waitForTimeout(1500);
const evidence=await page.evaluate(()=>({errors:window.__routeErrors,templates:[...document.querySelectorAll('template[data-dgst]')].map(e=>e.dataset.dgst)}));
await page.locator('.detail-start-actions a:visible').first().click();await page.waitForURL('**/products');results.push({route,...evidence,recoveryUrl:page.url()});
}console.log(JSON.stringify(results,null,2));fs.writeFileSync(path.join(__dirname,'invalid-route-diagnostic.json'),JSON.stringify(results,null,2));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
