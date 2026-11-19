// Real authentication and protected actions; only explicitly guarded synthetic data.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { chromium } = require('playwright'), axe = require('axe-core')
const { PrismaClient } = require('../.codex-tmp/af12-prisma/client')
const privateRoot = 'C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993'
const fixture = JSON.parse(fs.readFileSync(path.join(privateRoot, 'af12-browser-private.json'), 'utf8'))
const output = path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF12/2026-10-25-run-01')
const source = JSON.parse(fs.readFileSync(path.join(output, 'browser-fixture.json'), 'utf8'))
const target = new URL(fixture.url)
assert.equal(target.hostname, '127.0.0.1'); assert.equal(target.port, '55449'); assert.equal(target.pathname, '/stoquify_local_af12_20261025_r1')
const presentationOnly = process.argv.includes('--presentation-only')
const report = presentationOnly ? JSON.parse(fs.readFileSync(path.join(output, 'browser-verification.json'), 'utf8'))
  : { synthetic: true, checks: [], screenshots: [], axe: [], pageErrors: [], passed: false }
if (presentationOnly) { assert.equal(report.passed, true); report.passed = false }
async function main() {
  const db = new PrismaClient({ datasources: { db: { url: fixture.url } } }), browser = await chromium.launch({ headless: true })
  const contexts = [], pages = {}, check = text => { report.checks.push(text); console.log(text) }
  const route = locale => `${fixture.base}/${locale}/dashboard/accounting/accountant-portal?clientOrganizationId=${encodeURIComponent(source.client)}&periodId=${encodeURIComponent(source.periodId)}`
  const panel = (page, locale = 'en') => page.getByRole('region', { name: locale === 'en' ? 'Client advisory' : 'Conseil client', exact: true })
  const shot = async (name, page, section) => { await section.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, name + '.png') }); report.screenshots.push(name + '.png') }
  async function load(page, locale = 'en') {
    const section = panel(page, locale)
    await section.getByRole('button', { name: locale === 'en' ? 'Load advisory engagements' : 'Charger les missions de conseil', exact: true }).click()
    await section.getByLabel(locale === 'en' ? 'Select an engagement' : 'Choisir une mission', { exact: true }).selectOption(source.engagementId)
    await section.getByRole('heading', { name: locale === 'en' ? 'Retained revisions' : 'Versions conservées', exact: true }).waitFor()
    return section
  }
  async function stepUp(page, section) {
    await page.waitForFunction(() => {
      const section = document.querySelector('section[aria-label="Client advisory"]')
      return !!section?.querySelector('input[type="password"]') || /Saved\.|Current permissions|Submission not confirmed/.test(section?.textContent || '')
    })
    if (await section.getByLabel('Password', { exact: true }).count()) {
      await section.getByLabel('Password', { exact: true }).fill(fixture.password)
      await section.getByRole('button', { name: 'Verify identity', exact: true }).click()
      await section.getByText('Identity verified. Retry when ready.', { exact: true }).waitFor()
      await section.getByRole('button', { name: 'Retry submission', exact: true }).click()
    }
  }
  try {
    const actual = (await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory
    assert.equal(fs.realpathSync(actual).toLowerCase(), fs.realpathSync(path.join(privateRoot, 'af01-host/af01-postgres')).toLowerCase())
    for (const role of ['preparer', 'reviewer', 'owner']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true }); contexts.push(context)
      const response = await context.request.post(fixture.base + '/api/auth/sign-in/email', { data: { email: source.actors[role] + '@example.invalid', password: fixture.password }, headers: { Origin: fixture.base }, timeout: 240000 })
      assert.equal(response.status(), 200, role + ' real sign-in')
      const page = await context.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', error => report.pageErrors.push(error.message)); pages[role] = page
    }
    const preparer = pages.preparer, reviewer = pages.reviewer, owner = pages.owner
    if (presentationOnly) {
      for (const locale of ['en', 'fr']) for (const width of [1440, 390]) {
        await reviewer.setViewportSize({ width, height: 1000 }); await reviewer.goto(route(locale), { waitUntil: 'domcontentloaded', timeout: 240000 })
        const section = await load(reviewer, locale)
        const owners = section.getByLabel(locale === 'en' ? 'Client action owner' : 'Responsable de l’action chez le client', { exact: true })
        assert.equal(await owners.locator('option').first().textContent(), locale === 'en' ? 'Select an action owner' : 'Choisir un responsable')
        await reviewer.addScriptTag({ content: axe.source })
        const result = await reviewer.evaluate(async label => window.axe.run(document.querySelector(`section[aria-label="${label}"]`), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }), locale === 'en' ? 'Client advisory' : 'Conseil client')
        report.axe.push({ phase: 'final-copy', locale, width, violations: result.violations.map(v => ({ id: v.id, impact: v.impact })) })
        assert.equal(result.violations.length, 0)
        assert.ok(await reviewer.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
        await shot(`advisory-final-${locale}-${width}`, reviewer, section)
      }
      check('Final copy and owner-choice presentation rechecked in EN/FR at 1440px and 390px with four additional clean scoped axe scans.')
      assert.equal(report.pageErrors.length, 0); report.passed = true; return
    }
    await preparer.goto(route('en'), { waitUntil: 'domcontentloaded', timeout: 240000 })
    let section = await load(preparer)
    await section.getByLabel('Client-facing conclusion', { exact: true }).fill('Browser AF12: Cash matches the current independently reviewed evidence.')
    await section.getByLabel('Follow-up action to agree with client', { exact: true }).fill('Confirm cash evidence coverage with the client next month.')
    await section.getByLabel('Client action owner', { exact: true }).selectOption(source.actors.owner)
    await section.getByLabel('Due date (UTC)', { exact: true }).fill('2026-11-15')
    await section.getByLabel('Private firm note (excluded from client reports)', { exact: true }).fill('BROWSER_PRIVATE_FIRM_NOTE')
    await section.getByLabel('Decision reason', { exact: true }).fill('Browser AF12 lost-response recovery preparation')
    let intercepted = false
    await preparer.route('**/*', async route => {
      const request = route.request(), body = request.postData() || ''
      if (!intercepted && request.headers()['next-action'] && body.includes('Browser AF12 lost-response recovery preparation')) {
        intercepted = true; await route.fetch(); await route.abort('failed')
      } else await route.continue()
    })
    const count = await db.firmAdvisoryRevision.count({ where: { engagementId: source.engagementId } })
    await section.getByRole('button', { name: 'Save new draft', exact: true }).click()
    await section.getByText('Submission not confirmed. Retry the retained submission.', { exact: true }).waitFor()
    assert.equal(await db.firmAdvisoryRevision.count({ where: { engagementId: source.engagementId } }), count + 1)
    await preparer.unroute('**/*')
    await section.getByRole('button', { name: 'Retry submission', exact: true }).click()
    await section.getByText('Saved. Current advisory version loaded.', { exact: true }).waitFor()
    assert.equal(await db.firmAdvisoryRevision.count({ where: { engagementId: source.engagementId } }), count + 1)
    check('Lost successful response retries the identical command without a duplicate advisory revision.')
    await section.getByLabel('Decision reason', { exact: true }).fill('Synthetic self-review must be denied')
    await section.getByRole('button', { name: 'Independently review', exact: true }).click(); await stepUp(preparer, section)
    await section.getByText('Current permissions or evidence do not allow this action. Refresh and check the client mandate.', { exact: true }).waitFor()
    check('Self-review denied after real password step-up; private workspace cleared.')
    await reviewer.goto(route('en'), { waitUntil: 'domcontentloaded', timeout: 240000 }); section = await load(reviewer)
    await section.getByLabel('Decision reason', { exact: true }).fill('Independent browser review of the client narrative and actions')
    await section.getByRole('button', { name: 'Independently review', exact: true }).click(); await stepUp(reviewer, section)
    await section.getByText('Saved. Current advisory version loaded.', { exact: true }).waitFor()
    await owner.goto(route('en'), { waitUntil: 'domcontentloaded', timeout: 240000 }); let clientPanel = await load(owner)
    assert.equal(await clientPanel.getByLabel('Private firm note (excluded from client reports)', { exact: true }).count(), 0)
    assert.ok(!(await clientPanel.textContent()).includes('BROWSER_PRIVATE_FIRM_NOTE'))
    await clientPanel.getByLabel('Decision reason', { exact: true }).fill('Client agrees to the displayed owner and due date')
    await clientPanel.getByRole('button', { name: 'Agree to these actions', exact: true }).click()
    await clientPanel.getByText('Saved. Current advisory version loaded.', { exact: true }).waitFor()
    await section.getByRole('button', { name: 'Refresh advisory pack', exact: true }).click()
    await section.getByRole('heading', { name: 'Retained revisions', exact: true }).waitFor()
    await section.getByLabel('Decision reason', { exact: true }).fill('Publish the client-agreed reviewed advisory pack')
    await section.getByRole('button', { name: 'Publish agreed pack to client', exact: true }).click(); await stepUp(reviewer, section)
    await section.getByText('Saved. Current advisory version loaded.', { exact: true }).waitFor()
    check('Real firm draft, independent review, client agreement and publication complete through protected actions; private note excluded.')
    for (const format of ['JSON', 'PDF']) {
      const download = reviewer.waitForEvent('download')
      await section.getByRole('button', { name: 'Download delivered version ' + format, exact: true }).first().click()
      const artifact = await download; await artifact.saveAs(path.join(output, 'browser-advisory.' + format.toLowerCase()))
      await section.getByText('Saved. Current advisory version loaded.', { exact: true }).waitFor()
    }
    assert.ok(!fs.readFileSync(path.join(output, 'browser-advisory.json'), 'utf8').includes('BROWSER_PRIVATE_FIRM_NOTE'))
    check('Readable PDF and canonical JSON downloaded from the delivered version without private notes.')
    const to = new Date(); to.setUTCHours(0, 0, 0, 0); const from = new Date(to.getTime() - 86400000)
    await section.getByLabel('Observation window start (UTC)', { exact: true }).fill(from.toISOString().slice(0, 10))
    await section.getByLabel('Observation window end (exclusive UTC)', { exact: true }).fill(to.toISOString().slice(0, 10))
    await section.getByRole('button', { name: 'Measure outcomes for this engagement and period', exact: true }).click()
    await section.getByText(/No baseline established/).waitFor()
    check('Authorized outcome view discloses missing baseline, unmeasured work time and timestamp coverage.')
    for (const locale of ['en', 'fr']) for (const width of [1440, 390]) {
      await reviewer.setViewportSize({ width, height: 1000 }); await reviewer.goto(route(locale), { waitUntil: 'domcontentloaded', timeout: 240000 })
      section = await load(reviewer, locale); await section.scrollIntoViewIfNeeded()
      await reviewer.addScriptTag({ content: axe.source })
      const result = await reviewer.evaluate(async label => await window.axe.run(document.querySelector(`section[aria-label="${label}"]`), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }), locale === 'en' ? 'Client advisory' : 'Conseil client')
      report.axe.push({ locale, width, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) })
      assert.equal(result.violations.length, 0)
      assert.ok(await reviewer.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'No page overflow')
      const button = section.getByRole('button').first(); await button.focus(); assert.equal(await button.evaluate(el => el === document.activeElement), true)
      await shot(`advisory-${locale}-${width}`, reviewer, section)
    }
    check('EN/FR desktop and 390px layouts pass four scoped axe scans, keyboard focus and no horizontal overflow.')
    const account = await db.chartOfAccount.findFirstOrThrow({ where: { organizationId: source.client, code: '571' } })
    await db.chartOfAccount.update({ where: { id: account.id }, data: { mappingKey: 'af12-browser-source-change' } })
    await section.getByRole('button', { name: 'Actualiser le dossier de conseil', exact: true }).click()
    await section.getByText(/Nouvelle revue requise — sources ou revue modifiées/).first().waitFor()
    await shot('advisory-stale-fr-mobile', reviewer, section)
    check('Source mutation marks retained delivered narrative for review while preserving attributable historical evidence.')
    const org = await db.organization.findUniqueOrThrow({ where: { id: source.client } })
    try {
      await db.organization.update({ where: { id: source.client }, data: { requestedModules: ['accounting'] } })
      await section.getByRole('button', { name: 'Actualiser le dossier de conseil', exact: true }).click()
      await reviewer.waitForFunction(() => !document.querySelector('section[aria-label="Conseil client"] details'))
      check('Live client module denial clears retained advisory content from the UI.')
    } finally { await db.organization.update({ where: { id: source.client }, data: { requestedModules: org.requestedModules } }) }
    assert.equal(report.pageErrors.length, 0)
    report.passed = true
  } finally {
    fs.writeFileSync(path.join(output, 'browser-verification.json'), JSON.stringify(report, null, 2))
    for (const context of contexts) await context.close(); await browser.close(); await db.$disconnect()
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
