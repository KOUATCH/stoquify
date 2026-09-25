const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),pos=require(path.join(f.root,'services/pos/pos.service.ts'));
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/pos/pos.service.ts','services/pos/shift-opening-access.ts','actions/pos/session.actions.ts','hooks/posHooks/usePosOperations.ts','components/pos/ProfessionalPOSSystem.tsx','messages/en.json','messages/fr.json'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),browser:[],scope:'Owned local credentials and real shift actions. EN read-only POS and FR suspended sales grant fixtures. Local grant restoration is synthetic test setup, not live customer activation. No sale, payment or external operation.'};let browser;
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const organizationId='workflow_shift_access_browser_'+locale+'_'+stamp;
  await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'POS stop '+locale,slug:organizationId,currency:'XAF'}});
  const password='Owned-stop-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
  const user=await db.user.create({data:{organizationId,email:locale+stamp+'@example.invalid',name:'Owned cashier',password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
  await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned cashier',permissions:['dashboard.read','pos.read','pos.use','pos.session.start','pos.session.end'],users:{connect:{id:user.id}}}});
  await db.account.create({data:{userId:user.id,accountId:user.id,providerId:'credential',password:passwordHash}});
  const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED',isDefault:true}});
  const terminal=await db.pOSStation.create({data:{organizationId,locationId:location.id,name:'Owned till',terminalNumber:'OWNED'}});
  await db.tenantModuleConfiguration.create({data:{organizationId,manifestHash:'owned-'+stamp,newWorkStoppedModules:[]}});
  for(const moduleSlug of ['pos','sales'])await db.tenantModuleGrant.create({data:{organizationId,moduleSlug,status:locale==='fr'&&moduleSlug==='sales'?'suspended':'active',source:'manual_override',readOnly:locale==='en'&&moduleSlug==='pos'}});
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),sample={locale,pageErrors:[],screenshots:[]};report.browser.push(sample);
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
   const page=await context.newPage();page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
   const copy=require(path.join(f.root,'messages',locale+'.json')).pos,started=Date.now();await page.goto(base+'/'+locale+'/dashboard/pos');
   const amount=page.getByRole('spinbutton',{name:copy.shift.openingPlaceholder,exact:true}),open=page.getByRole('button',{name:copy.shift.openCta,exact:true});await expect(amount).toBeVisible();sample.readyMs=Date.now()-started;
   await amount.fill('125');await open.click();const error=page.locator('#pos-open-shift-error');await expect(error).toHaveText(copy.notifications.openShiftEntitlementUnavailable);await expect(amount).toHaveValue('125');assert.equal(await db.pOSSession.count({where:{organizationId}}),0);assert.equal(await db.cashDrawerTransaction.count({where:{cashDrawer:{terminalId:terminal.id}}}),0);sample.commercialDenialWithAmountRetainedAndNoShift=true;
   for(const width of [1440,768,320]){await page.setViewportSize({width,height:1100});await error.scrollIntoViewIfNeeded();const screenshot='shift-access-v129-'+locale+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});sample.screenshots.push(screenshot);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   await db.tenantModuleGrant.updateMany({where:{organizationId},data:{status:'active',readOnly:false}});assert.equal(await db.pOSSession.count({where:{organizationId}}),0);await expect(amount).toHaveValue('125');sample.fixtureGrantChangeDoesNotAutoSubmit=true;
   await open.focus();await page.keyboard.press('Enter');await expect.poll(()=>db.pOSSession.count({where:{organizationId,status:'ACTIVE'}})).toBe(1);
   const shift=await db.pOSSession.findFirstOrThrow({where:{organizationId,status:'ACTIVE'}});assert.equal(String(shift.openingBalance),'125');assert.equal(await db.cashDrawerTransaction.count({where:{sessionId:shift.id,type:'OPENING_BALANCE'}}),1);await expect(error).toHaveCount(0);sample.explicitKeyboardRetryOpensOnce=true;
   await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId,moduleSlug:'pos'}},data:{readOnly:true}});await pos.closePOSShift({organizationId,userId:user.id,sessionId:shift.id,actualBalance:'125'});assert.equal((await db.pOSSession.findUniqueOrThrow({where:{id:shift.id}})).status,'CLOSED');sample.retainedClosureVerifiedByService=true;
   assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);assert.equal(sample.pageErrors.length,0);
  }catch(error){sample.failurePages=await Promise.all(context.pages().map(async page=>({url:page.url(),body:f.safe((await page.locator('body').innerText()).slice(0,3000),secrets)})));throw error;}finally{await context.close();}
 }
 report.passed=true;
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1;}).finally(async()=>{report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'shift-access-browser-v129-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await browser?.close();await db.$disconnect();}});
