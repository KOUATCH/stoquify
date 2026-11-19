const pw=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.REVIEW_BROWSER||'chrome',out=path.join(__dirname,'recovery-'+engine);fs.mkdirSync(out,{recursive:true});const results=[];
(async()=>{const browser=await(engine==='chrome'?pw.chromium:pw[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})});try{
 for(const locale of ['en','fr'])for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4334/'+locale+'/products',{waitUntil:'load',timeout:120000});
  const response=await page.goto('http://localhost:4334/'+locale+'/this-page-does-not-exist',{waitUntil:'load',timeout:120000});
  assert.equal(response.status(),404);await page.getByRole('heading',{level:1,name:locale==='fr'?'Cette page est introuvable':'This page could not be found',exact:true}).waitFor();await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);
  assert.equal(await page.getByRole('img',{name:'Stoquify',exact:true}).count(),1);
  const home=page.getByRole('link',{name:locale==='fr'?'Revenir à l’accueil':'Go to home',exact:true});assert.equal(await home.getAttribute('href'),'/'+locale);
  await page.addScriptTag({path:require.resolve('axe-core')});const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});assert.deepEqual(violations,[]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.equal(overflow,0);if(width===390){await page.setViewportSize({width:320,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);await page.setViewportSize({width,height:900});}
  await page.screenshot({path:path.join(out,`${locale}-${width}.png`),fullPage:true});await home.click();await page.waitForURL(new RegExp('/'+locale+'/?$'));await page.locator('.cinematic-home.motion-ready').waitFor();await page.goBack();await page.getByRole('button',{name:locale==='fr'?'Retour':'Go back',exact:true}).click();await page.waitForURL('**/'+locale+'/products');
  assert.deepEqual(errors,[]);const item={locale,width,status:response.status(),overflow,violations,homeRecovery:true,backRecovery:true,errors};results.push(item);console.log(JSON.stringify({engine,...item}));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await context.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
