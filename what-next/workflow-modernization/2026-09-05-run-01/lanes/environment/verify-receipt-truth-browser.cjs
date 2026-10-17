const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {hashPassword}=require(path.join(root,'lib/password.ts')),{chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const files=['services/purchase-order/purchase-receiving-workbench.service.ts','services/purchase-order/purchase-receipt-accounting-evidence.ts','components/purchase-orders/PurchaseReceivingWorkbench.tsx'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const stamp=crypto.randomUUID(),base='http://127.0.0.1:3110',secrets=[],result={at:new Date().toISOString(),sourceBefore:hashes(),cases:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const negative=JSON.parse(fs.readFileSync(path.join(__dirname,'receipt-posting-truth-after-7f7bb036-a6a1-4388-bfc3-86f76336dc2d.json')));assert.ok(negative.passed);
 const scope={organizationId:negative.organizationId};assert.ok((await db.organization.findUniqueOrThrow({where:{id:negative.organizationId}})).name.startsWith(helper.prefix));
 assert.equal(await db.journalEntry.count({where:scope}),0);
 browser=await chromium.launch({headless:true});
 for(const [locale,width]of [['en',1440],['fr',320]]){
  const t=JSON.parse(fs.readFileSync(path.join(root,'messages',locale+'.json'))).purchaseReceiving;
  const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password),actor=await db.user.create({data:{...scope,email:crypto.randomUUID()+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
  await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
  await db.role.create({data:{...scope,code:'READ_RECEIPT_'+crypto.randomUUID(),nameEn:'Owned receipt evidence observer',permissions:['purchases.orders.read'],users:{connect:{id:actor.id}}}});
  const stateHash=async()=>f.hash(await Promise.all(['goodsReceipt','inventoryTransaction','ledgerPostingBatch','journalEntry','accountingSourceLink','payment'].map(model=>db[model].findMany({where:scope,orderBy:{id:'asc'}}))));const before=await stateHash();
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(f.safe(e,secrets)));const start=Date.now();
  await page.goto(base+'/'+locale+'/dashboard/purchase-orders/'+negative.orderId,{waitUntil:'networkidle',timeout:180000});
  const tab=page.getByRole('tab',{name:t.history,exact:true});await tab.focus();await page.keyboard.press('Enter');const history=page.getByRole('region',{name:t.history});
  const unverified=history.getByText(t.accounting.unverified,{exact:true});await expect(unverified).toBeVisible();await expect(history.getByText(t.stock.recorded,{exact:true})).toBeVisible();await expect(history.getByText(t.accounting.posted,{exact:true})).toHaveCount(0);await unverified.scrollIntoViewIfNeeded();
  const layout=await page.evaluate(()=>({viewport:innerWidth,body:document.documentElement.scrollWidth}));assert.ok(layout.body<=layout.viewport+1);assert.equal(await stateHash(),before);assert.deepEqual(errors,[]);
  const screenshot='receipt-truth-browser-'+stamp+'-'+locale+width+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});
  result.cases.push({locale,width,routeAndNavigationMs:Date.now()-start,recordedStockAndUnverifiedAccounting:true,noPostedClaim:true,readOnlyPersona:true,keyboardHistoryNavigation:true,noFinancialOrStockMutations:true,layout,screenshot});await context.close();console.log(JSON.stringify({locale,passed:true}));
 }result.passed=true;
}
main().catch(async e=>{result.passed=false;result.error=f.safe(e,secrets);if(page&&!page.isClosed()){result.failureScreenshot='receipt-truth-browser-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot)}).catch(()=>{})}}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const receipt='receipt-truth-browser-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,receipt),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({receipt,passed:result.passed,error:result.error}));await db.$disconnect();process.exitCode=result.passed?0:1});
