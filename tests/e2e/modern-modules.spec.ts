import { expect, test, type Page, type TestInfo } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import axe from "axe-core"
import { COMMERCIAL_MODULE_SLUGS } from "../../services/modules/module-control-contracts"

const { Client } = require("pg")
const { DATABASE_NAME, BASE_URL, FIXTURES, EVIDENCE_DIR, readPrivateFixture, targetUrl } = require("../../scripts/modern-modules-local-verification")

type Fixture = { key: string; organizationId: string; email: string; journey: string; locale: "en" | "fr" }
type DatabaseState = { revision: number; activeRevision: number; active: string[]; stopped: string[]; transferCount: number; grants: string[]; commands: Array<{ id: string; state: string }>; lifecycle: { id: string; commandId: string; state: string } | null; events: string[] }
const labels = {
  en: { heading: "Build your workspace", retailer: "Retailer", service: "Service business", review: "Review configuration", dialog: "Review your configuration", apply: "Apply configuration", configure: "Configure", workspace: "My workspace", history: "Change history", reopen: "Reopen as new draft", denied: /is not available for this role/i },
  fr: { heading: "Composez votre espace de travail", retailer: "Commerce de détail", service: "Entreprise de services", review: "Examiner la configuration", dialog: "Examinez votre configuration", apply: "Appliquer la configuration", configure: "Configurer", workspace: "Mon espace", history: "Historique", reopen: "Rouvrir dans un nouveau brouillon", denied: /n’est pas disponible pour ce rôle/i },
}

function localeFor(info: TestInfo): "en" | "fr" { return info.project.name === "mobile-fr" ? "fr" : "en" }
function fixtureFor(info: TestInfo, journey: string): Fixture {
  const suffix = info.project.name === "mobile-fr" ? "fr_mobile" : "en_desktop"
  const fixture = FIXTURES.find((item: Fixture) => item.key === `${journey}_${suffix}`)
  if (!fixture) throw new Error("Missing isolated fixture for this browser journey")
  return fixture
}

async function databaseState(organizationId: string): Promise<DatabaseState> {
  if (process.env.MODERN_MODULES_LOCAL_VERIFICATION !== "1") throw new Error("Run through scripts/modern-modules-local-verification.js test")
  const client = new Client({ connectionString: targetUrl().toString(), connectionTimeoutMillis: 5000 })
  await client.connect()
  try {
    await client.query("BEGIN READ ONLY")
    const identity = await client.query("SELECT current_database() AS name")
    expect(identity.rows[0].name).toBe(DATABASE_NAME)
    const configuration = await client.query('SELECT revision, "activeRevision", "activeModules", "newWorkStoppedModules" FROM "tenant_module_configurations" WHERE "organizationId" = $1', [organizationId])
    const transfers = await client.query('SELECT count(*)::int AS count FROM stock_transfers WHERE "organizationId" = $1', [organizationId])
    const grants = await client.query('SELECT "moduleSlug" FROM "tenant_module_grants" WHERE "organizationId" = $1 ORDER BY "moduleSlug"', [organizationId])
    const commands = await client.query('SELECT id, state FROM "tenant_module_configuration_commands" WHERE "organizationId" = $1 ORDER BY "createdAt", id', [organizationId])
    const operations = await client.query('SELECT id, "commandId", state FROM "tenant_module_lifecycle_operations" WHERE "organizationId" = $1 ORDER BY "desiredRevision" DESC LIMIT 1', [organizationId])
    const lifecycle = operations.rows[0] ?? null
    const events = lifecycle ? await client.query('SELECT "eventType" FROM "tenant_module_lifecycle_events" WHERE "organizationId" = $1 AND "operationId" = $2 ORDER BY sequence', [organizationId, lifecycle.id]) : { rows: [] }
    return { revision: configuration.rows[0]?.revision ?? 0, activeRevision: configuration.rows[0]?.activeRevision ?? 0, active: configuration.rows[0]?.activeModules ?? [], stopped: configuration.rows[0]?.newWorkStoppedModules ?? [], transferCount: transfers.rows[0].count, grants: grants.rows.map((row: { moduleSlug: string }) => row.moduleSlug), commands: commands.rows, lifecycle, events: events.rows.map((row: { eventType: string }) => row.eventType) }
  } finally { await client.query("ROLLBACK"); await client.end() }
}

