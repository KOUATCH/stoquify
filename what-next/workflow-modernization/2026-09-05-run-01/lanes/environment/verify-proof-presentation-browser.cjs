// Guarded synthetic read fixtures: these do not establish valid posting/sign-off.
const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['components/evidence/ProofTrailDrawer.tsx','components/evidence/proof-trail-presentation.ts','components/evidence/EvidenceGradeBadge.tsx','components/ui/sheet.tsx','components/cash-command/CashCommandDashboard.tsx','actions/evidence/proof-trail.actions.ts','services/evidence/proof-trail.service.ts','services/evidence/evidence-grade.service.ts','services/cash-command/cash-command.service.ts','services/cash-command/cash-command-presentation.ts','services/cash-command/cash-command-visibility.service.ts','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),syntheticOnly:true,sourceBefore:hashes(),checks:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const org=await db.organization.create({data:{name:helper.prefix+'Proof presentation '+stamp,slug:'proof-presentation-'+stamp,currency:'XAF',timezone:'UTC'}}),scope={organizationId:org.id};
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{...scope,email:stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const permissions=['finance.read','dashboard.read','payments.reconciliation.read','accounting.journal.read','accounting.close.read'];
 const role=await db.role.create({data:{...scope,code:'admin',nameEn:'Owned proof reader',permissions,users:{connect:{id:actor.id}}}});
 const modules=['dashboard','finance','accounting','payment_reconciliation','close_assurance'];
 await db.tenantModuleConfiguration.create({data:{...scope,manifestHash:'synthetic-proof',selectedModules:modules,activeModules:modules}});
 await db.tenantModuleGrant.createMany({data:modules.map(moduleSlug=>({...scope,moduleSlug,status:'active',source:'requested_modules'}))});
 await db.location.create({data:{...scope,name:'Owned proof source',code:'OWNED'}});
 const now=new Date(),old=new Date(now.getTime()-86400000),end=new Date(now.getTime()+86400000);
 const year=await db.fiscalYear.create({data:{...scope,name:'Synthetic proof year',startDate:old,endDate:end}});
 const period=await db.accountingPeriod.create({data:{...scope,fiscalYearId:year.id,periodNumber:1,name:'Owned source period',startDate:old,endDate:end}});
 const journal=await db.journal.create({data:{...scope,code:'OWNED',nameEn:'Synthetic journal',type:'GENERAL'}});
 // Deliberately incomplete posted-looking record must be blocked for no source link.
 const entry=await db.journalEntry.create({data:{...scope,journalId:journal.id,periodId:period.id,entryNumber:'OWNED-NO-SOURCE',entryDate:now,status:'POSTED',memo:'Synthetic invalid proof; no actual posting'}});
 const rail=await db.paymentRail.create({data:{...scope,type:'MOBILE_MONEY',code:'OWNED',name:'Synthetic rail'}});
 const provider=await db.providerAccount.create({data:{...scope,paymentRailId:rail.id,providerCode:'OWNED',displayName:'Synthetic account',externalAccountHash:stamp}});
 const recon=await db.reconciliationRun.create({data:{...scope,paymentRailId:rail.id,providerAccountId:provider.id,businessDate:now,periodStart:old,periodEnd:end,status:'READY_FOR_SIGNOFF'}});
 const payment=await db.paymentTransaction.create({data:{...scope,amount:123,currencyCode:'XAF',occurredAt:now,state:'PENDING'}});
 await db.paymentException.create({data:{...scope,paymentTransactionId:payment.id,reconciliationRunId:recon.id,type:'OTHER',severity:'HIGH',status:'OPEN'}});
 const close=await db.closeRun.create({data:{...scope,periodId:period.id,status:'READY'}});
 await db.closeAssuranceFinding.create({data:{...scope,periodId:period.id,closeRunId:close.id,domain:'LEDGER',severity:'HIGH',title:'Owned custom source finding',detail:'Keep original source description',sourceService:'synthetic'}});
 const subjects=[
  {id:payment.id,type:'payment.transaction',en:'Payment transaction proof',fr:'Preuves de la transaction de paiement',reasonEn:'Payment transaction has unresolved proof blockers.',reasonFr:'La transaction de paiement présente des blocages de preuve non résolus.'},
  {id:recon.id,type:'reconciliation.run',en:'Reconciliation proof',fr:'Preuves de rapprochement',reasonEn:'Reconciliation run has unresolved exceptions, suspense, or failed state.',reasonFr:'Le rapprochement présente des anomalies, des suspens non résolus ou un état d’échec.'},
  {id:close.id,type:'close.run',en:'Close proof',fr:'Preuves de clôture',reasonEn:'Close run has unresolved blockers or unavailable evidence.',reasonFr:'La clôture présente des blocages non résolus ou des preuves indisponibles.'},
  {id:entry.id,type:'journal.entry',en:'Ledger proof',fr:'Preuves comptables',reasonEn:'Journal entry has unresolved proof blockers.',reasonFr:'L’écriture comptable présente des blocages de preuve non résolus.'},
 ];
 async function fingerprint(){const rows=await Promise.all(['paymentTransaction','paymentException','reconciliationRun','closeRun','closeAssuranceFinding','journalEntry','payment','journalEntryLine'].map(model=>db[model].findMany({where:scope,orderBy:{id:'asc'}})));return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
 const before=await fingerprint();browser=await chromium.launch({headless:true});
 for(const view of [{locale:'en',width:1440},{locale:'fr',width:768},{locale:'fr',width:320}]){
  const {locale,width}=view;await db.role.update({where:{id:role.id},data:{permissions}});
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',timezoneId:'America/New_York'});
  let abortNext=false,expectedSubject=null,verifiedResponse=false;const pageErrors=[];
  await context.route('**/*',async route=>{
   if(new URL(route.request().url()).origin!==base)return route.abort();
   if(abortNext&&route.request().headers()['next-action']){abortNext=false;return route.abort('failed');}
   if(route.request().headers()['next-action']){const actual=await route.fetch({maxRedirects:0});const body=await actual.body();verifiedResponse=actual.ok()&&body.toString().includes(expectedSubject);return route.fulfill({response:actual,body});}
   return route.continue();
  });
  result.stage=locale+width+' login';assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
  page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});
  for(const [index,subject]of subjects.entries()){
   result.stage=locale+width+' '+subject.type;const button=page.getByRole('button',{name:subject[locale],exact:true});await expect(button).toBeEnabled();
   await expect.poll(()=>button.evaluate(element=>Object.keys(element).some(key=>key.startsWith('__reactProps$')&&typeof element[key]?.onClick==='function'))).toBe(true);
   const dialog=page.getByRole('dialog');expectedSubject=subject.id;verifiedResponse=false;
   if(index===0){abortNext=true;await button.focus();await page.keyboard.press('Enter');await expect(dialog.getByRole('alert')).toContainText(locale==='fr'?'réessayer':'retry');await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(button).toBeFocused();}
   const started=performance.now();await button.focus();await page.keyboard.press('Enter');
   await expect(dialog).toHaveCount(1);await expect(dialog.getByText(locale==='fr'?subject.reasonFr:subject.reasonEn,{exact:true})).toBeVisible();assert.ok(verifiedResponse);
   await expect(dialog.getByRole('heading',{name:locale==='fr'?'Éléments de preuve':'Evidence Nodes'})).toBeVisible();
   if(locale==='fr')await expect(dialog.getByText(subject.reasonEn,{exact:true})).toHaveCount(0);
   if(subject.type==='close.run')assert.ok((await dialog.innerText()).includes('Owned custom source finding'));
   if(subject.type==='journal.entry')assert.ok((await dialog.innerText()).includes('OWNED-NO-SOURCE'));
   assert.ok(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1),'Proof drawer horizontal overflow');
   for(let i=0;i<5;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(element=>element.contains(document.activeElement)),'Focus escaped dialog');}
   const screenshot='proof-presentation-'+stamp+'-'+locale+'-'+width+'-'+index+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(button).toBeFocused();
   result.checks.push({locale,width,subjectType:subject.type,localizedReason:true,customSourceRetained:true,actualResponse:true,keyboardContainmentAndReturn:true,noHorizontalOverflow:true,durationMs:Math.round(performance.now()-started),screenshot});
  }
  await db.role.update({where:{id:role.id},data:{permissions:['finance.read','dashboard.read']}});const revoked=await page.reload({waitUntil:'domcontentloaded',timeout:180000}),payload=await revoked.text();
  for(const subject of subjects){await expect(page.getByRole('button',{name:subject[locale],exact:true})).toBeDisabled();assert.ok(!payload.includes(subject.id));}
  assert.deepEqual(pageErrors,[]);result.checks.filter(row=>row.locale===locale&&row.width===width).forEach(row=>{row.freshPermissionRevocation=true;row.noPageErrors=true;});
  await context.close();console.log(locale+' '+width+' all proof subjects passed');
 }
 assert.equal(await fingerprint(),before);result.noBusinessMutation=true;result.passed=true;
}
main().catch(async e=>{result.passed=false;result.error=f.safe(e,secrets);process.exitCode=1;if(page&&!page.isClosed()){result.failureScreenshot='proof-presentation-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{});}}).finally(async()=>{
 await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}
 const file='proof-presentation-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error}));await db.$disconnect();
});
