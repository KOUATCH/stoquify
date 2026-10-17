const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {hashPassword}=require(path.join(root,'lib/password.ts')),{chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {recordCloseCertificationInvalidation}=require(path.join(root,'services/accounting/close-assurance-pack.service.ts'));
const receipt=process.argv[2];assert.match(receipt,/^close-proof-corrected-[a-f0-9-]+\.json$/);const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,receipt)));assert.ok(fixture.passed&&fixture.sourceStable);
const files=[...Object.keys(fixture.sourceAfter),'actions/evidence/proof-trail.actions.ts','components/evidence/ProofTrailDrawer.tsx','components/cash-command/CashCommandDashboard.tsx','services/cash-command/cash-command.service.ts','services/cash-command/cash-command-sources.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const stamp=crypto.randomUUID(),secrets=[],base='http://127.0.0.1:3110',result={at:new Date().toISOString(),sourceBefore:hashes(),fixtureReceipt:receipt,cases:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);for(const [file,hash]of Object.entries(fixture.sourceAfter))assert.equal(result.sourceBefore[file],hash);
 const x=fixture.fixture,scope={organizationId:x.organizationId};assert.ok((await db.organization.findUniqueOrThrow({where:{id:x.organizationId}})).name.startsWith(helper.prefix));
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{...scope,email:crypto.randomUUID()+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const existing=await db.role.findFirst({where:{...scope,code:'admin'}});
 if(existing){assert.equal(existing.nameEn,'Owned close proof reader');await db.role.update({where:{id:existing.id},data:{users:{connect:{id:actor.id}}}})}
 else await db.role.create({data:{...scope,code:'admin',nameEn:'Owned close proof reader',permissions:['finance.read','dashboard.read','accounting.close.read'],users:{connect:{id:actor.id}}}});
 const fingerprint=async()=>f.hash(await Promise.all(['closeRun','closePackExport','journalEntry','payment','businessEvent'].map(model=>db[model].findMany({where:scope,orderBy:{id:'asc'}}))));
 browser=await chromium.launch({headless:true});
 for(const state of ['draft','invalidated']){
  if(state==='invalidated'){
   // Actual invalidation refreshes the historical fixture's revision, making it
   // the latest subject selected by Cash Command's normal server-owned discovery.
   await recordCloseCertificationInvalidation(x.organizationId,{closeRunId:x.historicalRunId,closePackExportId:x.packId,sourceModel:'InventoryValuationAnnex',sourceId:x.periodId,sourceEventName:'inventory.valuation.annex.checked',staleReason:'Synthetic browser verification source revision',newEvidenceHash:'sha256:'+crypto.createHash('sha256').update(stamp).digest('hex')},{actorId:x.reviewerId});
  }
  const subjectId=state==='draft'?fixture.assessment.runId:x.historicalRunId,before=await fingerprint();
  for(const view of [{locale:'en',width:1440},{locale:'fr',width:320}]){
   const {locale,width}=view,context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});let actualResponse=false;const errors=[];
   await context.route('**/*',async route=>{if(new URL(route.request().url()).origin!==base)return route.abort();if(route.request().headers()['next-action']){const response=await route.fetch({maxRedirects:0}),body=await response.body();actualResponse=response.ok()&&body.toString().includes(subjectId);return route.fulfill({response,body})}return route.continue()});
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
   page=await context.newPage();page.on('pageerror',error=>errors.push(f.safe(error,secrets)));result.stage=state+' '+locale+width;
   await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});await expect(page.getByRole('button',{name:locale==='fr'?'Synthèse':'Brief',exact:true})).toBeEnabled();
   const button=page.getByRole('button',{name:locale==='fr'?'Preuves de clôture':'Close proof',exact:true});await expect(button).toBeEnabled();await button.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');
   await expect(dialog.getByText(locale==='fr'?'La clôture présente des blocages non résolus ou des preuves indisponibles.':'Close run has unresolved blockers or unavailable evidence.',{exact:true})).toBeVisible();assert.ok(actualResponse);
   if(state==='invalidated')await expect(dialog.getByText(locale==='fr'?'Les preuves de certification de clôture sont périmées':'Close certification evidence is stale',{exact:true})).toBeVisible();
   assert.ok(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1));for(let i=0;i<4;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(node=>node.contains(document.activeElement)))}
   const screenshot='cash-close-proof-'+stamp+'-'+state+'-'+locale+width+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(button).toBeFocused();assert.deepEqual(errors,[]);result.cases.push({state,...view,subjectId,actualResponse:true,localizedBlockers:true,keyboardContainmentAndReturn:true,noHorizontalOverflow:true,screenshot});await context.close();console.log(JSON.stringify({state,...view,passed:true}));
  }
  assert.equal(await fingerprint(),before);
 }
 result.passed=true;result.readsPreservedBusinessRecords=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);if(page&&!page.isClosed()){result.failureScreenshot='cash-close-proof-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{})}}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='cash-close-proof-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error}));await db.$disconnect();process.exit(result.passed?0:1)});
