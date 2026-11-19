// Real protected-action verification, restricted to the retained synthetic AF10 cluster.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict")
const { chromium } = require("playwright"), axe = require("axe-core")
const { PrismaClient } = require("../.codex-tmp/af10-prisma/client")
const privateRoot = "C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993"
const fixture = JSON.parse(fs.readFileSync(path.join(privateRoot, "af10-browser-private.json"), "utf8"))
const output = path.resolve("docs/accounting-firms/roadmap-2026-10-19/execution/AF10/2026-10-20-run-01")
const source = JSON.parse(fs.readFileSync(path.join(output, "browser-fixture.json"), "utf8"))
const target = new URL(fixture.url)
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55449"); assert.equal(target.pathname, "/stoquify_local_af10_20261020_r1")
const report = { synthetic: true, checks: [], screenshots: [], axe: [], pageErrors: [], passed: false }
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
    for (const role of ["preparer", "reviewer", "owner"]) {
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
    check("Independent review is persisted against the exact manifest; preview review remains separate from financial authorization.")
    const owner = pages.owner
    await owner.goto(route("en"), { waitUntil: "domcontentloaded", timeout: 240000 })
    const cutover = (page, locale = "en") => page.getByRole("region", { name: locale === "en" ? "Controlled opening apply" : "Application contrôlée de l’ouverture", exact: true })
    const loadCutover = async (page, locale = "en") => {
      const panel = cutover(page, locale), button = panel.getByRole("button", { name: locale === "en" ? "Load / recover cutover" : "Charger / récupérer la reprise", exact: true })
      let sent = false
      for (let attempt = 0; attempt < 2 && !sent; attempt++) {
        const request = page.waitForRequest(r => r.method() === "POST" && r.url().includes("/accounting/opening-position"), { timeout: 15000 }).then(() => true, () => false)
        await button.click(); sent = await request
      }
      assert.ok(sent)
      await panel.getByRole("heading", { name: new RegExp(locale === "en" ? "Reviewed source" : "Source revue") }).waitFor()
      return panel
    }
    let panel = await loadCutover(owner)
    await panel.getByLabel("Financial approval conclusion", { exact: true }).fill("I independently authorize this synthetic source-bound financial opening for the empty client.")
    const scanForm = async state => {
      await owner.addScriptTag({ content: axe.source })
      const scan = await owner.evaluate(async () => window.axe.run(document.querySelector('[aria-label="Controlled opening apply"]'), { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }))
      report.axe.push({ state, locale: "en", width: 1440, violations: scan.violations.map(row => ({ id: row.id, impact: row.impact, nodes: row.nodes.length })) })
      assert.equal(scan.violations.length, 0, `Scoped ${state} accessibility`)
    }
    await scanForm("approval-form")
    await panel.scrollIntoViewIfNeeded()
    await shot("cutover-approval-form-en-1440", owner)
    await panel.getByRole("button", { name: "Approve financial cutover", exact: true }).click()
    await owner.waitForFunction(() => {
      const e = document.querySelector('[aria-label="Controlled opening apply"]')
      return e?.textContent.includes("Approved — financial apply pending") || !!e?.querySelector('input[type="password"]')
    })
    if (await panel.getByLabel("Password for financial confirmation", { exact: true }).count()) {
      await panel.getByLabel("Password for financial confirmation", { exact: true }).fill(fixture.password)
      await panel.getByRole("button", { name: "Verify financial identity", exact: true }).click()
      await panel.getByText("Identity verified. Retry when ready.", { exact: true }).waitFor()
      await panel.getByRole("button", { name: "Retry the same financial command", exact: true }).click()
      check("Client operator completes real password step-up and explicitly retries the separate financial approval.")
    }
    await panel.getByRole("heading", { name: "Approved — financial apply pending", exact: true }).waitFor()
    assert.deepEqual(await state(), before, "Approval does not post balances")
    assert.ok(await panel.getByRole("button", { name: "Apply approved opening", exact: true }).isDisabled())
    await panel.locator("input[type=checkbox]:enabled").waitFor()
    await panel.getByRole("checkbox").focus()
    await owner.keyboard.press("Space")
    assert.ok(await panel.getByRole("checkbox").isChecked())
    await scanForm("apply-form")
    await shot("cutover-approved-en-1440", owner)
    check("Financial approval persists without effects; keyboard confirmation enables apply. Approval/apply form axe scans have no violations.")
    assert.match(source.client, /^af10-[a-zA-Z0-9_-]+$/)
    await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION af10_browser_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'OPENING_APPLY_AFTER_STOCK' AND NEW."organizationId" = '${source.client}' THEN RAISE EXCEPTION 'AF10 browser synthetic failure'; END IF; RETURN NEW; END $$`)
    await db.$executeRawUnsafe("CREATE TRIGGER af10_browser_fail BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION af10_browser_fail()")
    try {
      await panel.getByRole("button", { name: "Apply approved opening", exact: true }).click()
      await panel.getByText("Outcome not confirmed. Load the recovery view or retry the same saved command; do not start another cutover.", { exact: true }).waitFor()
      assert.deepEqual(await state(), before)
      assert.equal((await db.financialOpeningExecution.findFirstOrThrow({ where: { organizationId: source.client } })).status, "APPROVED")
      await shot("cutover-rollback-retry-en-1440", owner)
      check("Real protected apply fails after stock; all financial effects roll back and UI retains the exact retry command.")
    } finally { await db.$executeRawUnsafe("DROP TRIGGER af10_browser_fail ON audit_logs") }
    // Execute the real protected action but lose only its browser response.
    let lost = false
    let signalLost
    const responseLost = new Promise(resolve => { signalLost = resolve })
    await owner.route("**/accounting/opening-position*", async intercepted => {
      if (!lost && intercepted.request().method() === "POST") {
        lost = true
        await intercepted.fetch({ timeout: 120000 })
        await intercepted.abort("failed")
        signalLost()
      } else await intercepted.continue()
    })
    await panel.getByRole("button", { name: "Retry the same financial command", exact: true }).click()
    await responseLost
    await panel.getByText("Outcome not confirmed. Load the recovery view or retry the same saved command; do not start another cutover.", { exact: true }).waitFor()
    await panel.getByRole("button", { name: "Retry the same financial command", exact: true }).waitFor({ state: "visible" })
    await owner.unroute("**/accounting/opening-position*")
    const committed = await db.financialOpeningExecution.findFirstOrThrow({ where: { organizationId: source.client } })
    assert.equal(committed.status, "ACTIVE"); assert.equal(lost, true)
    panel = await loadCutover(owner)
    await panel.getByRole("heading", { name: "Opening applied and reconciled", exact: true }).waitFor()
    const applied = await state()
    assert.deepEqual(applied, { journals: 1, stock: 1, levels: 1, ar: 1, ap: 1, customer: "100", supplier: "50" })
    await panel.getByRole("button", { name: "Retry the same financial command", exact: true }).click()
    await panel.getByText("Command recorded. Current results are shown below.", { exact: true }).waitFor()
    assert.deepEqual(await state(), applied)
    check("Lost response after real commit is recovered from ACTIVE receipt; exact retry does not duplicate financial effects.")
    for (const [locale, width] of [["en", 1440], ["en", 390], ["fr", 1440], ["fr", 390]]) {
      await owner.setViewportSize({ width, height: 1000 })
      await owner.goto(route(locale), { waitUntil: "domcontentloaded", timeout: 240000 })
      panel = await loadCutover(owner, locale)
      await panel.scrollIntoViewIfNeeded()
      assert.ok(await panel.evaluate(e => e.scrollWidth <= e.clientWidth + 1), "No cutover panel overflow")
      await owner.addScriptTag({ content: axe.source })
      const scan = await owner.evaluate(async () => window.axe.run(document.querySelector('[aria-label="Controlled opening apply"], [aria-label="Application contrôlée de l’ouverture"]'), { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }))
      report.axe.push({ locale, width, violations: scan.violations.map(row => ({ id: row.id, impact: row.impact, nodes: row.nodes.length })) })
      assert.equal(scan.violations.length, 0, "Scoped automated accessibility")
      await shot(`cutover-active-${locale}-${width}`, owner)
    }
    check("EN/FR desktop/mobile retained results: four axe scans without violations and no panel overflow.")
    panel = await loadCutover(reviewer)
    assert.equal(await panel.getByRole("button", { name: "Apply approved opening", exact: true }).count(), 0)
    await panel.getByText("Firm access permits inspection. Approval and apply require a client operator with current journal, stock approval, payable and customer permissions.", { exact: true }).waitFor()
    check("Named firm reviewer can inspect committed recovery evidence but has no client financial actions.")
    const org = await db.organization.findUniqueOrThrow({ where: { id: source.client } })
    try {
      await db.organization.update({ where: { id: source.client }, data: { requestedModules: ["accounting"] } })
      await panel.getByRole("button", { name: "Load / recover cutover", exact: true }).click()
      await panel.getByText("Access or source conditions changed. Refresh and review the current source, approval and period.", { exact: true }).waitFor()
      assert.equal(await panel.locator("article").count(), 0)
      await shot("cutover-denied-en-1440", reviewer)
      check("Current module denial clears retained financial details.")
    } finally { await db.organization.update({ where: { id: source.client }, data: { requestedModules: org.requestedModules } }) }
    report.financialBefore = before; report.financialAfter = applied
    report.reconciliation = committed.reconciliation
    assert.deepEqual(report.pageErrors, [])
    report.passed = true
  } finally {
    fs.writeFileSync(path.join(output, "browser-verification.json"), JSON.stringify(report, null, 2))
    for (const context of contexts) await context.close()
    await browser.close(); await db.$disconnect()
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
