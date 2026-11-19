// Controlled AF02 browser check: real Next route, Better Auth, protected actions,
// and the dedicated synthetic PostgreSQL fixture. No application .env is loaded.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const { PrismaClient } = require('@prisma/client')
const axe = require('axe-core')
const run = process.env.AF02_BROWSER_RUN || '2026-10-19-run-01'
assert.match(run, /^2026-10-19-run-\d{2}$/)
const output = path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF02', run)
fs.mkdirSync(output, { recursive: true })
const privateFile = 'C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993/af02-browser-private.json'
const base = 'http://127.0.0.1:3037'
async function main() {
  const fixture = JSON.parse(fs.readFileSync(privateFile, 'utf8'))
  const target = new URL(fixture.url)
  assert.equal(target.hostname, '127.0.0.1'); assert.equal(target.port, '55441')
  assert.equal(target.pathname, '/stoquify_local_af02_browser_20261019_r1')
  const db = new PrismaClient({ datasources: { db: { url: fixture.url } } })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.setDefaultTimeout(60000)
  const report = { synthetic: true, authentication: 'Better Auth email/password; real protected actions and PostgreSQL', checks: [], screenshots: [], pageErrors: [] }
  page.on('pageerror', error => report.pageErrors.push(error.message))
  const waitClient = async name => page.locator('#accountant-portfolio-workspace').getByRole('heading', { name, exact: true }).waitFor()
  const shot = async name => { await page.screenshot({ path: path.join(output, name + '.png'), fullPage: false }); report.screenshots.push(name + '.png') }
  const signin = async () => {
    const response = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: fixture.email, password: fixture.password }, headers: { Origin: base }, timeout: 180000 })
    assert.equal(response.status(), 200, 'Synthetic sign-in must succeed')
  }
  try {
    assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name, target.pathname.slice(1))
    await db.role.update({ where: { id: 'af02-role' }, data: { permissions: ['accounting.audit.read', 'accounting.close.read'] } })
    await db.organization.update({ where: { id: 'af02-firm' }, data: { requestedModules: ['accounting', 'close_assurance'] } })
    await db.accountantAccessGrant.update({ where: { id: 'af02-grant-000' }, data: { status: 'ACTIVE', activeScopeKey: 'af02-client-000:af02-actor', expiresAt: new Date('2099-01-01'), revokedAt: null } })
    await signin()
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false })
    for (const locale of ['en', 'fr']) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
        await page.goto(`${base}/${locale}/dashboard/accounting/accountant-portfolio?pageSize=10`, { waitUntil: 'domcontentloaded', timeout: 240000 })
        await waitClient('Synthetic Client 001')
        await page.locator('#accountant-work-title').waitFor()
        await page.locator('#portfolio-search').focus()
        await page.keyboard.press('Tab')
        assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), locale === 'fr' ? 'Rechercher' : 'Search')
        await page.keyboard.press('Enter')
        await waitClient('Synthetic Client 001')
        await page.waitForFunction(() => document.activeElement?.id === 'portfolio-heading')
        const scope = page.locator('#accountant-portfolio-workspace')
        assert((await scope.innerText()).includes(locale === 'fr' ? 'Justificatifs périmés' : 'Evidence stale'))
        assert((await scope.innerText()).includes('100%'))
        const geometry = await scope.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }))
        assert(geometry.scroll <= geometry.client + 1, 'Workspace must not overflow horizontally')
        assert((await page.locator('#portfolio-search').boundingBox()).width >= 200, 'Search field must remain usable on mobile')
        await page.addScriptTag({ content: axe.source })
        const accessibility = await page.evaluate(async () => window.axe.run('#accountant-portfolio-workspace', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }))
        const violations = accessibility.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) }))
        report.checks.push({ locale, width, keyboardSubmitAndHeadingRecovery: true, geometry, axeViolations: violations })
        await page.locator('#portfolio-heading').scrollIntoViewIfNeeded()
        await shot(`portfolio-${locale}-${width}`)
        assert.equal(violations.length, 0, 'Scoped axe violations')
        console.log(`Passed rendered ${locale} ${width}px, keyboard recovery and scoped axe`)
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`${base}/en/dashboard/accounting/accountant-portfolio?pageSize=20`, { waitUntil: 'domcontentloaded' })
    const names = []
    for (let start = 1; start <= 105; start += 20) {
      await waitClient(`Synthetic Client ${String(start).padStart(3, '0')}`)
      names.push(...await page.locator('#accountant-portfolio-workspace article h3').allTextContents())
      if (start < 101) await page.getByRole('link', { name: 'Continue portfolio', exact: true }).click()
    }
    assert.equal(names.length, 105); assert.equal(new Set(names).size, 105)
    assert.equal(await page.getByRole('link', { name: 'Continue portfolio', exact: true }).count(), 0)
    report.checks.push({ traversal: '105 unique authorized clients / 6 real service pages' })

    const transportFailure = async route => {
      if (route.request().headers()['next-action'] && route.request().postData()?.includes('"pageSize":20')) { await route.abort('failed'); await page.unroute('**/dashboard/accounting/accountant-portfolio**', transportFailure) }
      else await route.continue()
    }
    await page.locator('section[aria-labelledby="accountant-work-title"][aria-busy="false"]').waitFor()
    await page.route('**/dashboard/accounting/accountant-portfolio**', transportFailure)
    await page.getByRole('button', { name: 'Refresh access and evidence' }).click()
    await page.getByRole('heading', { name: 'Portfolio unavailable', exact: true }).waitFor()
    assert.equal(await page.locator('#accountant-portfolio-workspace article').count(), 0)
    await shot('transport-failure-retry')
    await page.getByRole('button', { name: 'Retry', exact: true }).click()
    await waitClient('Synthetic Client 101')
    report.checks.push({ transientFailure: 'one browser transport failure injected; private cards removed and real action retry succeeds' })

    await page.getByRole('searchbox').fill('Synthetic Client 001')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await waitClient('Synthetic Client 001')
    const evidenceHref = await page.getByRole('link', { name: /Open ledger evidence:/ }).getAttribute('href')
    assert.equal(new URL(evidenceHref, base).searchParams.get('clientOrganizationId'), 'af02-client-000')
    assert.equal(new URL(evidenceHref, base).searchParams.get('periodId'), 'af02-period-0')
    await page.getByRole('link', { name: /Open ledger evidence:/ }).click()
    await page.waitForURL(/accountant-portal\?.*periodId=af02-period-0/, { timeout: 180000 })
    await page.getByRole('heading', { name: 'Accountant Portal', exact: true }).waitFor()
    await shot('portal-client-period')
    report.checks.push({ evidenceNavigation: 'real guarded portal route; client and period preserved' })

    await page.goto(`${base}/en/dashboard/accounting/accountant-portfolio?search=Synthetic+Client+001`, { waitUntil: 'domcontentloaded' })
    await waitClient('Synthetic Client 001')
    await db.accountantAccessGrant.update({ where: { id: 'af02-grant-000' }, data: { status: 'REVOKED', activeScopeKey: null, revokedAt: new Date() } })
    await page.getByRole('button', { name: 'Refresh access and evidence' }).click()
    await page.getByRole('heading', { name: 'No accessible clients on this page' }).waitFor()
    assert.equal(await page.locator('#accountant-portfolio-workspace article').count(), 0)
    await shot('changed-grant-empty')
    await page.goto(base + evidenceHref, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Accountant Portal', exact: true }).waitFor()
    assert(!(await page.locator('main').innerText()).includes('Synthetic Client 001'))
    report.checks.push({ revokedGrant: 'removed on refresh; direct portal revisit does not expose client name' })

    await page.goto(`${base}/en/dashboard/accounting/accountant-portfolio`, { waitUntil: 'domcontentloaded' })
    await waitClient('Synthetic Client 002')
    await db.role.update({ where: { id: 'af02-role' }, data: { permissions: [] } })
    await page.getByRole('button', { name: 'Refresh access and evidence' }).click()
    await page.getByRole('heading', { name: /Access unavailable|Accountant portfolio is not available for this role/ }).waitFor()
    assert.equal(await page.locator('#accountant-portfolio-workspace article').count(), 0)
    await shot('permission-denied')
    await db.role.update({ where: { id: 'af02-role' }, data: { permissions: ['accounting.audit.read', 'accounting.close.read'] } })
    if (await page.getByRole('button', { name: 'Retry', exact: true }).count()) await page.getByRole('button', { name: 'Retry', exact: true }).click()
    else await page.reload({ waitUntil: 'domcontentloaded' })
    await waitClient('Synthetic Client 002')
    await db.session.deleteMany({ where: { userId: 'af02-actor' } })
    await page.getByRole('button', { name: 'Refresh access and evidence' }).click()
    await page.waitForFunction(() => document.body.innerText.includes('Session needs renewal') || window.location.pathname.endsWith('/login'))
    assert.equal(await page.locator('#accountant-portfolio-workspace article').count(), 0)
    await shot('stale-session')
    report.checks.push({ permissionLossAndSessionRevocation: 'private cards removed; existing server guard/login recovery respected; restored permission reload succeeds' })
    await context.tracing.stop({ path: path.join(output, 'synthetic-browser-trace.zip') })
    // Sign-in credentials are deliberately outside the retained trace.
    await signin()
    // Empty legacy intent means full-suite access; use an explicit other module.
    await db.organization.update({ where: { id: 'af02-firm' }, data: { requestedModules: ['inventory'] } })
    for (const locale of ['en', 'fr']) {
      await page.goto(`${base}/${locale}/dashboard/accounting/accountant-portfolio`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: locale === 'fr' ? 'Module comptable indisponible' : 'Accounting module unavailable', exact: true }).waitFor()
      assert.equal(await page.locator('#accountant-portfolio-workspace article').count(), 0)
      await shot(`module-locked-${locale}`)
    }
    report.checks.push({ moduleLock: 'existing server route gate prevents portfolio mount' })
    report.passed = true
  } catch (error) {
    report.passed = false; report.failure = error.message
    await shot('failure').catch(() => {})
    await context.tracing.stop({ path: path.join(output, 'synthetic-browser-failed-trace.zip') }).catch(() => {})
    process.exitCode = 1
  } finally {
    await db.role.update({ where: { id: 'af02-role' }, data: { permissions: ['accounting.audit.read', 'accounting.close.read'] } })
    await db.organization.update({ where: { id: 'af02-firm' }, data: { requestedModules: ['accounting', 'close_assurance'] } })
    await db.session.deleteMany({ where: { userId: 'af02-actor' } })
    report.sessionsRevokedAfterCapture = true
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
    await context.close(); await browser.close(); await db.$disconnect()
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1 })
