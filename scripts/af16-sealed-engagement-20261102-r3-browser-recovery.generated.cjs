// Additional authenticated recovery checks on the same explicitly synthetic AF05 fixture.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {chromium}=require('playwright'),{PrismaClient}=require("E:/ohada saas/Focused projects/stoquify/.codex-tmp/af16-prisma/client")
const fixture=JSON.parse(fs.readFileSync("C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993/af16-engagement-https-20261102-r3/fixture.json",'utf8'))
assert.equal(new URL(fixture.url).hostname,'127.0.0.1');assert.equal(new URL(fixture.url).port,'55451');assert.notEqual(process.env.NODE_ENV,'production')
assert.equal(new URL(fixture.url).pathname,'/stoquify_local_af16_20261102_engagement_r3')
const output=path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-11-02-run-03')
const report={synthetic:true,checks:[],pageErrors:[],passed:false}
async function main(){
 const db=new PrismaClient({datasources:{db:{url:fixture.url}}}),browser=await chromium.launch({headless:true,args:["--host-resolver-rules=MAP localhost 127.0.0.1"]})
 const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true}),page=await context.newPage()
 page.setDefaultTimeout(60000);page.on('pageerror',e=>report.pageErrors.push(String(e.message).split(fixture.password).join('[REDACTED]')))
 let originalExpiry,grantId
 try{assert.equal(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase(),fs.realpathSync("C:\\Users\\J COMPUTER\\.codex\\visualizations\\2026\\10\\19\\01a1542f-53bc-7513-b68f-4bce330ca993\\af16-postgres").toLowerCase());
  await db.organization.update({where:{id:'af05-firm'},data:{requestedModules:['accounting']}})
  await db.role.update({where:{id:'af05-manager-role'},data:{permissions:['accounting.audit.read','accounting.close.read','accounting.close.accountant.invite','accounting.close.accountant.review']}})
  const r=await context.request.post(fixture.base+'/api/auth/sign-in/email',{data:{email:'af05-manager@example.invalid',password:fixture.password},headers:{Origin:fixture.base}})
  assert.equal(r.status(),200);const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name.includes('session_token')&&c.secure&&c.httpOnly),'Secure HttpOnly session cookie');
  await page.goto(fixture.base+'/en/dashboard/accounting/accountant-access?view=firm',{waitUntil:'domcontentloaded',timeout:180000})
  const workspace=page.locator('#firm-engagement-workspace')
  const ready=()=>workspace.getByRole('heading',{name:'Prepare an engagement',exact:true}).waitFor()
  await ready();await workspace.getByRole('button',{name:/Synthetic client —/}).first().click();await ready()
  const beforeCancel=await db.firmEngagement.findFirstOrThrow({where:{firmOrganizationId:'af05-firm'}});
  const transition=workspace.locator('form').filter({has:page.locator('select[name=status]')})
  await transition.locator('[name=reason]').fill('Synthetic keyboard cancellation')
  const trigger=transition.getByRole('button',{name:'Review this change',exact:true})
  await trigger.focus();await page.keyboard.press('Enter')
  const dialog=page.getByRole('alertdialog')
  await dialog.waitFor();await page.waitForFunction(()=>document.activeElement?.textContent==='Cancel')
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
  assert(await trigger.evaluate(el=>el===document.activeElement))
  assert.deepEqual(await db.firmEngagement.findUniqueOrThrow({where:{id:beforeCancel.id}}),beforeCancel);
  report.checks.push('Keyboard confirmation starts on Cancel; Escape returns focus to the triggering control without mutation')
  const old=await db.accountantAccessGrant.findFirstOrThrow({where:{organizationId:'af05-client',accountantUserId:'af05-preparer',status:'ACTIVE'}})
  grantId=old.id;originalExpiry=old.expiresAt
  await db.accountantAccessGrant.update({where:{id:old.id},data:{expiresAt:new Date(Date.now()-60000)}})
  await workspace.getByRole('button',{name:'Refresh authority and status',exact:true}).click();await ready()
  await workspace.getByText(/Client mandates: Expired/).waitFor()
  await workspace.getByRole('heading',{name:'Staff assignment and client consent',exact:true}).scrollIntoViewIfNeeded()
  await page.screenshot({path:path.join(output,'recovery-engagement-expiry-detail.png')})
  report.checks.push('Persisted synthetic mandate expiry renders Expired after reauthorization')
  await db.accountantAccessGrant.update({where:{id:old.id},data:{expiresAt:originalExpiry}});originalExpiry=null
  let intercepted=false
  await page.route('**/dashboard/accounting/accountant-access?view=firm',async route=>{
   if(!intercepted&&route.request().method()==='POST'){intercepted=true;await route.abort('failed')}else await route.continue()
  })
  await workspace.getByRole('button',{name:'Refresh authority and status',exact:true}).click()
  await workspace.getByRole('alert').waitFor();assert(intercepted)
  assert.equal(await workspace.getByRole('button',{name:/Synthetic client —/}).count(),0)
  await page.unroute('**/dashboard/accounting/accountant-access?view=firm')
  await workspace.getByRole('button',{name:'Retry',exact:true}).click();await ready()
  report.checks.push('Aborted server-action read clears private cards; Retry reloads current authorized metadata')
  await db.role.update({where:{id:'af05-manager-role'},data:{permissions:[]}})
  await workspace.getByRole('button',{name:'Refresh authority and status',exact:true}).click()
  await workspace.getByRole('alert').waitFor();assert.equal(await workspace.getByRole('button',{name:/Synthetic client —/}).count(),0);await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Accountant access is not available for this role',exact:true}).waitFor()
  assert.equal(await workspace.count(),0)
  await page.screenshot({path:path.join(output,'recovery-permission-denied.png')})
  await db.role.update({where:{id:'af05-manager-role'},data:{permissions:['accounting.audit.read','accounting.close.read','accounting.close.accountant.invite','accounting.close.accountant.review']}})
  await page.reload({waitUntil:'domcontentloaded'});await ready()
  report.checks.push('Persisted role removal replaces the entire workspace with the existing route permission boundary; restoring permission and reloading recovers')
  await db.organization.update({where:{id:'af05-firm'},data:{requestedModules:['inventory']}})
  await workspace.getByRole('button',{name:'Refresh authority and status',exact:true}).click()
  await workspace.getByRole('alert').waitFor()
  assert.equal(await workspace.getByRole('button',{name:/Synthetic client —/}).count(),0)
  await page.screenshot({path:path.join(output,'recovery-module-locked.png')})
  await db.organization.update({where:{id:'af05-firm'},data:{requestedModules:['accounting']}})
  await workspace.getByRole('button',{name:'Retry',exact:true}).click();await ready()
  report.checks.push('Persisted accounting-module removal denies and clears metadata; restoring the module recovers')
  await db.session.deleteMany({where:{userId:'af05-manager'}})
  await workspace.getByRole('button',{name:'Refresh authority and status',exact:true}).click()
  await page.waitForFunction(()=>!!document.querySelector('#firm-engagement-workspace [role=alert]') || /\/login|\/sign-in/.test(location.pathname))
  assert.equal(await workspace.getByRole('button',{name:/Synthetic client —/}).count(),0)
  await page.screenshot({path:path.join(output,'recovery-session-revoked.png')})
  report.checks.push('Persisted session deletion denies subsequent reads and clears private cards')
  assert.deepEqual(report.pageErrors,[]);report.passed=true;report.artifactSha256="bed03f4b4ce2d88345a6f04244e9667c6fdbca9cf8f47d037810aa6423d43835"
 }catch(e){report.failure=String(e.message).split(fixture.password).join('[REDACTED]');await page.screenshot({path:path.join(output,'recovery-failure.png')}).catch(()=>{});throw e}
 finally{
  if(originalExpiry)await db.accountantAccessGrant.update({where:{id:grantId},data:{expiresAt:originalExpiry}})
  fs.writeFileSync(path.join(output,'browser-recovery.json'),JSON.stringify(report,null,2))
  await browser.close();await db.$disconnect()
 }
}
main().catch(e=>{console.error(String(e.message).split(fixture.password).join('[REDACTED]'));process.exitCode=1})
