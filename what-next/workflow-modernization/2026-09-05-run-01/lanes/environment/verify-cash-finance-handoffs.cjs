// Disposable, explicitly synthetic read fixtures. No posting or payment execution.
const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {getCashCommandData}=require(path.join(f.root,'services/cash-command/cash-command.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/cash-command/cash-command-navigation.ts','app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts','app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts','actions/payroll/payroll-control.actions.ts','services/cash-command/cash-command-sources.service.ts','services/payroll/payroll-finance-forecast.service.ts','services/bi/bi-evidence-adapter.service.ts','services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/cash-command-contracts.ts','components/cash-command/CashCommandDashboard.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx','services/modules/module-entitlement.service.ts'];
files.push('components/finance/FinanceSpecializedLedgerSurfaces.tsx','components/finance/PaymentReconciliationWorkbench.tsx','app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts','actions/finance/finance-dashboard.actions.ts');
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:[]},output=path.join(__dirname,'cash-finance-handoff-'+stamp+'.json');
let browser,page;
async function fixture(label,amount){
 const org=await db.organization.create({data:{name:helper.prefix+'Cash visibility '+label+' '+stamp,slug:'cash-visibility-'+label+'-'+stamp,currency:'XAF',timezone:'UTC'}});
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{organizationId:org.id,email:label+'-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const role=await db.role.create({data:{organizationId:org.id,code:'admin',nameEn:'Owned Cash Command reader',permissions:['finance.read','dashboard.read','payroll.payments.reconcile'],users:{connect:{id:actor.id}}}});
 const modules=[...require(path.join(f.root,'services/modules/module-control-contracts.ts')).COMMERCIAL_MODULE_SLUGS];
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
 await helper.withClient(f.target,helper.assertOwned);const own=await fixture('finance-handoff',100);
 const {getCashCommandSources}=require(path.join(f.root,'services/cash-command/cash-command-sources.service.ts'));
 const readSources=()=>getCashCommandSources({organizationId:own.org.id,actorId:own.actor.id,actorPermissions:['payroll.payments.reconcile'],currency:'XAF'});
 result.stage='actual empty forecast source';
 let sources=await readSources();assert.equal(sources.payrollForecast.status,'empty');assert.equal(sources.payrollForecast.evidenceGrade,'operational');
 const due=new Date();due.setUTCHours(12,0,0,0);const start=new Date(due);start.setUTCHours(0,0,0,0);const end=new Date(due);end.setUTCHours(23,59,59,999);
 await db.payrollPeriod.create({data:{organizationId:own.org.id,name:'Synthetic unposted forecast source',periodStart:start,periodEnd:end,payDate:due,countryCode:'CM'}});
 result.stage='actual incomplete forecast source';sources=await readSources();assert.equal(sources.payrollForecast.status,'blocked');assert.equal(sources.payrollForecast.evidenceGrade,'blocked');assert.equal(sources.payrollForecast.metrics.upcomingNetPayAmount,null);
 result.forecastSourceChecks={emptyOperational:true,incompleteBlocked:true};
 const effects=async()=>JSON.stringify({balances:await db.payrollEmployeeBalanceCase.findMany({where:{organizationId:own.org.id},orderBy:{id:'asc'}}),payments:await db.payment.count({where:{organizationId:own.org.id}}),journals:await db.journalEntry.count({where:{organizationId:own.org.id}})});
 const before=await effects();browser=await chromium.launch({headless:true});
 for(const item of [
  {id:'cash_collected',title:'Cash collected',permission:'finance.read',route:'/dashboard/finance/payments',kind:'payments'},
  {id:'unreconciled_cash',title:'Unreconciled cash',permission:'payments.reconciliation.read',route:'/dashboard/finance/reconciliation',kind:'reconciliation'},
 ])for(const locale of ['en','fr']){
  result.stage=item.id+' '+locale;
  const full=['dashboard.read','finance.read',item.permission];await db.role.update({where:{id:own.role.id},data:{permissions:full}});
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce',timezoneId:'America/New_York'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(f.safe({message:String(error.message).slice(-1500)},secrets)));
  const cash=base+'/'+locale+'/dashboard/finance/cash-command';await page.goto(cash,{waitUntil:'domcontentloaded',timeout:180000});
  let card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();await expect(card).toBeVisible();
  let link=card.locator('a[href="/'+locale+item.route+'"]').last();await expect(link).toBeVisible();await link.focus();await expect(link).toBeFocused();
  const started=Date.now();await link.press('Enter',{noWaitAfter:true});await expect(page).toHaveURL(base+'/'+locale+item.route,{timeout:180000});
  if(item.kind==='payments')await expect(page.locator('[data-finance-result-state="ready"]')).toBeVisible({timeout:120000});
  else await expect(page.getByRole('heading',{level:1,name:/reconciliation|rapprochement/i})).toBeVisible({timeout:120000});
  assert.ok(!/workbench unavailable|Missing permission|permission denied/i.test(await page.locator('main').first().innerText()));
  const destinationMs=Date.now()-started;const destinationScreenshot='cash-finance-handoff-'+stamp+'-'+item.id+'-'+locale+'-destination.png';await page.screenshot({path:path.join(__dirname,destinationScreenshot),fullPage:true,animations:'disabled'});
  await page.goBack({waitUntil:'domcontentloaded',timeout:180000});await expect(page).toHaveURL(cash);await expect(page.getByRole('heading',{name:item.title,exact:true}).first()).toBeVisible();
  await db.role.update({where:{id:own.role.id},data:{permissions:['dashboard.read']}});
  card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();link=card.locator('a[href="/'+locale+item.route+'"]').last();await link.focus();await link.press('Enter',{noWaitAfter:true});await expect(page).toHaveURL(base+'/'+locale+item.route,{timeout:180000});
  await expect(page.getByText(/access denied|permission required|permission denied|access restricted|not available for this role|accès.*refusé|autorisation requise/i).first()).toBeVisible({timeout:120000});
  const revokedScreenshot='cash-finance-handoff-'+stamp+'-'+item.id+'-'+locale+'-revoked.png';await page.screenshot({path:path.join(__dirname,revokedScreenshot),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);result.checks.push({id:item.id,locale,keyboardHandoff:true,backRetainedLocale:true,renderedLinkRevocation:true,noPageErrors:true,destinationMs,screenshots:[destinationScreenshot,revokedScreenshot]});await context.close();console.log(item.id+' '+locale+': passed');
 }
 assert.equal(await effects(),before);result.noBusinessMutationsDuringReads=true;result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert.ok(result.sourceStable);result.passed=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);if(page){result.failedUrl=page.url();result.failedScreen='cash-finance-handoff-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failedScreen),fullPage:true}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();await db.$disconnect();fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,passed:result.passed,stage:result.stage,error:result.error}));});
