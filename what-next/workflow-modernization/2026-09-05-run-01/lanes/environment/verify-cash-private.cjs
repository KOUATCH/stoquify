// Disposable, explicitly synthetic read fixtures. No posting or payment execution.
const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts'));
const {getCashCommandData}=require(path.join(f.root,'services/cash-command/cash-command.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/cash-command-contracts.ts','components/cash-command/CashCommandDashboard.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx','services/modules/module-entitlement.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:[]},output=path.join(__dirname,'cash-private-'+stamp+'.json');
let browser,page;
async function fixture(label,amount){
 const org=await db.organization.create({data:{name:helper.prefix+'Cash visibility '+label+' '+stamp,slug:'cash-private-'+label+'-'+stamp,currency:'XAF',timezone:'UTC'}});
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{organizationId:org.id,email:label+'-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const role=await db.role.create({data:{organizationId:org.id,code:'admin',nameEn:'Owned Cash Command reader',permissions:['finance.read','dashboard.read','payroll.payments.reconcile'],users:{connect:{id:actor.id}}}});
 const modules=['dashboard','finance','accounting','inventory','sales','pos','cash_drawer','payment_reconciliation'];
 await db.tenantModuleConfiguration.create({data:{organizationId:org.id,manifestHash:'synthetic-cash-visibility',selectedModules:modules,activeModules:modules}});
 await db.tenantModuleGrant.createMany({data:modules.map(moduleSlug=>({organizationId:org.id,moduleSlug,status:'active',source:'requested_modules'}))});
 await db.location.create({data:{organizationId:org.id,name:'Owned read source',code:'OWNED'}});
 return {org,actor,role,password};
}

const drawerService=require(path.join(f.root,'services/pos/drawer-dashboard.service.ts'));
const moduleService=require(path.join(f.root,'services/modules/module-entitlement.service.ts'));
const drawerRead=drawerService.getCashDrawerDashboard,moduleRead=moduleService.getModuleControlCenterData;
let readCounts={drawer:0,diagnostics:0};
drawerService.getCashDrawerDashboard=async(...args)=>{readCounts.drawer++;return drawerRead(...args)};
moduleService.getModuleControlCenterData=async(...args)=>{readCounts.diagnostics++;return moduleRead(...args)};
async function addDrawer(owned,variance){
 const location=await db.location.findFirst({where:{organizationId:owned.org.id}});
 const terminal=await db.pOSStation.create({data:{organizationId:owned.org.id,locationId:location.id,name:'Synthetic source only',terminalNumber:'SYNTHETIC'}});
 return db.cashDrawer.create({data:{name:'Synthetic read boundary',drawerNumber:'SYNTHETIC',locationId:location.id,terminalId:terminal.id,currentBalance:variance,expectedBalance:0}});
}
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const own=await fixture('own',0),foreign=await fixture('foreign',0);
 const ownDrawer=await addDrawer(own,7654321),foreignDrawer=await addDrawer(foreign,3456789);
 const effects=async()=>JSON.stringify({drawers:await db.cashDrawer.findMany({where:{id:{in:[ownDrawer.id,foreignDrawer.id]}},orderBy:{id:'asc'}}),transactions:await db.cashDrawerTransaction.count({where:{cashDrawerId:{in:[ownDrawer.id,foreignDrawer.id]}}})});
 browser=await chromium.launch({headless:true});
 for(const state of ['missing-dependency','allowed','permission-revoked','module-suspended','retained-read']){
  result.stage=state;
  const denied=state==='permission-revoked'||state==='module-suspended'||state==='missing-dependency';
  const permissions=state==='permission-revoked'?['finance.read','dashboard.read']:['finance.read','dashboard.read','CASH_DRAWER_READ'];
  await db.role.update({where:{id:own.role.id},data:{permissions}});
  await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId:own.org.id,moduleSlug:'cash_drawer'}},data:{status:state==='module-suspended'?'suspended':state==='retained-read'?'read_only':'active'}});
  await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId:own.org.id,moduleSlug:'sales'}},data:{status:state==='missing-dependency'?'suspended':'active'}});
  const before=await effects();readCounts={drawer:0,diagnostics:0};
  const data=await getCashCommandData({organizationId:own.org.id,actorId:own.actor.id,actorPermissions:permissions,actorRoleCodes:['admin']});
  assert.deepEqual(readCounts,{drawer:denied?0:1,diagnostics:0});
  assert.equal(data.summary.drawerVariance,denied?null:7654321);assert.equal(data.drawerState===null,denied);
  assert.ok(!JSON.stringify(data).includes('3456789'));assert.equal(data.moduleControl,null);
  for(const locale of ['en','fr']){
   const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:own.actor.email,password:own.password},timeout:60000})).status(),200);
   page=await context.newPage();const response=await page.goto(base+'/'+locale+'/dashboard/finance/cash-command',{waitUntil:'domcontentloaded',timeout:180000});assert.ok(response&&response.ok());
   const main=page.locator('main.dashboard-landing-theme');
   await expect(main.getByRole('status')).toContainText(locale==='fr'?'Une valeur indisponible ne signifie pas un solde nul':'An unavailable value does not mean a zero balance');
   const card=main.getByText('Drawer risk',{exact:true});if(denied)await expect(card).toHaveCount(0);else await expect(card.first()).toBeVisible();
   const html=await response.text();assert.ok(!html.includes('3456789'));if(denied)assert.ok(!html.includes('7654321'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
   const screenshot='cash-private-'+stamp+'-'+locale+'-'+state+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});
   result.checks.push({state,locale,drawerQueryAllowed:!denied,realServiceCalls:{...readCounts},drawerVariance:data.summary.drawerVariance,foreignValueAbsent:true,screenshot});
   await context.close();console.log(locale+' '+state+': passed');
  }
  assert.equal(await effects(),before);
 }
 readCounts={drawer:0,diagnostics:0};
 const admin=await getCashCommandData({organizationId:own.org.id,actorId:own.actor.id,actorPermissions:['finance.read','MANAGE_SYSTEM_SETTINGS'],actorRoleCodes:['admin']});
 assert.deepEqual(readCounts,{drawer:0,diagnostics:1});assert.ok(admin.moduleControl);result.settingsDiagnosticsReadVerified=true;
 result.noBusinessMutationsDuringReads=true;result.passed=true;
}
main().catch(async error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1;if(page&&!page.isClosed()){result.failureScreenshot='cash-private-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{});}}).finally(async()=>{
 await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:result.passed,error:result.error,sourceStable:result.sourceStable}));await db.$disconnect();
});
