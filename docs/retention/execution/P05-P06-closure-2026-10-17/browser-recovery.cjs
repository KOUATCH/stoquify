const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/J COMPUTER/AppData/Local/ms-playwright'
const { chromium } = require('playwright')
const { expect } = require('@playwright/test')
const { PrismaClient } = require('@prisma/client')
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'))
const fixture = read('BROWSER_FIXTURE.json'), app = read('APPLICATION_TARGET.json'), target = read('DATABASE_TARGET.json')
const prefix = process.argv[2] === 'postfix' ? 'POSTFIX_' : ''
assert.equal(app.origin, 'http://127.0.0.1:3187')
assert.equal(app.database, target.database)
assert.match(target.database, /^stoquify_pos_audit_20261017_[a-f0-9]+$/)
const db = new PrismaClient({ datasources: { db: { url: `postgresql://retention_fixture@localhost:${target.port}/${target.database}?schema=public` } } })
async function snapshot() {
  const where = { organizationId: fixture.organizationId }
  const [sale, stock, customer, records, payments, movements, journals, postings, ledger] = await Promise.all([
    db.salesOrder.findUniqueOrThrow({ where: { id: fixture.salesOrderId }, select: { id: true, orderNumber: true, status: true, total: true } }),
    db.inventoryLevel.findFirstOrThrow({ where: { itemId: fixture.itemId, locationId: fixture.locationId }, select: { quantityOnHand: true, totalValue: true } }),
    db.customer.findUniqueOrThrow({ where: { id: fixture.customerId }, select: { currentBalance: true } }),
    db.pOSCommitResult.findMany({ where, select: { clientCommitId: true, salesOrderId: true, status: true } }),
    db.payment.count({ where: { salesOrderId: fixture.salesOrderId } }), db.inventoryTransaction.count({ where }),
    db.journalEntry.count({ where }), db.ledgerPostingBatch.count({ where }), db.customerLedgerEntry.count({ where }),
  ])
  return JSON.parse(JSON.stringify({ sale, stock, customer, records, payments, movements, journals, postings, ledger }))
}
async function main() {
  const resultPath = path.join(__dirname, prefix + 'BROWSER_RECOVERY.json')
  if (fs.existsSync(resultPath)) {
    const prior = read(prefix + 'BROWSER_RECOVERY.json')
    if (prior.status !== 'FAIL' || prior.committedBeforeResponseDrop) throw new Error('Inspect committed/prior successful state before another journey')
    const stamp = Date.now()
    for (const name of ['BROWSER_RECOVERY.json', 'BROWSER_RECOVERY_BODY.txt', 'BROWSER_RECOVERY_FINAL.png']) {
      const file = path.join(__dirname, prefix + name)
      if (fs.existsSync(file)) fs.renameSync(file, path.join(__dirname, `${stamp}-${name}`))
    }
  }
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  context.setDefaultTimeout(90000)
  const result = { utc: new Date().toISOString(), browser: browser.version(), viewport: { width: 1366, height: 768 }, fixture: fixture.salesOrderId, steps: [], errors: [] }
  let page, intercept = false, dropped = false
  let signalDrop
  const didDrop = new Promise(resolve => { signalDrop = resolve })
  await context.route('**/*', async route => {
    const req = route.request()
    if (new URL(req.url()).origin !== app.origin) return route.abort()
    if (intercept && !dropped && req.method() === 'POST' && req.headers()['next-action'] && (req.postData() || '').includes(fixture.request.clientCommitId)) {
      try {
        const response = await route.fetch({ timeout: 180000, maxRetries: 0 })
        const state = await snapshot()
        if (state.sale.status === 'COMPLETED' && state.records.some(r => r.clientCommitId === fixture.request.clientCommitId)) {
          dropped = true
          result.committedBeforeResponseDrop = { utc: new Date().toISOString(), state }
          await context.setOffline(true)
          await route.abort('connectionfailed')
          signalDrop()
          return
        }
        await route.fulfill({ response })
      } catch (error) { result.errors.push('Intercept: ' + error.message); await route.abort().catch(() => {}) }
      return
    }
    return route.continue()
  })
  try {
    result.before = await snapshot()
    assert.equal(result.before.records.length, 0, 'Fixture must be uncommitted before the browser journey')
    console.log('Authenticating synthetic cashier')
    const auth = await context.request.post(app.origin + '/api/auth/sign-in/email', { data: { email: fixture.email, password: 'Retention-Synthetic-Only-2026!', rememberMe: true }, headers: { Origin: app.origin }, timeout: 240000 })
    assert.equal(auth.status(), 200, 'Real credential sign-in')
    page = await context.newPage()
    page.on('pageerror', error => result.errors.push(error.message))
    console.log('Rendering actual English POS recovery')
    await page.goto(app.origin + '/en/dashboard/pos', { waitUntil: 'domcontentloaded', timeout: 600000 })
    console.log('English POS DOM received; waiting for retained request')
    const panel = page.getByTestId('pos-commit-recovery')
    const retryLoad = page.getByRole('button', { name: 'Try again', exact: true })
    await Promise.race([panel.waitFor({ state: 'visible', timeout: 600000 }), retryLoad.waitFor({ state: 'visible', timeout: 600000 })])
    if (await retryLoad.isVisible()) {
      result.steps.push({ step: 'initial POS read failed; explicitly retried read-only load', status: 'OBSERVED' })
      await retryLoad.click()
    }
    await expect(panel).toBeVisible({ timeout: 600000 })
    await expect(panel).toContainText(fixture.request.clientCommitId)
    const retry = panel.getByRole('button', { name: /retry original/i })
    await expect(retry).toBeEnabled({ timeout: 180000 })
    result.steps.push({ step: 'original retained intent and exact retry available', status: 'PASS' })
    intercept = true
    await retry.focus(); await page.keyboard.press('Enter')
    let deadline
    try { await Promise.race([didDrop, new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('No durable commit observed before response suppression')), 180000) })]) }
    finally { clearTimeout(deadline) }
    await expect(page.locator('body')).toContainText('The result could not be verified.', { timeout: 30000 })
    result.uncertainText = await page.locator('body').innerText()
    result.retainedAfterDrop = await page.evaluate(({ organizationId, userId }) => sessionStorage.getItem(`stoquify:pos:pending-sale:v1:${encodeURIComponent(organizationId)}:${encodeURIComponent(userId)}`), fixture)
    assert.equal(JSON.parse(result.retainedAfterDrop).request.clientCommitId, fixture.request.clientCommitId)
    await page.screenshot({ path: path.join(__dirname, prefix + 'P05_EN_UNCERTAIN.png'), fullPage: true })
    result.steps.push({ step: 'response lost after independently confirmed commit; original intent retained', status: 'PASS' })
    intercept = false
    await context.setOffline(false)
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 240000 })
    const recorded = page.getByRole('status').filter({ hasText: result.committedBeforeResponseDrop.state.sale.orderNumber }).first()
    await expect(recorded).toBeVisible({ timeout: 600000 })
    result.englishRecoveredText = await recorded.innerText()
    result.afterEnglishRecovery = await snapshot()
    assert.deepEqual(result.afterEnglishRecovery, result.committedBeforeResponseDrop.state)
    assert.equal(result.afterEnglishRecovery.records.length, 1)
    assert.equal(result.afterEnglishRecovery.movements, 1)
    assert.equal(result.afterEnglishRecovery.journals, 2)
    await page.screenshot({ path: path.join(__dirname, prefix + 'P05_EN_RECOVERED.png'), fullPage: true })
    result.steps.push({ step: 'reload recovers original recorded sale without a second effect set', status: 'PASS' })
    console.log('Rendering French recovery for the same retained operation')
    // Restore the exact bytes captured after response loss to exercise French
    // recovery after English reconciliation consumed its one-time notice.
    await page.evaluate(({ fixture, retained }) => sessionStorage.setItem(`stoquify:pos:pending-sale:v1:${encodeURIComponent(fixture.organizationId)}:${encodeURIComponent(fixture.userId)}`, retained), { fixture, retained: result.retainedAfterDrop })
    result.frenchFixture = 'Exact captured pending bytes restored in same tab; original operation unchanged'
    await page.goto(app.origin + '/fr/dashboard/pos', { waitUntil: 'domcontentloaded', timeout: 240000 })
    await expect(recorded).toBeVisible({ timeout: 600000 })
    result.frenchRecoveredText = await recorded.innerText()
    result.afterFrenchRecovery = await snapshot()
    assert.deepEqual(result.afterFrenchRecovery, result.afterEnglishRecovery)
    await page.screenshot({ path: path.join(__dirname, prefix + 'P05_FR_RECOVERED.png'), fullPage: true })
    result.steps.push({ step: 'French recovery of captured original intent preserves financial result', status: 'PASS' })
    result.status = 'PASS'
  } catch (error) { result.status = 'FAIL'; result.failure = error.message; process.exitCode = 1 }
  finally {
    if (page) {
      result.url = page.url()
      fs.writeFileSync(path.join(__dirname, prefix + 'BROWSER_RECOVERY_BODY.txt'), await page.locator('body').innerText({ timeout: 10000 }).catch(() => 'Unavailable'))
      await page.screenshot({ path: path.join(__dirname, prefix + 'BROWSER_RECOVERY_FINAL.png'), fullPage: true, timeout: 15000 }).catch(() => {})
    }
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2))
    await context.close(); await browser.close(); await db.$disconnect()
  }
}
main().catch(async error => { console.error(error.message); process.exitCode = 1; await db.$disconnect() })
