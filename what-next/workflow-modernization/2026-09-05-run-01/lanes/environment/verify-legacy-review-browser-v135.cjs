const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f,{fixture,snapshot}=require('./verify-tender-access-v131.cjs');
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),{pendingSaleKey}=require(path.join(f.root,'lib/pos/pending-sale.ts'));
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/pos/pos.service.ts','services/pos/offline-sync.service.ts','components/pos/ProfessionalPOSSystem.tsx','messages/en.json','messages/fr.json'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),browser:[],scope:'Old-format same-tab request is a controlled browser-storage fixture. Authentication, read/review/commit and persisted outcomes use the actual application.'};let browser;
async function main(){await f.helper.withClient(f.target,f.helper.assertOwned);browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const x=await fixture('legacy-browser-'+locale),{organizationId,userId}=x.ctx,password='Owned-legacy-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
  const user=await db.user.update({where:{id:userId},data:{password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
  await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned cashier',permissions:['dashboard.read','pos.read','pos.use','pos.session.start','pos.session.end'],users:{connect:{id:userId}}}});
  await db.account.create({data:{userId,accountId:userId,providerId:'credential',password:passwordHash}});
  const request={...x.commit};delete request.expectedCartRevision;delete request.organizationId;delete request.userId;
  const key=pendingSaleKey(organizationId,userId),retained=JSON.stringify({version:1,organizationId,actorId:userId,request});
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),sample={locale,screenshots:[],pageErrors:[]};report.browser.push(sample);
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   await context.addInitScript(({key,retained,base})=>{if(location.origin===base&&!sessionStorage.getItem(key))sessionStorage.setItem(key,retained)},{key,retained,base});
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
   const page=await context.newPage();page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
   const copy=require(path.join(f.root,'messages',locale+'.json')).pos,start=Date.now(),unchanged=await snapshot(x);
   await page.goto(base+'/'+locale+'/dashboard/pos');const panel=page.getByTestId('pos-commit-recovery');
   await panel.getByRole('button',{name:copy.recovery.check,exact:true}).click();await expect(panel.getByRole('status')).toHaveText(copy.recovery.legacyReview);sample.readyMs=Date.now()-start;
   await expect(panel.getByRole('button',{name:copy.recovery.retryOriginal,exact:true})).toHaveCount(0);
   assert.equal(await snapshot(x),unchanged);sample.legacyReadRequiresReviewWithoutEffects=true;
   const review=panel.getByRole('button',{name:copy.recovery.reviewCurrent,exact:true});await review.focus();await review.press('Enter');await expect(panel.getByRole('status')).toHaveText(copy.recovery.reviewReady);
   assert.equal(await snapshot(x),unchanged);assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),key),retained);sample.reviewRetainsOriginalWithoutSubmission=true;
   for(const width of [1440,768,320]){await page.setViewportSize({width,height:1100});await panel.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));const file='legacy-review-v135-'+locale+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,file),animations:'disabled'});sample.screenshots.push(file);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   await page.getByLabel(copy.tender.amount,{exact:true}).fill('100');const charge=page.getByTestId('pos-charge-footer').getByRole('button');await charge.focus();await charge.press('Enter');
   await expect.poll(()=>db.pOSCommitResult.count({where:{organizationId,status:'COMPLETED'}})).toBe(1);await expect(panel).toHaveCount(0);
   const committed=await db.pOSCommitResult.findFirstOrThrow({where:{organizationId}});assert.equal(committed.clientCommitId,request.clientCommitId);assert.equal(await db.payment.count({where:{organizationId}}),1);
   assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),key),null);assert.equal(sample.pageErrors.length,0);sample.explicitReviewCommitsOnceWithOriginalIdentifier=true;
  }finally{await context.close()}
 }
 report.passed=true;
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1}).finally(async()=>{report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'legacy-review-browser-v135-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'})}finally{await browser?.close();await db.$disconnect()}});
