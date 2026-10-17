const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper,root}=f;
const {hashPassword}=require(path.join(root,'lib/password.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/payroll/payment-settlement-balance.ts','services/payroll/payroll-finance-forecast.service.ts','lib/dashboard/snapshot-source-blocker-presentation.ts','services/daily-habit/daily-habit-digest.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const result={at:new Date().toISOString(),syntheticLegacyReadFixture:true,sourceBefore:hashes(),checks:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const org=await db.organization.create({data:{name:helper.prefix+'Partial warning '+stamp,slug:'partial-warning-'+stamp,currency:'XAF',timezone:'UTC'}}),scope={organizationId:org.id};
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{...scope,email:stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const permissions=['dashboard.read','payroll.command.read','payroll.reports.read'];
 const role=await db.role.create({data:{...scope,code:'admin',nameEn:'Owned settlement reader',permissions,users:{connect:{id:actor.id}}}});
 const modules=['dashboard','payroll','accounting','finance','payment_reconciliation'];
 await db.tenantModuleConfiguration.create({data:{...scope,manifestHash:'synthetic-settlement',selectedModules:modules,activeModules:modules}});
 await db.tenantModuleGrant.createMany({data:modules.map(moduleSlug=>({...scope,moduleSlug,status:'active',source:'requested_modules'}))});
 await db.location.create({data:{...scope,name:'Owned warning source',code:'OWNED'}});
 const now=new Date(),start=new Date(now);start.setUTCHours(0,0,0,0);const end=new Date(start.getTime()+86400000-1);
 const period=await db.payrollPeriod.create({data:{...scope,name:'Synthetic legacy partial',periodStart:start,periodEnd:end,payDate:now,countryCode:'CM'}});
 const run=await db.payrollRun.create({data:{...scope,payrollPeriodId:period.id,runNumber:'SYNTHETIC',status:'POSTED',countryCode:'CM',countryPackVersion:'synthetic-not-approval',countryPackSchemaVersion:'synthetic',countryPackResolutionHash:'synthetic',countryPackCapabilityStatus:'UNAVAILABLE',ruleSetHash:'synthetic',calculationHash:'synthetic',attendanceSnapshotHash:'synthetic',netPayableAmount:350000,metadata:{syntheticReadFixture:true}}});
 await db.payrollPaymentBatch.create({data:{...scope,payrollRunId:run.id,batchNumber:'SYNTHETIC',status:'PARTIALLY_SETTLED',method:'BANK_TRANSFER',amount:350000,currency:'XAF',paymentDate:now,requestedById:actor.id}});
 const fingerprint=async()=>JSON.stringify(await db.payrollPaymentBatch.findMany({where:scope}));const before=await fingerprint();
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  await db.role.update({where:{id:role.id},data:{permissions}});
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1100},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  result.stage=locale+' warning';await page.goto(base+'/'+locale+'/dashboard/daily-digest?digest=owner-morning&mode=command',{waitUntil:'domcontentloaded',timeout:180000});
  const title=locale==='fr'?'Le solde restant du paiement de paie n’est pas vérifié':'Remaining payroll payment balance is unverified';
  const main=page.locator('.dashboard-landing-content'),disclosure=main.locator('summary').filter({hasText:title}).first();
  await expect(disclosure).toBeVisible();await disclosure.focus();await page.keyboard.press('Enter');
  await expect(disclosure.locator('..').getByText(locale==='fr'?'Examinez les preuves de règlement de la paie et établissez l’obligation restante avant de vous fier à cette prévision.':'Review payroll settlement evidence and establish the remaining obligation before relying on this forecast.',{exact:false})).toBeVisible();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  const screenshot='settlement-warning-'+stamp+'-'+locale+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});
  await db.role.update({where:{id:role.id},data:{permissions:['dashboard.read']}});await page.reload({waitUntil:'domcontentloaded',timeout:180000});await expect(main.getByText(title,{exact:true})).toHaveCount(0);assert.deepEqual(errors,[]);
  result.checks.push({locale,localizedRecovery:true,keyboardDisclosure:true,permissionRevocation:true,noHorizontalOverflow:true,noPageErrors:true,screenshot});await context.close();console.log(locale+' legacy warning passed');
 }
 assert.equal(await fingerprint(),before);result.noBatchMutation=true;result.passed=true;
}
main().catch(async e=>{result.passed=false;result.error=f.safe(e,secrets);process.exitCode=1;if(page&&!page.isClosed()){result.failureScreenshot='settlement-warning-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{});}}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}const file='settlement-warning-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error}));await db.$disconnect();});
