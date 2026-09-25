const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),pos=require(path.join(f.root,'services/pos/pos.service.ts'));
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/pos/pos.service.ts','services/pos/cart-write-access.ts','actions/pos/cart.actions.ts','hooks/posHooks/usePosOperations.ts','components/pos/ProfessionalPOSSystem.tsx','messages/en.json','messages/fr.json'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),browser:[],scope:'Owned local credentials and real cart actions. Commercial grant changes are synthetic fixtures, not live activation. No checkout, payment or external operation.'};let browser;
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const organizationId='workflow_cart_access_browser_'+locale+'_'+stamp;
  await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Cart access '+locale,slug:organizationId,currency:'XAF'}});
  const password='Owned-cart-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
  const user=await db.user.create({data:{organizationId,email:locale+stamp+'@example.invalid',name:'Owned cashier',password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
  await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned cashier',permissions:['dashboard.read','pos.read','pos.use','pos.session.start','pos.session.end'],users:{connect:{id:user.id}}}});
  await db.account.create({data:{userId:user.id,accountId:user.id,providerId:'credential',password:passwordHash}});
  const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED',isDefault:true}}),terminal=await db.pOSStation.create({data:{organizationId,locationId:location.id,name:'Owned till',terminalNumber:'OWNED'}});
  const scope={organizationId,userId:user.id,locationId:location.id,terminalId:terminal.id};const shift=await pos.openPOSShift({...scope,openingBalance:0});scope.sessionId=shift.id;
  const item=await db.item.create({data:{organizationId,slug:'owned',sku:'OWNED',nameEn:'Owned item',nameFr:'Article de test',sellingPrice:100,imageUrls:[]}});
  await db.inventoryLevel.create({data:{itemId:item.id,locationId:location.id,quantityOnHand:20,quantityAvailable:20}});
  const cart=await pos.addPOSCartLine({...scope,itemId:item.id,quantity:1}),lineId=cart.lines[0].id;
  await db.tenantModuleConfiguration.create({data:{organizationId,manifestHash:'owned-'+stamp}});
  for(const moduleSlug of ['pos','sales'])await db.tenantModuleGrant.create({data:{organizationId,moduleSlug,status:locale==='fr'&&moduleSlug==='sales'?'suspended':'active',readOnly:locale==='en'&&moduleSlug==='pos',source:'manual_override'}});
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),sample={locale,pageErrors:[],screenshots:[]};report.browser.push(sample);
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
   const page=await context.newPage();page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
   const copy=require(path.join(f.root,'messages',locale+'.json')).pos,name=locale==='en'?item.nameEn:item.nameFr,started=Date.now();await page.goto(base+'/'+locale+'/dashboard/pos');
   const row=page.getByTestId('pos-cart-line'),quantity=row.getByRole('spinbutton'),error=page.getByTestId('pos-cart-access-error');await expect(quantity).toHaveValue('1');sample.readyMs=Date.now()-started;
   const product=page.getByRole('button',{name:copy.catalog.add+' '+name,exact:true}).locator('..'),onHand=product.getByText(copy.stock.onHand,{exact:true}).locator('..').locator(':scope > div').nth(1);await expect(onHand).toHaveText('20');sample.onHandDoesNotSubtractUncommittedCart=true;
   await page.getByRole('button',{name:copy.catalog.add+' '+name,exact:true}).click();await expect(error).toHaveText(copy.notifications.cartWriteUnavailable);
   await quantity.fill('3');await quantity.press('Enter');await expect(row.getByRole('alert')).toHaveText(copy.notifications.cartWriteDeniedLine);await expect(quantity).toHaveValue('3');
   await row.getByRole('button',{name:copy.cart.removeLine.replace('{item}',name),exact:true}).click();await expect.poll(()=>db.auditLog.count({where:{organizationId,action:'POS_CART_WRITE_ENTITLEMENT_DENIED'}})).toBe(3);
   assert.equal(String((await db.salesOrderLine.findUniqueOrThrow({where:{id:lineId}})).quantity),'1');await expect(quantity).toHaveValue('3');sample.addUpdateRemoveDeniedDraftRetained=true;
   for(const width of [1440,768,320]){await page.setViewportSize({width,height:1100});await error.scrollIntoViewIfNeeded();const screenshot='cart-access-v130-'+locale+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});sample.screenshots.push(screenshot);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   await db.tenantModuleGrant.updateMany({where:{organizationId},data:{status:'active',readOnly:false}});assert.equal(String((await db.salesOrderLine.findUniqueOrThrow({where:{id:lineId}})).quantity),'1');sample.grantChangeDoesNotSubmit=true;
   await quantity.focus();await quantity.press('Enter');await expect.poll(async()=>String((await db.salesOrderLine.findUniqueOrThrow({where:{id:lineId}})).quantity)).toBe('3');await expect(error).toHaveCount(0);sample.explicitKeyboardCorrectionSaved=true;
   await expect(onHand).toHaveText('20');assert.equal(String((await db.inventoryLevel.findUniqueOrThrow({where:{itemId_locationId:{itemId:item.id,locationId:location.id}}})).quantityOnHand),'20');sample.stockStillMatchesDatabaseAfterCartEdit=true;
   await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId,moduleSlug:'pos'}},data:{readOnly:true}});await pos.closePOSShift({...scope,actualBalance:'0'});assert.equal((await db.pOSSession.findUniqueOrThrow({where:{id:shift.id}})).status,'CLOSED');sample.retainedClosureVerifiedByService=true;
   assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);assert.equal(sample.pageErrors.length,0);
  }catch(error){sample.failurePages=await Promise.all(context.pages().map(async page=>({url:page.url(),body:f.safe((await page.locator('body').innerText()).slice(0,3500),secrets)})));throw error;}finally{await context.close();}
 }
 report.passed=true;
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1;}).finally(async()=>{report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'cart-access-browser-v130-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await browser?.close();await db.$disconnect();}});
