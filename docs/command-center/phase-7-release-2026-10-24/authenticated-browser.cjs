const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{PrismaClient}=require('@prisma/client');
const {state,redact}=require('./environment.cjs');
const s=state(),fixture=JSON.parse(fs.readFileSync(path.join(s.work,'fixture-private.json')));
const db=new PrismaClient({datasources:{db:{url:s.url}}});
const report={startedAt:new Date().toISOString(),origin:s.origin,database:s.database,realAuthentication:true,actionMocks:false,checks:[],errors:[],blockedExternalRequests:0};
let browser,page;
async function login(context,email,locale='en'){
 const p=await context.newPage();p.setDefaultTimeout(60000);p.setDefaultNavigationTimeout(180000);
 await p.goto(s.origin+'/'+locale+'/login?returnUrl=/dashboard/manager-action-center');
 await p.locator('#email').fill(email);await p.locator('#password').fill(fixture.password);
 await p.locator('form button[type="submit"]').click();
 await p.waitForURL(/\/dashboard(?:\?|\/|$)/,{timeout:180000});return p;
}
async function panelFor(locale='en'){const panel=page.getByRole('region',{name:locale==='fr'?'Travail et suivi':'Work & follow-up'}).first();await panel.getByRole('heading',{level:3}).first().waitFor({timeout:180000});return panel}
async function center(name,locale='en'){await page.goto(s.origin+'/'+locale+'/dashboard/'+name);return panelFor(locale)}
async function main(){
 const identity=await db.$queryRaw`SELECT current_database() AS name,current_setting('data_directory') AS directory`;assert.equal(identity[0].name,s.database);assert.equal(path.resolve(identity[0].directory).toLowerCase(),s.cluster.toLowerCase());
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===s.origin||u.protocol==='data:')return route.continue();report.blockedExternalRequests++;return route.abort()});
 context.on('page',p=>p.on('pageerror',e=>report.errors.push(e.message)));
 page=await login(context,fixture.managerEmail);await panelFor();assert.ok(await db.session.count({where:{userId:fixture.managerId}}));report.checks.push('Browser credential login created a real BetterAuth session');
 let panel;let before;
 if(!process.argv.includes('--outcomes')){
 panel=await center('manager-action-center');
 for(const name of ['Stock availability','Overdue receiving']){
  const row=panel.getByRole('article').filter({has:page.getByRole('heading',{name,exact:true})});
  await row.getByLabel('Follow-up date (UTC)').fill('2026-11-01');await row.getByRole('button',{name:'Save follow-up',exact:true}).click();await panel.getByText(/Follow-up saved/).waitFor();
 }
 before=await db.$queryRaw`SELECT "id","sourceKey","revision","ownerId","condition","dueAt" FROM command_center_occurrences WHERE "organizationId"=${fixture.organizationId} AND "scopeKey"='TENANT' AND "sourceKey" IN ('stockout','receiving') ORDER BY "sourceKey"`;
 assert.equal(before.length,2);assert.ok(before.every(r=>r.ownerId===fixture.managerId&&r.condition==='ACTIVE'));report.checks.push('Real server actions persisted assignment and UTC deadline for both source families');
 panel=await center('daily-digest');await panel.getByRole('heading',{name:'Stock availability',exact:true}).waitFor();await panel.getByRole('heading',{name:'Overdue receiving',exact:true}).waitFor();report.checks.push('Personal Digest reads the real persisted assignments');
 panel=await center('owner-war-room');if(await panel.getByRole('button',{name:'Record review of these follow-ups',exact:true}).count())await panel.getByRole('button',{name:'Record review of these follow-ups',exact:true}).click();await panel.getByRole('button',{name:'Review recorded for the current evidence.',exact:true}).waitFor();report.checks.push('Owner view persists an evidence-bound review through its real protected action');
 const receiptBefore=await db.$queryRaw`SELECT count(*)::int AS n FROM command_center_review_receipts WHERE "organizationId"=${fixture.organizationId}`;assert.ok(receiptBefore[0].n>0);
 await page.screenshot({path:path.join(__dirname,'authenticated-before.png'),fullPage:false});
 // Native source handoff first, then the selected order's existing receive tab.
 const receiving=panel.getByRole('article').filter({has:page.getByRole('heading',{name:'Overdue receiving',exact:true})});await receiving.getByRole('link',{name:'Open source',exact:true}).click();await page.waitForURL(/\/purchase-orders(?:\?|$)/);
 await page.goto(s.origin+'/en/dashboard/purchase-orders/'+fixture.purchaseOrderId+'?tab=receive');
 const dialog=page.getByRole('dialog',{name:'Receive goods',exact:true});await dialog.waitFor({timeout:180000});
 await dialog.locator('#quantity-'+fixture.purchaseOrderLineId).fill('1');await dialog.locator('#receiving-inspection').selectOption('PASSED');
 await dialog.getByRole('button',{name:'Review receipt',exact:true}).click();await dialog.getByRole('button',{name:'Confirm decision',exact:true}).click();
 await dialog.getByText('Stock: receipt movements verified',{exact:true}).waitFor({timeout:120000});
 assert.equal((await db.purchaseOrder.findUniqueOrThrow({where:{id:fixture.purchaseOrderId}})).status,'RECEIVED');assert.equal((await db.inventoryLevel.findUniqueOrThrow({where:{id:fixture.levelId}})).quantityAvailable.toString(),'1');
 assert.equal(await db.goodsReceipt.count({where:{purchaseOrderId:fixture.purchaseOrderId}}),1);report.checks.push('Real purchase receiving review/confirm created one receipt and stock movement; no direct fixture completion update');
 await page.screenshot({path:path.join(__dirname,'authenticated-receiving.png'),fullPage:false});
 }else{
 const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'authenticated-source-results.json')));assert.ok(prior.checks.some(c=>c.startsWith('Real purchase receiving')));report.checks.push(...prior.checks.slice(1,5));report.continuationOf='authenticated-source-results.json';before=await db.$queryRaw`SELECT id FROM command_center_occurrences WHERE "organizationId"=${fixture.organizationId} AND "scopeKey"='TENANT' AND "sourceKey" IN ('stockout','receiving') ORDER BY "sourceKey"`;
 assert.equal((await db.purchaseOrder.findUniqueOrThrow({where:{id:fixture.purchaseOrderId}})).status,'RECEIVED');assert.equal(await db.goodsReceipt.count({where:{purchaseOrderId:fixture.purchaseOrderId}}),1);
 }
 for(const locale of ['en','fr'])for(const name of ['manager-action-center','daily-digest','owner-war-room']){
  panel=await center(name,locale);const clear=locale==='fr'?'Condition levée à la source':'Source condition cleared';assert.equal(await panel.getByText(new RegExp(clear)).count(),2);
  if(name==='owner-war-room')assert.ok(await panel.getByRole('button',{name:locale==='fr'?'Enregistrer la revue de ces suivis':'Record review of these follow-ups',exact:true}).isEnabled());
  await page.setViewportSize({width:locale==='fr'?390:1440,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await panel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'authenticated-'+name+'-'+locale+'.png'),fullPage:false});report.checks.push(locale+' '+name+': authoritative source clearance and review invalidation visible');
 }
 const after=await db.$queryRaw`SELECT "id","sourceKey","condition","ownerId" FROM command_center_occurrences WHERE "organizationId"=${fixture.organizationId} AND "scopeKey"='TENANT' AND "sourceKey" IN ('stockout','receiving') ORDER BY "sourceKey"`;
 assert.deepEqual(after.map(r=>r.id),before.map(r=>r.id));assert.ok(after.every(r=>r.condition==='CLEAR'));report.occurrences=after;
 const fresh=await browser.newContext({viewport:{width:1440,height:1000}});await fresh.route('**/*',r=>new URL(r.request().url()).origin===s.origin?r.continue():r.abort());page=await login(fresh,fixture.managerEmail);panel=await panelFor();assert.equal(await panel.getByText(/Source condition cleared/).count(),2);report.checks.push('A fresh browser context and new authenticated session retain the same source-confirmed outcomes');
 await page.goto(s.origin+'/en/dashboard/owner-war-room?followUpLocation='+fixture.foreignLocationId);panel=page.getByRole('region',{name:'Work & follow-up'}).first();await panel.getByText(/Follow-ups are unavailable/).waitFor();assert.equal(await panel.getByRole('article').count(),0);await panel.getByRole('button',{name:'Reset follow-up scope'}).click();await panel.getByRole('heading',{name:'Stock availability',exact:true}).waitFor();report.checks.push('Foreign location request denied without private rows; scope reset recovers');
 const sessions=await db.session.findMany({where:{userId:fixture.managerId},select:{id:true}});await db.session.deleteMany({where:{userId:fixture.managerId}});await panel.getByRole('button',{name:'Refresh follow-ups',exact:true}).click();await panel.getByText(/Follow-ups are unavailable/).waitFor();assert.equal(await panel.getByRole('article').count(),0);report.checks.push('Revoked real sessions deny further reads and clear private follow-up rows');report.revokedSyntheticSessionCount=sessions.length;
 assert.deepEqual(report.errors,[]);report.passed=true;
}
main().catch(async e=>{report.passed=false;report.failure=redact(e.stack);if(page){report.failureUrl=page.url();report.failureText=(await page.locator('body').innerText().catch(()=>'' )).slice(0,6000);await page.screenshot({path:path.join(__dirname,'authenticated-failure.png'),fullPage:false}).catch(()=>{})}process.exitCode=1}).finally(async()=>{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'authenticated-results.json'),JSON.stringify(report,null,2));await browser?.close();await db.$disconnect();console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failure:report.failure?.split('\n')[0]}))});
