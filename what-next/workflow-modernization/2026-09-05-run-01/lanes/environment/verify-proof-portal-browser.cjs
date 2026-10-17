// Disposable, explicitly synthetic read fixtures. No posting or payment execution.
const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {getCashCommandData}=require(path.join(f.root,'services/cash-command/cash-command.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/cash-command-contracts.ts','components/cash-command/CashCommandDashboard.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx','services/modules/module-entitlement.service.ts'];
files.push('components/evidence/ProofTrailDrawer.tsx','components/bi/BIProofDrawerHost.tsx','components/ui/sheet.tsx','app/globals.css');
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={purpose:'Synthetic proof read and transport recovery; no financial processing',at:new Date().toISOString(),sourceBefore:hashes(),checks:[]},output=path.join(__dirname,'proof-portal-'+stamp+'.json');
let browser,page;
async function fixture(label,amount){
 const org=await db.organization.create({data:{name:helper.prefix+'Cash visibility '+label+' '+stamp,slug:'proof-portal-'+label+'-'+stamp,currency:'XAF',timezone:'UTC'}});
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{organizationId:org.id,email:label+'-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const role=await db.role.create({data:{organizationId:org.id,code:'admin',nameEn:'Owned Cash Command reader',permissions:['finance.read','dashboard.read','payroll.payments.reconcile'],users:{connect:{id:actor.id}}}});
 const modules=['dashboard','finance','accounting','payroll','payment_reconciliation'];
 await db.tenantModuleConfiguration.create({data:{organizationId:org.id,manifestHash:'synthetic-cash-visibility',selectedModules:modules,activeModules:modules}});
 await db.tenantModuleGrant.createMany({data:modules.map(moduleSlug=>({organizationId:org.id,moduleSlug,status:'active',source:'requested_modules'}))});
 await db.location.create({data:{organizationId:org.id,name:'Owned read source',code:'OWNED'}});
 const period=await db.payrollPeriod.create({data:{organizationId:org.id,name:'Synthetic read fixture; no approval',periodStart:new Date('2020-01-01'),periodEnd:new Date('2020-01-31'),payDate:new Date('2020-02-01'),countryCode:'CM'}});
 const run=await db.payrollRun.create({data:{organizationId:org.id,payrollPeriodId:period.id,runNumber:'SYNTHETIC',countryCode:'CM',countryPackVersion:'synthetic-not-approval',countryPackSchemaVersion:'synthetic',countryPackResolutionHash:'synthetic',countryPackCapabilityStatus:'UNAVAILABLE',ruleSetHash:'synthetic',calculationHash:'synthetic',attendanceSnapshotHash:'synthetic'}});
 const employee=await db.payrollEmployee.create({data:{organizationId:org.id,employeeNumber:'SYNTHETIC',displayName:'Synthetic cash read',hireDate:new Date('2020-01-01')}});
 await db.payrollEmployeeBalanceCase.create({data:{organizationId:org.id,employeeId:employee.id,payrollRunId:run.id,caseNumber:'SYNTHETIC',caseType:'RECEIVABLE',status:'OPEN',amount,outstandingAmount:amount,sourceNetPayableAmount:-amount,currency:'XAF',reason:'Synthetic read-boundary fixture',openedById:actor.id,documentHash:'synthetic',evidenceHash:'synthetic'}});
 return {org,actor,role,password};
}
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const own=await fixture('proof',12345),permissions=['finance.read','dashboard.read','payments.reconciliation.read'];
 const transaction=await db.paymentTransaction.create({data:{organizationId:own.org.id,amount:123,currencyCode:'XAF',occurredAt:new Date(),state:'PENDING',sourceType:'synthetic-proof-read',sourceId:stamp}});
 const before=JSON.stringify(await db.paymentTransaction.findUnique({where:{id:transaction.id}}));
 browser=await chromium.launch({headless:true});
 for(const [locale,width] of [['en',1440],['fr',1440],['en',768],['fr',768],['en',320],['fr',320]]){
  await db.role.update({where:{id:own.role.id},data:{permissions}});
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  let verifiedResponse=false;let abortNext=false;result.stage=locale+' login';
  await context.route('**/*',route=>{
   if(new URL(route.request().url()).origin!==base)return route.abort();
   if(abortNext&&route.request().headers()['next-action']){abortNext=false;result.transportAborted=true;return route.abort('failed');}
   if(route.request().headers()['next-action'])return (async()=>{
    const actual=await route.fetch({maxRedirects:0});const body=await actual.body();
    result.actionStatus=actual.status();result.actionRedirect=Boolean(actual.headers()['x-action-redirect']);
    verifiedResponse=body.toString().includes(transaction.id);result.actionContainsSubject=verifiedResponse;
    result.actionIncludesPage=body.toString().includes('CashCommandDashboard');
    await route.fulfill({response:actual,body});
   })();
   return route.continue();
  });
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
  page=await context.newPage();await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});
  const button=page.getByRole('button',{name:'Payment transaction proof',exact:true});await expect(button).toBeEnabled();
  await expect.poll(() => button.evaluate(element => Object.keys(element).some(key => key.startsWith('__reactProps$') && typeof element[key]?.onClick === 'function'))).toBe(true);
  result.stage=locale+' hydrated transport opening';abortNext=true;await button.focus();await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog');await expect(dialog).toHaveCount(1);
  await expect(dialog).toContainText(locale==='fr'?'réessayer':'retry');
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(button).toBeFocused();
  result.stage=locale+' actual proof retry';const received=page.waitForResponse(response=>!!response.request().headers()['next-action'],{timeout:60000});
  await page.keyboard.press('Enter');const response=await received;assert.ok(response.ok());
  assert.ok(verifiedResponse,'Actual proof response must identify the selected owned transaction');
  await expect(dialog).toHaveCount(1);await expect(dialog.getByRole('heading',{name:locale==='fr'?'Éléments de preuve':'Evidence Nodes'})).toBeVisible();
  assert.ok(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1),'Proof drawer overflows');
  
  result.stage=locale+' '+width+' visual and keyboard';
  const visual=await dialog.evaluate(panel=>{
   const color=value=>{const a=value.match(/[\d.]+/g)?.map(Number);if(!a||a.length<3)throw Error('Unresolved CSS color '+value);return [a[0],a[1],a[2],a[3]??1]};
   const blend=(fg,bg)=>[0,1,2].map(i=>fg[i]*fg[3]+bg[i]*(1-fg[3])).concat(1);
   const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
   const rootStyle=getComputedStyle(panel),base=color(rootStyle.backgroundColor),rows=[];
   if(base[3]!==1)throw Error('Proof panel background is not opaque');
   const walker=document.createTreeWalker(panel,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    const text=walker.currentNode.textContent.trim(),element=walker.currentNode.parentElement;
    if(!text||!element||element.closest('.sr-only,[aria-hidden="true"]')||!element.getClientRects().length)continue;
    const style=getComputedStyle(element);if(style.visibility==='hidden'||style.display==='none')continue;
    const ancestors=[];for(let node=element;node&&node!==panel;node=node.parentElement)ancestors.push(node);
    let bg=base;for(const node of ancestors.reverse())bg=blend(color(getComputedStyle(node).backgroundColor),bg);
    const fg=blend(color(style.color),bg),l1=lum(fg),l2=lum(bg),ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    rows.push({text:text.slice(0,110),ratio});
   }
   return {background:rootStyle.backgroundColor,foreground:rootStyle.color,animationName:rootStyle.animationName,overlayAnimationName:getComputedStyle(document.querySelector('[data-state="open"].fixed.inset-0')).animationName,rows};
  });
  result.lastVisual=visual; assert.ok(visual.rows.length>=10);assert.ok(visual.rows.every(row=>row.ratio>=4.5),'Proof text contrast below 4.5: '+JSON.stringify(visual.rows.filter(row=>row.ratio<4.5)));
  assert.equal(visual.animationName,'none');assert.equal(visual.overlayAnimationName,'none');
  for(let i=0;i<5;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');assert.ok(await dialog.evaluate(panel=>panel.contains(document.activeElement)),'Keyboard focus escaped proof');}
  const screenshot='proof-portal-'+stamp+'-'+locale+'-'+width+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:false,animations:'disabled'});
  await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  assert.ok(await dialog.evaluate(panel=>panel.scrollWidth<=panel.clientWidth+1),'Enlarged proof overflows');
  const enlarged='proof-portal-'+stamp+'-'+locale+'-'+width+'-enlarged.png';await page.screenshot({path:path.join(__dirname,enlarged),fullPage:false,animations:'disabled'});
  await page.evaluate(()=>document.documentElement.style.fontSize='');

  await page.keyboard.press('Escape');await expect(button).toBeFocused();
  result.stage=locale+' current permission revocation';await db.role.update({where:{id:own.role.id},data:{permissions:['finance.read','dashboard.read']}});
  const revoked=await page.reload({waitUntil:'domcontentloaded',timeout:180000});await expect(dialog).toHaveCount(0);await expect(button).toBeDisabled();
  assert.ok(!(await revoked.text()).includes(transaction.id),'Revoked proof identifier leaked through route payload');
  result.checks.push({locale,width,visual,enlarged,controlledTextEnlargement:2,keyboardContainment:true,oneDrawer:true,keyboardEscapeAndFocusReturn:true,transportRetry:true,realProofResponse:true,revokedProofAbsent:true,screenshot});
  await context.close();console.log(locale+' '+width+' proof portal: passed');
 }
 assert.equal(JSON.stringify(await db.paymentTransaction.findUnique({where:{id:transaction.id}})),before);
 result.noPaymentMutation=true;result.passed=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1;if(page&&!page.isClosed()){result.failureScreenshot='proof-portal-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{});}}).finally(async()=>{
 await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:result.passed,error:result.error,sourceStable:result.sourceStable}));await db.$disconnect();
});
