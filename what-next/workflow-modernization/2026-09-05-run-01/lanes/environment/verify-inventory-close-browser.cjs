const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {hashPassword}=require(path.join(root,'lib/password.ts')),{stableJsonStringify}=require(path.join(root,'services/events/business-event.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const receipt=process.argv[2];assert.match(receipt,/^inventory-close-freshness-[a-f0-9-]+\.json$/);const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,receipt)));assert.ok(fixture.passed&&fixture.sourceStable);
const files=[...Object.keys(fixture.sourceAfter),'actions/accounting/close-assurance.actions.ts','components/accounting/CloseAssuranceCenter.tsx','hooks/accounting/useCloseAssurance.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const stamp=crypto.randomUUID(),secrets=[],base='http://127.0.0.1:3110',result={at:new Date().toISOString(),fixtureReceipt:receipt,sourceBefore:hashes(),cases:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);for(const [file,hash]of Object.entries(fixture.sourceAfter))assert.equal(result.sourceBefore[file],hash);
 const x=fixture.fixture,scope={organizationId:x.organizationId};assert.ok((await db.organization.findUniqueOrThrow({where:{id:x.organizationId}})).name.startsWith(helper.prefix));
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password),actor=await db.user.create({data:{...scope,email:crypto.randomUUID()+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const existing=await db.role.findFirst({where:{...scope,code:'admin'}});if(existing){assert.equal(existing.nameEn,'Owned close assessment operator');await db.role.update({where:{id:existing.id},data:{users:{connect:{id:actor.id}}}})}else await db.role.create({data:{...scope,code:'admin',nameEn:'Owned close assessment operator',permissions:['dashboard.read','accounting.close.read','accounting.close.run','accounting.close.export'],users:{connect:{id:actor.id}}}});
 const financialHash=async()=>f.hash(await Promise.all(['inventoryTransaction','journalEntry','payment'].map(model=>db[model].findMany({where:scope,orderBy:{id:'asc'}}))));const before=await financialHash();
 browser=await chromium.launch({headless:true});
 for(const view of [{locale:'en',width:1440},{locale:'fr',width:320}]){
  const {locale,width}=view,context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',acceptDownloads:true});await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(f.safe(error,secrets)));result.stage=locale+width;
  const started=Date.now();await page.goto(base+'/'+locale+'/dashboard/accounting/close/'+x.periodId,{waitUntil:'domcontentloaded',timeout:180000});
  const runButton=page.getByRole('button',{name:locale==='fr'?"Lancer l'evaluation":'Run assessment',exact:true});await expect(runButton).toBeEnabled();const routeReadyMs=Date.now()-started;
  const oldCount=await db.closeRun.count({where:scope});const runStarted=Date.now();await runButton.focus();await page.keyboard.press('Enter');
  await expect.poll(()=>db.closeRun.count({where:scope}),{timeout:90000,intervals:[500,1000,2000]}).toBe(oldCount+1);await expect(runButton).toBeEnabled();
  const run=await db.closeRun.findFirstOrThrow({where:{...scope,runById:actor.id},orderBy:{createdAt:'desc'}});assert.equal(run.metadata.inventoryValuationAnnex.evidenceHashVersion,1);const assessmentMs=Date.now()-runStarted;
  const exportButton=page.getByRole('button',{name:locale==='fr'?'Exporter JSON brouillon':'Export draft JSON',exact:true});await expect(exportButton).toBeEnabled();await expect(page.getByRole('button',{name:locale==='fr'?'Exporter JSON certifie':'Export certified JSON',exact:true})).toBeDisabled();
  const exportStarted=Date.now();await exportButton.focus();const [download]=await Promise.all([page.waitForEvent('download',{timeout:90000}),page.keyboard.press('Enter')]);const artifact='inventory-close-browser-'+stamp+'-'+locale+'-draft.json';await download.saveAs(path.join(__dirname,artifact));assert.equal(await download.failure(),null);
  const payload=JSON.parse(fs.readFileSync(path.join(__dirname,artifact),'utf8'));assert.equal(payload.annexes.inventoryValuation.freshness.status,'FRESH');assert.equal(payload.export.mode,'DRAFT_NOT_CERTIFIED');
  const stored=await db.closePackExport.findFirstOrThrow({where:{...scope,closeRunId:run.id,contentHash:payload.export.contentHash}});assert.equal(stored.isCertified,false);
  const contentHash=payload.export.contentHash,canonical={...payload,export:{...payload.export}};delete canonical.export.contentHash;assert.equal('sha256:'+crypto.createHash('sha256').update(stableJsonStringify(canonical)).digest('hex'),contentHash);
  assert.ok(payload.export.certificationBlockers.some(text=>text.includes('payroll')));
  const screenshot='inventory-close-browser-'+stamp+'-'+locale+width+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});assert.deepEqual(errors,[]);
  result.cases.push({...view,runId:run.id,exportId:stored.id,artifact,screenshot,sourceFingerprintVersion:1,inventoryFreshness:'FRESH',downloadHashMatches:true,certifiedControlDenied:true,keyboardAssessmentAndExport:true,routeReadyMs,assessmentMs,exportMs:Date.now()-exportStarted});await context.close();console.log(JSON.stringify({...view,passed:true}));
 }
 assert.equal(await financialHash(),before);assert.equal(await db.closePackExport.count({where:{...scope,isCertified:true}}),0);result.financialRecordsUnchanged=true;result.passed=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);if(page&&!page.isClosed()){result.failureScreenshot='inventory-close-browser-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{})}}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='inventory-close-browser-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error}));await db.$disconnect();process.exit(result.passed?0:1)});