async function prepareFixture(fixture: Fixture, stage: "waiting" | "accounting" | "provider" | "pos" | "inventory-denial") {
  await promisify(execFile)(process.execPath, [path.resolve("scripts/run-modern-modules-lifecycle-fixture.js"), fixture.key, stage], { env: process.env, windowsHide: true, timeout: 60_000 })
}

async function openStopControls(page: Page, locale: "en" | "fr") {
  const summary = page.locator("summary").filter({ hasText: locale === "en" ? "Control new business operations" : "Contrôler les nouvelles opérations métier" })
  if (!(await summary.evaluate(node => node.parentElement?.hasAttribute("open")))) await summary.click()
  await expect(page.locator("#stop-inventory")).toBeVisible()
  return summary
}

async function resumeWithRealStepUp(page: Page, locale: "en" | "fr") {
  const panel = page.getByTestId("module-lifecycle")
  const resume = page.getByRole("button", { name: locale === "en" ? "Check inputs and resume preparation" : "Vérifier les données et reprendre", exact: true })
  await resume.click()
  const password = page.locator('input[type="password"]')
  await expect.poll(async () => await password.isVisible() || !(await resume.isVisible()) || await resume.isEnabled(), { timeout: 30_000 }).toBe(true)
  if (await password.isVisible()) {
    await password.fill(readPrivateFixture().password)
    await password.press("Enter")
  }
  await expect(password).toHaveCount(0, { timeout: 60_000 })
  await expect(panel).toBeVisible()
}

async function signIn(page: Page, fixture: Fixture, denied = false) {
  const privateFixture = readPrivateFixture()
  const response = await page.request.post(`${BASE_URL}/api/auth/sign-in/email`, {
    data: { email: denied ? "denied@modern-modules.stockflow.test" : fixture.email, password: privateFixture.password, rememberMe: false },
    headers: { Origin: BASE_URL },
  })
  expect(response.status(), "The genuine test-account sign-in must succeed").toBe(200)
  const permissions = await page.request.get(`${BASE_URL}/api/me/permissions`)
  expect(permissions.ok()).toBe(true)
  const payload = await permissions.json()
  const expectedOrganization = denied ? FIXTURES[0].organizationId : fixture.organizationId
  expect(payload.organizationId).toBe(expectedOrganization)
  const canManage = (payload.permissions ?? []).some((permission: string) => ["MANAGE_SYSTEM_SETTINGS", "system.settings.update"].includes(permission))
  expect(canManage).toBe(!denied)
  // A supplied foreign tenant header must not change the authenticated tenant.
  const isolated = await page.request.get(`${BASE_URL}/api/me/permissions`, { headers: { "x-organization-id": FIXTURES.find((item: Fixture) => item.organizationId !== expectedOrganization).organizationId } })
  expect(isolated.ok()).toBe(true)
  expect((await isolated.json()).organizationId).toBe(expectedOrganization)
}

