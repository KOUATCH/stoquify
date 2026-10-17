const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const original=fs.readFileSync(path.join(__dirname,'verify-cash-navigation.cjs'),'utf8');
const prefix=original.slice(0,original.indexOf('async function main(){'));
assert.ok(prefix.includes('async function fixture('));
const body=String.raw`
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
`;
const tail=original.slice(original.indexOf('main().catch('));
const added="files.push('components/finance/FinanceSpecializedLedgerSurfaces.tsx','components/finance/PaymentReconciliationWorkbench.tsx','app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts','actions/finance/finance-dashboard.actions.ts');\n";
let script=(prefix+body+tail).replaceAll("'cash-navigation-'","'cash-finance-handoff-'");
script=script.replace('const hashes=()=>',added+'const hashes=()=>');
fs.writeFileSync(path.join(__dirname,'verify-cash-finance-handoffs.cjs'),script,{flag:'wx'});
console.log('Created owned finance handoff verifier.');
