// Read the journal produced by real lifecycle services from synthetic inputs.
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const postingFile='payroll-posting-proof-83e84e0e-86f5-42a0-b264-18145720fcbe.json';
const posting=JSON.parse(fs.readFileSync(path.join(__dirname,postingFile)));assert.ok(posting.passed&&posting.sourceStable);
const files=['components/evidence/ProofTrailDrawer.tsx','components/evidence/proof-trail-presentation.ts','actions/evidence/proof-trail.actions.ts','services/evidence/proof-trail.service.ts','services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','services/payroll/payroll-control.service.ts'];
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hashes=()=>Object.fromEntries(files.map(file=>[file,hash(path.join(f.root,file))]));
const result={at:new Date().toISOString(),postingReceipt:{file:postingFile,sha256:hash(path.join(__dirname,postingFile))},syntheticCalculatedInputs:true,sourceBefore:hashes(),checks:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 for(const [file,expected]of Object.entries(posting.sourceAfter))assert.equal(hash(path.join(f.root,file)),expected);
 const scope={organizationId:posting.result.organizationId};
 const org=await db.organization.findUniqueOrThrow({where:{id:scope.organizationId}});assert.ok(org.name.startsWith(helper.prefix));
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{...scope,email:stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const permissions=['finance.read','dashboard.read','accounting.journal.read'];
 const role=await db.role.create({data:{...scope,code:'admin',nameEn:'Owned posting reader',permissions,users:{connect:{id:actor.id}}}});
 const modules=['dashboard','finance','accounting'];
 await db.tenantModuleConfiguration.create({data:{...scope,manifestHash:'owned-posting-browser',selectedModules:modules,activeModules:modules}});
 await db.tenantModuleGrant.createMany({data:modules.map(moduleSlug=>({...scope,moduleSlug,status:'active',source:'requested_modules'}))});
 await db.location.create({data:{...scope,name:'Owned posting source',code:'OWNED'}});
 async function fingerprint(){const rows=await Promise.all(['payrollRun','payrollPayslip','payrollPayslipLine','payrollRunTransition','journalEntry','journalEntryLine'].map(model=>db[model].findMany({where:scope,orderBy:{id:'asc'}})));return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
 const before=await fingerprint();browser=await chromium.launch({headless:true});
 for(const view of [{locale:'en',width:1440},{locale:'fr',width:768},{locale:'fr',width:320}]){
  const {locale,width}=view;await db.role.update({where:{id:role.id},data:{permissions}});
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',timezoneId:'America/New_York'});let verifiedResponse=false;const errors=[];
  await context.route('**/*',async route=>{
   if(new URL(route.request().url()).origin!==base)return route.abort();
   if(route.request().headers()['next-action']){const actual=await route.fetch({maxRedirects:0});const body=await actual.body();verifiedResponse=actual.ok()&&body.toString().includes(posting.result.journalEntryId);return route.fulfill({response:actual,body});}
   return route.continue();
  });
  result.stage=locale+width+' login';assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});
  const button=page.getByRole('button',{name:locale==='fr'?'Preuves comptables':'Ledger proof',exact:true});await expect(button).toBeEnabled();
  await expect.poll(()=>button.evaluate(el=>Object.keys(el).some(key=>key.startsWith('__reactProps$')&&typeof el[key]?.onClick==='function'))).toBe(true);
  const started=performance.now();await button.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');
  await expect(dialog.getByText(locale==='fr'?'L’écriture est comptabilisée et reliée à un lot comptable comptabilisé.':'Journal entry is posted and linked to a posted ledger batch.',{exact:true})).toBeVisible();assert.ok(verifiedResponse);
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  for(let i=0;i<5;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));}
  const screenshot='posted-payroll-'+stamp+'-'+locale+'-'+width+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(button).toBeFocused();
  await db.role.update({where:{id:role.id},data:{permissions:['finance.read','dashboard.read']}});const response=await page.reload({waitUntil:'domcontentloaded',timeout:180000});await expect(button).toBeDisabled();assert.ok(!(await response.text()).includes(posting.result.journalEntryId));assert.deepEqual(errors,[]);
  result.checks.push({locale,width,actualPostedResponse:true,localizedReason:true,keyboardContainmentAndReturn:true,permissionRevocation:true,noHorizontalOverflow:true,noPageErrors:true,durationMs:Math.round(performance.now()-started),screenshot});await context.close();console.log(locale+' '+width+' posted proof passed');
 }
 assert.equal(await fingerprint(),before);result.noBusinessMutation=true;result.passed=true;
}
main().catch(async e=>{result.passed=false;result.error=f.safe(e,secrets);process.exitCode=1;if(page&&!page.isClosed()){result.failureScreenshot='posted-payroll-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{});}}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}const file='posted-payroll-browser-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error}));await db.$disconnect();});
