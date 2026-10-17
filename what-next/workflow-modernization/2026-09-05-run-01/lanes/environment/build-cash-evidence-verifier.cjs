const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prior=fs.readFileSync(path.join(__dirname,'verify-cash-drawer.cjs'),'utf8'),cut=prior.indexOf('async function main(){');assert.ok(cut>0);
let source=prior.slice(0,cut).replaceAll('cash-drawer-','cash-evidence-');
source+=String.raw`
async function main(){
 await helper.withClient(f.target,helper.assertOwned);const own=await fixture('own',987654321);
 const effects=async()=>JSON.stringify({balances:await db.payrollEmployeeBalanceCase.findMany({where:{organizationId:own.org.id},orderBy:{id:'asc'}}),payments:await db.payment.count({where:{organizationId:own.org.id}}),journals:await db.journalEntry.count({where:{organizationId:own.org.id}})});
 const before=await effects(),full=['dashboard.read','finance.read','payroll.payments.reconcile','payroll.declarations.manage','payroll.command.read','payments.reconciliation.read'];
 browser=await chromium.launch({headless:true});let upcoming;
 for(const state of ['empty','incomplete','out-of-horizon','denied']){
  result.stage=state+' source';
  if(state==='incomplete'){
   const due=new Date();due.setUTCHours(12,0,0,0);
   const start=new Date(due);start.setUTCHours(0,0,0,0);const end=new Date(due);end.setUTCHours(23,59,59,999);
   upcoming=await db.payrollPeriod.create({data:{organizationId:own.org.id,name:'Synthetic incomplete forecast; no approval',periodStart:start,periodEnd:end,payDate:due,countryCode:'CM'}});
  }
  if(state==='out-of-horizon')await db.payrollPeriod.update({where:{id:upcoming.id},data:{payDate:new Date('2020-02-01')}});
  const permissions=state==='denied'?['dashboard.read']:full;
  await db.role.update({where:{id:own.role.id},data:{permissions}});
  const data=await getCashCommandData({organizationId:own.org.id,actorId:own.actor.id,actorPermissions:permissions,actorRoleCodes:['admin']});
  assert.ok(data.changes.every(row=>row.direction==='observed'&&row.previousValue===null));
  if(state==='incomplete'){const blockerObservation=data.changes.find(row=>row.id==='cash-command-change:upcoming_payroll_net_pay');assert.ok(blockerObservation);assert.equal(blockerObservation.unit,'blockers');assert.equal(blockerObservation.format,'number');}
  const ids=['upcoming_payroll_net_pay','upcoming_statutory_liability'];
  if(state==='denied'){assert.equal(data.cards.length,0);assert.equal(data.changes.length,0);}
  else for(const id of ids){
   const card=data.cards.find(row=>row.id===id);assert.ok(card);
   assert.equal(card.value,state==='incomplete'?null:0);assert.equal(card.evidenceGrade,state==='incomplete'?'blocked':'operational');
   assert.equal(card.trustState,card.evidenceGrade);assert.equal(card.state,state==='incomplete'?'blocked':'empty');
  }
  for(const locale of ['en','fr']){
   result.stage=state+' '+locale;
   const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce',timezoneId:'America/New_York'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
   page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(f.safe({message:String(error.message).slice(-1500)},secrets)));
   const start=Date.now();await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});
   const observations=page.locator('section').filter({has:page.getByRole('heading',{name:locale==='fr'?'Observations actuelles de trésorerie':'Current cash observations',exact:true})}).first();
   await expect(observations).toBeVisible();
   if(state==='denied'){
    await expect(observations.getByText(locale==='fr'?'Aucune observation visible':'No visible observations',{exact:true})).toBeVisible();
    await expect(observations).toContainText(locale==='fr'?'cela ne confirme pas l’absence de risque':'this does not confirm the absence of risk');
   }else{
    await expect(observations.getByText(locale==='fr'?'Comparaison historique indisponible':'Historical comparison unavailable',{exact:true}).first()).toBeVisible();
    await expect(observations.getByText(locale==='fr'?'Observé':'Observed',{exact:true}).first()).toBeVisible();
    for(const title of ['Upcoming net pay','Upcoming statutory liability']){
     const card=page.locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})}).first();await expect(card).toBeVisible();
     await expect(card.getByText(locale==='fr'?'Comptabilisé':'Posted',{exact:true})).toHaveCount(0);
     await expect(card.getByText(state==='incomplete'?(locale==='fr'?'Bloqué':'Blocked'):(locale==='fr'?'Opérationnel':'Operational'),{exact:true}).first()).toBeVisible();
    }
   }
   assert.ok(!/What changed since yesterday|Ce qui a change depuis hier/.test(await observations.innerText()));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
   const screenshot='cash-evidence-'+stamp+'-'+state+'-'+locale+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});assert.deepEqual(errors,[]);
   result.checks.push({state,locale,observationsNotComparisons:true,forecastGradeVerified:true,noPageErrors:true,durationMs:Date.now()-start,screenshot});
   await context.close();console.log(state+' '+locale+': passed');
  }
 }
 assert.equal(await effects(),before);result.noFinancialMutationsDuringReads=true;result.fixtureChanges='Created an incomplete synthetic period and moved its due date outside the forecast horizon; no posting, approval or financial resolution was simulated.';
 result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert.ok(result.sourceStable);result.passed=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);if(page){result.failedUrl=page.url();result.failedScreen='cash-evidence-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failedScreen),fullPage:true}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();await db.$disconnect();fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,passed:result.passed,stage:result.stage,error:result.error}));});
`;
source=source.replace("files.push(","files.push('components/bi/BIWhatChangedStrip.tsx','components/bi/BIKpiCard.tsx',");
fs.writeFileSync(path.join(__dirname,'verify-cash-evidence.cjs'),source,{flag:'wx'});
