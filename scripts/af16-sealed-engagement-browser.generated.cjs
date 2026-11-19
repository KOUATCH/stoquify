// Real Better Auth + protected actions against the isolated AF05 fixture. No delivery worker runs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {chromium}=require('playwright'),{PrismaClient}=require("E:/ohada saas/Focused projects/stoquify/.codex-tmp/af16-prisma/client"),axe=require('axe-core')
const privateRoot='C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993'
const fixture=JSON.parse(fs.readFileSync("C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993/af16-engagement-https-20261028-r2/fixture.json",'utf8'))
assert.equal(new URL(fixture.url).pathname,'/stoquify_local_af16_20261028_engagement_r2')
assert.equal(new URL(fixture.url).hostname,'127.0.0.1');assert.equal(new URL(fixture.url).port,'55451');assert.notEqual(process.env.NODE_ENV,'production')
const output=path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-28-run-02')
const resume=false
const report=resume ? {...JSON.parse(fs.readFileSync(path.join(output,'browser-results.json'),'utf8')),resumedAfterVerifiedHandover:true,passed:false} : {synthetic:true,checks:[],screenshots:[],pageErrors:[],passed:false}
delete report.failure
async function main(){
 const db=new PrismaClient({datasources:{db:{url:fixture.url}}})
 const browser=await chromium.launch({headless:true,args:["--host-resolver-rules=MAP localhost 127.0.0.1"]})
 const manager=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',ignoreHTTPSErrors:true})
 const owner=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',ignoreHTTPSErrors:true})
 const page=await manager.newPage(), client=await owner.newPage()
 for(const p of [page,client]) {p.setDefaultTimeout(90000);p.on('pageerror',e=>report.pageErrors.push(e.message))}
 const base=fixture.base, route=base+'/en/dashboard/accounting/accountant-access'
 const signin=async(context,role)=>{const r=await context.request.post(base+'/api/auth/sign-in/email',{data:{email:'af05-'+role+'@example.invalid',password:fixture.password},headers:{Origin:base},timeout:240000});assert.equal(r.status(),200,role+' sign-in');const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name.includes('session_token')&&c.secure&&c.httpOnly),'Secure HttpOnly session cookie');report.secureCookieRoles=[...(report.secureCookieRoles||[]),role]}
 const shot=async(name,p=page)=>{await p.screenshot({path:path.join(output,name+'.png'),fullPage:false});report.screenshots.push(name+'.png')}
 const workspace=page.locator('#firm-engagement-workspace')
 const ready=()=>workspace.getByRole('heading',{name:'Prepare an engagement',exact:true}).waitFor()
 const refresh=async()=>{await workspace.getByRole('button',{name:'Refresh authority and status',exact:true}).click();await ready()}
 const confirm=async()=>{
   const dialog=page.getByRole('alertdialog');await dialog.getByRole('button',{name:'Confirm change',exact:true}).click()
   // Reuse the actual password step-up when a long browser run crosses the freshness window.
   await page.waitForFunction(()=>!document.querySelector('[role=alertdialog]') || !!document.querySelector('[role=alertdialog] input[name=password]'))
   if(await dialog.getByLabel('Password',{exact:true}).count()){
     await dialog.getByLabel('Password',{exact:true}).fill(fixture.password)
     await dialog.getByRole('button',{name:'Confirm identity',exact:true}).click()
     await dialog.getByRole('button',{name:'Confirm change',exact:true}).click()
   }
   await dialog.waitFor({state:'hidden'});await ready()
 }
 const terms=async(form)=>{await form.locator('[name=scope]').selectOption('REVIEWER');await form.locator('[name=effectiveFrom]').fill('2026-10-01T00:00');await form.locator('[name=expiresAt]').fill('2027-10-01T00:00')}
 const grant=async(email)=>{
   const form=client.getByRole('heading',{name:'Invite an accountant',exact:true}).locator('..').locator('..')
   await form.locator('[name=accountantEmail]').fill(email);await form.locator('[name=accountantFirmName]').fill('Synthetic firm')
   await form.locator('[name=role]').selectOption('REVIEWER');await form.locator('[name=effectiveFrom]').fill('2020-01-01T00:00')
   await form.locator('[name=expiresAt]').fill('2099-01-01T00:00');await form.locator('[name=consentEvidenceHash]').fill('sha256:'+'a'.repeat(64))
   await form.getByRole('button',{name:'Invite or grant access',exact:true}).click()
   await client.waitForFunction(()=>/Accountant access granted\.|Accountant invitation queued\.|Confirm your password/.test(document.body.innerText))
   if((await client.locator('body').innerText()).includes('Confirm your password')){
     await client.getByLabel('Password',{exact:true}).waitFor()
     await client.getByLabel('Password',{exact:true}).fill(fixture.password)
     await client.getByRole('button',{name:'Confirm identity',exact:true}).click()
     await client.getByRole('button',{name:'Retry',exact:true}).click()
   }
   await client.getByText(/Accountant access granted.|Accountant invitation queued./,{exact:true}).waitFor()
 }
 try {
   assert.equal(fs.realpathSync((await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory).toLowerCase(),fs.realpathSync("C:\\Users\\J COMPUTER\\.codex\\visualizations\\2026\\10\\19\\01a1542f-53bc-7513-b68f-4bce330ca993\\af16-postgres").toLowerCase());assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name,fixture.name)
   await signin(manager,'manager');await signin(owner,'owner')
   await client.goto(route,{waitUntil:'domcontentloaded',timeout:240000})
   if(!resume){
   await grant('af05-preparer@example.invalid');await grant('af05-reviewer@example.invalid')
   report.checks.push({clientGrant:'Client owner granted named preparer/reviewer through real existing protected form'})
   await page.goto(route+'?view=firm',{waitUntil:'domcontentloaded',timeout:240000});await ready()
   let engagement=await db.firmEngagement.findFirst({where:{firmOrganizationId:'af05-firm'}})
   if(!engagement){
     const form=workspace.getByRole('heading',{name:'Prepare an engagement',exact:true}).locator('..')
     await form.locator('[name=client]').selectOption('af05-client');await terms(form)
     await form.getByRole('button',{name:'Prepare draft',exact:true}).click();await confirm()
     engagement=await db.firmEngagement.findFirstOrThrow({where:{firmOrganizationId:'af05-firm'}})
   }else {await workspace.getByRole('button',{name:/Synthetic client —/}).first().click();await ready()}
   const assign=workspace.getByRole('heading',{name:'Assign member',exact:true}).locator('..')
   await assign.locator('[name=member]').selectOption('af05-preparer');await terms(assign)
   await assign.getByRole('button',{name:'Assign member',exact:true}).click();await confirm()
   assert.equal(await db.firmEngagementGrantLink.count({where:{engagementId:engagement.id}}),0)
   await workspace.getByRole('button',{name:'Enroll existing mandate: preparer',exact:true}).click();await confirm()
   let transition=workspace.locator('form').filter({has:page.locator('select[name=status]')})
   await transition.locator('[name=status]').selectOption('ACTIVE');await transition.locator('[name=reason]').fill('Synthetic activation after client consent')
   await transition.getByRole('button',{name:'Review this change',exact:true}).click();await confirm()
   await workspace.getByText('Current managed read access',{exact:true}).waitFor()
   report.checks.push({setup:'Draft, assignment, explicit enrollment and activation; assignment alone did not create a link'})
   const activeBefore=await db.firmEngagement.findUniqueOrThrow({where:{id:engagement.id}})
   assert.equal(activeBefore.status,'ACTIVE')
   const consentBefore=await db.accountantAccessGrant.findMany({where:{organizationId:'af05-client'},orderBy:{id:'asc'}})
   await transition.locator('[name=status]').selectOption('SUSPENDED')
   await transition.locator('[name=reason]').fill('Synthetic engagement suspension preserves client consent')
   await transition.getByRole('button',{name:'Review this change',exact:true}).click();await confirm()
   const suspended=await db.firmEngagement.findUniqueOrThrow({where:{id:engagement.id}})
   assert.equal(suspended.status,'SUSPENDED');assert.equal(suspended.version,activeBefore.version+1)
   assert.equal(await workspace.getByText('Current managed read access',{exact:true}).count(),0)
   await shot('engagement-suspended')
   await transition.locator('[name=status]').selectOption('ACTIVE')
   await transition.locator('[name=reason]').fill('Synthetic reactivation after suspension review')
   await transition.getByRole('button',{name:'Review this change',exact:true}).click();await confirm()
   const reactivated=await db.firmEngagement.findUniqueOrThrow({where:{id:engagement.id}})
   assert.equal(reactivated.status,'ACTIVE');assert.equal(reactivated.version,suspended.version+1)
   await workspace.getByText('Current managed read access',{exact:true}).waitFor()
   assert.deepEqual(await db.accountantAccessGrant.findMany({where:{organizationId:'af05-client'},orderBy:{id:'asc'}}),consentBefore)
   report.checks.push({suspension:'Real suspension clears managed read state; explicit reactivation advances version and restores it without rewriting client grants'})

   await workspace.getByRole('button',{name:'Load authorized work summary',exact:true}).click()
   await workspace.getByText(/Awaiting client recipients: 0/).waitFor()
   const beforeWork=await db.closeAssuranceFinding.count({where:{organizationId:'af05-client'}})
   const handover=workspace.getByRole('heading',{name:'Replace assigned member',exact:true}).locator('..')
   await handover.locator('[name=outgoing]').selectOption('af05-preparer');await handover.locator('[name=incoming]').selectOption('af05-reviewer');await terms(handover)
   await handover.locator('[name=reason]').fill('Synthetic handover retains original evidence')
   await handover.getByRole('button',{name:'Replace assigned member / End assignment',exact:true}).click();await confirm()
   assert(await db.firmEngagementAssignment.findFirst({where:{engagementId:engagement.id,accountantUserId:'af05-preparer',endedAt:{not:null}}}))
   assert.equal(await db.firmEngagementGrantLink.count({where:{engagementId:engagement.id,accountantUserId:'af05-reviewer'}}),0)
   assert.equal(await db.closeAssuranceFinding.count({where:{organizationId:'af05-client'}}),beforeWork)
   await workspace.getByRole('button',{name:'Enroll existing mandate: reviewer',exact:true}).click();await confirm()
   report.checks.push({handover:'Old assignment ended, incoming consent not transferred; explicit second enrollment; work rows unchanged'})
   for(const locale of ['en','fr']) for(const width of [1440,390]){
     await page.setViewportSize({width,height:width===390?844:1000})
     await page.goto(base+`/${locale}/dashboard/accounting/accountant-access?view=firm`,{waitUntil:'domcontentloaded'})
     await workspace.getByRole('heading',{name:locale==='fr'?'Préparer une mission':'Prepare an engagement',exact:true}).waitFor()
     await workspace.getByRole('button',{name:/Synthetic client —/}).first().click()
     await workspace.getByRole('heading',{name:locale==='fr'?'Préparer une mission':'Prepare an engagement',exact:true}).waitFor()
     await workspace.getByRole('button',{name:locale==='fr'?'Actualiser les droits et les statuts':'Refresh authority and status',exact:true}).focus()
     await page.keyboard.press('Enter')
     await page.waitForFunction(()=>document.activeElement?.id==='firm-engagement-heading')
     const geometry=await workspace.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}))
     assert(geometry.scroll<=geometry.client+1)
     await page.addScriptTag({content:axe.source})
     const scan=await page.evaluate(async()=>window.axe.run('#firm-engagement-workspace',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}))
     const violations=scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))
     report.checks.push({locale,width,geometry,keyboardRefresh:true,axeViolations:violations})
     await shot(`engagement-${locale}-${width}`);assert.equal(violations.length,0)
   }
   }
   await page.setViewportSize({width:1440,height:1000});await page.goto(route+'?view=firm',{waitUntil:'domcontentloaded'});await ready()
   await workspace.getByRole('button',{name:/Synthetic client —/}).first().click();await ready()
   const reviewerGrant=await db.accountantAccessGrant.findFirstOrThrow({where:{organizationId:'af05-client',accountantUserId:'af05-reviewer',status:'ACTIVE'}})
   await client.reload({waitUntil:'domcontentloaded'})
   client.once('dialog',d=>d.accept('Synthetic client revocation after handover'))
   await client.getByRole('row').filter({hasText:'af05-reviewer@example.invalid'}).getByRole('button',{name:'Revoke',exact:true}).click()
   await client.waitForFunction(()=>/Accountant access revoked\.|Confirm your password/.test(document.body.innerText))
   if((await client.locator('body').innerText()).includes('Confirm your password')){
     await client.getByLabel('Password',{exact:true}).fill(fixture.password)
     await client.getByRole('button',{name:'Confirm identity',exact:true}).click()
     await client.getByRole('button',{name:'Retry',exact:true}).click()
   }
   await client.getByText('Accountant access revoked.',{exact:true}).waitFor()
   await refresh();assert((await db.accountantAccessGrant.findUniqueOrThrow({where:{id:reviewerGrant.id}})).revokedAt)
   await shot('client-revocation',client)
   report.checks.push({revocation:'Real client owner form revokes enrolled incoming mandate'})
   await grant('af05-delivery@example.invalid')
   const invite=await db.accountantClientInvite.findFirstOrThrow({where:{organizationId:'af05-client'}})
   await db.businessEventOutbox.update({where:{id:invite.outboxId},data:{status:'FAILED',attempts:1,availableAt:new Date(Date.now()+60000)}})
   await client.locator('#accountant-invitation-delivery').getByRole('button',{name:'Refresh authority and status'}).click()
   await client.locator('#accountant-invitation-delivery').getByText(/Failed — retry scheduled/).waitFor()
   assert.equal(await db.accountantAccessGrant.count({where:{organizationId:'af05-client'}}),3)
   await shot('delivery-failure-pending-acceptance',client)
   report.checks.push({invitation:'Actual queued invitation, synthetic worker-failure state; retry visible, acceptance still pending, no grant and no provider called'})
   await db.role.update({where:{id:'af05-manager-role'},data:{permissions:[]}})
   await workspace.getByRole('button',{name:'Refresh authority and status',exact:true}).click()
   await page.getByRole('heading',{name:'Accountant access is not available for this role',exact:true}).waitFor()
   assert.equal(await workspace.count(),0)
   await shot('permission-denied')
   await db.role.update({where:{id:'af05-manager-role'},data:{permissions:['accounting.audit.read','accounting.close.read','accounting.close.accountant.invite','accounting.close.accountant.review']}})
   await page.reload({waitUntil:'domcontentloaded'});await ready()
   await db.organization.update({where:{id:'af05-firm'},data:{requestedModules:['inventory']}})
   await workspace.getByRole('button',{name:'Refresh authority and status',exact:true}).click()
   await workspace.getByRole('alert').waitFor();await shot('module-locked')
   report.checks.push({denial:'Persisted role removal and module lock clear private metadata'})
   assert.deepEqual(report.pageErrors,[]);report.passed=true;report.artifactSha256="987da3ead9c716cdbf5d2a22ac1723aa8a8ed15113f40a6b8abd3c1fb64d151f"
 }catch(e){report.failure=e.message;await shot('failure').catch(()=>{});await shot('client-failure',client).catch(()=>{});throw e}
 finally {fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(report,null,2));await browser.close();await db.$disconnect()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1})
