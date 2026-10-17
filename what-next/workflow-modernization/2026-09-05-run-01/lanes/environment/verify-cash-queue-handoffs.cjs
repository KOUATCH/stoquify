// Owned, synthetic read fixtures. No business transitions, approvals or postings.
const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {getCashCommandData}=require(path.join(f.root,'services/cash-command/cash-command.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/cash-command/cash-command-navigation.ts','services/cash-command/cash-command-sources.service.ts','services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','components/cash-command/CashCommandDashboard.tsx','components/bi/BIActionPriorityBoard.tsx','services/signals/business-signal-rules.service.ts','services/modules/module-entitlement.service.ts',
 'services/snapshots/close-readiness-snapshot.service.ts','services/snapshots/inventory-loss-snapshot.service.ts',
 'app/[locale]/(dashboard)/dashboard/purchase-orders/page.tsx','app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-data-access.ts','services/purchase-order/purchase-order.service.ts',
 'app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx','app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access.tsx','components/accounting/CloseAssuranceCenter.tsx',
 'app/[locale]/(dashboard)/dashboard/inventory/loss-control/page.tsx','components/inventory/loss/InventoryLossWorkbench.tsx','actions/inventory/inventoryLossReadActions.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const org=await db.organization.create({data:{name:helper.prefix+'Cash queue '+stamp,slug:'cash-queue-'+stamp,currency:'XAF',timezone:'UTC'}});
 const password='Owned-'+crypto.randomUUID()+'!',hashed=await hashPassword(password);secrets.push(password);
 const actor=await db.user.create({data:{organizationId:org.id,email:'cash-queue-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const role=await db.role.create({data:{organizationId:org.id,code:'admin',nameEn:'Owned Cash reader',permissions:['dashboard.read'],users:{connect:{id:actor.id}}}});
 const modules=[...require(path.join(f.root,'services/modules/module-control-contracts.ts')).COMMERCIAL_MODULE_SLUGS];
 await db.tenantModuleConfiguration.create({data:{organizationId:org.id,manifestHash:'synthetic-cash-queue',selectedModules:modules,activeModules:modules}});
 await db.tenantModuleGrant.createMany({data:modules.map(moduleSlug=>({organizationId:org.id,moduleSlug,status:'active',source:'requested_modules'}))});
 const location=await db.location.create({data:{organizationId:org.id,name:'Owned queue site',code:'QUEUE'}});
 const supplier=await db.supplier.create({data:{organizationId:org.id,name:'Owned queue supplier'}});
 const now=new Date(),startDate=new Date(now.getTime()-86400000),endDate=new Date(now.getTime()+86400000);
 const order=await db.purchaseOrder.create({data:{organizationId:org.id,supplierId:supplier.id,locationId:location.id,createdById:actor.id,orderNumber:'CASH-PURCHASE-'+stamp,status:'SUBMITTED',expectedDeliveryDate:startDate}});
 const year=await db.fiscalYear.create({data:{organizationId:org.id,name:'Owned queue year',startDate,endDate}});
 const period=await db.accountingPeriod.create({data:{organizationId:org.id,fiscalYearId:year.id,periodNumber:1,name:'Owned Cash queue close period',startDate,endDate}});
 const closeRun=await db.closeRun.create({data:{organizationId:org.id,periodId:period.id,status:'BLOCKED',readinessScore:42}});
 const item=await db.item.create({data:{organizationId:org.id,nameEn:'Owned Cash loss item',nameFr:'Article perte Cash de test',sku:'CASH-LOSS-'+stamp,slug:'cash-loss-'+stamp,imageUrls:[]}});
 const adjustment=await db.stockAdjustment.create({data:{organizationId:org.id,locationId:location.id,createdById:actor.id,adjustmentNumber:'CASH-LOSS-'+stamp,type:'DAMAGED',status:'COMPLETED',reason:'Synthetic historical source; no approval claimed',lines:{create:{itemId:item.id,systemQuantity:4,actualQuantity:3,adjustedQuantity:-1,unitCost:45000,totalCost:-45000}}}});
 const effects=async()=>JSON.stringify({order:await db.purchaseOrder.findUniqueOrThrow({where:{id:order.id}}),closeRun:await db.closeRun.findUniqueOrThrow({where:{id:closeRun.id}}),adjustment:await db.stockAdjustment.findUniqueOrThrow({where:{id:adjustment.id},include:{lines:true}}),payments:await db.payment.count({where:{organizationId:org.id}}),journals:await db.journalEntry.count({where:{organizationId:org.id}}),events:await db.businessEvent.count({where:{organizationId:org.id}}),receipts:await db.goodsReceipt.count({where:{organizationId:org.id}})});
 const before=await effects();browser=await chromium.launch({headless:true});
 const cases=[
  {id:'purchasing',permission:'purchases.orders.read',route:'/dashboard/purchase-orders',record:order.orderNumber},
  {id:'close',permission:'accounting.close.read',route:'/dashboard/accounting/close',record:period.name},
  {id:'loss',permission:'inventory.levels.read',route:'/dashboard/inventory/loss-control',record:item.nameEn},
 ];
 for(const test of cases.filter(test=>!process.argv[2]||test.id===process.argv[2]))for(const locale of ['en','fr']){
  result.stage=test.id+' '+locale;const permissions=['dashboard.read',test.permission];await db.role.update({where:{id:role.id},data:{permissions}});
  const data=await getCashCommandData({organizationId:org.id,actorId:actor.id,actorPermissions:permissions,actorRoleCodes:[role.code]});
  assert.ok(data.actionsToday.some(action=>action.actionLink.href===test.route),test.id+' source action');
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce',timezoneId:'America/New_York'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',error=>{
   let detail=String(error.message);for(const secret of [f.target.toString(),helper.metadata().authSecret,...secrets])if(secret)detail=detail.split(secret).join('[redacted]');
   errors.push(detail.slice(-12000));result.pageErrors=[...(result.pageErrors||[]),{stage:result.stage,detail:detail.slice(-12000)}];
  });
  const cash=base+'/'+locale+'/dashboard/finance/cash-command',destination='/'+locale+test.route;
  await page.goto(cash,{waitUntil:'domcontentloaded',timeout:180000});let link=page.locator('#cash-actions a[href="'+destination+'"]').first();await expect(link).toBeVisible();
  await link.focus();await expect(link).toBeFocused();const started=Date.now();await link.press('Enter',{noWaitAfter:true});await expect(page).toHaveURL(base+destination,{timeout:180000});
  await expect(page.getByText(test.record,{exact:test.id!=='close'}).first()).toBeVisible({timeout:120000});
  const destinationMs=Date.now()-started;
  if(test.id==='close'){
   await expect(page.getByText(locale==='en'?/^As of: .* UTC$/:/^A la date: .* UTC$/)).toBeVisible();
   for(const name of locale==='en'?['Run assessment','Export draft JSON','Export certified JSON','Save review']:["Lancer l'evaluation",'Exporter JSON brouillon','Exporter JSON certifie','Enregistrer la revue'])await expect(page.getByRole('button',{name,exact:true})).toBeDisabled();
  }
  if(test.id==='loss'){
   const details=page.getByRole('button',{name:(locale==='en'?'Open loss record details: ':'Ouvrir le detail de la perte: ')+adjustment.adjustmentNumber});await details.focus();await details.press('Enter');await expect(page.getByRole('dialog').getByText(adjustment.adjustmentNumber,{exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  const screenshots=[];const shot=async suffix=>{const name='cash-queue-'+stamp+'-'+test.id+'-'+locale+'-'+suffix+'.png';await page.screenshot({path:path.join(__dirname,name),fullPage:true,animations:'disabled',caret:'initial'});screenshots.push(name);};await shot('destination');
  await page.goBack({waitUntil:'domcontentloaded',timeout:180000});await expect(page).toHaveURL(cash);link=page.locator('#cash-actions a[href="'+destination+'"]').first();await expect(link).toBeVisible();
  await db.role.update({where:{id:role.id},data:{permissions:['dashboard.read']}});await link.focus();await link.press('Enter',{noWaitAfter:true});await expect(page).toHaveURL(base+destination,{timeout:180000});
  await expect(page.getByText(/access denied|permission required|permission denied|access restricted|not available for this role|accès.*refusé|autorisation requise/i).first()).toBeVisible({timeout:120000});
  // A client navigation can retain previously authorized route DOM. Verify both
  // current visibility and fresh server delivery; do not claim cache erasure.
  const retained=await page.getByText(test.record,{exact:test.id!=='close'}).all();
  const retainedVisibility=await Promise.all(retained.map(element=>element.isVisible()));assert.ok(retainedVisibility.every(visible=>!visible));
  const freshDenied=await context.request.get(base+destination,{timeout:120000});const deniedHtml=await freshDenied.text();assert.ok(!deniedHtml.includes(test.record),'fresh denied response must not serialize the source record');
  await shot('revoked');
  await page.goto(cash,{waitUntil:'domcontentloaded',timeout:180000});await expect(page.locator('#cash-actions a[href="'+destination+'"]')).toHaveCount(0);
  const denied=await getCashCommandData({organizationId:org.id,actorId:actor.id,actorPermissions:['dashboard.read'],actorRoleCodes:[role.code]});assert.ok(!denied.actionsToday.some(action=>action.actionLink.href===test.route));
  assert.deepEqual(errors,[]);result.checks.push({id:test.id,locale,sourceActionVerified:true,keyboardHandoff:true,recordVisible:true,backRetainedLocale:true,renderedLinkRevocation:true,revokedActionRemoved:true,retainedHistoryElements:retained.length,retainedHistoryInvisible:true,freshDeniedRecordAbsent:true,noPageErrors:true,destinationMs,screenshots});await context.close();console.log(test.id+' '+locale+': passed');
 }
 assert.equal(await effects(),before);result.noBusinessMutationsDuringReads=true;result.passed=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1;if(page&&!page.isClosed()){result.failureScreenshot='cash-queue-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{});result.failureText=await page.locator('main').last().innerText().then(text=>f.safe(text,secrets)).catch(()=>null);}}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}await db.$disconnect();const output=path.join(__dirname,'cash-queue-'+stamp+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:result.passed,stage:result.stage,error:result.error}));});
