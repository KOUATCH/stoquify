const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),{chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const stamp=crypto.randomUUID(),base='http://127.0.0.1:3110',secrets=[],files=['services/bi/bi-contracts.ts','services/daily-habit/daily-habit-digest.service.ts','services/daily-habit/daily-habit-digest-presentation.ts','components/bi/BIWhatChangedStrip.tsx','components/daily-habit/DailyHabitDigestDashboard.tsx'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
files.push('components/bi/BIKpiCard.tsx');
const result={at:new Date().toISOString(),sourceBefore:hashes(),browser:[],scope:'Owned localhost fixture; one submitted purchase order for a current source observation. No approval, dispatch, receipt or payment.'};let browser;
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const org=await db.organization.create({data:{name:f.helper.prefix+'Digest observations '+stamp,slug:'digest-observations-'+stamp,currency:'XAF',timezone:'UTC'}});
 const password='Owned-'+crypto.randomUUID()+'!',hashed=await hashPassword(password);secrets.push(password);
 const actor=await db.user.create({data:{organizationId:org.id,email:'observations-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const role=await db.role.create({data:{organizationId:org.id,code:'manager',nameEn:'Owned digest manager',permissions:['dashboard.read','purchases.orders.read','accounting.close.read'],users:{connect:{id:actor.id}}}});
 const supplier=await db.supplier.create({data:{organizationId:org.id,name:'Owned observation supplier'}}),location=await db.location.create({data:{organizationId:org.id,name:'Owned observation site',code:'OBS'}});
 const order=await db.purchaseOrder.create({data:{organizationId:org.id,supplierId:supplier.id,locationId:location.id,createdById:actor.id,orderNumber:'OBS-'+stamp,status:'SUBMITTED'}});
 const count=async()=>({events:await db.businessEvent.count({where:{organizationId:org.id}}),journals:await db.journalEntry.count({where:{organizationId:org.id}}),payments:await db.payment.count({where:{organizationId:org.id}})}),before=await count();
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  await db.role.update({where:{id:role.id},data:{permissions:['dashboard.read','purchases.orders.read','accounting.close.read']}});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',timezoneId:'America/New_York'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password}})).status(),200);
  const page=await context.newPage(),row={locale,screenshots:[],pageErrors:[],hydrationErrors:[]};result.browser.push(row);
  page.on('pageerror',error=>row.pageErrors.push(f.safe(error,secrets)));page.on('console',m=>{if(m.type()==='error'&&/hydrat/i.test(m.text()))row.hydrationErrors.push(f.safe(m.text(),secrets))});
  await page.goto(base+`/${locale}/dashboard/daily-digest`,{timeout:120000});await expect(page.getByRole('heading',{name:locale==='en'?'Daily Habit Digest':'Digest quotidien',exact:true})).toBeVisible();
  const region=page.getByRole('region',{name:locale==='en'?'Summary and changes':'Synthèse et évolutions',exact:true});
  for(const width of [1440,768,320]){
   await page.setViewportSize({width,height:1000});await expect(region.getByText(locale==='en'?'Observed':'Observé',{exact:true})).toBeVisible();await expect(region.getByText(locale==='en'?'Risk score: 50':'Score de risque: 50',{exact:true})).toBeVisible();await expect(region.getByText(locale==='en'?'Historical comparison unavailable':'Comparaison historique indisponible',{exact:true})).toBeVisible();assert.ok(!(await region.innerText()).includes('->'));
   await region.getByText(locale==='en'?'Observed':'Observé',{exact:true}).scrollIntoViewIfNeeded();const shot=`digest-observations-v160-${stamp}-${locale}-${width}.png`;await page.screenshot({path:path.join(__dirname,shot),caret:'initial',animations:'disabled'});row.screenshots.push(shot);
   const kpi=region.locator('article').filter({has:page.getByRole('heading',{name:locale==='en'?'Pending purchase orders':'Commandes fournisseurs en attente',exact:true})}).first();
   const geometry=await kpi.evaluate(el=>({box:el.getBoundingClientRect().toJSON(),overflow:el.scrollWidth>el.clientWidth+1,badge:el.firstElementChild.lastElementChild.getBoundingClientRect().toJSON()}));assert.equal(geometry.overflow,false);assert.ok(geometry.badge.right<=geometry.box.right&&geometry.badge.left>=geometry.box.left);row.badgeContained=true;
  }
  const accountant=page.getByRole('button',{name:locale==='en'?'Accountant':'Comptable',exact:true});await accountant.focus();await page.keyboard.press('Enter');
  for(const width of [1440,768,320]){
   await page.setViewportSize({width,height:1000});const kpi=region.locator('article').filter({has:page.getByRole('heading',{name:locale==='en'?'Close readiness':'Préparation à la clôture',exact:true})}).first();await expect(kpi.getByText(locale==='en'?'No value':'Aucune valeur',{exact:true})).toBeVisible();assert.ok(!(await kpi.innerText()).includes('0 %'));await kpi.scrollIntoViewIfNeeded();
   const shot=`digest-metrics-v160-${stamp}-${locale}-${width}-missing-close.png`;await page.screenshot({path:path.join(__dirname,shot),caret:'initial',animations:'disabled'});row.screenshots.push(shot);
  }
  row.missingCloseNotZero=true;const manager=page.getByRole('button',{name:locale==='en'?'Manager':'Responsable',exact:true});await manager.click();
  await page.reload();await expect(region.getByText(locale==='en'?'Observed':'Observé',{exact:true})).toBeVisible();row.repeatedObservation=true;
  const command=page.getByRole('button',{name:locale==='en'?'Command':'Pilotage',exact:true});await command.focus();await page.keyboard.press('Enter');const actions=page.getByRole('region',{name:locale==='en'?'Actions and risks':'Actions et risques',exact:true});await expect(actions.locator(`a[href="/${locale}/dashboard/purchase-orders"]`).first()).toBeVisible();row.authorizedSourceLink=true;
  await db.role.update({where:{id:role.id},data:{permissions:['dashboard.read']}});await page.reload();await expect(page.getByRole('heading',{name:locale==='en'?'Daily Habit Digest':'Digest quotidien',exact:true})).toBeVisible();await expect(region.getByText(locale==='en'?'Observed':'Observé',{exact:true})).toHaveCount(0);row.permissionFiltered=true;
  assert.equal(row.pageErrors.length,0);assert.equal(row.hydrationErrors.length,0);await context.close();
 }
 assert.deepEqual(await count(),before);assert.equal((await db.purchaseOrder.findUniqueOrThrow({where:{id:order.id}})).status,'SUBMITTED');result.noBusinessEffects=true;result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);const output=path.join(__dirname,'digest-observations-v160-'+stamp+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({output,...result}));await db.$disconnect()});
