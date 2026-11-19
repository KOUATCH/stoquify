const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const work=path.resolve(__dirname,'../../.codex-tmp/landing-build-fixture-regression');
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(['/bundle.js','/style.css'].includes(pathname)){res.setHeader('Content-Type',pathname.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(path.join(work,pathname.slice(1))));return;}
  res.end('<!doctype html><html lang="'+(pathname.startsWith('/fr')?'fr':'en')+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
 try{
  for(const locale of ['en','fr'])for(const surface of ['daily-digest','owner-war-room','manager-action-center','locations']){
   const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/${locale}/dashboard/${surface}`);
   await page.getByRole('heading',{level:1}).waitFor();await page.waitForTimeout(100);
   const heading=await page.getByRole('heading',{level:1}).innerText();
   await page.evaluate(()=>window.fixtureCommit());await page.waitForTimeout(100);
   assert.equal(await page.getByRole('heading',{level:1}).innerText(),heading);
   await page.setViewportSize({width:390,height:844});
   await page.evaluate(()=>window.fixtureRevoke());await page.waitForTimeout(100);
   assert.equal(await page.getByRole('heading',{level:1}).count(),1);
   const remaining=await page.locator('main a[href*="record=fixture"]').count();assert.equal(remaining,0);
   const calls=await page.evaluate(()=>window.fixtureCommandCalls);assert.equal(calls,0);assert.deepEqual(errors,[]);
   results.push({locale,surface,heading,commitPreservesHeading:true,revokeClearsWork:true,businessActionCalls:calls,errors});
   console.log(`${locale} ${surface}: mount, commit and revoke passed`);await page.close();
  }
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(__dirname,process.env.FIXTURE_PHASE==='6'?'fixture-phase6-controls.json':'fixture-controls.json'),JSON.stringify({scope:'Real dashboard components with synthetic data and mocked actions; focused fixture-control regression',results},null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
