const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let s=fs.readFileSync(path.join(__dirname,'verify-cash-visibility.cjs'),'utf8').split('async function main(){')[0].replaceAll('cash-visibility-','cash-private-');
s=s.replace("['dashboard','finance','accounting','payroll','payment_reconciliation']","['dashboard','finance','accounting','inventory','pos','cash_drawer','payment_reconciliation']");
const start=s.indexOf(' const period=await db.payrollPeriod.create('),end=s.indexOf(' return {org,actor,role,password};',start);assert.ok(start>0&&end>start);s=s.slice(0,start)+s.slice(end);
s+=`
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
 for(const state of ['allowed','permission-revoked','module-suspended','retained-read']){
  result.stage=state;
  const denied=state==='permission-revoked'||state==='module-suspended';
  const permissions=state==='permission-revoked'?['finance.read','dashboard.read']:['finance.read','dashboard.read','CASH_DRAWER_READ'];
  await db.role.update({where:{id:own.role.id},data:{permissions}});
  await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId:own.org.id,moduleSlug:'cash_drawer'}},data:{status:state==='module-suspended'?'suspended':state==='retained-read'?'read_only':'active'}});
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
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\\n',{flag:'wx'});console.log(JSON.stringify({output,passed:result.passed,error:result.error,sourceStable:result.sourceStable}));await db.$disconnect();
});
`;
fs.writeFileSync(path.join(__dirname,'verify-cash-private.cjs'),s,{flag:'wx'});
