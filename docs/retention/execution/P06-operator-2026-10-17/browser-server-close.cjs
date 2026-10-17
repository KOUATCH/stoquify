const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/J COMPUTER/AppData/Local/ms-playwright'
const {chromium}=require('playwright'),{PrismaClient}=require('@prisma/client'),expect=require('@playwright/test').expect.configure({timeout:90000})
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'))
const f=read('BROWSER_FIXTURE.json'),app=read('APPLICATION_TARGET.json'),target=read('DATABASE_TARGET.json')
assert.equal(app.origin,'http://127.0.0.1:3187');assert.equal(app.database,target.database)
assert.equal(target.host,'localhost');assert.equal(target.user,'retention_fixture');assert.match(target.database,/^stoquify_pos_audit_20261017_[a-f0-9]+$/)
const db=new PrismaClient({datasources:{db:{url:`postgresql://retention_fixture@localhost:${target.port}/${target.database}?schema=public`}}})
async function main(){
  const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1366,height:768}})
  const result={utc:new Date().toISOString(),fixture:f.organizationId,browser:browser.version(),scope:'new browser context with no local queue; same authenticated cashier and persisted server blockers'}
  let page,closePosts=0
  await context.route('**/*',route=>{const request=route.request();if(new URL(request.url()).origin!==app.origin)return route.abort();if(request.method()==='POST'&&request.headers()['next-action']&&(request.postData()||'').includes('actualBalance'))closePosts++;return route.continue()})
  try{
    const blockers=await db.pOSOfflineSyncCertificate.count({where:{organizationId:f.organizationId,closeBlocker:true}})
    assert.ok(blockers>0,'Previous operator run must leave real server blockers')
    const auth=await context.request.post(app.origin+'/api/auth/sign-in/email',{data:{email:f.email,password:'Retention-Synthetic-Only-2026!'},headers:{Origin:app.origin},timeout:180000});assert.equal(auth.status(),200)
    page=await context.newPage();await page.goto(app.origin+'/en/dashboard/pos',{waitUntil:'domcontentloaded',timeout:300000})
    await expect(page.getByTestId('local-offline-recovery')).toContainText('No pending evidence found on this browser')
    await page.getByRole('button',{name:'End shift',exact:true}).click({timeout:90000})
    const dialog=page.getByRole('dialog');await dialog.getByLabel('Counted cash',{exact:true}).fill('100')
    await dialog.locator('button.dashboard-button-primary').filter({hasText:'Close'}).click()
    await expect(dialog).toContainText('Offline sales need reconciliation')
    assert.equal(closePosts,1,'Empty local inventory submits to authoritative server guard')
    assert.equal((await db.pOSSession.findUniqueOrThrow({where:{id:f.sessionId}})).status,'ACTIVE')
    assert.equal(await db.pOSCommitResult.count({where:{organizationId:f.organizationId}}),0)
    await page.screenshot({path:path.join(__dirname,'SERVER_CLOSE_BLOCKED.png')})
    Object.assign(result,{status:'PASS',blockers,closePosts,shift:'ACTIVE',financialCommits:0})
  }catch(error){Object.assign(result,{status:'FAIL',error:error.stack,closePosts});process.exitCode=1}
  finally{fs.writeFileSync(path.join(__dirname,`server-close-${Date.now()}.json`),JSON.stringify(result,null,2));await context.close();await browser.close();await db.$disconnect();console.log(JSON.stringify(result))}
}
main().catch(async error=>{console.error(error);await db.$disconnect();process.exitCode=1})
