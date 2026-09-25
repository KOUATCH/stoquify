const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),pos=require(path.join(f.root,'services/pos/pos.service.ts'));
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/pos/terminal-management.service.ts','actions/pos/terminal-management.actions.ts','hooks/posHooks/useTerminalManagement.ts','components/pos/TerminalManagementDashboard.tsx'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),browser:[],scope:'Owned real sign-in/terminal actions, actual shift opening after dialogs loaded, persisted checks. No checkout or external operation.'};let browser;
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const organizationId='workflow_terminal_browser_'+stamp;
 await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Terminal browser',slug:organizationId,currency:'XAF'}});
 const password='Owned-terminal-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
 const user=await db.user.create({data:{organizationId,email:stamp+'@example.invalid',name:'Owned terminal operator',password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
 await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned terminal operator',permissions:['dashboard.read','pos.read','pos.use','pos.session.start'],users:{connect:{id:user.id}}}});
 await db.account.create({data:{userId:user.id,accountId:user.id,providerId:'credential',password:passwordHash}});
 const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}});
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 try{
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
  for(const locale of ['en','fr']){
   const create=label=>db.pOSStation.create({data:{organizationId,locationId:location.id,name:locale+' '+label,terminalNumber:locale+'-'+label}});
   const edit=await create('edit'),archive=await create('archive'),idle=await create('idle');
   const page=await context.newPage(),sample={locale,pageErrors:[],screenshots:[]};report.browser.push(sample);
   page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
   const t=locale==='en'?{edit:'Edit terminal',active:'Active for POS selection',name:'Terminal name',deactivate:'Deactivate',confirm:'Deactivate terminal',cancel:'Cancel',error:'Close the active shift before deactivating this terminal.'}:{edit:'Modifier terminal',active:'Actif dans la selection POS',name:'Nom du terminal',deactivate:'Desactiver',confirm:'Desactiver terminal',cancel:'Annuler',error:'Clôturez la session active avant de désactiver ce terminal.'};
   const started=Date.now();await page.goto(base+'/'+locale+'/dashboard/settings/terminals');
   await page.getByRole('button',{name:'Actions: '+edit.name,exact:true}).click();sample.readyMs=Date.now()-started;
   await page.getByRole('menuitem',{name:t.edit,exact:true}).click();let dialog=page.getByRole('dialog');
   const name=dialog.getByRole('textbox').first();await name.fill('Retained '+locale);
   await dialog.getByRole('switch').first().click();
   await pos.openPOSShift({organizationId,userId:user.id,locationId:location.id,terminalId:edit.id,openingBalance:'0'});
   await dialog.getByRole('button',{name:t.edit,exact:true}).click();await expect(dialog.getByRole('alert')).toHaveText(t.error);await expect(name).toHaveValue('Retained '+locale);
   assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:edit.id}})).name,edit.name);sample.rejectedEditRetainsDraft=true;
   assert.ok(await dialog.evaluate(el=>getComputedStyle(el).getPropertyValue('--dash-danger').trim().length>0));sample.portalThemeBound=true;
   for(const width of [1440,768,320]){
    await page.setViewportSize({width,height:1100});const screenshot='terminal-edit-v125-'+locale+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});sample.screenshots.push(screenshot);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const box=await dialog.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width+1);
   }
   await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));sample.dialogFocusContained=true;
   await dialog.getByRole('switch').first().click();await dialog.getByRole('button',{name:t.edit,exact:true}).click();await expect(dialog).toHaveCount(0);
   assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:edit.id}})).name,'Retained '+locale);sample.correctedDraftSaved=true;
   await page.setViewportSize({width:1440,height:1100});
   await page.getByRole('button',{name:'Actions: '+archive.name,exact:true}).click();await page.getByRole('menuitem',{name:t.deactivate,exact:true}).click();dialog=page.getByRole('alertdialog');
   await pos.openPOSShift({organizationId,userId:user.id,locationId:location.id,terminalId:archive.id,openingBalance:'0'});
   await dialog.getByRole('button',{name:t.confirm,exact:true}).click();await expect(dialog.getByRole('alert')).toHaveText(t.error);
   assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:archive.id}})).isActive,true);sample.archiveDenialRetainsDialog=true;
   await dialog.getByRole('button',{name:t.cancel,exact:true}).click();
   await page.getByRole('button',{name:'Actions: '+idle.name,exact:true}).click();await page.getByRole('menuitem',{name:t.deactivate,exact:true}).click();dialog=page.getByRole('alertdialog');
   await dialog.getByRole('button',{name:t.confirm,exact:true}).focus();await page.keyboard.press('Enter');await expect(dialog).toHaveCount(0);
   assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:idle.id}})).isActive,false);sample.keyboardIdleArchivePersisted=true;
   assert.equal(sample.pageErrors.length,0);await page.close();
  }
  assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);report.passed=true;
 }finally{await context.close();}
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1;}).finally(async()=>{
 report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);
 const file=path.join(__dirname,'terminal-browser-v125-'+stamp+'.json');console.log(JSON.stringify({file,...report}));
 try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await browser?.close();await db.$disconnect();}
});