async function openWorkbench(page: Page, locale: "en" | "fr") {
  const started = Date.now()
  const response = await page.goto(`/${locale}/dashboard/settings/modules`, { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBe(200)
  await expect(page.getByTestId("module-composition-workbench")).toBeVisible()
  await expect(page.getByTestId("module-composition-workbench")).toHaveAttribute("data-hydrated", "true")
  await expect(page.getByRole("heading", { name: labels[locale].heading, exact: true })).toBeVisible()
  return Date.now() - started
}

async function capture(page: Page, info: TestInfo, name: string, facts: Record<string, unknown> = {}) {
  const directory = path.join(EVIDENCE_DIR, "screenshots")
  await mkdir(directory, { recursive: true })
  const prefix = `${info.project.name}-${name}`
  // Avoid capturing any authentication field, including a recoverable failure.
  await expect(page.locator('input[type="password"]')).toHaveCount(0)
  let evidenceTarget = "viewport"
  if (await page.getByRole("dialog").count() === 0 && !facts.reviewButton) {
    const selector = name.includes("preparation-") ? "#module-lifecycle-title" : name.includes("retained-workspace") ? "#module-retained-title" : /workspace|history/.test(name) ? '[role="tabpanel"][data-state="active"] h2' : null
    if (selector) {
      const target = page.locator(selector).first()
      await expect(target).toBeVisible()
      await target.evaluate(node => node.scrollIntoView({ block: "start", behavior: "instant" }))
      await page.evaluate(() => window.scrollBy({ top: -80, behavior: "instant" }))
      await expect(target).toBeInViewport()
      evidenceTarget = selector
    } else {
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }))
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    }
    await page.evaluate(async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    })
  }
  const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollY, scrollX, overflowPx: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth, viewportTopTag: document.elementFromPoint(innerWidth / 2, 40)?.tagName ?? null }))
  expect(layout.overflowPx).toBeLessThanOrEqual(2)
  await page.screenshot({ path: path.join(directory, `${prefix}.png`), fullPage: false, animations: "disabled", scale: "css" })
  await writeFile(path.join(directory, `${prefix}.json`), JSON.stringify({
    classification: "ISOLATED_APPLICATION_VERIFICATION", productionApproval: false, capturedAt: new Date().toISOString(),
    url: page.url(), project: info.project.name, layout, evidenceTarget, ...facts,
  }, null, 2))
}

async function checkWorkbenchAccessibility(page: Page, scope = '[data-testid="module-composition-workbench"]') {
  await page.addScriptTag({ content: axe.source })
  const violations = await page.evaluate(async (selector) => {
    const engine = (window as unknown as { axe: typeof axe }).axe
    const result = await engine.run(selector, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] }, resultTypes: ["violations"],
    })
    return result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) }))
  }, scope)
  expect(violations).toEqual([])
}

async function reviewWithKeyboard(page: Page, locale: "en" | "fr") {
  const button = page.getByRole("button", { name: labels[locale].review, exact: true }).last()
  await button.focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: labels[locale].dialog, exact: true })
  await expect(dialog).toBeVisible()
  await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
  const focusable = dialog.locator('button:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]')
  await focusable.last().focus()
  await page.keyboard.press("Tab")
  await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible()
  await expect(button).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(dialog).toBeVisible()
  return dialog
}

async function applyWithRealStepUp(page: Page, locale: "en" | "fr") {
  const review = page.getByRole("dialog", { name: labels[locale].dialog, exact: true })
  await review.getByRole("button", { name: labels[locale].apply, exact: true }).click()
  const password = page.locator('input[type="password"]')
  await expect.poll(async () => await password.isVisible() || !(await review.isVisible()), { timeout: 30_000 }).toBe(true)
  if (await password.isVisible()) {
    await password.fill(readPrivateFixture().password)
    await password.press("Enter")
  }
  await expect(review).not.toBeVisible({ timeout: 60_000 })
  await expect(password).toHaveCount(0)
}

