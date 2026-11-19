const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const {PrismaClient} = require('@prisma/client'), argon2 = require('argon2'), {chromium} = require('playwright');
const base = __dirname, context = JSON.parse(fs.readFileSync(path.join(base, 'runtime-context.json')));
const url = 'postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public';
if (process.env.HRIS_CORRECTNESS_DATABASE_URL !== url || !context.organizationId.startsWith('hr21browser-') || context.url !== 'http://127.0.0.1:35581') throw Error('Owned test environment required');
const db = new PrismaClient({datasources:{db:{url}}}), org = context.organizationId, user = org + '-manager';
const baseline = process.argv.includes('--baseline'), steps = [], failures = [], browserErrors = [], failedRequests = [];
const resultPath=path.join(base,baseline?'browser-baseline.json':'browser-results.json');
if(fs.existsSync(resultPath))fs.copyFileSync(resultPath,path.join(base,'prior-browser-'+Date.now()+'.json'));
const owned=JSON.parse(fs.readFileSync(path.join(base,'owned-files.json')));
const hashes=()=>Object.fromEntries(owned.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const sourceHashes=hashes();
let browser, page, cleaned = false;
async function main() {
 try {
  assert.equal(await db.organization.count({where:{id:org}}),0);
  const password = crypto.randomBytes(30).toString('hex');
  await db.organization.create({data:{id:org,slug:org,name:'DBakes synthetic browser development',country:'CM',requestedModules:['payroll']}});
  await db.user.create({data:{id:user,email:user+'@example.invalid',name:'Synthetic HR operator',organizationId:org,emailVerified:true,isVerified:true}});
  await db.role.create({data:{organizationId:org,code:user,nameEn:'Synthetic HR role',permissions:['hris.people.read','hris.people.manage','hris.handoff.read','hris.handoff.prepare','EMPLOYEE_SALARY_READ','payroll.contracts.manage'],users:{connect:{id:user}}}});
  await db.account.create({data:{userId:user,accountId:user,providerId:'credential',password:await argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1})}});
  browser = await chromium.launch({headless:true});
  const browserContext = await browser.newContext({baseURL:context.url,viewport:{width:1440,height:1000}});
  await browserContext.route('**/*',route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const login = await browserContext.request.post('/api/auth/sign-in/email',{headers:{Origin:context.url},data:{email:user+'@example.invalid',password},timeout:180000});
  assert.equal(login.status(),200,'Native HTTP login must succeed'); steps.push('native-http-login');
  page = await browserContext.newPage(); page.setDefaultTimeout(40000);
  page.on('pageerror',error=>browserErrors.push(error.message));
  page.on('requestfailed',request=>failedRequests.push(new URL(request.url()).pathname+': '+request.failure()?.errorText));
  await page.goto('/en/dashboard/people/manage',{waitUntil:'domcontentloaded',timeout:240000});
  await page.getByText('Create employee draft',{exact:true}).click();
  const form = page.locator('form').filter({has:page.getByLabel('Employee number',{exact:true})});
  // Wait for the actual client submit handler, not just the streamed server HTML.
  await page.waitForFunction(()=>Array.from(document.forms).some(f=>Object.keys(f).some(k=>k.startsWith('__reactProps')&&typeof f[k]?.onSubmit==='function')),null,{timeout:120000});
  await form.getByLabel('Employee number',{exact:true}).fill('BROWSER-001');
  await form.getByLabel('Employee name',{exact:true}).fill('Synthetic browser employee');
  await form.getByLabel('Employment start date',{exact:true}).fill('2026-01-01');
  await form.getByLabel('Applicable country (2-letter code)',{exact:true}).fill('CM');
  await form.getByRole('button',{name:'Save',exact:true}).click();
  if (baseline) {
   await page.getByText('Could not save. Your entries remain.',{exact:false}).waitFor();
   assert.equal(await page.getByRole('dialog').count(),0); assert.equal(await db.payrollEmployee.count({where:{organizationId:org}}),0);
   await page.screenshot({path:path.join(base,'baseline-no-password-recovery.png'),fullPage:true});
   steps.push('fresh-auth-denial-has-no-recovery-and-no-write');
  } else {
   await page.getByRole('dialog').waitFor();
   await page.getByLabel('Password',{exact:true}).fill('incorrect');
   await page.getByRole('button',{name:'Verify password',exact:true}).click();
   await page.getByText('The password could not be verified. Try again.',{exact:true}).waitFor();
   assert.equal(await page.getByLabel('Password',{exact:true}).inputValue(),'');
   assert.equal(await db.payrollEmployee.count({where:{organizationId:org}}),0); steps.push('wrong-password-cleared-no-write');
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
   assert.equal(await form.getByLabel('Employee name',{exact:true}).inputValue(),'Synthetic browser employee');
   assert.equal(await form.getByRole('button',{name:'Save',exact:true}).evaluate(el=>el===document.activeElement),true); steps.push('cancel-preserves-draft-and-focus');
   await form.getByRole('button',{name:'Save',exact:true}).click();
   await page.getByLabel('Password',{exact:true}).fill(password);
   await page.getByRole('button',{name:'Verify password',exact:true}).click();
   await page.getByRole('dialog').waitFor({state:'hidden'});
   assert.equal(await db.payrollEmployee.count({where:{organizationId:org}}),0); steps.push('verification-does-not-auto-submit');
   await form.getByRole('button',{name:'Save',exact:true}).click();
   await page.getByText('Saved.',{exact:false}).first().waitFor();
   assert.equal(await db.payrollEmployee.count({where:{organizationId:org,employeeNumber:'BROWSER-001'}}),1); steps.push('explicit-retry-saves-one-profile');
   const expire=()=>db.session.updateMany({where:{userId:user},data:{assuranceVerifiedAt:new Date(Date.now()-301000)}});
   await expire();await page.setViewportSize({width:390,height:844});
   await page.goto('/fr/dashboard/people/handoff',{waitUntil:'domcontentloaded',timeout:240000});
   await page.getByRole('heading',{name:'Confirmez votre identité pour continuer'}).waitFor();
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(el=>el.textContent.includes('Vérifier le mot de passe')&&Object.keys(el).some(k=>k.startsWith('__reactProps')&&typeof el[k]?.onClick==='function')),null,{timeout:120000});
   await page.getByRole('button',{name:'Vérifier le mot de passe',exact:true}).click();
   const dialog=page.getByRole('dialog');await dialog.waitFor();
   assert.equal(await page.getByLabel('Mot de passe',{exact:true}).evaluate(el=>el===document.activeElement),true);
   const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=391);
   await page.screenshot({path:path.join(base,'fr-narrow-password-recovery.png')});steps.push('expired-assurance-french-narrow-gate-and-focus');
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   assert.equal(await page.getByRole('button',{name:'Vérifier le mot de passe',exact:true}).evaluate(el=>el===document.activeElement),true);
   await page.getByRole('button',{name:'Vérifier le mot de passe',exact:true}).click();
   await page.getByLabel('Mot de passe',{exact:true}).fill(password);
   await dialog.getByRole('button',{name:'Vérifier le mot de passe',exact:true}).click();
   await page.getByRole('heading',{name:'Transmission des entrées de paie',exact:true}).waitFor();
   assert.ok((await db.session.findFirstOrThrow({where:{userId:user}})).assuranceVerifiedAt.getTime()>Date.now()-60000);steps.push('french-password-confirmation-refreshes-authorized-handoff');
   await page.screenshot({path:path.join(base,'fr-handoff-after-verification.png'),fullPage:true});
   // Revocation after the prompt opened must still deny the subsequent server read.
   await expire();await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(el=>el.textContent.includes('Vérifier le mot de passe')&&Object.keys(el).some(k=>k.startsWith('__reactProps')&&typeof el[k]?.onClick==='function')),null,{timeout:120000});
   await page.getByRole('button',{name:'Vérifier le mot de passe',exact:true}).click();await dialog.waitFor();
   await db.role.updateMany({where:{organizationId:org,code:user},data:{permissions:['hris.people.read']}});
   await page.getByLabel('Mot de passe',{exact:true}).fill(password);
   await dialog.getByRole('button',{name:'Vérifier le mot de passe',exact:true}).click();
   await page.getByRole('heading',{name:'Confirmez votre identité pour continuer'}).waitFor({state:'hidden'});
   await page.getByRole('heading',{name:'Cette page n’est pas accessible avec votre rôle',exact:true}).waitFor();
   assert.equal(await page.getByRole('heading',{name:'Transmission des entrées de paie',exact:true}).count(),0);
   await page.screenshot({path:path.join(base,'fr-revoked-role-denied.png'),fullPage:true});steps.push('verification-does-not-override-revoked-permission');
   await db.role.updateMany({where:{organizationId:org,code:user},data:{permissions:['hris.people.read','hris.people.manage','hris.handoff.read','EMPLOYEE_SALARY_READ']}});
   await db.tenantModuleConfiguration.create({data:{organizationId:org,manifestHash:'synthetic-browser-empty-grants'}});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.getByRole('heading',{name:'Cette page n’est pas accessible avec votre rôle',exact:true}).waitFor();
   assert.equal(await page.getByRole('heading',{name:'Transmission des entrées de paie',exact:true}).count(),0);
   assert.equal(await page.getByRole('button',{name:'Vérifier le mot de passe',exact:true}).count(),0);steps.push('fresh-password-does-not-override-payroll-module-denial');
   await page.screenshot({path:path.join(base,'fr-module-denied.png'),fullPage:true});
  }
  assert.equal(browserErrors.length,0,'No unhandled browser exceptions');assert.deepEqual(hashes(),sourceHashes,'Source must not change during browser verification');
 } catch(e) { failures.push({name:e.name,message:e.message}); if(page){fs.writeFileSync(path.join(base,baseline?'baseline-page.txt':'failure-page.txt'),await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:path.join(base,baseline?'baseline-failure.png':'failure.png'),fullPage:true}).catch(()=>{});} }
 finally {
  await browser?.close();
  try { await db.tenantModuleConfiguration.deleteMany({where:{organizationId:org}}); await db.payrollEmployee.deleteMany({where:{organizationId:org}}); await db.organization.deleteMany({where:{id:org}}); await db.user.deleteMany({where:{id:user}}); assert.equal(await db.organization.count({where:{id:org}}),0); for(const model of ['user','session','account'])assert.equal(await db[model].count({where:model==='user'?{id:user}:{userId:user}}),0); cleaned=true; } catch(e){failures.push({name:'cleanup',message:e.message});}
  await db.$disconnect();
  fs.writeFileSync(resultPath,JSON.stringify({status:failures.length?'FAILED':'PASS_SCOPED',steps,failures,browserErrors,failedRequests,sourceHashes,cleanupComplete:cleaned,completedAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify({steps,failures,cleaned}));process.exitCode=failures.length?1:0;
 }
}
main();
