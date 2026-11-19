const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const results=[];
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const locale of ['en','fr'])for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  const item={locale,width,recoveries:[],errors:[]};results.push(item);page.on('pageerror',e=>item.errors.push({url:page.url(),message:e.message}));
  for(const route of ['/products/not-a-product','/offers/not-an-offer']){
   await page.goto(`http://localhost:4332/${locale}/products/receivables`,{waitUntil:'domcontentloaded',timeout:120000});
   await page.locator('.detail-product-copy .outline:visible').click();await page.waitForURL('**/login?**',{waitUntil:'commit',timeout:60000});
   // Interrupt immediately after the protected destination redirects. No login input or submission.
   await page.goto(`http://localhost:4332/${locale}${route}`,{waitUntil:'domcontentloaded',timeout:120000});
   await page.locator('.detail-start-actions a:visible').first().click();await page.waitForURL('**/'+locale+'/products');await page.locator('.catalog-unit').waitFor();
   item.recoveries.push(route);
  }
  console.log(JSON.stringify(item));fs.writeFileSync(path.join(__dirname,'interrupted-auth-navigation.json'),JSON.stringify(results,null,2));await context.close();
 }
}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'interrupted-auth-navigation.json'),JSON.stringify(results,null,2));}
assert.ok(results.every(r=>r.errors.length===0),'Browser errors recorded');})().catch(e=>{console.error(e);process.exitCode=1});
