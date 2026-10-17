const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const original=fs.readFileSync(path.join(__dirname,'verify-cash-navigation.cjs'),'utf8');
let prefix=original.slice(0,original.indexOf('async function main(){'));
assert.equal(prefix.split("currency:'XAF'").length-1,2);prefix=prefix.replaceAll("currency:'XAF'","currency:'EUR'");
prefix=prefix.replace('const hashes=()=>',"files.push('components/bi/BIActionPriorityBoard.tsx','components/bi/BITrustLegend.tsx','components/bi/BIRiskOpportunityRadar.tsx','lib/dashboard/bi-presentation.ts');\nconst hashes=()=>");
const body=String.raw`
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
`;
const tail=original.slice(original.indexOf('main().catch('));
fs.writeFileSync(path.join(__dirname,'verify-cash-presentation.cjs'),(prefix+body+tail).replaceAll("'cash-navigation-'","'cash-presentation-'"),{flag:'wx'});
console.log('Created guarded EUR presentation verifier.');
