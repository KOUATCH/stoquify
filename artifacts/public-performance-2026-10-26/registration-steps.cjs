// Local-only UI review. All mutation requests are blocked; final submission is never activated.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'registration');fs.mkdirSync(out,{recursive:true});const results=[];
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const locale of ['en','fr'])for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),mutations=[],errors=[];
  await context.route('**/*',route=>{if(!['GET','HEAD','OPTIONS'].includes(route.request().method())){mutations.push({method:route.request().method(),url:route.request().url()});return route.abort();}return route.continue();});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://localhost:4332/'+locale+'/register',{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>document.querySelector('input[name="firstName"]')?.disabled===false);await page.evaluate(()=>document.fonts.ready);
  for(const [name,value] of Object.entries({firstName:'Preview',lastName:'Reviewer',email:'preview@example.invalid',phone:'000000000'}))await page.locator('input[name="'+name+'"]').fill(value);
  await page.getByRole('button',{name:locale==='fr'?'Continuer':'Continue',exact:true}).click();await page.locator('input[name="companyName"]').fill('Fictional review workspace');
  await page.getByRole('combobox').first().click();await page.getByRole('option').first().click();
  const item={locale,width,steps:[],mutations,errors};results.push(item);
  for(const step of ['company','security']){
   if(step==='security')await page.getByRole('button',{name:locale==='fr'?'Continuer':'Continue',exact:true}).click();
   await page.screenshot({path:path.join(out,`${locale}-${width}-${step}.png`),fullPage:true});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.equal(overflow,0);
   await page.addScriptTag({path:require.resolve('axe-core')});const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[]);item.steps.push({step,overflow,violations});
   if(width===390){await page.setViewportSize({width:320,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);await page.screenshot({path:path.join(out,`${locale}-320-${step}.png`),fullPage:true});await page.setViewportSize({width,height:1000});}
  }
  for(const route of ['terms','privacy'])assert.equal(await page.locator('form a[href="/'+locale+'/'+route+'"]').count(),1);
  await page.getByRole('button',{name:locale==='fr'?'Retour':'Back',exact:true}).click();assert.equal(await page.locator('input[name="companyName"]').inputValue(),'Fictional review workspace');
  assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);console.log(JSON.stringify({locale,width,steps:2,mutations:0}));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await context.close();
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}})().catch(e=>{console.error(e);process.exitCode=1});