for (const scenario of ["retailer", "service", "alternate locale and width"] as const) {
  test(`${scenario}: native selection, dependencies, review, activation and durable recovery`, async ({ page }, info) => {
    const alternate = scenario === "alternate locale and width"
    const locale = alternate ? (localeFor(info) === "en" ? "fr" : "en") : localeFor(info)
    const journey: "retailer" | "service" = scenario === "retailer" ? "retailer" : scenario === "service" ? "service" : locale === "fr" ? "service" : "retailer"
    const fixture: Fixture = alternate ? FIXTURES.find((item: Fixture) => item.key === `${journey}_${locale === "fr" ? "fr_mobile" : "en_desktop"}`) : fixtureFor(info, journey)
    const evidenceName = alternate ? `${journey}-${locale}-${locale === "fr" ? "desktop" : "mobile"}` : journey
    if (alternate) await page.setViewportSize(locale === "fr" ? { width: 1440, height: 1100 } : { width: 390, height: 844 })
    await prepareFixture(fixture, "waiting")
    const before = await databaseState(fixture.organizationId)
    await signIn(page, fixture)
    const usefulResultMs = await openWorkbench(page, locale)
    await page.getByRole("button", { name: new RegExp(labels[locale][journey]) }).click()
    // Reopening a retained fixture must explicitly request reactivation.
    const stopSummary = await openStopControls(page, locale)
    const stopControls = page.getByRole("checkbox", { name: locale === "en" ? /^Stop new work in / : /^Arrêter les nouvelles opérations de / })
    for (const control of await stopControls.all()) if (await control.isChecked()) await control.uncheck()
    await stopSummary.click()
    // Reconciliation is the first integration slice; its dependencies are selected by the real builder.
    const reconciliation = page.getByTestId("module-card-payment_reconciliation").getByRole("checkbox")
    if (!(await reconciliation.isChecked())) await reconciliation.check()
    await expect(page.getByTestId("module-card-finance").getByRole("checkbox")).toBeChecked()
    await expect(page.getByTestId("module-card-accounting").getByRole("checkbox")).toBeChecked()
    if (journey === "service") {
      await expect(page.getByTestId("module-card-inventory").getByRole("checkbox")).not.toBeChecked()
      await expect(page.getByTestId("module-card-pos").getByRole("checkbox")).not.toBeChecked()
    }
    await checkWorkbenchAccessibility(page)
    await capture(page, info, `${evidenceName}-builder`, { usefulResultMs, measurementKind: "observed-development-route-load-no-certified-budget" })
    await reviewWithKeyboard(page, locale)
    await checkWorkbenchAccessibility(page, '[role="dialog"]')
    await capture(page, info, `${evidenceName}-review`)
    await applyWithRealStepUp(page, locale)
    const waiting = await databaseState(fixture.organizationId)
    expect(waiting.revision).toBe(before.revision + 1)
    expect(waiting.activeRevision).toBe(before.activeRevision)
    expect(waiting.active).toEqual(before.active)
    expect(waiting.lifecycle?.state).toBe("REQUESTED")
    expect(waiting.events).toEqual(expect.arrayContaining(["REQUEST_ACCEPTED", "PREPARATION_STARTED", "PREPARATION_WAITING"]))
    await expect(page.getByTestId("module-lifecycle")).toBeVisible()
    await checkWorkbenchAccessibility(page)
    await capture(page, info, `${evidenceName}-preparation-waiting`, { requestedRevision: waiting.revision, activeRevision: waiting.activeRevision, priorWorkspacePreserved: true })
    await prepareFixture(fixture, "accounting")
    if (journey === "retailer") await prepareFixture(fixture, "pos")
    await prepareFixture(fixture, "provider")
    await resumeWithRealStepUp(page, locale)
    await expect.poll(async () => (await databaseState(fixture.organizationId)).lifecycle?.state, { timeout: 60_000 }).toBe("ACTIVE")
    // Database commit precedes delivery/rendering of the action response.
    // An ACTIVE screenshot must show the actual applied UI, not an in-flight resume.
    await expect(page.getByTestId("module-lifecycle").getByText(locale === "en" ? "Applied" : "Appliquée", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: locale === "en" ? "Check inputs and resume preparation" : "Vérifier les données et reprendre", exact: true })).toHaveCount(0)
    const after = await databaseState(fixture.organizationId)
    expect(after.revision).toBe(before.revision + 1)
    expect(after.activeRevision).toBe(after.revision)
    expect(after.lifecycle?.id).toBe(waiting.lifecycle?.id)
    expect(after.events).toContain("CONFIGURATION_ACTIVATED")
    expect(after.active).toEqual(expect.arrayContaining(["payment_reconciliation", "finance", "accounting"]))
    expect(after.grants).toEqual(before.grants)
    expect(after.commands.filter((command) => command.state === "REQUESTED")).toHaveLength(before.commands.filter((command) => command.state === "REQUESTED").length + 1)
    await capture(page, info, `${evidenceName}-preparation-active`, { revision: after.revision, operationId: after.lifecycle?.id, syntheticDomainSetup: true, productionApproval: false })
    await page.getByRole("tab", { name: labels[locale].workspace, exact: true }).click()
    await expect(page.getByRole("link", { name: /reconciliation|rapprochement/i }).last()).toBeVisible()
    await capture(page, info, `${evidenceName}-workspace`, { revision: after.revision, grantsPreserved: true, operationalSetupCertified: false })
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("module-composition-workbench")).toBeVisible()
    await expect(page.getByTestId("module-composition-workbench")).toHaveAttribute("data-hydrated", "true")
    await page.getByRole("tab", { name: labels[locale].history, exact: true }).click()
    const reopen = page.getByRole("button", { name: labels[locale].reopen, exact: true }).first()
    await expect(reopen).toBeVisible()
    await capture(page, info, `${evidenceName}-history`)
    await reopen.click()
    await expect(page.getByRole("tab", { name: labels[locale].configure, exact: true })).toHaveAttribute("aria-selected", "true")
    const recovered = await databaseState(fixture.organizationId)
    expect(recovered.revision).toBe(after.revision)
    expect(recovered.commands.filter((command) => command.state === "DRAFT").length).toBeGreaterThan(after.commands.filter((command) => command.state === "DRAFT").length)
    expect(recovered.active).toEqual(after.active)
    if (journey === "retailer") {
      await openStopControls(page, locale)
      await page.getByRole("checkbox", { name: locale === "en" ? "Stop new work in Inventory" : "Arrêter les nouvelles opérations de Stock", exact: true }).check()
      await reviewWithKeyboard(page, locale)
      await applyWithRealStepUp(page, locale)
      await expect.poll(async () => (await databaseState(fixture.organizationId)).lifecycle?.state).toBe("RETAINED")
      expect((await databaseState(fixture.organizationId)).grants).toEqual(after.grants)
      await page.getByRole("tab", { name: labels[locale].workspace, exact: true }).click()
      await expect(page.getByRole("heading", { name: locale === "en" ? "Stopped capabilities and historical records" : "Capacités arrêtées et documents historiques", exact: true })).toBeVisible()
      await expect(page.getByRole("link", { name: locale === "en" ? "Open authorized Inventory records" : "Ouvrir les documents autorisés de Stock", exact: true })).toBeVisible()
      await capture(page, info, `${evidenceName}-retained-workspace`, { historicalRightsPreserved: true, stoppedCapability: "inventory" })
      await page.getByRole("tab", { name: labels[locale].history, exact: true }).click()
      await capture(page, info, `${evidenceName}-retained-history`, { state: "RETAINED" })
    }
  })
}

