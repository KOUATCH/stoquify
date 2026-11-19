const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base='http://localhost:4331',out=path.join(__dirname,'final-delta');fs.mkdirSync(out,{recursive:true});
const results=[];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const locale of ['en','fr'])for(const width of [1440,390])for(const route of ['/get-started','/products/hris','/offers/finance','/products/not-a-product','/offers/not-an-offer','/privacy','/terms']){
  const page=await browser.newPage({viewport:{width,height:width===1440?1000:844},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+'/'+locale+route,{waitUntil:'load',timeout:120000});await page.locator('.cinematic-home.motion-ready').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
  const item={locale,width,route,status:response.status(),errors,...await page.evaluate(()=>({title:document.title,lang:document.documentElement.lang,robots:document.querySelector('meta[name="robots"]')?.content,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}))};results.push(item);
  assert.equal(item.lang,locale);assert.equal(item.overflow,0);
  if(route.includes('/not-a')){
   assert.ok([200,404].includes(item.status));assert.equal(item.title,locale==='fr'?'Page introuvable | Stoquify':'Page not found | Stoquify');assert.match(item.robots,/noindex/);
   assert.equal(await page.locator('.detail-start-actions a:visible').first().getAttribute('href'),'/'+locale+'/products');
  }else assert.equal(item.status,200);
  if(route==='/privacy'||route==='/terms'){
   assert.match(item.robots,/noindex/);assert.equal(await page.locator('.detail-start-actions a[href="/'+locale+'/register"]').count(),1);
   assert.equal(await page.locator('.detail-start-actions h2').count(),1);
  }
  if(route==='/get-started'){
   item.setupColumns=await page.locator('.detail-setup-list').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(item.setupColumns,width===1440?2:1);assert.equal(await page.locator('.detail-setup-list .detail-card').count(),4);
  }
  await page.screenshot({path:path.join(out,`${locale}-${width}-${route.slice(1).replaceAll('/','-')}.png`),fullPage:true});
  await page.addScriptTag({path:require.resolve('axe-core')});item.accessibility=[];
  for(const theme of ['default','alternate']){if(theme==='alternate')await page.locator('.theme-toggle').click();const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});item.accessibility.push({theme,violations});assert.deepEqual(violations,[]);}
  if(width===390){await page.setViewportSize({width:320,height:844});item.overflow320=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.equal(item.overflow320,0);}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({locale,width,route,status:item.status,errors:errors.length,setupColumns:item.setupColumns}));await page.close();
 }}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
