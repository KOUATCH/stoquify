const fs=require('node:fs'),path=require('node:path');let source=fs.readFileSync(path.join(__dirname,'verify-cash-proof-browser.cjs'),'utf8');
source=source.replaceAll('cash-proof-state-','proof-module-');
source=source.replace('const hashes=',"files.push('actions/evidence/proof-trail.actions.ts','services/_shared/protect.ts','services/evidence/proof-trail.service.ts');\nconst hashes=");
const a=source.indexOf('async function main(){'),b=source.indexOf('main().catch',a);
source=source.slice(0,a)+`async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const own=await fixture('proof-module',12345),permissions=['finance.read','dashboard.read','payments.reconciliation.read'];
 await db.role.update({where:{id:own.role.id},data:{permissions}});
 const transaction=await db.paymentTransaction.create({data:{organizationId:own.org.id,amount:123,currencyCode:'XAF',occurredAt:new Date(),state:'PENDING',sourceType:'synthetic-proof-read',sourceId:stamp}});
 const before=JSON.stringify(await db.paymentTransaction.findUnique({where:{id:transaction.id}}));browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr'])for(const state of ['active','suspended','expired','read_only']){
  result.stage=locale+' '+state;
  const where={organizationId_moduleSlug:{organizationId:own.org.id,moduleSlug:'payment_reconciliation'}};
  await db.tenantModuleGrant.update({where,data:{status:'active',startsAt:null,endsAt:null}});
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce'});
  let responseContainsSubject=null;
  await context.route('**/*',route=>{
   if(new URL(route.request().url()).origin!==base)return route.abort();
   if(route.request().headers()['next-action'])return (async()=>{const actual=await route.fetch({maxRedirects:0});const body=await actual.body();responseContainsSubject=body.toString().includes(transaction.id);await route.fulfill({response:actual,body});})();
   return route.continue();
  });
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
  page=await context.newPage();await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});
  const button=page.getByRole('button',{name:'Payment transaction proof',exact:true});await expect(button).toBeEnabled();
  await expect.poll(()=>button.evaluate(element=>Object.keys(element).some(key=>key.startsWith('__reactProps$')&&typeof element[key]?.onClick==='function'))).toBe(true);
  await db.tenantModuleGrant.update({where,data:{status:state==='expired'?'active':state,endsAt:state==='expired'?new Date('2020-01-01'):null}});
  const received=page.waitForResponse(response=>!!response.request().headers()['next-action'],{timeout:60000});await button.click();await received;
  const allowed=state==='active'||state==='read_only';result.responseContainsSubject=responseContainsSubject;
  assert.equal(responseContainsSubject,allowed,'Cached proof action disclosure disagrees with current module read access');
  result.checks.push({locale,state,cachedButton:true,currentModuleReadAllowed:allowed,responseContainsSubject});
  await context.close();console.log(locale+' '+state+': passed');
 }
 assert.equal(JSON.stringify(await db.paymentTransaction.findUnique({where:{id:transaction.id}})),before);result.noPaymentMutation=true;result.passed=true;
}
`+source.slice(b);
fs.writeFileSync(path.join(__dirname,'verify-proof-module-browser.cjs'),source,{flag:'wx'});