test("legacy conversion preserves all existing canonical module grants", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-en", "One isolated legacy fixture; bilingual layout covered by both customer journeys")
  const fixture = fixtureFor(info, "legacy")
  await signIn(page, fixture)
  await openWorkbench(page, "en")
  await page.getByRole("button", { name: /Service business/ }).click()
  await reviewWithKeyboard(page, "en")
  await applyWithRealStepUp(page, "en")
  const state = await databaseState(fixture.organizationId)
  expect(state.grants).toEqual([...COMMERCIAL_MODULE_SLUGS].sort())
  await capture(page, info, "legacy-preservation", { persistedCanonicalGrants: state.grants.length })
})

test("employee without configuration permission receives the native denied state", async ({ page }, info) => {
  const locale = localeFor(info)
  await signIn(page, fixtureFor(info, "retailer"), true)
  const response = await page.goto(`/${locale}/dashboard/settings/modules`, { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: labels[locale].denied })).toBeVisible()
  await expect(page.getByTestId("module-composition-workbench")).toHaveCount(0)
  await capture(page, info, "permission-denied", { serverPermissionDenial: true })
})

test("French tablet and narrow reflow keep configuration and review reachable", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile-fr", "Additional widths belong to the French project")
  await signIn(page, fixtureFor(info, "service"))
  for (const width of [834, 320]) {
    await page.setViewportSize({ width, height: 1112 })
    await openWorkbench(page, "fr")
    await page.getByRole("button", { name: /Entreprise de services/ }).click()
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const reviewButton = page.getByRole("button", { name: labels.fr.review, exact: true })
    await expect(reviewButton).toHaveCount(1)
    const buttonBox = await reviewButton.boundingBox()
    expect(buttonBox).not.toBeNull()
    expect(buttonBox!.y).toBeGreaterThanOrEqual(0)
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(1112)
    expect(buttonBox!.x).toBeGreaterThanOrEqual(width >= 768 ? 220 : 0)
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(width)
    const lastCardBox = await page.locator('[data-testid^="module-card-"]').last().boundingBox()
    expect(lastCardBox).not.toBeNull()
    expect(lastCardBox!.y + lastCardBox!.height).toBeLessThan(buttonBox!.y)
    await capture(page, info, `service-review-reachable-${width}`, { cssWidth: width, reviewButton: buttonBox, lastCard: lastCardBox })
    await reviewWithKeyboard(page, "fr")
    await capture(page, info, `service-reflow-${width}`, { cssWidth: width, actualBrowserZoomCertified: false })
    await page.keyboard.press("Escape")
  }
})

