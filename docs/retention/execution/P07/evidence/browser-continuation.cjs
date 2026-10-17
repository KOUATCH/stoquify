// Actual Next route/actions + synthetic DB. No migration wrapper or mocked service.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/J COMPUTER/AppData/Local/ms-playwright';
const {chromium}=require('playwright'),{PrismaClient}=require('@prisma/client');
const expect=require('@playwright/test').expect.configure({timeout:90000});
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'));
const f=read('BROWSER_FIXTURE.json'),target=read('DATABASE_TARGET.json'),app=read('APPLICATION_TARGET.json');
assert.equal(app.origin,'http://127.0.0.1:3188');assert.equal(app.database,target.database);assert.match(target.database,/^stoquify_retention_p07_20261017_[a-f0-9]+$/);assert.equal(target.host,'localhost');
const db=new PrismaClient({datasources:{db:{url:`postgresql://${target.user}@localhost:${target.port}/${target.database}?schema=public`}}});
const root=path.resolve(__dirname,'../../../../..');
const messages=JSON.parse(fs.readFileSync(path.join(root,'messages/en.json'),'utf8')).masterDataOnboarding;
const out=path.join(__dirname,'browser-continuation-'+Date.now()+'.json'),result={at:new Date().toISOString(),fixture:f.organizationId,steps:[],origin:app.origin};
let browser,contexts=[],page,capturedApproval;
const step=(name,data={})=>{result.steps.push({name,...data});console.log(name);fs.writeFileSync(out,JSON.stringify(result,null,2));};
const panel=p=>p.getByRole('region',{name:'Opening positions: review still required'});
async function login(kind){
  const c=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(c);c.setDefaultTimeout(90000);
  await c.route('**/*',route=>new URL(route.request().url()).origin===app.origin?route.continue():route.abort());
  const r=await c.request.post(app.origin+'/api/auth/sign-in/email',{data:{email:f.actors[kind].email,password:'Retention-Synthetic-Only-2026!',rememberMe:true},headers:{Origin:app.origin},timeout:300000});assert.equal(r.status(),200);
  const p=await c.newPage();await p.goto(app.origin+'/en/dashboard/settings/data-onboarding',{waitUntil:'domcontentloaded',timeout:600000});return{c,p};
}
async function choose(p,target){await p.waitForLoadState('networkidle',{timeout:180000});await p.locator('#master-data-target').selectOption(target);}
async function stage(p,target,content,name){await choose(p,target);await p.locator('#master-data-file').setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(content)});await p.getByRole('button',{name:messages.actions.runValidation,exact:true}).click();}
async function batch(target,status){await expect.poll(async()=>db.onboardingImportBatch.count({where:{organizationId:f.organizationId,target,status}})).toBeGreaterThan(0);return db.onboardingImportBatch.findFirstOrThrow({where:{organizationId:f.organizationId,target,status},orderBy:{createdAt:'desc'}});}
async function snapshot(){const where={organizationId:f.organizationId};return{customers:await db.customer.count({where}),suppliers:await db.supplier.count({where}),items:await db.item.count({where}),movements:await db.inventoryTransaction.count({where}),journals:await db.journalEntry.count({where}),postings:await db.ledgerPostingBatch.count({where})};}

