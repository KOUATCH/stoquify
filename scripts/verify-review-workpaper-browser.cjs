// Real Better Auth / protected actions on the guarded synthetic AF08 database.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict")
const { chromium } = require("playwright"), axe = require("axe-core")
const { PrismaClient } = require("../.codex-tmp/af07-prisma/client")
const privateRoot = "C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993"
const fixture = JSON.parse(fs.readFileSync(path.join(privateRoot, "af08-browser-private.json"), "utf8"))
const output = path.resolve("docs/accounting-firms/roadmap-2026-10-19/execution/AF08/2026-10-20-run-01")
const source = JSON.parse(fs.readFileSync(path.join(output, "browser-fixture.json"), "utf8"))
const target = new URL(fixture.url)
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.port, "55441"); assert.equal(target.pathname, "/stoquify_local_af08_20261020_r1")
const moduleRecoveryOnly = process.argv.includes("--module-recovery-only")
const report = moduleRecoveryOnly
  ? JSON.parse(fs.readFileSync(path.join(output, "browser-verification.json"), "utf8"))
  : { synthetic: true, checks: [], screenshots: [], axe: [], pageErrors: [], passed: false }
if (moduleRecoveryOnly) {
  assert.equal(report.checks.length, 7, "Retain the completed journey, layout and stale-source evidence before targeted recovery")
  assert.equal(report.axe.length, 4)
  assert.ok(report.axe.every(row => row.violations.length === 0))
  report.passed = false
}
async function main() {
  const db = new PrismaClient({ datasources: { db: { url: fixture.url } } }), browser = await chromium.launch({ headless: true })
  const pages = {}, contexts = []
  const check = value => { report.checks.push(value); console.log(value) }
  const shot = async (name, page) => { await page.screenshot({ path: path.join(output, name + ".png"), fullPage: false }); report.screenshots.push(name + ".png") }
  const route = locale => `${fixture.base}/${locale}/dashboard/accounting/accountant-portal?clientOrganizationId=${encodeURIComponent(source.client)}&periodId=${encodeURIComponent(source.periodId)}`
  const load = async (page, locale = "en") => {
    const section = page.locator("#portal-workpapers")
    await section.getByRole("button", { name: locale === "en" ? "Load / refresh workpapers" : "Charger / actualiser le dossier", exact: true }).click()
    await section.getByRole("heading", { name: locale === "en" ? "Cash / settlement" : "Trésorerie / règlements", exact: true }).waitFor()
    return section
  }
  const verifyModuleDenial = async (page, section) => {
    const organization = await db.organization.findUniqueOrThrow({ where: { id: source.client } })
    try {
      // An empty list means legacy defaults in Stoquify. Keep accounting selected
      // and explicitly omit close_assurance to exercise a real module denial.
      await db.organization.update({ where: { id: source.client }, data: { requestedModules: ["accounting"] } })
      await section.getByRole("button", { name: "Charger / actualiser le dossier", exact: true }).click()
      await section.getByText("Les accès ou justificatifs actuels ne permettent pas cette action. Actualisez le dossier et vérifiez le mandat client.", { exact: true }).waitFor()
      assert.equal(await section.getByRole("heading", { name: "Trésorerie / règlements", exact: true }).count(), 0)
      await shot("workpaper-module-denied-fr-mobile", page)
      check("Current target module denial clears client figures from the workpaper panel.")
    } finally { await db.organization.update({ where: { id: source.client }, data: { requestedModules: organization.requestedModules } }) }
  }
  try {
    const actual = (await db.$queryRawUnsafe("SHOW data_directory"))[0].data_directory
    assert.equal(fs.realpathSync(actual).toLowerCase(), fs.realpathSync(path.join(privateRoot, "af01-host/af01-postgres")).toLowerCase())
    for (const role of ["preparer", "reviewer"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", acceptDownloads: true })
      contexts.push(context)
      const response = await context.request.post(fixture.base + "/api/auth/sign-in/email", { data: {
        email: source.actors[role] + "@example.invalid", password: fixture.password,
      }, headers: { Origin: fixture.base }, timeout: 240000 })
      assert.equal(response.status(), 200, role + " real sign-in")
      const page = await context.newPage(); page.setDefaultTimeout(60000)
      page.on("pageerror", error => report.pageErrors.push(error.message))
      pages[role] = page
    }
    const preparer = pages.preparer, reviewer = pages.reviewer
    if (moduleRecoveryOnly) {
      await reviewer.setViewportSize({ width: 390, height: 1000 })
      await reviewer.goto(route("fr"), { waitUntil: "domcontentloaded", timeout: 240000 })
      const section = await load(reviewer, "fr")
      await section.scrollIntoViewIfNeeded()
      await verifyModuleDenial(reviewer, section)
      report.passed = true
      report.recovery = "Targeted module-denial rerun after correcting the synthetic fixture's legacy-default module selection."
      return
    }
    await preparer.goto(route("en"), { waitUntil: "domcontentloaded", timeout: 240000 })
    let section = await load(preparer)
    await section.scrollIntoViewIfNeeded(); await shot("workpaper-schedules-en-desktop", preparer)
    await section.getByLabel("Preparation or review conclusion", { exact: true }).fill("Browser AF08 preparation: inspected four current account schedules.")
    await section.getByRole("button", { name: "Record preparation", exact: true }).click()
    await section.getByText("Recorded. Current workpapers refreshed.", { exact: true }).waitFor()
    check("Named firm preparer records the exact source-bound preparation through the real protected action.")
    await section.getByLabel("Preparation or review conclusion", { exact: true }).fill("Attempted self-review must not approve my preparation.")
    await section.getByRole("button", { name: "Record independent review", exact: true }).click()
    if (await section.getByLabel("Password", { exact: true }).isVisible().catch(() => false)) {
      await section.getByLabel("Password", { exact: true }).fill(fixture.password)
      await section.getByRole("button", { name: "Verify identity", exact: true }).click()
      await section.getByText("Identity verified. Retry when ready.", { exact: true }).waitFor()
      await section.getByRole("button", { name: "Retry saved submission", exact: true }).click()
    }
    // Wait for either password step-up or the expected domain denial.
    await preparer.waitForFunction(() => document.querySelector("#portal-workpapers")?.textContent.includes("Current access or evidence") ||
      !!document.querySelector('#portal-workpapers input[type="password"]'))
    if (await section.getByLabel("Password", { exact: true }).count()) {
      await section.getByLabel("Password", { exact: true }).fill(fixture.password)
      await section.getByRole("button", { name: "Verify identity", exact: true }).click()
      await section.getByText("Identity verified. Retry when ready.", { exact: true }).waitFor()
      await section.getByRole("button", { name: "Retry saved submission", exact: true }).click()
    }
    await section.getByText("Current access or evidence does not permit this action. Refresh the workpapers and check your client mandate.", { exact: true }).waitFor()
    check("Self-review is denied by the service, including after real fresh authentication.")
    await reviewer.goto(route("en"), { waitUntil: "domcontentloaded", timeout: 240000 })
    section = await load(reviewer)
    await section.getByLabel("Preparation or review conclusion", { exact: true }).fill("Browser AF08 independent review: all four pilot schedules tie exactly.")
    await section.getByRole("button", { name: "Record independent review", exact: true }).click()
    await reviewer.waitForFunction(() => document.querySelector("#portal-workpapers")?.textContent.includes("Recorded. Current workpapers refreshed.") ||
      !!document.querySelector('#portal-workpapers input[type="password"]'))
    if (await section.getByLabel("Password", { exact: true }).count()) {
      await section.getByLabel("Password", { exact: true }).fill(fixture.password)
      await section.getByRole("button", { name: "Verify identity", exact: true }).click()
      await section.getByText("Identity verified. Retry when ready.", { exact: true }).waitFor()
      await section.getByRole("button", { name: "Retry saved submission", exact: true }).click()
      check("Independent reviewer completes a real password step-up and explicitly retries.")
    }
    await section.getByText("Recorded. Current workpapers refreshed.", { exact: true }).waitFor()
    check("Independent reviewer records review without certifying the Close run.")
    const downloads = []
    for (const format of ["JSON", "CSV", "PDF"]) {
      const waiting = reviewer.waitForEvent("download")
      await section.getByRole("button", { name: "Export " + format, exact: true }).click()
      const download = await waiting
      const file = `browser-workpapers.${format.toLowerCase()}`
      await download.saveAs(path.join(output, file)); downloads.push(file)
      await section.getByText("Recorded. Current workpapers refreshed.", { exact: true }).waitFor()
      await section.getByRole("button", { name: "Export JSON", exact: true }).waitFor({ state: "visible" })
    }
    const canonical = JSON.parse(fs.readFileSync(path.join(output, downloads[0]), "utf8"))
    assert.equal(canonical.organizationId, source.client); assert.equal(canonical.periodId, source.periodId); assert.equal(canonical.reviewState, "REVIEWED")
    assert.ok(canonical.decisions.every(row => row.conclusion === "[REDACTED]"))
    const records = await db.closePackExport.findMany({ where: { organizationId: source.client, watermarkId: canonical.watermarkId } })
    assert.equal(records.length, 1); assert.equal(records[0].isCertified, false)
    assert.equal((await db.accountantReview.count({ where: { organizationId: source.client, status: "APPROVED_FOR_CLOSE" } })), 0)
    check("JSON, CSV and PDF download from one retained canonical publication; exported conclusions are redacted.")
    for (const [locale, width] of [["en", 1440], ["en", 390], ["fr", 1440], ["fr", 390]]) {
      await reviewer.setViewportSize({ width, height: 1000 })
      await reviewer.goto(route(locale), { waitUntil: "domcontentloaded", timeout: 240000 })
      section = await load(reviewer, locale)
      await section.scrollIntoViewIfNeeded()
      assert.ok(await section.evaluate(element => element.scrollWidth <= element.clientWidth + 1), "No binder horizontal overflow")
      await reviewer.addScriptTag({ content: axe.source })
      const result = await reviewer.evaluate(async () => window.axe.run("#portal-workpapers", { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }))
      report.axe.push({ locale, width, violations: result.violations.map(row => ({ id: row.id, impact: row.impact, nodes: row.nodes.length })) })
      assert.equal(result.violations.length, 0, "Scoped WCAG scan")
      await shot(`workpaper-${locale}-${width}`, reviewer)
    }
    check("English/French desktop/mobile binder: no horizontal overflow and four scoped axe scans with zero violations.")
    const account = await db.chartOfAccount.findFirstOrThrow({ where: { organizationId: source.client, code: "571" } })
    await db.chartOfAccount.update({ where: { id: account.id }, data: { mappingKey: "af08-browser-source-changed" } })
    section = await load(reviewer, "fr")
    await section.getByText("Sources modifiées — nouvelle revue requise", { exact: true }).waitFor()
    await shot("workpaper-stale-fr-mobile", reviewer)
    check("A changed source immediately removes current amounts and marks the former review stale on refresh.")
    await verifyModuleDenial(reviewer, section)
    report.passed = true
  } finally {
    fs.writeFileSync(path.join(output, "browser-verification.json"), JSON.stringify(report, null, 2))
    for (const context of contexts) await context.close()
    await browser.close(); await db.$disconnect()
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
