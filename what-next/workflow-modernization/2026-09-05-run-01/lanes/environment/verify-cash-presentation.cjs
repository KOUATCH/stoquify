// Disposable, explicitly synthetic read fixtures. No posting or payment execution.
const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {getCashCommandData}=require(path.join(f.root,'services/cash-command/cash-command.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/cash-command/cash-command-navigation.ts','app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts','app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts','actions/payroll/payroll-control.actions.ts','services/cash-command/cash-command-sources.service.ts','services/payroll/payroll-finance-forecast.service.ts','services/bi/bi-evidence-adapter.service.ts','services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/cash-command-contracts.ts','components/cash-command/CashCommandDashboard.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx','services/modules/module-entitlement.service.ts'];
files.push('components/bi/BIActionPriorityBoard.tsx','components/bi/BITrustLegend.tsx','components/bi/BIRiskOpportunityRadar.tsx','lib/dashboard/bi-presentation.ts');
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:[]},output=path.join(__dirname,'cash-presentation-'+stamp+'.json');
let browser,page;
async function fixture(label,amount){
 const org=await db.organization.create({data:{name:helper.prefix+'Cash visibility '+label+' '+stamp,slug:'cash-visibility-'+label+'-'+stamp,currency:'EUR',timezone:'UTC'}});
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
 await db.payrollEmployeeBalanceCase.create({data:{organizationId:org.id,employeeId:employee.id,payrollRunId:run.id,caseNumber:'SYNTHETIC',caseType:'RECEIVABLE',status:'OPEN',amount,outstandingAmount:amount,sourceNetPayableAmount:-amount,currency:'EUR',reason:'Synthetic read-boundary fixture',openedById:actor.id,documentHash:'synthetic',evidenceHash:'synthetic'}});
 return {org,actor,role,password};
}



async function main(){
 await helper.withClient(f.target,helper.assertOwned);const own=await fixture('presentation',125000);
 const full=['dashboard.read','finance.read','payroll.payments.reconcile','payments.reconciliation.read','payroll.command.read'];
 const effects=async()=>JSON.stringify({balances:await db.payrollEmployeeBalanceCase.findMany({where:{organizationId:own.org.id},orderBy:{id:'asc'}}),payments:await db.payment.count({where:{organizationId:own.org.id}}),journals:await db.journalEntry.count({where:{organizationId:own.org.id}})});
 const before=await effects();browser=await chromium.launch({headless:true});
 for(const state of ['populated','denied'])for(const locale of ['en','fr']){
  result.stage=state+' '+locale;const permissions=state==='denied'?['dashboard.read']:full;await db.role.update({where:{id:own.role.id},data:{permissions}});
  const data=await getCashCommandData({organizationId:own.org.id,actorId:own.actor.id,actorPermissions:permissions,actorRoleCodes:[own.role.code]});assert.equal(data.currency,'EUR');
  if(state==='populated')assert.ok(data.risks.some(row=>row.moneyImpact===125000));else{assert.equal(data.risks.length,0);assert.equal(data.actionsToday.length,0);}
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce',timezoneId:'America/New_York'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(f.safe({message:String(error.message).slice(-1500)},secrets)));
  const start=Date.now();await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});
  const radar=page.getByRole('heading',{name:locale==='fr'?'Risques de trésorerie':'Cash risk radar',exact:true}).locator('xpath=ancestor::section[1]');
  const queue=page.getByRole('heading',{name:locale==='fr'?'Actions à traiter aujourd’hui':'What needs action today',exact:true}).locator('xpath=ancestor::section[1]');
  await expect(page.getByRole('heading',{name:locale==='fr'?'Légende des niveaux de preuve':'Trust legend',exact:true})).toBeVisible();
  if(state==='populated'){
   const amount=new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(125000);await expect(radar.getByText(amount,{exact:true})).toBeVisible();assert.ok(!/FCFA|XAF/.test(await radar.innerText()));
   await expect(queue.getByText(locale==='fr'?'moyen':'medium',{exact:true}).first()).toBeVisible();
   await expect(queue.getByText(locale==='fr'?'Partiel':'Partial',{exact:true}).first()).toBeVisible();
   if(locale==='fr'){assert.ok(!/Operational|Partial|high|unknown/.test(await queue.innerText()));}
  }else{
   await expect(queue.getByText(locale==='fr'?'Aucune action visible à traiter':'No visible action is due',{exact:true})).toBeVisible();
   await expect(radar.getByText(locale==='fr'?'Aucun signal affiché':'No signals displayed',{exact:true})).toBeVisible();
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  const screenshot='cash-presentation-'+stamp+'-'+state+'-'+locale+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled',caret:'initial'});assert.deepEqual(errors,[]);
  result.checks.push({state,locale,tenantCurrencyVerified:true,localizedSharedStates:true,emptyGuidanceVerified:state==='denied',noPageErrors:true,noHorizontalOverflow:true,durationMs:Date.now()-start,screenshot});await context.close();console.log(state+' '+locale+': passed');
 }
 assert.equal(await effects(),before);result.noBusinessMutationsDuringReads=true;result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert.ok(result.sourceStable);result.passed=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);if(page){result.failedUrl=page.url();result.failedScreen='cash-presentation-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failedScreen),fullPage:true}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();await db.$disconnect();fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,passed:result.passed,stage:result.stage,error:result.error}));});
