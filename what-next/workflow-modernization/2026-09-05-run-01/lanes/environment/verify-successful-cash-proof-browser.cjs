const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {hashPassword}=require(path.join(root,'lib/password.ts')),{chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const input=process.argv[2];assert.match(input,/^payment-match-proof-corrected-[a-f0-9-]+\.json$/);const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,input)));assert.ok(fixture.passed&&fixture.sourceStable);
const files=[...Object.keys(fixture.sourceAfter),'actions/evidence/proof-trail.actions.ts','components/evidence/ProofTrailDrawer.tsx','components/evidence/proof-trail-presentation.ts','components/cash-command/CashCommandDashboard.tsx','services/cash-command/cash-command.service.ts','services/cash-command/cash-command-sources.service.ts','services/modules/module-access-batch.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const stamp=crypto.randomUUID(),secrets=[],base='http://127.0.0.1:3110',result={at:new Date().toISOString(),sourceBefore:hashes(),fixtureReceipt:input,cases:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 for(const [file,expected]of Object.entries(fixture.sourceAfter))assert.equal(result.sourceBefore[file],expected);
 const subjects=[
  {organizationId:fixture.fixture.organizationId,id:fixture.fixture.paymentId,type:'payment.transaction',en:'Payment transaction proof',fr:'Preuves de la transaction de paiement',reasonEn:'Payment transaction is matched against provider or statement evidence.',reasonFr:'La transaction de paiement est rapprochée des preuves du prestataire ou du relevé.'},
  {organizationId:fixture.reconciliation.organizationId,id:fixture.reconciliation.runId,type:'reconciliation.run',en:'Reconciliation proof',fr:'Preuves de rapprochement',reasonEn:'Reconciliation run is signed and has certificate evidence.',reasonFr:'Le rapprochement est signé et dispose d’une preuve de certificat.'},
 ];
 browser=await chromium.launch({headless:true});
 for(const subject of subjects){
  const org=await db.organization.findUniqueOrThrow({where:{id:subject.organizationId}});assert.ok(org.name.startsWith(helper.prefix));
  const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password),scope={organizationId:org.id};
  const actor=await db.user.create({data:{...scope,email:crypto.randomUUID()+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
  await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
  const existingRole=await db.role.findFirst({where:{...scope,code:'admin'}});
  if(existingRole){assert.equal(existingRole.nameEn,'Owned Cash proof reader');await db.role.update({where:{id:existingRole.id},data:{users:{connect:{id:actor.id}}}});}
  else await db.role.create({data:{...scope,code:'admin',nameEn:'Owned Cash proof reader',permissions:['finance.read','dashboard.read','payments.reconciliation.read'],users:{connect:{id:actor.id}}}});
  const fingerprint=async()=>f.hash(await Promise.all(['paymentTransaction','matchRecord','providerEvent','reconciliationRun','journalEntry','payment'].map(model=>db[model].findMany({where:scope,orderBy:{id:'asc'}}))));const before=await fingerprint();
  for(const view of [{locale:'en',width:1440},{locale:'fr',width:768},{locale:'fr',width:320}]){
   const {locale,width}=view,context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});let actualResponse=false;const errors=[];
   await context.route('**/*',async route=>{if(new URL(route.request().url()).origin!==base)return route.abort();if(route.request().headers()['next-action']){const response=await route.fetch({maxRedirects:0});const body=await response.body();actualResponse=response.ok()&&body.toString().includes(subject.id);return route.fulfill({response,body});}return route.continue();});
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
   page=await context.newPage();page.on('pageerror',error=>errors.push(f.safe(error,secrets)));result.stage=subject.type+' '+locale+width;
   await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});await expect(page.getByRole('button',{name:locale==='fr'?'Synthèse':'Brief',exact:true})).toBeEnabled();const button=page.getByRole('button',{name:subject[locale],exact:true});await expect(button).toBeEnabled();await button.focus();await page.keyboard.press('Enter');
   const dialog=page.getByRole('dialog');await expect(dialog.getByText(locale==='fr'?subject.reasonFr:subject.reasonEn,{exact:true})).toBeVisible();assert.ok(actualResponse);
   assert.ok(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1));for(let i=0;i<4;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(node=>node.contains(document.activeElement)));}
   const screenshot='cash-successful-proof-'+stamp+'-'+subject.type+'-'+locale+width+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(button).toBeFocused();assert.deepEqual(errors,[]);result.cases.push({subject:subject.type,...view,actualResponse:true,localizedReason:true,keyboardContainmentAndReturn:true,noHorizontalOverflow:true,screenshot});await context.close();console.log(JSON.stringify({subject:subject.type,...view,passed:true}));
  }
  assert.equal(await fingerprint(),before);
 }
 result.passed=true;result.readsPreservedFinancialRecords=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);if(page&&!page.isClosed()){result.failureScreenshot='cash-successful-proof-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{});}process.exitCode=1;}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='cash-successful-proof-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error}));await db.$disconnect();process.exit(result.passed?0:1);});
