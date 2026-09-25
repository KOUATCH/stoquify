const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f,{make}=require('./verify-offline-review-v137.cjs'),{snapshot}=require('./verify-tender-access-v131.cjs');
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/pos/offline-review.service.ts','actions/pos/offline-review.actions.ts','components/pos/ProfessionalPOSSystem.tsx','components/pos/offline/OfflineConflictReview.tsx','components/pos/offline/OfflineSyncStatusStrip.tsx','hooks/posHooks/useOfflineSync.ts','messages/en.json','messages/fr.json'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),browser:[],scope:'Owned synthetic unresolved conflict; actual authentication, server actions, review audit and financial snapshots. Does not enable offline ingestion or replay.'};let browser;
async function main(){await f.helper.withClient(f.target,f.helper.assertOwned);browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const {x,conflict}=await make(),{organizationId,userId}=x.ctx,password='Owned-review-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
  const user=await db.user.update({where:{id:userId},data:{password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
  const permissions=['dashboard.read','pos.read','pos.use','pos.session.start','pos.session.end','pos.transactions.read','controls.manage'];
  const role=await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned review operator',permissions,users:{connect:{id:userId}}}});
  await db.account.create({data:{userId,accountId:userId,providerId:'credential',password:passwordHash}});
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),sample={locale,screenshots:[],pageErrors:[]};report.browser.push(sample);
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
   const page=await context.newPage();page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
   const copy=require(path.join(f.root,'messages',locale+'.json')).pos.offlineReview,start=Date.now(),unchanged=await snapshot(x);
   await page.goto(base+'/'+locale+'/dashboard/pos');
   await page.waitForTimeout(3000);sample.initialText=f.safe(await page.locator('body').innerText(),secrets);console.log(JSON.stringify({stage:'page-loaded',locale,text:sample.initialText}));
   await page.getByRole('button',{name:locale==='fr'?'Examiner les conflits':'Review conflicts',exact:true}).click();
   const panel=page.getByTestId('offline-conflict-review');await panel.getByRole('button',{name:copy.open,exact:false}).click();
   const note=panel.getByLabel(copy.note,{exact:true}),draft='Investigate retained source evidence before any replay.';
   await note.fill(draft);sample.readyMs=Date.now()-start;
   // A concurrent evidence update must invalidate the loaded revision without losing the draft.
   await db.pOSOfflineSyncConflict.update({where:{id:conflict.id},data:{metadata:{originalEvidence:'retained',concurrentEvidence:'arrived'}}});
   await panel.getByRole('button',{name:copy.save,exact:true}).click();await expect(panel.getByRole('alert')).toHaveText(copy.freshAuth);await expect(note).toHaveValue(draft);
   await panel.getByLabel(copy.password,{exact:true}).fill(password);await panel.getByRole('button',{name:copy.authenticate,exact:true}).click();await expect(panel.getByRole('status')).toHaveText(copy.authenticated);assert.equal(await db.auditLog.count({where:{organizationId,action:'POS_OFFLINE_CONFLICT_REVIEWED'}}),0);sample.explicitFreshAuthenticationNoAutomaticSave=true;
   await panel.getByRole('button',{name:copy.save,exact:true}).click();await expect(panel.getByRole('alert')).toHaveText(copy.stale);await expect(note).toHaveValue(draft);
   assert.equal(await db.auditLog.count({where:{organizationId,action:'POS_OFFLINE_CONFLICT_REVIEWED'}}),0);assert.equal(await snapshot(x),unchanged);sample.staleRejectedDraftRetained=true;
   await panel.getByRole('button',{name:copy.refresh,exact:true}).click();await expect(panel.getByRole('alert')).toHaveCount(0);await expect(note).toHaveValue(draft);
   // Lose the acknowledgement after the actual action committed. A same-request retry must be idempotent.
   let lost=false;await page.route('**/*',async route=>{const req=route.request();if(!lost&&req.headers()['next-action']&&req.postData()?.includes(draft)){lost=true;await route.fetch();return route.abort('failed')}return route.continue()});
   await panel.getByRole('button',{name:copy.save,exact:true}).click();await expect(panel.getByRole('alert')).toHaveText(copy.failed);assert.equal(lost,true);await expect(note).toHaveValue(draft);
   assert.equal(await db.auditLog.count({where:{organizationId,action:'POS_OFFLINE_CONFLICT_REVIEWED'}}),1);
   const save=panel.getByRole('button',{name:copy.save,exact:true});await save.focus();await save.press('Enter');await expect(panel.getByRole('status')).toHaveText(copy.saved);
   assert.equal(await db.auditLog.count({where:{organizationId,action:'POS_OFFLINE_CONFLICT_REVIEWED'}}),1);assert.equal(await snapshot(x),unchanged);
   assert.equal(await db.pOSOfflineSyncConflict.count({where:{organizationId,status:{in:['OPEN','ACKNOWLEDGED']}}}),1);sample.lostResponseRetrySingleAuditBlockerRetained=true;
   for(const width of [1440,768,320]){await page.setViewportSize({width,height:1100});await panel.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));const file='offline-review-v137-'+locale+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,file),animations:'disabled'});sample.screenshots.push(file);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await panel.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Review panel content must not be clipped');await save.focus();await save.scrollIntoViewIfNeeded();assert.ok(await save.evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}));}
   await page.evaluate(()=>document.documentElement.style.fontSize='200%');await save.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await panel.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Review panel must reflow at 200% text');sample.text200NoHorizontalOverflow=true;const zoomFile='offline-review-v137-'+locale+'-text200-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,zoomFile),animations:'disabled'});sample.screenshots.push(zoomFile);await page.evaluate(()=>document.documentElement.style.fontSize='');
   await db.role.update({where:{id:role.id},data:{permissions:permissions.filter(p=>p!=='controls.manage')}});await page.reload();await page.getByRole('button',{name:locale==='fr'?'Examiner les conflits':'Review conflicts',exact:true}).click();await panel.getByRole('button',{name:copy.open,exact:false}).click();await expect(panel.getByRole('button',{name:copy.save,exact:true})).toBeDisabled();await expect(panel.getByText(copy.denied,{exact:true})).toBeVisible();sample.readOnlyReviewerDenied=true;
   await db.role.update({where:{id:role.id},data:{permissions:permissions.filter(p=>!['controls.manage','pos.transactions.read'].includes(p))}});await page.reload();await expect(panel).toHaveCount(0);await expect(page.getByRole('button',{name:locale==='fr'?'Examiner les conflits':'Review conflicts',exact:true})).toHaveCount(0);sample.readPermissionRevocationHidesReview=true;
   assert.equal(await snapshot(x),unchanged);assert.equal(sample.pageErrors.length,0);
  }finally{await context.close()}
 }
 report.passed=true;
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1}).finally(async()=>{report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'offline-review-browser-v137-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'})}finally{await browser?.close();await db.$disconnect()}});
