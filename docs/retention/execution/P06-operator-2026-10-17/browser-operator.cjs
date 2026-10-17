// Actual authenticated Next action journey. Only synthetic records in our
// recorded disposable DB; fixture injection uses the production queue helper.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto')
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/J COMPUTER/AppData/Local/ms-playwright'
const { chromium } = require('playwright'), { PrismaClient } = require('@prisma/client'), ts = require('typescript')
const expect = require('@playwright/test').expect.configure({timeout:90000})
const root = path.resolve(__dirname,'../../../..'), read = name => JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'))
const f = read('BROWSER_FIXTURE.json'), app = read('APPLICATION_TARGET.json'), target = read('DATABASE_TARGET.json')
assert.equal(app.origin,'http://127.0.0.1:3187'); assert.equal(app.database,target.database)
assert.equal(target.host,'localhost'); assert.equal(target.user,'retention_fixture'); assert.match(target.database,/^stoquify_pos_audit_20261017_[a-f0-9]+$/)
const db = new PrismaClient({ datasources:{db:{url:`postgresql://retention_fixture@localhost:${target.port}/${target.database}?schema=public`}} })
const queueCode = ts.transpileModule(fs.readFileSync(path.join(root,'lib/pos/offline-local-queue.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText
const hash = s => crypto.createHash('sha256').update(s).digest('hex')
const policyHash = hash('p06-operator-policy'), sourceHash = hash('p06-operator-reference')
const stable = v => JSON.stringify(sort(v))
function sort(v) { return Array.isArray(v) ? v.map(sort) : v && typeof v==='object' ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])) : v }
async function economicSnapshot() {
  const where = {organizationId:f.organizationId}
  return { commits:await db.pOSCommitResult.count({where}), payments:await db.payment.count({where:{salesOrderId:f.salesOrderId}}), movements:await db.inventoryTransaction.count({where}), journals:await db.journalEntry.count({where}), postings:await db.ledgerPostingBatch.count({where}), stock:String((await db.inventoryLevel.findFirstOrThrow({where:{itemId:f.itemId,locationId:f.locationId}})).quantityOnHand), shift:(await db.pOSSession.findUniqueOrThrow({where:{id:f.sessionId}})).status }
}
async function main() {
  const out = path.join(__dirname,`browser-${Date.now()}.json`), result = {utc:new Date().toISOString(),steps:[],fixture:f.organizationId,origin:app.origin}
  result.steps.push = function(...steps) { console.log(...steps); return Array.prototype.push.apply(this,steps) }
  assert.equal(await db.pOSOfflineEvent.count({where:{organizationId:f.organizationId}}),0,'Use a fresh synthetic fixture for each run')
  const {publicKey,privateKey} = crypto.generateKeyPairSync('rsa',{modulusLength:2048})
  const pem = publicKey.export({format:'pem',type:'spki'}).toString()
  await db.pOSOfflineDevice.update({where:{id:f.deviceId},data:{signingPublicKeyPem:pem,publicKeyFingerprint:hash(pem),policySnapshotHash:policyHash,sourceSnapshotHash:sourceHash}})
  const browser = await chromium.launch({headless:true}), context = await browser.newContext({viewport:{width:1366,height:768}})
  result.browser = browser.version(); result.viewport={width:1366,height:768}
  context.setDefaultTimeout(90000)
  let page, dropping=false, dropProof=null, capturedAction, closePosts=0
  const originalId = crypto.randomUUID()
  await context.route('**/*',async route=>{
    const request=route.request(), url=new URL(request.url()), body=request.postData()||''
    if(url.origin!==app.origin) return route.abort()
    if(url.pathname==='/__p06_queue.js') return route.fulfill({contentType:'text/javascript',body:queueCode})
    if(request.method()==='POST' && request.headers()['next-action']) {
      if(body.includes('actualBalance')) closePosts++
      if(body.includes(originalId)) {
        capturedAction={body,headers:request.headers(),url:request.url()}
        if(dropping) {
          const response=await route.fetch({timeout:180000,maxRetries:0})
          const record=await db.pOSOfflineEvent.findFirst({where:{organizationId:f.organizationId,idempotencyKey:originalId}})
          if(record) {dropProof={id:record.id,status:record.status,payloadHash:record.payloadHash}; await context.setOffline(true); return route.abort('connectionfailed')}
          return route.fulfill({response})
        }
      }
    }
    return route.continue()
  })
  const installQueue = async () => page.evaluate(async()=>{window.p06queue=await import('/__p06_queue.js')})
  const config = deviceId=>({organizationKey:f.organizationId,deviceId,locationId:f.locationId,terminalId:f.terminalId,sessionId:f.sessionId})
  async function seed(deviceId, idempotencyKey) {
    const payload={commitSale:f.request}, payloadHash=hash(stable(payload)), entryHash=hash([deviceId,'1','OFFLINE_SALE_CAPTURED','1',payloadHash,''].join('|'))
    const input={eventType:'OFFLINE_SALE_CAPTURED',payload,idempotencyKey,policySnapshotHash:policyHash,sourceSnapshotHash:sourceHash,signature:crypto.sign('sha256',Buffer.from(entryHash),privateKey).toString('base64')}
    const entry=await page.evaluate(async({config,input})=>window.p06queue.enqueueOfflineLocalEvent(config,input),{config:config(deviceId),input})
    assert.equal(entry.event.entryHash,entryHash)
    return entry
  }
  const state = deviceId=>page.evaluate(config=>window.p06queue.loadOfflineLocalQueue(config),config(deviceId))
  const row = deviceId=>page.getByTestId('local-offline-queue').filter({hasText:deviceId})
  try {
    result.before=await economicSnapshot()
    const auth=await context.request.post(app.origin+'/api/auth/sign-in/email',{data:{email:f.email,password:'Retention-Synthetic-Only-2026!',rememberMe:true},headers:{Origin:app.origin},timeout:300000})
    assert.equal(auth.status(),200,'Actual credential sign-in')
    page=await context.newPage()
    await page.goto(app.origin+'/en/dashboard/pos',{waitUntil:'domcontentloaded',timeout:600000})
    await expect(page.getByTestId('local-offline-recovery')).toBeVisible({timeout:300000})
    await installQueue()
    const original=await seed(f.deviceId,originalId)
    await expect(row(f.deviceId)).toContainText('1 awaiting server acknowledgement')
    assert.equal(await db.pOSOfflineEvent.count({where:{organizationId:f.organizationId}}),0)
    await page.getByRole('button',{name:'End shift',exact:true}).click()
    const dialog=page.getByRole('dialog')
    await dialog.getByLabel('Counted cash',{exact:true}).fill('100')
    await dialog.locator('button.dashboard-button-primary').filter({hasText:'Close'}).click()
    await expect(dialog).toContainText('Shift close is blocked while local offline evidence')
    assert.equal(closePosts,0,'Local blocker prevents server close submission')
    await page.screenshot({path:path.join(__dirname,'LOCAL_CLOSE_BLOCKED.png'),fullPage:false})
    await page.keyboard.press('Escape')
    result.steps.push('Never-uploaded evidence visible; local close prevented before any close action')
    await context.setOffline(true)
    await expect(row(f.deviceId).getByRole('button',{name:'Send retained evidence'})).toBeDisabled()
    await expect(row(f.deviceId)).toContainText('Reconnect to send')
    await context.setOffline(false)
    await expect(row(f.deviceId).getByRole('button',{name:'Send retained evidence'})).toBeEnabled()
    dropping=true
    await row(f.deviceId).getByRole('button',{name:'Send retained evidence'}).click()
    await expect.poll(()=>dropProof,{timeout:240000}).not.toBeNull()
    await expect.poll(async()=>(await state(f.deviceId)).entries[0].status,{timeout:120000}).toBe('UNCERTAIN')
    assert.deepEqual((await state(f.deviceId)).entries[0].event,original.event)
    result.dropProof=dropProof
    await page.screenshot({path:path.join(__dirname,'LOCAL_UNCERTAIN.png'),fullPage:false})
    result.steps.push('Actual authenticated signed ingestion committed; response lost; immutable evidence remains UNCERTAIN')
    dropping=false; await context.setOffline(false)
    await page.reload({waitUntil:'domcontentloaded',timeout:300000}); await installQueue()
    await expect(row(f.deviceId)).toContainText('1 awaiting server acknowledgement',{timeout:180000})
    const send=row(f.deviceId).getByRole('button',{name:'Send retained evidence'})
    await expect(send).toBeEnabled(); await send.focus(); await expect(send).toBeFocused(); await page.keyboard.press('Enter')
    await expect(row(f.deviceId)).toContainText('1 acknowledged evidence',{timeout:180000})
    assert.equal(await db.pOSOfflineEvent.count({where:{organizationId:f.organizationId,idempotencyKey:originalId}}),1)
    assert.deepEqual((await state(f.deviceId)).entries[0].event,original.event)
    assert.deepEqual(await economicSnapshot(),result.before)
    result.steps.push('Reload/reconnect and keyboard retry acknowledge the same event once; no sale/payment/stock/ledger effects')
    // Auth/tenant checks exercise the captured real action; no test-only API.
    assert.ok(capturedAction)
    const anon=await browser.newContext()
    const headers={'content-type':capturedAction.headers['content-type'],'next-action':capturedAction.headers['next-action'],'Origin':app.origin}
    const batches=await db.pOSOfflineSyncBatch.count({where:{organizationId:f.organizationId}})
    const denied=await anon.request.post(capturedAction.url,{headers,data:capturedAction.body,timeout:180000,maxRedirects:0})
    assert.ok([303,307,308].includes(denied.status()),'Unauthenticated request must redirect to login before action execution')
    assert.match(new URL(denied.headers().location,app.origin).pathname,/\/login$/)
    result.unauthenticatedBoundary={status:denied.status(),destination:new URL(denied.headers().location,app.origin).pathname}
    await anon.close()
    const foreignBody=capturedAction.body.replace('"deviceId":','"organizationId":"foreign-synthetic-org","deviceId":')
    assert.notEqual(foreignBody,capturedAction.body)
    const foreign=await context.request.post(capturedAction.url,{headers,data:foreignBody,timeout:180000})
    assert.match(await foreign.text(),/FORBIDDEN|Forbidden|tenant|organization/i)
    assert.equal(await db.pOSOfflineSyncBatch.count({where:{organizationId:f.organizationId}}),batches)
    result.steps.push('Unauthenticated action and spoofed tenant denied without an extra batch')
    for(const mode of ['expired','revoked']) {
      const device=await db.pOSOfflineDevice.create({data:{organizationId:f.organizationId,locationId:f.locationId,terminalId:f.terminalId,deviceFingerprintHash:crypto.randomUUID(),deviceLabel:'Synthetic '+mode,status:mode==='revoked'?'REVOKED':'ACTIVE',policyExpiresAt:new Date(mode==='expired'?0:Date.now()+86400000),policySnapshotHash:policyHash,sourceSnapshotHash:sourceHash,signingPublicKeyPem:pem,publicKeyFingerprint:hash(pem)}})
      const retained=await seed(device.id,crypto.randomUUID())
      await expect(row(device.id)).toBeVisible()
      await row(device.id).getByRole('button',{name:'Send retained evidence'}).click()
      await expect(row(device.id)).toContainText('1 requiring review',{timeout:180000})
      await expect(row(device.id).getByRole('button',{name:'Send retained evidence'})).toBeDisabled()
      assert.deepEqual((await state(device.id)).entries[0].event,retained.event)
      const conflict=await db.pOSOfflineSyncConflict.findFirstOrThrow({where:{deviceId:device.id}})
      assert.ok(conflict)
      result.steps.push(mode+' policy/device: real server conflict, retained evidence and manager path; no retry/clear escape')
    }
    await page.goto(app.origin+'/fr/dashboard/pos',{waitUntil:'domcontentloaded',timeout:300000}); await installQueue()
    await expect(page.getByTestId('local-offline-recovery')).toContainText('Preuves hors ligne dans ce navigateur',{timeout:180000})
    await expect(page.getByTestId('local-offline-recovery')).toContainText('ne modifiez ni ne supprimez ces preuves')
    await page.setViewportSize({width:390,height:844})
    await page.getByTestId('local-offline-recovery').scrollIntoViewIfNeeded()
    const bounds=await page.getByTestId('local-offline-recovery').boundingBox()
    assert.ok(bounds.width<=390)
    await page.screenshot({path:path.join(__dirname,'LOCAL_FR_MOBILE.png'),fullPage:false})
    result.steps.push('French manager recovery and retained counts survive route reload at mobile width')
    result.after=await economicSnapshot(); assert.deepEqual(result.after,result.before)
    result.status='PASS'
  } catch(error) { result.status='FAIL'; result.error=error.stack; if(page) {await page.screenshot({path:path.join(__dirname,`FAIL-${Date.now()}.png`)}).catch(()=>{}); fs.writeFileSync(path.join(__dirname,`FAIL-${Date.now()}.txt`),await page.locator('body').innerText().catch(()=>''))}; process.exitCode=1 }
  finally { fs.writeFileSync(out,JSON.stringify(result,null,2)); await context.close(); await browser.close(); await db.$disconnect(); console.log(result.status,result.steps.length,result.error||'') }
}
main().catch(async error=>{console.error(error);await db.$disconnect();process.exitCode=1})
