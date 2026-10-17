// Actual application presentation while remote POS reads are unavailable.
// Creates only synthetic browser-local evidence; never sends that fixture.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript')
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/J COMPUTER/AppData/Local/ms-playwright'
const {chromium}=require('playwright'),expect=require('@playwright/test').expect.configure({timeout:90000})
const root=path.resolve(__dirname,'../../../..'),f=JSON.parse(fs.readFileSync(path.join(__dirname,'BROWSER_FIXTURE.json'),'utf8')),app=JSON.parse(fs.readFileSync(path.join(__dirname,'APPLICATION_TARGET.json'),'utf8'))
assert.equal(app.origin,'http://127.0.0.1:3187')
const source=ts.transpileModule(fs.readFileSync(path.join(root,'lib/pos/offline-local-queue.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText
async function main(){
  const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:390,height:844}}),result={utc:new Date().toISOString(),steps:[],scope:'actual authenticated app; injected remote read failures; synthetic local-only evidence; no sync submission'}
  let page,failReads=false,posts=0
  await context.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==app.origin)return route.abort();if(url.pathname==='/__p06_queue.js')return route.fulfill({contentType:'text/javascript',body:source});if(failReads&&req.method()==='POST'&&req.headers()['next-action']){posts++;return route.abort('connectionfailed')}return route.continue()})
  try{
    const auth=await context.request.post(app.origin+'/api/auth/sign-in/email',{data:{email:f.email,password:'Retention-Synthetic-Only-2026!'},headers:{Origin:app.origin},timeout:180000});assert.equal(auth.status(),200)
    page=await context.newPage();failReads=true
    await page.goto(app.origin+'/fr/dashboard/pos',{waitUntil:'domcontentloaded',timeout:300000})
    const panel=page.getByTestId('local-offline-recovery');await expect(panel).toBeVisible()
    await page.evaluate(async config=>{const q=await import('/__p06_queue.js');await q.enqueueOfflineLocalEvent(config,{eventType:'OFFLINE_SESSION_EVIDENCE',payload:{syntheticReadState:true}})}, {organizationKey:f.organizationId,deviceId:'synthetic-local-only-read-state',locationId:f.locationId,terminalId:f.terminalId,sessionId:f.sessionId})
    await expect(panel).toContainText("1 en attente d'accusé de réception")
    await expect(panel).toContainText('En attente de vérification de la session')
    const colors=await panel.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,width:el.getBoundingClientRect().width}))
    assert.notEqual(colors.background,'rgba(0, 0, 0, 0)');assert.notEqual(colors.background,'rgb(255, 255, 255)');assert.ok(colors.width<=390)
    await expect(panel.getByRole('button',{name:'Envoyer les preuves conservées'})).toBeDisabled()
    await panel.screenshot({path:path.join(__dirname,'LOCAL_FR_READ_FAILURE.png')})
    result.steps.push('French local evidence remains readable and retained at 390px during remote read failures; unverified session cannot send')
    result.colors=colors;result.failedRemotePosts=posts;assert.ok(posts>0)
    await context.setOffline(true);await expect(panel).toContainText('Reconnectez-vous pour envoyer')
    await expect(panel).toContainText("1 en attente d'accusé de réception")
    result.steps.push('Actual browser offline transition keeps local evidence and recovery copy visible')
    result.status='PASS'
  }catch(error){result.status='FAIL';result.error=error.stack;process.exitCode=1}
  finally{fs.writeFileSync(path.join(__dirname,`read-states-${Date.now()}.json`),JSON.stringify(result,null,2));await context.close();await browser.close();console.log(JSON.stringify(result))}
}
main().catch(error=>{console.error(error);process.exitCode=1})
