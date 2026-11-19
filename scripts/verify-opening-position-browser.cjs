// Real protected-action verification, restricted to the retained synthetic AF09 cluster.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict")
const { chromium } = require("playwright"), axe = require("axe-core")
const { PrismaClient } = require("../.codex-tmp/af09-prisma/client")
const privateRoot = "C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993"
const fixture = JSON.parse(fs.readFileSync(path.join(privateRoot, "af09-browser-private.json"), "utf8"))
const output = path.resolve("docs/accounting-firms/roadmap-2026-10-19/execution/AF09/2026-10-20-run-01")
const source = JSON.parse(fs.readFileSync(path.join(output, "browser-fixture.json"), "utf8"))
const target = new URL(fixture.url)
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55449"); assert.equal(target.pathname, "/stoquify_local_af09_20261020_r1")
const mismatchOnly = process.argv.includes("--mismatch-only")
const report = mismatchOnly ? JSON.parse(fs.readFileSync(path.join(output, "browser-verification.json"), "utf8"))
  : { synthetic: true, checks: [], screenshots: [], axe: [], pageErrors: [], passed: false }
if (mismatchOnly) { assert.equal(report.passed, true, "Completed main journey required"); report.passed = false }
async function main() {
  const db = new PrismaClient({ datasources: { db: { url: fixture.url } } }), browser = await chromium.launch({ headless: true })
  const contexts = [], pages = {}
  const check = text => { report.checks.push(text); console.log(text) }
  const route = locale => `${fixture.base}/${locale}/dashboard/accounting/opening-position?clientOrganizationId=${encodeURIComponent(source.client)}`
  const shot = async (name, page) => { await page.screenshot({ path: path.join(output, name + ".png") }); report.screenshots.push(name + ".png") }
  const load = async (page, locale = "en") => {
    const section = page.locator("#opening-position-workbench")
    const button = section.getByRole("button", { name: locale === "en" ? "Load / refresh preview" : "Charger / actualiser l’aperçu", exact: true })
    // SSR can expose the button before hydration on a cold development build.
    // Retry only this read if the first click emitted no server-action request.
    let sent = false
    for (let attempt = 0; attempt < 2 && !sent; attempt++) {
      const request = page.waitForRequest(r => r.method() === "POST" && r.url().includes("/accounting/opening-position"), { timeout: 15000 }).then(() => true, () => false)
      await button.click(); sent = await request
    }
    assert.ok(sent, "Read action dispatched after hydration")
    try { await section.getByRole("heading", { name: locale === "en" ? "Current evidence" : "Justificatifs actuels", exact: true }).waitFor() }
    catch (error) { console.error("Preview state:", await section.innerText()); throw error }
    return section
  }
  const state = async () => ({
    journals: await db.journalEntry.count({ where: { organizationId: source.client } }),
    stock: await db.inventoryTransaction.count({ where: { organizationId: source.client } }),
    levels: await db.inventoryLevel.count({ where: { item: { organizationId: source.client }, location: { organizationId: source.client } } }),
    ar: await db.customerLedgerEntry.count({ where: { organizationId: source.client } }),
    ap: await db.supplierLedgerEntry.count({ where: { organizationId: source.client } }),
    customer: (await db.customer.findFirstOrThrow({ where: { organizationId: source.client } })).currentBalance.toString(),
    supplier: (await db.supplier.findFirstOrThrow({ where: { organizationId: source.client } })).currentBalance.toString(),
  })
  try {
    const actual = (await db.$queryRawUnsafe("SHOW data_directory"))[0].data_directory
    assert.equal(fs.realpathSync(actual).toLowerCase(), fs.realpathSync(path.join(privateRoot, "af01-host/af01-postgres")).toLowerCase())
    const before = await state()
    for (const role of ["preparer", "reviewer"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })
      contexts.push(context)
      const response = await context.request.post(fixture.base + "/api/auth/sign-in/email", {
        data: { email: source.actors[role] + "@example.invalid", password: fixture.password },
        headers: { Origin: fixture.base }, timeout: 240000,
      })
      assert.equal(response.status(), 200, role + " sign-in")
      pages[role] = await context.newPage(); pages[role].setDefaultTimeout(60000)
      pages[role].on("pageerror", error => report.pageErrors.push(error.message))
    }
    const preparer = pages.preparer, reviewer = pages.reviewer
    let section
    await preparer.goto(route("en"), { waitUntil: "domcontentloaded", timeout: 240000 })
    if (!mismatchOnly) {
    section = await load(preparer)
    const upload = JSON.parse(fs.readFileSync("services/onboarding/__tests__/fixtures/af09-source.json", "utf8"))
    upload.evidenceReference = "Synthetic browser source " + Date.now()
    await section.getByLabel("Source position JSON", { exact: true }).setInputFiles({ name: "browser-source.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(upload)) })
    await section.getByLabel("Independent control totals JSON", { exact: true }).setInputFiles("services/onboarding/__tests__/fixtures/af09-controls.json")
    const groups = { accounts: "Accounts", customers: "Customers", suppliers: "Suppliers", items: "Items", locations: "Locations" }
    for (const [group, rows] of Object.entries(source.mappings)) for (const row of rows) {
      await section.getByLabel(`${groups[group]} · ${row.source}`, { exact: true }).selectOption(row.targetId)
    }
    await section.getByRole("button", { name: "Stage a new preview", exact: true }).click()
    await section.getByText("Recorded. Preview refreshed.", { exact: true }).waitFor()
    await section.getByText("Staged — awaiting independent review", { exact: true }).waitFor()
    check("Real preparer uploads separate source/control files, maps existing client records and stages a new revision.")
    await reviewer.goto(route("en"), { waitUntil: "domcontentloaded", timeout: 240000 })
    section = await load(reviewer)
    await section.getByLabel("Review conclusion", { exact: true }).fill("Independent synthetic source and control totals agree. Preview only.")
    await section.getByRole("button", { name: "Record independent preview review", exact: true }).click()
    await reviewer.waitForFunction(() => document.querySelector("#opening-position-workbench")?.textContent.includes("Recorded. Preview refreshed.") || !!document.querySelector('#opening-position-workbench input[type="password"]'))
    if (await section.getByLabel("Password", { exact: true }).count()) {
      await section.getByLabel("Password", { exact: true }).fill(fixture.password)
      await section.getByRole("button", { name: "Verify identity", exact: true }).click()
      await section.getByText("Identity verified. Retry when ready.", { exact: true }).waitFor()
      await section.getByRole("button", { name: "Retry saved submission", exact: true }).click()
      check("Reviewer completes password step-up and explicitly retries the saved command.")
    }
    await section.getByText("Independently reviewed preview", { exact: true }).waitFor()
    const latest = await db.financialOpeningRevision.findFirstOrThrow({ where: { organizationId: source.client }, orderBy: { revision: "desc" } })
    assert.equal(latest.status, "REVIEWED"); assert.equal(latest.reviewedById, source.actors.reviewer); assert.equal(latest.manifest.canApply, false)
    check("Independent review is persisted against the exact manifest; financial apply remains unavailable.")
    for (const [locale, width] of [["en", 1440], ["en", 390], ["fr", 1440], ["fr", 390]]) {
      await reviewer.setViewportSize({ width, height: 1000 })
      await reviewer.goto(route(locale), { waitUntil: "domcontentloaded", timeout: 240000 })
      section = await load(reviewer, locale)
      await section.scrollIntoViewIfNeeded()
      assert.ok(await section.evaluate(e => e.scrollWidth <= e.clientWidth + 1), "No preview overflow")
      await reviewer.addScriptTag({ content: axe.source })
      const scan = await reviewer.evaluate(async () => window.axe.run("#opening-position-workbench", { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }))
      report.axe.push({ locale, width, violations: scan.violations.map(r => ({ id: r.id, impact: r.impact, nodes: r.nodes.length })) })
      assert.equal(scan.violations.length, 0, "Scoped WCAG scan")
      await shot(`opening-${locale}-${width}`, reviewer)
    }
    check("EN/FR desktop/mobile: no panel overflow; four scoped axe scans without violations.")
    } else {
      await reviewer.setViewportSize({ width: 390, height: 1000 })
      await reviewer.goto(route("fr"), { waitUntil: "domcontentloaded", timeout: 240000 })
    }
    const draft = await load(preparer)
    await draft.getByRole("button", { name: "Revise retained source and mappings", exact: true }).click()
    const mismatch = JSON.parse(fs.readFileSync("services/onboarding/__tests__/fixtures/af09-controls.json", "utf8"))
    mismatch.ar = "99.00"
    await draft.getByLabel("Independent control totals JSON", { exact: true }).setInputFiles({ name: "independent-mismatch.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(mismatch)) })
    await draft.getByRole("button", { name: "Stage a new preview", exact: true }).click()
    await draft.getByText("Recorded. Preview refreshed.", { exact: true }).waitFor()
    section = await load(reviewer, "fr")
    await section.getByRole("row", { name: "Créances clients (XAF) 100.00 99.00 1.00", exact: true }).waitFor()
    await section.getByLabel("Conclusion de la revue", { exact: true }).fill("Le contrôle indépendant ne correspond pas aux créances.")
    assert.ok(await section.getByRole("button", { name: "Consigner la revue indépendante", exact: true }).isDisabled())
    assert.ok(await section.getByRole("button", { name: "Demander des corrections", exact: true }).isEnabled())
    await shot("opening-mismatch-fr-390", reviewer)
    check("A separately changed control produces a visible +1.00 AR difference, supersedes review and blocks positive review.")
    const accountId = source.mappings.accounts[0].targetId
    const account = await db.chartOfAccount.findUniqueOrThrow({ where: { id: accountId } })
    try {
      await db.chartOfAccount.update({ where: { id: accountId }, data: { nameEn: account.nameEn + " changed" } })
      section = await load(reviewer, "fr")
      await section.getByText("Données associées modifiées — nouvelle révision requise", { exact: true }).waitFor()
      assert.ok(await section.getByRole("button", { name: "Consigner la revue indépendante", exact: true }).isDisabled())
      await shot("opening-stale-fr-390", reviewer)
      check("A changed mapped master makes the former review stale and disables review.")
    } finally { await db.chartOfAccount.update({ where: { id: accountId }, data: { nameEn: account.nameEn } }) }
    const org = await db.organization.findUniqueOrThrow({ where: { id: source.client } })
    try {
      await db.organization.update({ where: { id: source.client }, data: { requestedModules: ["accounting"] } })
      await section.getByRole("button", { name: "Charger / actualiser l’aperçu", exact: true }).click()
      await section.getByText("Les accès ou justificatifs actuels ne permettent pas cette action. Actualisez et vérifiez le mandat client.", { exact: true }).waitFor()
      assert.equal(await section.locator("table").count(), 0)
      await shot("opening-denied-fr-390", reviewer)
      check("Current module denial clears figures, mappings and review evidence from the panel.")
    } finally { await db.organization.update({ where: { id: source.client }, data: { requestedModules: org.requestedModules } }) }
    report.financialBefore = before; report.financialAfter = await state()
    assert.deepEqual(report.financialAfter, before)
    assert.deepEqual(report.pageErrors, [])
    check("Operational journals, stock, ledger entries and customer/supplier balances remain unchanged.")
    report.passed = true
  } finally {
    fs.writeFileSync(path.join(output, "browser-verification.json"), JSON.stringify(report, null, 2))
    for (const context of contexts) await context.close()
    await browser.close(); await db.$disconnect()
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