async function main(){
 browser=await chromium.launch({headless:true});result.browser=browser.version();const maker=await login('maker');page=maker.p;
 await expect(panel(page)).toBeVisible();await choose(page,'ITEM');
 await expect(panel(page)).toContainText('Blocked — inspect issues or recover the original batch');
 const retained=await db.onboardingImportBatch.findFirstOrThrow({where:{organizationId:f.organizationId,target:'ITEM'}});
 assert.equal(retained.lastSafeErrorCode,'DOMAIN_WRITE_RETRY_REQUIRED');assert.equal(retained.status,'APPROVED');assert.notEqual(retained.approvedById,retained.uploadedById);
 const expected={customers:1,suppliers:1,items:0,movements:0,journals:0,postings:0};assert.deepEqual(await snapshot(),expected);
 const batchesBefore=await db.onboardingImportBatch.count({where:{organizationId:f.organizationId}});
 await page.getByRole('button',{name:messages.actions.commit,exact:true}).click();await expect(page.getByRole('alert').filter({hasText:messages.notices.operationFailed})).toBeVisible();
 await page.getByRole('button',{name:'Refresh evidence',exact:true}).click();await expect(panel(page)).toContainText('Blocked — inspect issues or recover the original batch');
 assert.deepEqual(await snapshot(),expected);assert.equal(await db.onboardingImportBatch.count({where:{organizationId:f.organizationId}}),batchesBefore);
 step('Existing item import blocker remains visible after original-batch retry and refresh; no domain writes or new batch',{itemBatch:retained.id});
 await stage(page,'CUSTOMER',fs.readFileSync(path.join(__dirname,'P03-CUSTOMER.csv'),'utf8'),'p03-CUSTOMER.csv');await expect(page.getByRole('status').filter({hasText:messages.notices.batchReplayed})).toBeVisible();assert.deepEqual(await snapshot(),expected);step('Successful customer master replay remains idempotent beside blocked item import');
 const exportRequest=page.waitForRequest(req=>req.method()==='POST'&&Boolean(req.headers()['next-action'])&&(req.postData()||'').includes('batchId'));
 const download=page.waitForEvent('download');await page.getByRole('button',{name:messages.actions.exportEvidence,exact:true}).click();const exportAction=(await exportRequest).headers()['next-action'];await download;
 const customer=await batch('CUSTOMER','COMMITTED');const foreign=await login('foreign');await expect(panel(foreign.p)).toBeVisible();await expect(panel(foreign.p)).not.toContainText(customer.id);
 const response=await foreign.c.request.post(app.origin+'/en/dashboard/settings/data-onboarding',{data:JSON.stringify([{target:'CUSTOMER',batchId:customer.id,organizationId:f.organizationId}]),headers:{'next-action':exportAction,'Content-Type':'text/plain;charset=UTF-8',Origin:app.origin},timeout:180000});
 const denial=await response.text();assert(/not found/i.test(denial),'Foreign evidence export must be denied');assert.deepEqual(await snapshot(),expected);step('Foreign tenant cannot read the retained customer batch through page or actual evidence action');
 const denied=await login('denied');await expect(denied.p.getByText('is not available for this role',{exact:false})).toBeVisible();await expect(panel(denied.p)).toHaveCount(0);step('Unauthorized role denied before onboarding evidence is rendered');
 await page.goto(app.origin+'/fr/dashboard/settings/data-onboarding',{waitUntil:'domcontentloaded',timeout:300000});await page.waitForLoadState('networkidle',{timeout:180000});await page.setViewportSize({width:390,height:844});
 const frPanel=page.getByRole('region',{name:'Positions d’ouverture : revue encore requise'});await expect(frPanel).toBeVisible();await expect(frPanel.getByText('Import d’ouverture externe non pris en charge',{exact:true})).toHaveCount(2);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const summary=frPanel.locator('summary').first();await summary.focus();await page.keyboard.press('Enter');await expect(frPanel.locator('details').first()).toHaveAttribute('open','');
 const link=frPanel.getByRole('link').first();await link.focus();await expect(link).toBeFocused();assert((await link.getAttribute('href')).startsWith('/fr/dashboard/'));
 await frPanel.screenshot({path:path.join(__dirname,'GUIDANCE_FR_MOBILE.png')});result.after=await snapshot();step('French mobile, keyboard disclosure/focus and locale-aware links');
 result.status='PASS';result.scope='Independent checks only; full master import remains PARTIAL due item image contract';
}
main().catch(async error=>{result.status='FAIL';result.error=error.stack;if(page)await page.screenshot({path:path.join(__dirname,'CONTINUATION_FAIL-'+Date.now()+'.png'),fullPage:true}).catch(()=>{});process.exitCode=1;console.error(error.message)}).finally(async()=>{fs.writeFileSync(out,JSON.stringify(result,null,2));for(const c of contexts)await c.close();if(browser)await browser.close();await db.$disconnect();});
