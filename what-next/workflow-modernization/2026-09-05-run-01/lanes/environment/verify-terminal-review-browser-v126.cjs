const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),service=require(path.join(f.root,'services/pos/terminal-management.service.ts'));
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/pos/terminal-configuration-revision.ts','services/pos/terminal-management.schemas.ts','services/pos/terminal-management.service.ts','actions/pos/terminal-management.actions.ts','hooks/posHooks/useTerminalManagement.ts','components/pos/TerminalManagementDashboard.tsx','components/pos/terminal-draft.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),browser:[],scope:'Owned real credential login and terminal actions. Another operator represented by actual service update between form load and submit. No external operation.'};let browser;
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const organizationId='workflow_terminal_review_'+stamp;
 await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Terminal review',slug:organizationId,currency:'XAF'}});
 const password='Owned-review-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
 const user=await db.user.create({data:{organizationId,email:stamp+'@example.invalid',name:'Owned terminal reviewer',password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
 const permissions=['dashboard.read','pos.read','pos.use','pos.session.start'];const role=await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned reviewer',permissions,users:{connect:{id:user.id}}}});
 await db.account.create({data:{userId:user.id,accountId:user.id,providerId:'credential',password:passwordHash}});
 const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}});
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 try{
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
  for(const locale of ['en','fr']){
   const terminal=await service.createTerminalForManagement(organizationId,{name:'Original '+locale,terminalNumber:locale+'-OLD',locationId:location.id,hasCashDrawer:false});
   const page=await context.newPage(),sample={locale,pageErrors:[],screenshots:[]};report.browser.push(sample);page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
   const t=locale==='en'?{edit:'Edit terminal',review:'Review latest configuration',accept:'Use this reviewed version',error:'The terminal changed since you opened this form. Your draft is retained. Review the latest configuration before saving.'}:{edit:'Modifier terminal',review:'Vérifier la configuration actuelle',accept:'Utiliser cette version vérifiée',error:'Le terminal a changé depuis l’ouverture du formulaire. Votre brouillon est conservé. Vérifiez la configuration actuelle avant d’enregistrer.'};
   const started=Date.now();await page.goto(base+'/'+locale+'/dashboard/settings/terminals');await page.getByRole('button',{name:'Actions: '+terminal.name,exact:true}).click();sample.readyMs=Date.now()-started;
   await page.getByRole('menuitem',{name:t.edit,exact:true}).click();let dialog=page.getByRole('dialog');const draftName='My retained draft '+locale;
   await dialog.getByRole('textbox').first().fill('x'.repeat(101));await dialog.getByRole('button',{name:t.edit,exact:true}).click();
   await expect(dialog.getByRole('alert')).toContainText(locale==='en'?'1–100':'1 à 100');sample.invalidDetailsExplained=true;
   await dialog.getByRole('textbox').first().fill(draftName);
   await service.updateTerminalForManagement(organizationId,terminal.id,{name:'Other operator '+locale,terminalNumber:locale+'-NEW',locationId:location.id,expectedRevision:terminal.configurationRevision});
   await dialog.getByRole('button',{name:t.edit,exact:true}).click();await expect(dialog.getByRole('alert')).toHaveText(t.error);await expect(dialog.getByRole('textbox').first()).toHaveValue(draftName);sample.staleSaveRejectedDraftRetained=true;
   await dialog.getByRole('button',{name:t.review,exact:true}).click();dialog=page.getByRole('dialog');const review=dialog.getByRole('region',{name:t.review,exact:true});await expect(review).toBeVisible();await expect(review).toContainText('Other operator '+locale);await expect(review).toContainText(draftName);await expect(review).toContainText((locale+'-NEW').toUpperCase());await expect(dialog.getByRole('button',{name:t.edit,exact:true})).toBeDisabled();
   assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:terminal.id}})).name,'Other operator '+locale);sample.reviewDoesNotSave=true;
   for(const width of [1440,768,320]){await page.setViewportSize({width,height:1100});await review.scrollIntoViewIfNeeded();const screenshot='terminal-review-v126-'+locale+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});sample.screenshots.push(screenshot);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   await review.getByRole('button',{name:t.accept,exact:true}).click();await expect(dialog.getByRole('textbox').first()).toHaveValue(draftName);await expect(dialog.getByRole('textbox').nth(1)).toHaveValue((locale+'-NEW').toUpperCase());
   await dialog.getByRole('button',{name:t.edit,exact:true}).focus();await page.keyboard.press('Enter');await expect(dialog).toHaveCount(0);
   const saved=await db.pOSStation.findUniqueOrThrow({where:{id:terminal.id}});assert.equal(saved.name,draftName);assert.equal(saved.terminalNumber,(locale+'-NEW').toUpperCase());sample.reviewedMergeSaved=true;
   await db.role.update({where:{id:role.id},data:{permissions:permissions.filter(p=>p!=='pos.read')}});
   const changedPermissions=await context.request.get(base+'/api/me/permissions');const permissionBody=await changedPermissions.json();sample.serverReadRevoked=changedPermissions.status()===200&&!permissionBody.permissions.includes('pos.read');assert.ok(sample.serverReadRevoked);
   await page.bringToFront();sample.visibility=await page.evaluate(()=>document.visibilityState);
   await page.evaluate(()=>window.dispatchEvent(new Event('visibilitychange')));
   await expect(page.getByText(locale==='en'?'Terminals unavailable':'Terminaux indisponibles',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Actions: '+draftName,exact:true})).toHaveCount(0);
   await db.role.update({where:{id:role.id},data:{permissions}});await page.getByRole('button',{name:locale==='en'?'Try again':'Reessayer',exact:true}).click();
   await expect(page.getByRole('button',{name:'Actions: '+draftName,exact:true})).toBeVisible();sample.revocationHidesDataAndRestoredAccessRecovers=true;
   assert.equal(sample.pageErrors.length,0);await page.close();
  }
  assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);report.passed=true;
 }catch(error){report.failurePages=await Promise.all(context.pages().map(async page=>({url:page.url(),body:f.safe((await page.locator('body').innerText()).slice(0,3500),secrets)})));throw error;}finally{await context.close();}
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1;}).finally(async()=>{report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'terminal-review-browser-v126-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await browser?.close();await db.$disconnect();}});
