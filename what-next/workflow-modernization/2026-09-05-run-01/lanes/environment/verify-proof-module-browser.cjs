// Disposable, explicitly synthetic read fixtures. No posting or payment execution.
const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {getCashCommandData}=require(path.join(f.root,'services/cash-command/cash-command.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/cash-command-contracts.ts','components/cash-command/CashCommandDashboard.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx','services/modules/module-entitlement.service.ts'];
files.push('actions/evidence/proof-trail.actions.ts','services/_shared/protect.ts','services/evidence/proof-trail.service.ts');
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={purpose:'Synthetic proof read and transport recovery; no financial processing',at:new Date().toISOString(),sourceBefore:hashes(),checks:[]},output=path.join(__dirname,'proof-module-'+stamp+'.json');
let browser,page;
async function fixture(label,amount){
 const org=await db.organization.create({data:{name:helper.prefix+'Cash visibility '+label+' '+stamp,slug:'proof-module-'+label+'-'+stamp,currency:'XAF',timezone:'UTC'}});
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{organizationId:org.id,email:label+'-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const role=await db.role.create({data:{organizationId:org.id,code:'admin',nameEn:'Owned Cash Command reader',permissions:['finance.read','dashboard.read','payroll.payments.reconcile'],users:{connect:{id:actor.id}}}});
 const modules=['dashboard','finance','accounting','payroll','payment_reconciliation'];
 await db.tenantModuleConfiguration.create({data:{organizationId:org.id,manifestHash:'synthetic-cash-visibility',selectedModules:modules,activeModules:modules}});
 await db.tenantModuleGrant.createMany({data:modules.map(moduleSlug=>({organizationId:org.id,moduleSlug,status:'active',source:'requested_modules'}))});
 await db.location.create({data:{organizationId:org.id,name:'Owned read source',code:'OWNED'}});
 const period=await db.payrollPeriod.create({data:{organizationId:org.id,name:'Synthetic read fixture; no approval',periodStart:new Date('2020-01-01'),periodEnd:new Date('2020-01-31'),payDate:new Date('2020-02-01'),countryCode:'CM'}});
 const run=await db.payrollRun.create({data:{organizationId:org.id,payrollPeriodId:period.id,runNumber:'SYNTHETIC',countryCode:'CM',countryPackVersion:'synthetic-not-approval',countryPackSchemaVersion:'synthetic',countryPackResolutionHash:'synthetic',countryPackCapabilityStatus:'UNAVAILABLE',ruleSetHash:'synthetic',calculationHash:'synthetic',attendanceSnapshotHash:'synthetic'}});
 const employee=await db.payrollEmployee.create({data:{organizationId:org.id,employeeNumber:'SYNTHETIC',displayName:'Synthetic cash read',hireDate:new Date('2020-01-01')}});
 await db.payrollEmployeeBalanceCase.create({data:{organizationId:org.id,employeeId:employee.id,payrollRunId:run.id,caseNumber:'SYNTHETIC',caseType:'RECEIVABLE',status:'OPEN',amount,outstandingAmount:amount,sourceNetPayableAmount:-amount,currency:'XAF',reason:'Synthetic read-boundary fixture',openedById:actor.id,documentHash:'synthetic',evidenceHash:'synthetic'}});
 return {org,actor,role,password};
}
async function main(){
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
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1;if(page&&!page.isClosed()){result.failureScreenshot='proof-module-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{});}}).finally(async()=>{
 await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:result.passed,error:result.error,sourceStable:result.sourceStable}));await db.$disconnect();
});
