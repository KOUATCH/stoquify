const fs=require('node:fs'),path=require('node:path');
let old=fs.readFileSync(path.join(__dirname,'verify-cash-visibility.cjs'),'utf8');
const fixture=old.slice(old.indexOf('async function fixture('),old.indexOf('async function main(){')).replace("const modules=['dashboard','finance','accounting','payroll','payment_reconciliation'];","const modules=[...require(path.join(f.root,'services/modules/module-control-contracts.ts')).COMMERCIAL_MODULE_SLUGS];");
const header=old.slice(0,old.indexOf('async function fixture(')).replace("'cash-visibility-'+stamp+'.json'","'cash-sources-'+stamp+'.json'").replace("const files=[", "const files=['services/cash-command/cash-command-sources.service.ts','services/payroll/payroll-finance-forecast.service.ts','services/bi/bi-evidence-adapter.service.ts',");
const body=String.raw`
const sourceApi=require(path.join(f.root,'services/cash-command/cash-command-sources.service.ts'));
const reads={};
for(const [key,file,method] of [['reconciliation','payment-truth','getPaymentTruthSnapshot'],['inventory','inventory-cash','getInventoryCashSnapshot'],['close','close-readiness','getCloseReadinessSnapshot']]){
 const module=require(path.join(f.root,'services/snapshots/'+file+'-snapshot.service.ts')),actual=module[method];
 module[method]=async(...args)=>{reads[key]=(reads[key]||0)+1;return actual(...args)};
}
const forecastService=require(path.join(f.root,'services/payroll/payroll-finance-forecast.service.ts')),actualForecast=forecastService.getPayrollFinanceForecast;
forecastService.getPayrollFinanceForecast=async(...args)=>{reads.forecast=(reads.forecast||0)+1;return actualForecast(...args)};
let expectedOrg=null,failFinance=false;
const traced=db.$extends({query:{$allModels:{$allOperations:async({model,operation,args,query})=>{
 if(expectedOrg && ['Payment','PayrollEmployeeBalanceCase','PurchaseOrder'].includes(model)){
  assert.ok(['aggregate','groupBy'].includes(operation),'Source may only aggregate');assert.equal(args.where.organizationId,expectedOrg);
  const key={Payment:'finance',PayrollEmployeeBalanceCase:'balance',PurchaseOrder:'purchasing'}[model];reads[key]=(reads[key]||0)+1;
  if(failFinance&&model==='Payment')throw Error('Controlled cash source failure');
 }
 return query(args);
}}}});require(path.join(f.root,'prisma/db.ts')).db=traced;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const own=await fixture('own',987654321),foreign=await fixture('foreign',333222111);
 await db.payment.create({data:{organizationId:own.org.id,paymentNumber:'SYNTHETIC',amount:1234567,method:'CASH',status:'PAID'}});
 await db.payment.create({data:{organizationId:foreign.org.id,paymentNumber:'SYNTHETIC',amount:7654321,method:'CASH',status:'PAID'}});
 const now=new Date(),effects=async()=>JSON.stringify({balances:await db.payrollEmployeeBalanceCase.findMany({where:{organizationId:{in:[own.org.id,foreign.org.id]}},orderBy:{id:'asc'}}),payments:await db.payment.findMany({where:{organizationId:{in:[own.org.id,foreign.org.id]}},orderBy:{id:'asc'}}),journals:await db.journalEntry.count({where:{organizationId:{in:[own.org.id,foreign.org.id]}}})});
 const before=await effects();
 const matrix=[['finance.read','finance','finance','cashCollected'],['payments.reconciliation.read','payment_reconciliation','reconciliation','paymentTruth'],['inventory.read','inventory','inventory','inventoryCash'],['accounting.close.read','close_assurance','close','closeReadiness'],['payroll.payments.reconcile','payroll','balance','payrollBalance'],['payroll.declarations.manage','payroll','forecast','payrollForecast'],['purchases.orders.read','purchasing','purchasing',null]];
 for(const [permission,moduleSlug,key,field]of matrix){
  for(const state of ['active','permission-denied','suspended','expired','read_only']){
   result.stage=permission+' '+state;
   await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId:own.org.id,moduleSlug}},data:{status:state==='suspended'?'suspended':state==='read_only'?'read_only':'active',endsAt:state==='expired'?new Date(now.getTime()-1000):null}});
   for(const name of Object.keys(reads))delete reads[name];expectedOrg=own.org.id;
   const data=await sourceApi.getCashCommandSources({organizationId:own.org.id,actorId:own.actor.id,actorPermissions:state==='permission-denied'?[]:[permission],currency:'XAF',now});expectedOrg=null;
   const admitted=['active','read_only'].includes(state);assert.equal(reads[key]||0,admitted?1:0);
   if(field)assert.equal(data[field]!==null,admitted);
   if(!admitted)assert.deepEqual(reads,{});
   assert.ok(!JSON.stringify(data).includes('333222111'));assert.ok(!JSON.stringify(data).includes('7654321'));
   result.checks.push({permission,moduleSlug,state,reads:{...reads},deniedIsNull:!admitted,tenantIsolation:true});
  }
  await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId:own.org.id,moduleSlug}},data:{status:'active',endsAt:null}});
 }
 expectedOrg=own.org.id;failFinance=true;
 await assert.rejects(sourceApi.getCashCommandSources({organizationId:own.org.id,actorId:own.actor.id,actorPermissions:['finance.read'],currency:'XAF',now}),/Controlled cash source failure/);failFinance=false;
 assert.equal((await sourceApi.getCashCommandSources({organizationId:own.org.id,actorId:own.actor.id,actorPermissions:['finance.read'],currency:'XAF',now})).cashCollected.metrics.cashCollected,1234567);expectedOrg=null;
 result.failedQueryAndRetryVerified=true;
 browser=await chromium.launch({headless:true});
 for(const state of ['active','permission-denied','suspended','read_only']){
  result.stage='browser '+state;
  const permissions=state==='permission-denied'?['finance.read','dashboard.read']:['finance.read','dashboard.read','payroll.payments.reconcile'];
  await db.role.update({where:{id:own.role.id},data:{permissions}});
  await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId:own.org.id,moduleSlug:'payroll'}},data:{status:state==='suspended'?'suspended':state==='read_only'?'read_only':'active'}});
  const data=await getCashCommandData({organizationId:own.org.id,actorId:own.actor.id,actorPermissions:permissions,actorRoleCodes:['admin']});
  const admitted=['active','read_only'].includes(state);assert.equal(data.summary.employeeBalanceOutstandingAmount,admitted?987654321:null);assert.equal(data.summary.cashCollected,1234567);
  const cashCard=data.cards.find(card=>card.id==='cash_collected');assert.equal(cashCard.provenance.sourceKind,'cash.collected');assert.equal(cashCard.freshness.state,'fresh');
  assert.equal(data.summary.openSuspenseCount,null);assert.equal(data.summary.upcomingStatutoryLiabilityAmount,null);
  for(const locale of ['en','fr']){
   const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
   page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(f.safe(error,secrets)));const start=Date.now();
   const response=await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});assert.ok(response&&response.ok());
   const main=page.locator('main.dashboard-landing-theme');
   await expect(main.getByRole('status')).toContainText(locale==='fr'?'Une valeur indisponible ne signifie pas un solde nul':'An unavailable value does not mean a zero balance');
   const card=main.getByText('Employee balance recovery',{exact:true});if(admitted)await expect(card.first()).toBeVisible();else await expect(card).toHaveCount(0);
   const html=await response.text();assert.ok(!html.includes('333222111'));assert.ok(!html.includes('7654321'));if(!admitted)assert.ok(!html.includes('987654321'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
   const screenshot='cash-sources-'+stamp+'-'+locale+'-'+state+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});assert.deepEqual(errors,[]);
   result.checks.push({state,locale,permittedCash:1234567,permittedRecovery:admitted?987654321:null,foreignValuesAbsent:true,durationMs:Date.now()-start,screenshot});
   await context.close();console.log(locale+' '+state+': passed');
  }
 }
 assert.equal(await effects(),before);result.noBusinessMutationsDuringReads=true;
 result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert.ok(result.sourceStable);result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1;}).finally(async()=>{await browser?.close();await db.$disconnect();fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,passed:result.passed,stage:result.stage,error:result.error}));});
`;
fs.writeFileSync(path.join(__dirname,'verify-cash-sources.cjs'),header+fixture+body,{flag:'wx'});
let payroll=fs.readFileSync(path.join(__dirname,'verify-payroll-extraction.cjs'),'utf8');
payroll=payroll.replace("  result.checks.push({kind,",`  expectedOrg=org.id;const unavailableProvider=await payroll.getPayrollFinanceForecast({scope,paymentTruth:null,currency:org.currency});expectedOrg=null;
  if(kind==='incomplete-posting-proof'){assert.equal(unavailableProvider.metrics.totalUpcomingAmount,null);assert.ok(unavailableProvider.metrics.blockerCodes.includes('PAYROLL_FORECAST_PROVIDER_PROOF_MISSING'));}
  else assert.equal(unavailableProvider.metrics.totalUpcomingAmount,0);
  result.checks.push({unavailableProviderVerified:true,kind,`);
payroll=payroll.replace("'payroll-extraction-'+crypto.randomUUID()","'payroll-source-null-'+crypto.randomUUID()");
fs.writeFileSync(path.join(__dirname,'verify-payroll-source-null.cjs'),payroll,{flag:'wx'});
