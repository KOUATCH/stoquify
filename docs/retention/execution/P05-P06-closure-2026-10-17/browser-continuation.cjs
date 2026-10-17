// Reconnect to the SAME committed operation. Never submits another sale.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/J COMPUTER/AppData/Local/ms-playwright'
const { chromium } = require('playwright'), { expect } = require('@playwright/test'), { PrismaClient } = require('@prisma/client')
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'))
const prior = read('BROWSER_RECOVERY.json'), fixture = read('BROWSER_FIXTURE.json'), target = read('DATABASE_TARGET.json'), app = read('APPLICATION_TARGET.json')
assert(prior.committedBeforeResponseDrop)
assert.equal(app.database, target.database); assert.equal(app.origin, 'http://127.0.0.1:3187')
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
  const output = path.join(__dirname, 'BROWSER_CONTINUATION.json')
  if (fs.existsSync(output)) {
    const invalid = read('BROWSER_CONTINUATION.json')
    if (!invalid.enText?.includes('Loading your current access')) throw new Error('Inspect previous continuation before rerunning')
    for (const file of ['BROWSER_CONTINUATION.json', 'P05_EN_RECONNECTED.png', 'P05_FR_RECONNECTED.png']) {
      const absolute = path.join(__dirname, file)
      if (fs.existsSync(absolute)) fs.renameSync(absolute, path.join(__dirname, 'INVALID_SELECTOR-' + file))
    }
  }
  const browser = await chromium.launch({ headless: true }), context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const result = { utc: new Date().toISOString(), browser: browser.version(), steps: [], limitation: 'Fresh browser reconnect to original server-retained operation; not same-tab sessionStorage durability proof' }
  let page
  try {
    assert.deepEqual(await snapshot(), prior.committedBeforeResponseDrop.state)
    await context.route('**/*', route => new URL(route.request().url()).origin === app.origin ? route.continue() : route.abort())
    const auth = await context.request.post(app.origin + '/api/auth/sign-in/email', { data: { email: fixture.email, password: 'Retention-Synthetic-Only-2026!', rememberMe: true }, headers: { Origin: app.origin }, timeout: 180000 })
    assert.equal(auth.status(), 200)
    page = await context.newPage()
    for (const locale of ['en', 'fr']) {
      console.log('Recovering original committed operation in ' + locale)
      await page.goto(app.origin + `/${locale}/dashboard/pos`, { waitUntil: 'domcontentloaded', timeout: 600000 })
      // Server reconciliation may present a settled operation in the lifecycle
      // panel rather than the still-pending recovery panel. Require the original
      // order reference in visible text and inspect the exact copy in evidence.
      const recorded = page.getByRole('status').filter({ hasText: prior.committedBeforeResponseDrop.state.sale.orderNumber }).first()
      await expect(recorded).toBeVisible({ timeout: 600000 })
      result[locale + 'RecordedStatus'] = await recorded.innerText()
      result[locale + 'Text'] = await page.locator('body').innerText()
      result[locale + 'Snapshot'] = await snapshot()
      assert.deepEqual(result[locale + 'Snapshot'], prior.committedBeforeResponseDrop.state)
      await page.screenshot({ path: path.join(__dirname, `P05_${locale.toUpperCase()}_RECONNECTED.png`), fullPage: true })
      result.steps.push({ locale, result: 'PASS', claim: 'Original sale reference rendered after reconnect; financial snapshot unchanged' })
    }
    result.status = 'PASS'
  } catch (error) { result.status = 'FAIL'; result.failure = error.message; process.exitCode = 1 }
  finally {
    if (page) { result.url = page.url(); result.finalText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => 'Unavailable') }
    fs.writeFileSync(output, JSON.stringify(result, null, 2))
    await context.close(); await browser.close(); await db.$disconnect()
  }
}
main().catch(async error => { console.error(error.message); process.exitCode = 1; await db.$disconnect() })
