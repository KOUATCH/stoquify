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
const out=path.join(__dirname,'browser-'+Date.now()+'.json'),result={at:new Date().toISOString(),fixture:f.organizationId,steps:[],origin:app.origin};
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
 browser=await chromium.launch({headless:true});result.browser=browser.version();
 for(const name of ['EMPTY_EN.png','IMPORTED_FR_MOBILE.png']){const previous=path.join(__dirname,name);if(fs.existsSync(previous))fs.renameSync(previous,path.join(__dirname,Date.now()+'-'+name));}
 const maker=await login('maker');page=maker.p;await expect(panel(page)).toBeVisible();await expect(page.getByRole('heading',{name:'No batch selected'})).toBeVisible();result.before=await snapshot();assert.deepEqual(result.before,{customers:0,suppliers:0,items:0,movements:0,journals:0,postings:0});
 await page.screenshot({path:path.join(__dirname,'EMPTY_EN.png'),fullPage:true});step('Authenticated empty guidance; five outstanding opening requirements');
 // Reject an intentionally incomplete header without creating masters; retain it.
 await stage(page,'CUSTOMER',f.csv.CUSTOMER,'p03-incomplete.csv');await batch('CUSTOMER','BLOCKED');assert.deepEqual(await snapshot(),result.before);step('Rejected incomplete mapping retained; zero domain writes');
 const fixtureRows={CUSTOMER:[{code:'customer-a',name:'Synthetic customer'}],SUPPLIER:[{code:'supplier-a',name:'Synthetic supplier'}],ITEM:[{sku:'item-each',nameEn:'Synthetic EA',nameFr:'Article EA'},{sku:'item-weight',nameEn:'Synthetic KG',nameFr:'Article KG'}]};
 let checker;
 for(const targetName of ['CUSTOMER','SUPPLIER','ITEM']){
   await choose(page,targetName);
   const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:messages.actions.downloadTemplate,exact:true}).click();const download=await downloadPromise;
   const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);const template=Buffer.concat(chunks).toString('utf8');
   const headers=template.trim().split(/\r?\n/)[0].replace(/^\uFEFF/,'').split(',');
   const csv=headers.join(',')+'\n'+fixtureRows[targetName].map(row=>headers.map(key=>row[key]??({paymentTerms:'30',creditLimit:'0',preferredLocale:'EN',isActive:'true'}[key]??'')).join(',')).join('\n')+'\n';
   fs.writeFileSync(path.join(__dirname,'P03-'+targetName+'.csv'),csv);
   await stage(page,targetName,csv,'p03-'+targetName+'.csv');const pending=await batch(targetName,'VALIDATED');
   await expect(panel(page)).toContainText('Proposed — validate and approve');
   let actor=maker;
   if(pending.riskLevel==='HIGH'){
     await expect(page.getByRole('button',{name:messages.actions.recordApproval,exact:true})).toBeDisabled();
     // Exercise fresh server denial, not just a disabled control, with captured action ID.
     const evidenceDownloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:messages.actions.exportEvidence,exact:true}).click();
     const evidenceDownload=await evidenceDownloadPromise,evidenceChunks=[];for await(const chunk of await evidenceDownload.createReadStream())evidenceChunks.push(chunk);
     const evidence=JSON.parse(Buffer.concat(evidenceChunks).toString('utf8'));fs.writeFileSync(path.join(__dirname,'P03-'+targetName+'-validation-evidence-'+Date.now()+'.json'),JSON.stringify(evidence,null,2));
     assert(capturedApproval);const payload=[{target:targetName,batchId:pending.id,expectedApprovalDigest:evidence.manifest.approval.digest}];
     const denied=await maker.c.request.post(app.origin+'/en/dashboard/settings/data-onboarding',{data:JSON.stringify(payload),headers:{'next-action':capturedApproval,'Content-Type':'text/plain;charset=UTF-8',Origin:app.origin},timeout:180000});
     const deniedText=await denied.text();assert(deniedText.includes('requires approval by a different authorized user'),'Server must reject the current valid digest for self-approval');assert.equal((await db.onboardingImportBatch.findUniqueOrThrow({where:{id:pending.id}})).approvedById,null);
     if(!checker)checker=await login('checker');else await checker.p.reload({waitUntil:'domcontentloaded',timeout:300000});
     actor=checker;await choose(actor.p,targetName);step('High-risk '+targetName+' self-approval denied by UI and actual server action');
   }
   await actor.p.getByRole('checkbox').check();
   const approvalRequest=actor.p.waitForRequest(req=>req.method()==='POST'&&Boolean(req.headers()['next-action'])&&(req.postData()||'').includes('expectedApprovalDigest'));
   await actor.p.getByRole('button',{name:messages.actions.recordApproval,exact:true}).click();capturedApproval=(await approvalRequest).headers()['next-action'];await batch(targetName,'APPROVED');
   await expect(panel(actor.p)).toContainText('Reviewed — import still required');
   await actor.p.getByRole('button',{name:messages.actions.commit,exact:true}).click();await batch(targetName,'COMMITTED');
   // Read a new route response, so success never depends on optimistic client state.
   await page.reload({waitUntil:'domcontentloaded',timeout:300000});await expect(panel(page)).toContainText('Imported masters only');
   await expect(panel(page).getByText('Not verified here',{exact:true})).toHaveCount(3);await expect(panel(page).getByText('External opening import unsupported',{exact:true})).toHaveCount(2);
   step(targetName+' proposed/reviewed/imported through actual actions; opening stays unverified',{batchId:pending.id});
 }
 result.after=await snapshot();assert.deepEqual(result.after,{customers:1,suppliers:1,items:2,movements:0,journals:0,postings:0});
 const sourceRows=await db.onboardingImportRow.findMany({where:{organizationId:f.organizationId,committedRecordId:{not:null}},select:{businessKey:true,sourceRowHash:true,committedRecordId:true}});assert.equal(sourceRows.length,4);assert(sourceRows.every(row=>row.sourceRowHash&&row.committedRecordId));result.retainedRows=sourceRows;
 await choose(page,'ITEM');const itemCsv=fs.readFileSync(path.join(__dirname,'P03-ITEM.csv'),'utf8'),beforeBatches=await db.onboardingImportBatch.count({where:{organizationId:f.organizationId}});
 await stage(page,'ITEM',itemCsv,'p03-ITEM.csv');await expect(page.getByRole('status').filter({hasText:messages.notices.batchReplayed})).toBeVisible();assert.equal(await db.onboardingImportBatch.count({where:{organizationId:f.organizationId}}),beforeBatches);assert.deepEqual(await snapshot(),result.after);step('Same-file replay preserves batch and four masters without stock or ledger effects');
 const foreign=await login('foreign');await expect(panel(foreign.p)).toBeVisible();await expect(panel(foreign.p)).not.toContainText('p03-');
 const committed=await batch('CUSTOMER','COMMITTED');
 const response=await foreign.c.request.post(app.origin+'/en/dashboard/settings/data-onboarding',{data:JSON.stringify([{target:'CUSTOMER',batchId:committed.id,expectedApprovalDigest:committed.approvalDigest,organizationId:f.organizationId}]),headers:{'next-action':capturedApproval,'Content-Type':'text/plain;charset=UTF-8',Origin:app.origin},timeout:180000});
 assert.match(await response.text(),/not found/i);assert.deepEqual(await snapshot(),result.after);step('Foreign tenant cannot read evidence or mutate retained source batch');
 const denied=await login('denied');await expect(denied.p.getByText('is not available for this role',{exact:false})).toBeVisible();await expect(panel(denied.p)).toHaveCount(0);step('Unauthorized role cannot load onboarding evidence');
 await page.goto(app.origin+'/fr/dashboard/settings/data-onboarding',{waitUntil:'domcontentloaded',timeout:300000});await page.setViewportSize({width:390,height:844});
 const frPanel=page.getByRole('region',{name:'Positions d’ouverture : revue encore requise'});await expect(frPanel).toBeVisible();await expect(frPanel.getByText('Import d’ouverture externe non pris en charge',{exact:true})).toHaveCount(2);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 const summary=frPanel.locator('summary').first();await summary.focus();await page.keyboard.press('Enter');await expect(frPanel.locator('details').first()).toHaveAttribute('open','');
 const link=frPanel.getByRole('link').first();await link.focus();await expect(link).toBeFocused();assert((await link.getAttribute('href')).startsWith('/fr/dashboard/'));
 await page.screenshot({path:path.join(__dirname,'IMPORTED_FR_MOBILE.png'),fullPage:true});step('French mobile reflow and keyboard evidence disclosure/navigation',{viewport:{width:390,height:844}});
 result.status='PASS';
}
main().catch(async error=>{result.status='FAIL';result.error=error.stack;if(page)await page.screenshot({path:path.join(__dirname,'FAIL-'+Date.now()+'.png'),fullPage:true}).catch(()=>{});process.exitCode=1;console.error(error.message)}).finally(async()=>{fs.writeFileSync(out,JSON.stringify(result,null,2));for(const c of contexts)await c.close();if(browser)await browser.close();await db.$disconnect();});
