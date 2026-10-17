const { fixture }=require('./verify-signoff-request-order.cjs'),{add}=require('./verify-additional-sources.cjs');
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['components/finance/ReconciliationPreparationWorkbench.tsx','components/finance/ReconciliationSignReview.tsx','actions/payments/reconciliation-preparation.actions.ts','services/reconciliation/reconciliation-additional-sources.service.ts','services/reconciliation/reconciliation-run-preparation.service.ts','services/reconciliation/reconciliation-run-preparation-evidence.ts','services/reconciliation/payment-reconciliation-run.service.ts','messages/en.json','messages/fr.json'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourceBefore:hashes(),journeys:[]};let browser,page;
async function journey(locale){
 const x=await fixture('browser-'+locale+'-'+stamp);await add(x);
 const m=JSON.parse(fs.readFileSync(path.join(f.root,'messages/'+locale+'.json'),'utf8')).paymentReconciliationWorkbench,t=m.runPreparation;
 const row={locale,screenshots:[],errors:[]};report.journeys.push(row);
 const permissions=['dashboard.read','finance.read','payments.reconciliation.read','payments.reconciliation.run','payments.reconciliation.sign','accounting.journal.read'];
 const role=await db.role.create({data:{organizationId:x.org.id,code:'administrator',nameEn:'Owned recovery verifier',permissions,users:{connect:[{id:x.other.id},{id:x.signer.id}]}}});
 const contexts=[];
 async function login(user){
  const password='Owned-recovery-'+crypto.randomUUID()+'!',hashed=await hashPassword(password);secrets.push(password);
  await db.user.update({where:{id:user.id},data:{password:hashed,isVerified:true,emailVerified:true}});
  await db.account.create({data:{userId:user.id,accountId:user.id,providerId:'credential',password:hashed}});
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},locale:locale==='fr'?'fr-FR':'en-GB',reducedMotion:'reduce'});contexts.push(context);
  context.setDefaultTimeout(60000);context.setDefaultNavigationTimeout(180000);
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
  page=await context.newPage();page.on('pageerror',e=>row.errors.push(f.safe(e,secrets)));return {context,password};
 }
 const detail=()=>page.locator('section').filter({has:page.getByRole('heading',{name:t.additional.title,exact:true})}).last();
 async function shot(label){const name='additional-browser-'+stamp+'-'+locale+'-'+label+'.png';await page.screenshot({path:path.join(__dirname,name),animations:'disabled'});row.screenshots.push(name);}
 try{
  const actor=await login(x.other),start=Date.now();await page.goto(base+'/'+locale+'/dashboard/finance/reconciliation');
  await expect(page.getByRole('button',{name:t.open,exact:true})).toBeVisible();row.entryMs=Date.now()-start;
  await page.getByRole('button',{name:t.open,exact:true}).focus();await page.keyboard.press('Enter');
  await page.getByRole('button',{name:t.review,exact:true}).click();
  await expect(page.getByRole('button',{name:t.additional.preview,exact:true})).toBeEnabled();
  const previewStart=Date.now();await page.getByRole('button',{name:t.additional.preview,exact:true}).focus();await page.keyboard.press('Enter');
  await expect(detail().getByText(t.additional.ready,{exact:true})).toBeVisible();row.previewMs=Date.now()-previewStart;
  await expect(detail().getByRole('region',{name:t.additional.preview,exact:true})).toBeFocused();
  for(const width of [320,768,1440]){await page.setViewportSize({width,height:1000});await detail().scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('preview-'+width);}
  await detail().getByLabel(t.reason,{exact:true}).fill(locale==='fr'?'Revue des sources supplémentaires conservées':'Reviewed retained additional sources');
  await detail().getByRole('button',{name:t.additional.confirm,exact:true}).click();
  await expect(detail().getByLabel(m.manualMatch.passwordLabel,{exact:true})).toBeFocused();
  const key='stoquify:run-preparation:v1:'+x.org.id+':'+x.other.id+':'+x.run.runId;
  const saved=await page.evaluate(k=>sessionStorage.getItem(k),key),draft=JSON.parse(saved);assert.equal(draft.operation,'additional');
  await detail().getByLabel(m.manualMatch.passwordLabel,{exact:true}).fill(actor.password);
  await detail().getByRole('button',{name:m.suspenseWorkflow.review.authenticate,exact:true}).click();
  await expect(detail().getByRole('button',{name:t.additional.retry,exact:true})).toBeEnabled();
  let interrupted=false;
  await page.route('**/*',async route=>{const request=route.request();if(!interrupted&&request.method()==='POST'&&request.postData()?.includes(draft.pending.idempotencyKey)){interrupted=true;await route.fetch();await route.fulfill({status:503,contentType:'text/plain',body:'Owned response interruption after server processing'});}else await route.fallback();});
  await detail().getByRole('button',{name:t.additional.retry,exact:true}).click();await expect(detail().getByText(t.failed,{exact:true})).toBeVisible();
  assert.equal(interrupted,true);assert.equal(await db.matchRecord.count({where:{organizationId:x.org.id}}),2);
  assert.equal(await page.evaluate(k=>sessionStorage.getItem(k),key),saved);row.committedResponseLoss=true;
  await page.reload();await expect(detail().getByRole('button',{name:t.additional.retry,exact:true})).toBeEnabled();
  await detail().getByRole('button',{name:t.additional.retry,exact:true}).click();
  await expect(detail().getByRole('button',{name:t.additional.confirm,exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)).pending,key)).toBeNull();
  const receipt=await db.paymentReconciliationInboxItem.findFirstOrThrow({where:{organizationId:x.org.id,idempotencyKey:'reconciliation-additional-sources:'+draft.pending.idempotencyKey}});
  await expect(detail().getByText(t.additional.receipt.replace('{id}',receipt.id),{exact:true})).toBeVisible();
  assert.equal(await db.ledgerAuditEvent.count({where:{organizationId:x.org.id,action:'RECONCILIATION_ADDITIONAL_SOURCES'}}),1);row.exactRetryAndHistory=true;await shot('recovered');
  await detail().getByRole('button',{name:t.preview,exact:true}).click();
  const preparing=page.getByRole('region',{name:t.reviewTitle,exact:true});await expect(preparing.getByText(t.ready,{exact:true})).toBeVisible();
  await preparing.getByRole('button',{name:t.confirm,exact:true}).click();
  await expect.poll(async()=>(await db.reconciliationRun.findUniqueOrThrow({where:{id:x.run.runId}})).status).toBe('READY_FOR_SIGNOFF');
  await preparing.getByRole('button',{name:m.signReview.open,exact:true}).click();
  await expect(page.getByRole('region',{name:m.signReview.title,exact:true}).getByText(m.signReview.independent,{exact:true})).toBeVisible();row.operatorSignDenied=true;
  const signer=await login(x.signer);await page.goto(base+'/'+locale+'/dashboard/finance/reconciliation?reviewRun='+x.run.runId);
  const signing=page.getByRole('region',{name:m.signReview.title,exact:true});await expect(signing.getByText(m.signReview.ready,{exact:true})).toBeVisible();
  await signing.getByRole('button',{name:m.signReview.confirm,exact:true}).click();await signing.getByLabel(m.manualMatch.passwordLabel,{exact:true}).fill(signer.password);
  await signing.getByRole('button',{name:m.suspenseWorkflow.review.authenticate,exact:true}).click();
  await expect(signing.getByRole('button',{name:m.signReview.retry,exact:true})).toBeEnabled();await signing.getByRole('button',{name:m.signReview.retry,exact:true}).click();
  await expect.poll(async()=>(await db.reconciliationRun.findUniqueOrThrow({where:{id:x.run.runId}})).status).toBe('SIGNED');await shot('signed');row.independentSign=true;
  assert.equal(await db.journalEntry.count({where:{organizationId:x.org.id}}),0);
  await db.role.update({where:{id:role.id},data:{permissions:['dashboard.read','finance.read','payments.reconciliation.read','accounting.journal.read']}});
  await page.goto(base+'/'+locale+'/dashboard/finance/reconciliation');await page.getByRole('button',{name:t.open,exact:true}).click();
  await page.getByLabel(t.view,{exact:true}).selectOption('ALL');await page.getByRole('button',{name:t.search,exact:true}).click();await page.getByRole('button',{name:t.review,exact:true}).click();
  await expect(page.getByRole('button',{name:t.additional.preview,exact:true})).toBeDisabled();row.revokedWriteDenied=true;
  assert.deepEqual(row.errors,[]);row.passed=true;console.log(JSON.stringify({locale,passed:true,entryMs:row.entryMs}));
 }catch(error){row.error=f.safe(error,secrets);row.stack=String(error.stack).split('\n').slice(0,5);if(page&&!page.isClosed()){row.failureText=await page.locator('main').last().innerText({timeout:5000}).then(s=>f.safe(s,secrets)).catch(()=>'Unavailable');await shot('failed').catch(()=>{});}throw error;}
 finally{for(const context of contexts)await context.close();}
}
(async()=>{await helper.withClient(f.target,helper.assertOwned);browser=await chromium.launch({headless:true});for(const locale of ['en','fr'])await journey(locale);report.passed=true;})()
.catch(error=>{report.passed=false;report.error=f.safe(error,secrets);process.exitCode=1;}).finally(async()=>{await browser?.close();report.sourceAfter=hashes();report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);const output=path.join(__dirname,'additional-browser-'+stamp+'.json');fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({output,passed:report.passed,error:report.error,sourceStable:report.sourceStable}));await db.$disconnect();process.exit(process.exitCode||0);});
