const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f,{fixture,restrict,snapshot}=require('./verify-tender-access-v131.cjs');
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),pos=require(path.join(f.root,'services/pos/pos.service.ts')),{pendingSaleKey}=require(path.join(f.root,'lib/pos/pending-sale.ts'));
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/pos/pos.service.ts','actions/pos/commit-recovery.actions.ts','lib/pos/pending-sale.ts','components/pos/ProfessionalPOSSystem.tsx','hooks/posHooks/usePosOperations.ts','messages/en.json','messages/fr.json'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),browser:[],scope:'Actual cashier requests and controlled lost responses on owned local PostgreSQL. FR void is a service fixture; no external payment/delivery or live approval.'};let browser;
async function main(){await f.helper.withClient(f.target,f.helper.assertOwned);browser=await chromium.launch({headless:true});
 for(const [locale,dropPoint]of [['en','after'],['fr','after'],['en','before']]){
  const x=await fixture('recovery-browser-'+locale+'-'+dropPoint),{organizationId,userId}=x.ctx,password='Owned-recovery-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
  const user=await db.user.update({where:{id:userId},data:{password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
  const role=await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned cashier',permissions:['dashboard.read','pos.read','pos.use','pos.session.start','pos.session.end'],users:{connect:{id:userId}}}});
  await db.account.create({data:{userId,accountId:userId,providerId:'credential',password:passwordHash}});
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),sample={locale,dropPoint,pageErrors:[],screenshots:[],actionResponses:[]};report.browser.push(sample);let dropped=false,dropFinished=false,failRead=false;
  try{
   await context.route('**/*',async route=>{
    const request=route.request();if(new URL(request.url()).origin!==base)return route.abort();
    if(request.method()==='POST'&&request.headers()['next-action']&&request.postData()?.includes('clientCommitId')){
     if(!dropped){dropped=true;if(dropPoint==='after'){await route.fetch();assert.equal((await db.salesOrder.findUniqueOrThrow({where:{id:x.cartId}})).status,'COMPLETED');}await restrict(x);dropFinished=true;return route.abort('failed');}
     if(failRead){failRead=false;return route.abort('failed');}
    }
    return route.continue();
   });
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
   const page=await context.newPage();page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
   page.on('response',async response=>{const request=response.request();if(request.method()==='POST'&&request.headers()['next-action']&&request.postData()?.includes('clientCommitId')){try{sample.actionResponses.push({status:response.status(),body:f.safe((await response.text()).slice(0,2200),secrets)})}catch{sample.actionResponses.push({status:response.status(),body:'Response body unavailable'})}}});
   const copy=require(path.join(f.root,'messages',locale+'.json')).pos,started=Date.now();await page.goto(base+'/'+locale+'/dashboard/pos');
   await page.getByLabel(copy.tender.amount,{exact:true}).fill('100');sample.readyMs=Date.now()-started;
   await page.getByTestId('pos-charge-footer').getByRole('button').click();await expect.poll(()=>dropFinished).toBe(true);
   const key=pendingSaleKey(organizationId,userId),retained=await page.evaluate(key=>sessionStorage.getItem(key),key);assert.ok(retained);sample.originalRequestRetainedBeforeLostResponse=true;
   if(locale==='fr'){await db.tenantModuleGrant.updateMany({where:{organizationId,moduleSlug:'pos'},data:{readOnly:false}});await pos.voidPOSSale(x.correction);await db.tenantModuleGrant.updateMany({where:{organizationId,moduleSlug:'pos'},data:{readOnly:true}});}
   await page.reload();const panel=page.getByTestId('pos-commit-recovery'),check=panel.getByRole('button',{name:copy.recovery.check,exact:true});await expect(check).toBeEnabled();assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),key),retained);sample.reloadPreservesOriginalRequest=true;
   const financialBefore=await snapshot(x);failRead=true;await check.click();await expect(panel.getByRole('alert')).toHaveText(copy.recovery.failed);assert.equal(await snapshot(x),financialBefore);sample.failedReadDoesNotBecomeNotFound=true;
   await check.focus();await check.press('Enter');
   if(dropPoint==='after'){
    await expect(panel.getByRole('status')).toContainText(copy.recovery.status[locale==='fr'?'CANCELLED':'COMPLETED']);assert.equal(await snapshot(x),financialBefore);sample.ownResultRecoveredUnderReadOnlyWithoutEffects=true;sample.currentStatus=locale==='fr'?'CANCELLED':'COMPLETED';
    await db.role.update({where:{id:role.id},data:{permissions:['dashboard.read','pos.use','pos.session.start','pos.session.end']}});await check.click();await expect(panel.getByRole('alert')).toHaveText(copy.recovery.failed);await expect(panel.getByRole('status')).toHaveText('');sample.currentReadPermissionRechecked=true;
    await db.role.update({where:{id:role.id},data:{permissions:['dashboard.read','pos.read','pos.use','pos.session.start','pos.session.end']}});await check.click();await expect(panel.getByRole('status')).toContainText(copy.recovery.status[sample.currentStatus]);
   }else{await expect(panel.getByRole('status')).toHaveText(copy.recovery.notFound);assert.equal(await snapshot(x),financialBefore);sample.missingResultExplicit=true;}
   for(const width of [1440,768,320]){await page.setViewportSize({width,height:1100});await panel.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));const heading=await panel.getByRole('heading').boundingBox(),header=await panel.locator('xpath=preceding-sibling::header').boundingBox();(sample.viewports??=[]).push({width,heading,header,scroll:await panel.evaluate(node=>({margin:getComputedStyle(node).scrollMarginTop,scrollY:window.scrollY,panelY:node.getBoundingClientRect().y}))});const screenshot='commit-recovery-v132-'+locale+'-'+dropPoint+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});sample.screenshots.push(screenshot);assert.ok(heading&&header&&heading.y>=header.y+header.height);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}sample.headingClearOfStickyHeader=true;
   if(dropPoint==='before'){
    await db.tenantModuleGrant.updateMany({where:{organizationId,moduleSlug:'pos'},data:{readOnly:false}});assert.equal(await snapshot(x),financialBefore);
    const retry=panel.getByRole('button',{name:copy.recovery.retryOriginal,exact:true});await retry.focus();await retry.press('Enter');await expect.poll(async()=>await db.pOSCommitResult.count({where:{organizationId,status:'COMPLETED'}})).toBe(1);await expect(panel).toHaveCount(0);assert.equal(await db.payment.count({where:{organizationId}}),1);sample.explicitOriginalRetryCommitsOnce=true;
   }else{await panel.getByRole('button',{name:copy.recovery.acknowledge,exact:true}).click();await expect(panel).toHaveCount(0);assert.equal(await snapshot(x),financialBefore);sample.acknowledgementOnlyClearsLocalRecovery=true;}
   assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),key),null);assert.equal(sample.pageErrors.length,0);
  }catch(error){sample.failurePages=await Promise.all(context.pages().map(async page=>({url:page.url(),body:f.safe((await page.locator('body').innerText()).slice(0,4500),secrets)})));throw error}finally{await context.close()}
 }
 report.passed=true;
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1}).finally(async()=>{report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'commit-recovery-browser-v132-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'})}finally{await browser?.close();await db.$disconnect()}});
