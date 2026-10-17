const fs=require('node:fs'),path=require('node:path');
let source=fs.readFileSync(path.join(__dirname,'verify-cash-visibility.cjs'),'utf8');
source=source.replaceAll('cash-visibility-','cash-proof-state-').replace("const result={at:","const result={purpose:'Synthetic proof read and transport recovery; no financial processing',at:");
const a=source.indexOf('async function main(){'),b=source.indexOf('main().catch',a);
source=source.slice(0,a)+`async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const own=await fixture('proof',12345),permissions=['finance.read','dashboard.read','payments.reconciliation.read'];
 const transaction=await db.paymentTransaction.create({data:{organizationId:own.org.id,amount:123,currencyCode:'XAF',occurredAt:new Date(),state:'PENDING',sourceType:'synthetic-proof-read',sourceId:stamp}});
 const before=JSON.stringify(await db.paymentTransaction.findUnique({where:{id:transaction.id}}));
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  await db.role.update({where:{id:own.role.id},data:{permissions}});
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce'});
  let abortNext=false;
  await context.route('**/*',route=>{
   if(new URL(route.request().url()).origin!==base)return route.abort();
   if(abortNext&&route.request().headers()['next-action']){abortNext=false;return route.abort('failed');}
   return route.continue();
  });
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
  page=await context.newPage();await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});
  const button=page.getByRole('button',{name:'Payment transaction proof',exact:true});await expect(button).toBeEnabled();
  abortNext=true;await button.focus();await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog');await expect(dialog).toHaveCount(1);
  await expect(dialog).toContainText(locale==='fr'?'réessayer':'retry');
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(button).toBeFocused();
  const received=page.waitForResponse(response=>!!response.request().headers()['next-action'],{timeout:60000});
  await page.keyboard.press('Enter');const response=await received;assert.ok(response.ok());
  assert.ok((await response.text()).includes(transaction.id),'Actual proof response must identify the selected owned transaction');
  await expect(dialog).toHaveCount(1);await expect(dialog.getByRole('heading',{name:'Evidence Nodes'})).toBeVisible();
  assert.ok(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1),'Proof drawer overflows');
  const screenshot='cash-proof-state-'+stamp+'-'+locale+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});
  await page.keyboard.press('Escape');await expect(button).toBeFocused();
  await db.role.update({where:{id:own.role.id},data:{permissions:['finance.read','dashboard.read']}});
  const revoked=await page.reload({waitUntil:'domcontentloaded',timeout:180000});await expect(dialog).toHaveCount(0);await expect(button).toBeDisabled();
  assert.ok(!(await revoked.text()).includes(transaction.id),'Revoked proof identifier leaked through route payload');
  result.checks.push({locale,oneDrawer:true,keyboardEscapeAndFocusReturn:true,transportRetry:true,realProofResponse:true,revokedProofAbsent:true,screenshot});
  await context.close();console.log(locale+' proof recovery: passed');
 }
 assert.equal(JSON.stringify(await db.paymentTransaction.findUnique({where:{id:transaction.id}})),before);
 result.noPaymentMutation=true;result.passed=true;
}
`+source.slice(b);
fs.writeFileSync(path.join(__dirname,'verify-cash-proof-browser.cjs'),source,{flag:'wx'});
