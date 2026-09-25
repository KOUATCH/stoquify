const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),service=require(path.join(f.root,'services/pos/terminal-management.service.ts'));
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/pos/terminal-configuration-revision.ts','services/pos/terminal-management.service.ts','actions/pos/terminal-management.actions.ts','hooks/posHooks/useTerminalManagement.ts','components/pos/TerminalManagementDashboard.tsx'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),browser:[],scope:'Owned real credential login and application terminal actions. Competing operator uses actual terminal service, not a second browser. No external or financial operation.'};let browser;
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const organizationId='workflow_terminal_archive_browser_'+stamp;
 await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Archive browser',slug:organizationId,currency:'XAF'}});
 const password='Owned-archive-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
 const user=await db.user.create({data:{organizationId,email:stamp+'@example.invalid',name:'Owned terminal reviewer',password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
 await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned reviewer',permissions:['dashboard.read','pos.read','pos.use','pos.session.start'],users:{connect:{id:user.id}}}});
 await db.account.create({data:{userId:user.id,accountId:user.id,providerId:'credential',password:passwordHash}});
 const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}});
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 try{
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
  for(const locale of ['en','fr']){
   const terminal=await service.createTerminalForManagement(organizationId,{name:'Original '+locale,terminalNumber:locale+'-OLD',locationId:location.id,hasCashDrawer:false});
   const page=await context.newPage(),sample={locale,pageErrors:[],screenshots:[]};report.browser.push(sample);page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
   const t=locale==='en'?{menu:'Deactivate',confirm:'Deactivate terminal',review:'Review latest configuration',error:'The terminal changed since you opened this confirmation. Review its latest configuration before deactivating it.',cancel:'Cancel'}:{menu:'Desactiver',confirm:'Desactiver terminal',review:'Vérifier la configuration actuelle',error:'Le terminal a changé depuis l’ouverture de cette confirmation. Vérifiez sa configuration actuelle avant de le désactiver.',cancel:'Annuler'};
   const started=Date.now();await page.goto(base+'/'+locale+'/dashboard/settings/terminals');await page.getByRole('button',{name:'Actions: '+terminal.name,exact:true}).click();sample.readyMs=Date.now()-started;
   await page.getByRole('menuitem',{name:t.menu,exact:true}).click();const dialog=page.getByRole('alertdialog');await expect(dialog).toBeVisible();
   const changed=await service.updateTerminalForManagement(organizationId,terminal.id,{name:'Other operator '+locale,terminalNumber:locale+'-NEW',locationId:location.id,expectedRevision:terminal.configurationRevision});
   await dialog.getByRole('button',{name:t.confirm,exact:true}).click();await expect(dialog.getByRole('alert')).toHaveText(t.error);await expect(dialog.getByRole('button',{name:t.confirm,exact:true})).toBeDisabled();assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:terminal.id}})).isActive,true);sample.staleConfirmationDenied=true;
   await dialog.getByRole('button',{name:t.review,exact:true}).click();const review=dialog.getByRole('region',{name:t.review,exact:true});await expect(review).toContainText(changed.name);await expect(review).toContainText(changed.terminalNumber);await expect(dialog.getByRole('button',{name:t.confirm,exact:true})).toBeEnabled();assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:terminal.id}})).isActive,true);sample.reviewDoesNotDeactivate=true;
   for(const width of [1440,768,320]){await page.setViewportSize({width,height:1100});const screenshot='terminal-archive-v127-'+locale+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});sample.screenshots.push(screenshot);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);}
   await dialog.getByRole('button',{name:t.confirm,exact:true}).focus();await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));sample.tabContained=true;
   await dialog.getByRole('button',{name:t.confirm,exact:true}).focus();await page.keyboard.press('Enter');await expect(dialog).toHaveCount(0);assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:terminal.id}})).isActive,false);sample.reviewedKeyboardConfirmationPersisted=true;
   // A second open confirmation must expose an already deactivated terminal after refresh.
   const other=await service.createTerminalForManagement(organizationId,{name:'Concurrent inactive '+locale,terminalNumber:locale+'-SECOND',locationId:location.id,hasCashDrawer:false});
   await page.reload();await page.getByRole('button',{name:'Actions: '+other.name,exact:true}).click();await page.getByRole('menuitem',{name:t.menu,exact:true}).click();await service.archiveTerminalForManagement(organizationId,other.id,other.configurationRevision);
   await dialog.getByRole('button',{name:t.review,exact:true}).click();await expect(dialog.getByRole('button',{name:t.confirm,exact:true})).toBeDisabled();await expect(dialog.getByRole('region',{name:t.review,exact:true})).toContainText(locale==='en'?'No':'Non');await dialog.getByRole('button',{name:t.cancel,exact:true}).click();sample.alreadyInactiveReviewDisablesConfirmation=true;
   assert.equal(sample.pageErrors.length,0);await page.close();
  }
  assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);report.passed=true;
 }catch(error){report.failurePages=await Promise.all(context.pages().map(async page=>({url:page.url(),body:f.safe((await page.locator('body').innerText()).slice(0,3500),secrets)})));throw error;}finally{await context.close();}
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1;}).finally(async()=>{report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'terminal-archive-browser-v127-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await browser?.close();await db.$disconnect();}});