test("French stopped transfer explains the actual denial without creating new work", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile-fr", "One exact owned French stopped-inventory fixture")
  const fixture = fixtureFor(info, "retailer")
  const before = await databaseState(fixture.organizationId)
  expect(before.stopped).toContain("inventory")
  await prepareFixture(fixture, "inventory-denial")
  await signIn(page, fixture)
  const response = await page.goto("/fr/dashboard/inventory/transfers", { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBe(200)
  await page.getByRole("button", { name: "Create Transfer", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("combobox").filter({ hasText: "Select source location" }).click()
  await page.getByRole("option", { name: /Synthetic denial source/ }).click()
  await dialog.getByRole("combobox").filter({ hasText: "Select destination location" }).click()
  await page.getByRole("option", { name: /Synthetic denial destination/ }).click()
  await dialog.getByRole("combobox").filter({ hasText: "Choose item" }).click()
  const item = page.getByRole("option", { name: /MODULE-DENIAL-ITEM/ })
  await expect(item).toBeEnabled()
  await item.click()
  await dialog.getByPlaceholder("0", { exact: true }).fill("1")
  await dialog.getByRole("button", { name: "Add", exact: true }).click()
  await dialog.getByRole("button", { name: "Create Transfer", exact: true }).click()
  const reason = "Cette capacité n’accepte plus de nouvelles opérations. Les documents existants et les opérations de finalisation autorisées restent accessibles."
  const notice = dialog.getByRole("alert")
  await expect(notice.getByText(reason, { exact: true })).toBeVisible()
  await notice.scrollIntoViewIfNeeded()
  await expect(notice).toBeInViewport()
  await expect.poll(() => notice.evaluate(node => {
    const box = node.getBoundingClientRect()
    return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
  })).toBe(true)
  await capture(page, info, "inventory-new-work-denied", { genuineServerDenial: true, noticeInsideDialog: true, noticeNotOccluded: true, inheritedTransferFormLanguage: "English", denialLanguage: "French" })
  const after = await databaseState(fixture.organizationId)
  expect(after.transferCount).toBe(before.transferCount)
  expect(after.stopped).toContain("inventory")
})
