const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{PrismaClient}=require('@prisma/client');
const f=JSON.parse(fs.readFileSync('.codex-tmp/remaining-pos-browser-private.json','utf8'));
if(f.base!=='http://127.0.0.1:3168'||new URL(f.url).pathname!=='/stoquify_pos_audit_20261026_d30f')throw Error('Wrong local target');
async function main(){const browser=await chromium.launch({headless:true}),db=new PrismaClient({datasourceUrl:f.url});let page;try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(60000);
 const login=await context.request.post(f.base+'/api/auth/sign-in/email',{data:{email:f.actor.email,password:f.password},headers:{Origin:f.base},timeout:240000});assert.equal(login.status(),200);
 await page.goto(f.base+'/en/dashboard/pos',{waitUntil:'domcontentloaded',timeout:240000});
 await page.getByRole('heading',{name:'Point of sale',exact:true}).waitFor({timeout:90000});
 console.log('Signed in and loaded POS');
 const resume=page.getByRole('button',{name:'Resume cart',exact:true});if(await resume.count())await resume.first().click();
 const charge=page.getByRole('button',{name:/^Charge FCFA/});await charge.waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent?.trim().startsWith('Charge FCFA')&&!b.disabled));
 // Revocation after the page loaded must not trust its cached permission view.
 let revoked=false;
 await page.route('**/*',async route=>{
  if(!revoked&&route.request().method()==='POST'&&route.request().headers()['next-action']&&route.request().postData()?.includes('clientCommitId')){
   revoked=true;await db.role.update({where:{id:f.actor.roleId},data:{permissions:f.actor.permissions.filter(p=>p!=='pos.use')}});
  }
  await route.continue();
 });
 await charge.click();
 // This message is rendered only from the financial action's FORBIDDEN result.
 await page.getByText(/This attempt was denied because the required access is unavailable/).waitFor({timeout:90000});
 assert.equal(revoked,true);await page.unroute('**/*');console.log('Commit action denied by server');
 assert.equal(await db.pOSCommitResult.count({where:{organizationId:f.actor.organizationId}}),0);
 await page.screenshot({path:path.join(__dirname,'pos-denied-en.png'),fullPage:true});
 await db.role.update({where:{id:f.actor.roleId},data:{permissions:f.actor.permissions}});
 await page.reload({waitUntil:'domcontentloaded'});
 console.log('Restored synthetic permission and reloaded retained request');
 await page.getByRole('button',{name:'Resolve previous attempt',exact:true}).click();
 await page.getByRole('button',{name:'Check previous result',exact:true}).click();
 const retry=page.getByRole('button',{name:'Retry original request',exact:true});await retry.waitFor();
 let dropped=false;
 await page.route('**/*',async route=>{
  if(!dropped&&route.request().method()==='POST'&&route.request().headers()['next-action']&&route.request().postData()?.includes('clientCommitId')){
   const response=await route.fetch({timeout:90000}),body=await response.text();
   if(body.includes('"status":"COMPLETED"')&&body.includes('saleId')){dropped=true;await route.abort('failed')}else await route.fulfill({response});
  }else await route.continue();
 });
 await retry.click();
 await page.getByRole('button',{name:'Check previous result',exact:true}).click();
 await page.getByText(/This lookup made no new charge or posting/).waitFor();
 assert.equal(dropped,true);
 await page.screenshot({path:path.join(__dirname,'pos-recovered-en.png'),fullPage:true});
 const rows=await db.pOSCommitResult.findMany({where:{organizationId:f.actor.organizationId}});assert.equal(rows.length,1);
 const level=await db.inventoryLevel.findUniqueOrThrow({where:{itemId_locationId:{itemId:f.actor.itemId,locationId:f.actor.locationId}}});
 assert.equal(level.quantityOnHand.toFixed(3),'0.000');assert.equal(level.totalValue.toFixed(2),'0.00');
 assert.equal(await db.payment.count({where:{organizationId:f.actor.organizationId}}),1);
 await page.getByRole('button',{name:'Result reviewed — continue',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.goto(f.base+'/fr/dashboard/pos',{waitUntil:'domcontentloaded',timeout:180000});
 await page.getByRole('heading',{name:require(path.join(process.cwd(),'messages/fr.json')).pos.shell.title,exact:true}).waitFor();
 await page.screenshot({path:path.join(__dirname,'pos-recovered-fr.png'),fullPage:true});
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const axe=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('main')??document.body,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:r.passes.length}});
 fs.writeFileSync(path.join(__dirname,'pos-axe-fr.json'),JSON.stringify(axe,null,2));
 fs.writeFileSync(path.join(__dirname,'pos-browser-results.json'),JSON.stringify({status:'PASS',organizationId:f.actor.organizationId,actualRoute:'/dashboard/pos',locales:['en','fr'],viewports:['1440x1000','390x844'],roleRevocationDenied:true,lostReply:dropped,commitCount:rows.length,clientCommitId:rows[0].clientCommitId,stock:{quantity:level.quantityOnHand.toFixed(3),value:level.totalValue.toFixed(2)},axeViolationCount:axe.violations.length},null,2));
 fs.writeFileSync(path.join(__dirname,'pos-final-fr.txt'),await page.locator('body').innerText());
 console.log('POS browser recovery verification passed');
}catch(error){if(page){fs.writeFileSync(path.join(__dirname,'pos-failure.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(__dirname,'pos-failure.png'),fullPage:true})}throw error}finally{await db.role.update({where:{id:f.actor.roleId},data:{permissions:f.actor.permissions}});await db.$disconnect();await browser.close()}}
main().catch(e=>{console.error(e.message);process.exitCode=1});
