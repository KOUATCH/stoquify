const fs=require('node:fs'),path=require('node:path');const old=fs.readFileSync(path.join(__dirname,'verify-cash-sources.cjs'),'utf8');
const header=old.slice(0,old.indexOf('async function fixture(')).replace("'cash-sources-'+stamp+'.json'","'cash-navigation-'+stamp+'.json'").replace('const files=[',`const files=['services/cash-command/cash-command-navigation.ts','app/[locale]/(dashboard)/dashboard/payroll/payroll-route-data-access.ts','app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts','actions/payroll/payroll-control.actions.ts',`);
const fixture=old.slice(old.indexOf('async function fixture('),old.indexOf('const sourceApi='));
const body=String.raw`
async function main(){
 await helper.withClient(f.target,helper.assertOwned);const own=await fixture('own',987654321);
 const effects=async()=>JSON.stringify({balances:await db.payrollEmployeeBalanceCase.findMany({where:{organizationId:own.org.id},orderBy:{id:'asc'}}),payments:await db.payment.count({where:{organizationId:own.org.id}}),journals:await db.journalEntry.count({where:{organizationId:own.org.id}})});
 const before=await effects();browser=await chromium.launch({headless:true});
 const cases=[
  {id:'stock_cash_buffer',title:'Stock cash buffer',source:'inventory.read',destination:['inventory.items.read'],route:'/dashboard/inventory/items',heading:'Inventory Items'},
  {id:'employee_balance_recovery',title:'Employee balance recovery',source:'payroll.payments.reconcile',destination:['payments.reconciliation.read','payroll.command.read'],route:'/dashboard/payroll/payments',heading:'Employee balance recovery'},
  {id:'upcoming_statutory_liability',title:'Upcoming statutory liability',source:'payroll.declarations.manage',destination:['payroll.command.read'],route:'/dashboard/payroll/declarations',heading:'Payroll declarations'},
 ];
 for(const item of cases)for(const locale of ['en','fr']){
  result.stage=item.id+' '+locale;
  const minimal=['finance.read','dashboard.read',item.source],full=[...minimal,...item.destination];
  await db.role.update({where:{id:own.role.id},data:{permissions:minimal}});
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(f.safe(error,secrets)));
  const cash=base+'/'+locale+'/dashboard/finance/cash-command';
  await page.goto(cash,{waitUntil:'domcontentloaded',timeout:180000});
  let card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();
  await expect(card).toBeVisible();await expect(card.locator('a')).toHaveCount(0);
  const reason=locale==='fr'?'vos droits actuels':'your current access';assert.ok((await card.locator('button[title]').first().getAttribute('title')).includes(reason));
  const deniedScreenshot='cash-navigation-'+stamp+'-'+item.id+'-'+locale+'-disabled.png';await page.screenshot({path:path.join(__dirname,deniedScreenshot),fullPage:true,animations:'disabled'});
  await db.role.update({where:{id:own.role.id},data:{permissions:full}});
  await page.reload({waitUntil:'domcontentloaded',timeout:180000});card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();
  let link=card.locator('a[href="/'+locale+item.route+'"]').last();await expect(link).toBeVisible();await link.focus();await expect(link).toBeFocused();
  const start=Date.now();await link.press('Enter');await expect(page).toHaveURL(base+'/'+locale+item.route,{timeout:180000});
  await expect(page.getByRole('heading',{name:item.heading,exact:true}).first()).toBeVisible({timeout:120000});
  const destinationMs=Date.now()-start;
  assert.ok(!/workbench unavailable|Missing permission|permission denied/i.test(await page.locator('main').innerText()));
  const destinationScreenshot='cash-navigation-'+stamp+'-'+item.id+'-'+locale+'-destination.png';await page.screenshot({path:path.join(__dirname,destinationScreenshot),fullPage:true,animations:'disabled'});
  await page.goBack({waitUntil:'domcontentloaded',timeout:180000});await expect(page).toHaveURL(cash);
  await expect(page.getByRole('heading',{name:item.title,exact:true}).first()).toBeVisible();
  // Withdraw the destination page permission while the source link is already rendered.
  await db.role.update({where:{id:own.role.id},data:{permissions:minimal}});
  card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();link=card.locator('a[href="/'+locale+item.route+'"]').last();
  await link.focus();await link.press('Enter');await expect(page).toHaveURL(base+'/'+locale+item.route,{timeout:180000});
  await expect(page.getByText(/access denied|permission required|permission denied|access restricted|accès refusé|autorisation requise/i).first()).toBeVisible({timeout:120000});
  const revokedScreenshot='cash-navigation-'+stamp+'-'+item.id+'-'+locale+'-revoked.png';await page.screenshot({path:path.join(__dirname,revokedScreenshot),fullPage:true,animations:'disabled'});
  await page.goto(cash,{waitUntil:'domcontentloaded',timeout:180000});card=page.locator('article').filter({has:page.getByRole('heading',{name:item.title,exact:true})}).first();await expect(card.locator('a')).toHaveCount(0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));assert.deepEqual(errors,[]);
  result.checks.push({id:item.id,locale,aggregatePreserved:true,destinationPermissionVerified:true,keyboardHandoff:true,backRetainedLocale:true,renderedLinkRevocation:true,destinationMs,screenshots:[deniedScreenshot,destinationScreenshot,revokedScreenshot]});
  await context.close();console.log(item.id+' '+locale+': passed');
 }
 assert.equal(await effects(),before);result.noBusinessMutationsDuringReads=true;result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert.ok(result.sourceStable);result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1;}).finally(async()=>{await browser?.close();await db.$disconnect();fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:output,passed:result.passed,stage:result.stage,error:result.error}));});
`;
fs.writeFileSync(path.join(__dirname,'verify-cash-navigation.cjs'),header+fixture+body,{flag:'wx'});
