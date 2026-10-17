// Disposable, explicitly synthetic read fixtures. No posting or payment execution.
const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {getCashCommandData}=require(path.join(f.root,'services/cash-command/cash-command.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['actions/pos/drawer-dashboard.actions.ts','hooks/posHooks/useDrawerDashboard.ts','app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts','components/pos/CashDrawerManagementDashboard.tsx','services/cash-command/cash-command-navigation.ts','app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts','app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts','actions/payroll/payroll-control.actions.ts','services/cash-command/cash-command-sources.service.ts','services/payroll/payroll-finance-forecast.service.ts','services/bi/bi-evidence-adapter.service.ts','services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/cash-command-contracts.ts','components/cash-command/CashCommandDashboard.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx','services/modules/module-entitlement.service.ts'];
files.push('lib/security/rbac-permissions.ts','components/bi/BICommandBriefHeader.tsx','services/snapshots/snapshot-utils.ts');
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:[]},output=path.join(__dirname,'cash-drawer-'+stamp+'.json');
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
 await helper.withClient(f.target,helper.assertOwned);const own=await fixture('own',987654321);
 const effects=async()=>JSON.stringify({balances:await db.payrollEmployeeBalanceCase.findMany({where:{organizationId:own.org.id},orderBy:{id:'asc'}}),payments:await db.payment.count({where:{organizationId:own.org.id}}),journals:await db.journalEntry.count({where:{organizationId:own.org.id}})});
 const before=await effects();browser=await chromium.launch({headless:true});
 const cases=['CASH_DRAWER_READ','finance.cash-drawer.read'].map((permission,index)=>({id:'drawer_risk',caseId:'drawer-'+index,title:'Drawer risk',destination:[permission],route:'/dashboard/finance/cash-drawer'}));
 for(const item of cases)for(const locale of ['en','fr']){
  result.stage=item.caseId+' '+locale;
  const minimal=['dashboard.read'],full=[...minimal,...item.destination];
  await db.role.update({where:{id:own.role.id},data:{permissions:minimal}});
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce',timezoneId:process.argv[2]==='timezone'?(item.caseId==='drawer-0'?'America/New_York':'Pacific/Kiritimati'):'Europe/Paris'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',error=>{const detail=f.safe({message:String(error.message).slice(-1500)},secrets);errors.push(detail);result.pageErrors=[...(result.pageErrors||[]),{stage:result.stage,url:page.url(),detail}];});
  const cash=base+'/'+locale+'/dashboard/finance/cash-command';
  await page.goto(cash,{waitUntil:'domcontentloaded',timeout:180000});
  let card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();
  await expect(page.getByRole('heading',{name:locale==='fr'?'Intelligence commande cash':'Cash Command Intelligence',exact:true})).toBeVisible();
  await expect(card).toHaveCount(0);
  const deniedScreenshot='cash-drawer-'+stamp+'-'+item.caseId+'-'+locale+'-disabled.png';await page.screenshot({path:path.join(__dirname,deniedScreenshot),fullPage:true,animations:'disabled'});
  await db.role.update({where:{id:own.role.id},data:{permissions:full}});
  await page.reload({waitUntil:'domcontentloaded',timeout:180000});card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();
  await expect(page.getByText(locale==='fr'?'Période (UTC)':'Period (UTC)',{exact:true}).first()).toBeVisible();
  assert.deepEqual(errors,[]);
  let link=card.locator('a[href="/'+locale+item.route+'"]').last();await expect(link).toBeVisible();await link.focus();await expect(link).toBeFocused();
  result.stage=item.id+' '+locale+' allowed keyboard handoff';
  const start=Date.now();await link.press('Enter',{noWaitAfter:true});await expect(page).toHaveURL(base+'/'+locale+item.route,{timeout:180000});
  await expect(page.getByRole('heading',{name:JSON.parse(fs.readFileSync(path.join(f.root,'messages/'+locale+'.json'))).cashDrawerDashboard.title,exact:true}).first()).toBeVisible({timeout:120000});
  const destinationMs=Date.now()-start;
  assert.ok(!/workbench unavailable|Missing permission|permission denied/i.test(await page.locator('main').first().innerText()));
  const destinationScreenshot='cash-drawer-'+stamp+'-'+item.caseId+'-'+locale+'-destination.png';await page.screenshot({path:path.join(__dirname,destinationScreenshot),fullPage:true,animations:'disabled'});
  await page.goBack({waitUntil:'domcontentloaded',timeout:180000});await expect(page).toHaveURL(cash);
  await expect(page.getByRole('heading',{name:item.title,exact:true}).first()).toBeVisible();
  // Withdraw the destination page permission while the source link is already rendered.
  await db.role.update({where:{id:own.role.id},data:{permissions:minimal}});
  card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();link=card.locator('a[href="/'+locale+item.route+'"]').last();
  result.stage=item.id+' '+locale+' revoked keyboard handoff';
  await link.focus();await link.press('Enter',{noWaitAfter:true});await expect(page).toHaveURL(base+'/'+locale+item.route,{timeout:180000});
  await expect(page.getByText(/access denied|permission required|permission denied|access restricted|not available for this role|accès.*refusé|autorisation requise/i).first()).toBeVisible({timeout:120000});
  const revokedScreenshot='cash-drawer-'+stamp+'-'+item.caseId+'-'+locale+'-revoked.png';await page.screenshot({path:path.join(__dirname,revokedScreenshot),fullPage:true,animations:'disabled'});
  await page.goto(cash,{waitUntil:'domcontentloaded',timeout:180000});card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();await expect(card).toHaveCount(0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));assert.deepEqual(errors,[]);
  result.checks.push({id:item.id,destinationPermission:item.destination[0],locale,timezone:await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone),deniedAggregateWithheld:true,destinationPermissionVerified:true,keyboardHandoff:true,backRetainedLocale:true,renderedLinkRevocation:true,noPageErrors:true,destinationMs,screenshots:[deniedScreenshot,destinationScreenshot,revokedScreenshot]});
  await context.close();console.log(item.id+' '+locale+': passed');
 }
 assert.equal(await effects(),before);result.noBusinessMutationsDuringReads=true;result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert.ok(result.sourceStable);result.passed=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);if(page){result.failedUrl=page.url();result.failedScreen='cash-drawer-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failedScreen),fullPage:true}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();await db.$disconnect();fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,passed:result.passed,stage:result.stage,error:result.error}));});
