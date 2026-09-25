const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const organizationId = 'workflow_pos_cart_concurrency_2c6e1737-7a42-488f-acf7-249115781b88', base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/pos/pos-read-result.ts','actions/pos/cart.actions.ts','actions/pos/catalog.actions.ts','actions/pos/session.actions.ts','actions/pos/receipt-token.actions.ts','hooks/posHooks/usePOSReadQuery.ts','hooks/posHooks/usePosOperations.ts','components/pos/ProfessionalPOSSystem.tsx','messages/en.json','messages/fr.json'];
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report = { at:new Date().toISOString(),sourcesBefore:sources(),browser:[],scope:'Owned local app and real server actions. HTTP503 injection proves UI transport recovery, not database-outage handling. No checkout or provider operation.' };
let browser;
async function main() {
  await f.helper.withClient(f.target,f.helper.assertOwned);
  assert.ok((await db.organization.findUniqueOrThrow({where:{id:organizationId}})).name.startsWith(f.helper.prefix));
  const user = await db.user.findFirstOrThrow({where:{organizationId}}), sale=await db.salesOrder.findFirstOrThrow({where:{organizationId,createdById:user.id,status:'DRAFT'},include:{lines:true}});
  const password='Owned-read-'+crypto.randomUUID()+'!';secrets.push(password);const passwordHash=await hashPassword(password);
  await db.user.update({where:{id:user.id},data:{password:passwordHash,isActive:true,isVerified:true,emailVerified:true}});
  await db.account.updateMany({where:{userId:user.id,providerId:'credential'},data:{password:passwordHash}});
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  try {
    await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
    for(const locale of ['en','fr']) {
      const page=await context.newPage(),sample={locale,pageErrors:[],screenshots:[]};report.browser.push(sample);
      page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);page.on('pageerror',e=>sample.pageErrors.push(f.safe(e,secrets)));
      const copy=require(path.join(f.root,'messages',locale+'.json')).pos,shared=require(path.join(f.root,'lib/dashboard/presentation.ts')).dashboardSharedCopy[locale].error;
      const started=Date.now();await page.goto(base+'/'+locale+'/dashboard/pos');
      let row=page.getByTestId('pos-cart-line').first(),quantity=row.getByRole('spinbutton');await expect(quantity).toBeVisible();sample.readyMs=Date.now()-started;
      const before=String((await db.salesOrderLine.findUniqueOrThrow({where:{id:sale.lines[0].id}})).quantity),draft=locale==='en'?'7':'8';
      await quantity.fill(draft);let blocked=0;
      await page.route('**/dashboard/pos',route=>{if(route.request().method()==='POST'){blocked++;return route.fulfill({status:503,contentType:'text/plain',body:'Owned read outage'});}return route.continue();});
      await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      await expect(page.getByRole('heading',{name:copy.readState.failedTitle,exact:true})).toBeVisible();assert.ok(blocked>0);
      await expect(page.getByTestId('pos-cart-line')).toHaveCount(0);await expect(page.getByTestId('pos-charge-footer')).toHaveCount(0);
      assert.equal(String((await db.salesOrderLine.findUniqueOrThrow({where:{id:sale.lines[0].id}})).quantity),before);
      sample.failureDoesNotClaimEmptyOrClosed=true;
      await page.setViewportSize({width:320,height:1100});
      const screenshot='pos-read-v123-'+locale+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});sample.screenshots.push(screenshot);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.unroute('**/dashboard/pos');await page.getByRole('button',{name:shared.retry,exact:true}).click();
      row=page.getByTestId('pos-cart-line').first();quantity=row.getByRole('spinbutton');await expect(quantity).toHaveValue(draft);
      sample.retryPreservesUnsavedQuantity=true;
      await quantity.focus();await quantity.press('Enter');
      await expect.poll(async()=>String((await db.salesOrderLine.findUniqueOrThrow({where:{id:sale.lines[0].id}})).quantity)).toBe(draft);
      sample.explicitCorrectionSaved=true;await page.close();
    }
    assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);report.passed=true;
  }finally{await context.close();}
}
main().catch(e=>{report.error=f.safe(e,secrets);process.exitCode=1;}).finally(async()=>{
  report.sourcesAfter=sources();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);
  const file=path.join(__dirname,'pos-read-browser-v123-'+stamp+'.json');console.log(JSON.stringify({file,...report}));
  try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await browser?.close();await db.$disconnect();}
});
