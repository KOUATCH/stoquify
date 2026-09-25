const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f,{fixture,restrict,snapshot}=require('./verify-tender-access-v131.cjs');
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/pos/pos.service.ts','services/pos/tender-write-access.ts','actions/pos/tender.actions.ts','components/pos/ProfessionalPOSSystem.tsx','hooks/posHooks/usePosOperations.ts','messages/en.json','messages/fr.json'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),browser:[],scope:'Actual EN/FR cashier actions on owned local accounts and PostgreSQL. Synthetic cash/ledger fixture, no external provider, delivery, statutory approval or live activation.'};let browser;
async function main(){await f.helper.withClient(f.target,f.helper.assertOwned);browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const x=await fixture('browser-'+locale),{organizationId,userId}=x.ctx,password='Owned-tender-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
  const user=await db.user.update({where:{id:userId},data:{password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
  await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned cashier',permissions:['dashboard.read','pos.read','pos.use','pos.session.start','pos.session.end'],users:{connect:{id:userId}}}});
  await db.account.create({data:{userId,accountId:userId,providerId:'credential',password:passwordHash}});
  await restrict(x);const financialBefore=await snapshot(x);
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),sample={locale,pageErrors:[],screenshots:[]};report.browser.push(sample);
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
   const page=await context.newPage();page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
   const copy=require(path.join(f.root,'messages',locale+'.json')).pos,started=Date.now();await page.goto(base+'/'+locale+'/dashboard/pos');
   const tender=page.getByLabel(copy.tender.amount,{exact:true}),charge=page.getByTestId('pos-charge-footer').getByRole('button'),error=page.getByTestId('pos-sale-access-error');
   await expect(tender).toBeVisible();sample.readyMs=Date.now()-started;await tender.fill('100');await charge.click();await expect(error).toHaveText(copy.notifications.saleAccessUnavailable);await expect(tender).toHaveValue('100');assert.equal(await snapshot(x),financialBefore);sample.deniedAttemptPreservesTenderAndFinancialState=true;
   for(const width of [1440,768,320]){await page.setViewportSize({width,height:1100});await error.scrollIntoViewIfNeeded();const screenshot='tender-v131-'+locale+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});sample.screenshots.push(screenshot);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   await db.tenantModuleGrant.updateMany({where:{organizationId,moduleSlug:'pos'},data:{readOnly:false}});assert.equal(await snapshot(x),financialBefore);sample.grantChangeDoesNotSubmit=true;
   await charge.focus();await charge.press('Enter');await expect.poll(async()=>(await db.salesOrder.findUniqueOrThrow({where:{id:x.cartId}})).status).toBe('COMPLETED');await expect(error).toHaveCount(0);
   assert.equal(await db.payment.count({where:{organizationId}}),1);const entries=await db.journalEntry.findMany({where:{organizationId},include:{lines:true}});assert.equal(entries.length,2);for(const entry of entries)assert.equal(entry.lines.reduce((n,l)=>n+Number(l.debit)-Number(l.credit),0),0);
   assert.equal(await db.pOSCommitResult.count({where:{organizationId,status:'COMPLETED'}}),1);assert.equal(String((await db.inventoryLevel.findFirstOrThrow({where:{itemId:x.itemId}})).quantityOnHand),'19');sample.explicitKeyboardRetryCommitsExactlyOnceWithBalancedPostings=true;assert.equal(sample.pageErrors.length,0);
  }catch(error){sample.failurePages=await Promise.all(context.pages().map(async page=>({url:page.url(),body:f.safe((await page.locator('body').innerText()).slice(0,4000),secrets)})));throw error}finally{await context.close()}
 }
 report.passed=true;
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1}).finally(async()=>{report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'tender-browser-v131-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'})}finally{await browser?.close();await db.$disconnect()}});
