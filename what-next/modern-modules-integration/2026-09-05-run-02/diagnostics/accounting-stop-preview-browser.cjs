"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../../../..");
const load = createRequire(path.join(root, "package.json"));
const { chromium, expect: playwrightExpect } = load("@playwright/test");
const expect = playwrightExpect.configure({ timeout: 60000 });
const { Client } = load("pg");
const { targetUrl, readPrivateFixture, FIXTURES, BASE_URL, DATABASE_NAME } = load("./scripts/modern-modules-local-verification.js");
const hash = source => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, source))).digest("hex");
const sources = ["next.config.mjs", "components/modules/ModuleCompositionWorkbench.tsx", "messages/en.json", "messages/fr.json", "services/modules/module-admission.service.ts", "services/modules/module-operational-dependencies.ts", "services/modules/module-stop-policy.service.ts"];
const stamps = () => sources.map(source => ({ path: source, sha256: hash(source) }));

async function state(fixture) {
  const client = new Client({ connectionString: targetUrl().toString(), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    assert.equal((await client.query("SELECT current_database() AS name")).rows[0].name, DATABASE_NAME);
    assert.equal((await client.query('SELECT "onboardingSource" FROM organizations WHERE id=$1', [fixture.organizationId])).rows[0].onboardingSource, "local-modern-modules-verification");
    return {
      configuration: (await client.query('SELECT revision,"activeRevision","activeModules","newWorkStoppedModules" FROM tenant_module_configurations WHERE "organizationId"=$1', [fixture.organizationId])).rows[0],
      commands: (await client.query('SELECT count(*)::int AS count FROM tenant_module_configuration_commands WHERE "organizationId"=$1', [fixture.organizationId])).rows[0].count,
    };
  } finally { await client.query("ROLLBACK"); await client.end(); }
}

async function main() {
  const startedAt = new Date().toISOString(), beforeSources = stamps();
  const fixture = FIXTURES.find(f => f.key === "service_fr_mobile"), credentials = readPrivateFixture();
  const before = await state(fixture), results = [];
  assert.ok(before.configuration.activeModules.includes("payment_reconciliation"), "The fixture must already configure reconciliation");
  assert.ok(!before.configuration.newWorkStoppedModules.includes("accounting"), "Preview must start without persisted accounting stop");
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  let failure = null;
  try {
    for (const locale of ["en", "fr"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: locale === "fr" ? "fr-FR" : "en-GB", reducedMotion: "reduce" });
      try {
        const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(240000);
        const messages = JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), "utf8")).moduleComposition;
        const signed = await context.request.post(`${BASE_URL}/api/auth/sign-in/email`, { data: { email: fixture.email, password: credentials.password, rememberMe: false }, headers: { Origin: BASE_URL }, timeout: 120000 });
        assert.equal(signed.status(), 200);
        const response = await page.goto(`${BASE_URL}/${locale}/dashboard/settings/modules`, { waitUntil: "domcontentloaded" });
        assert.equal(response.status(), 200);
        await expect(page.getByTestId("module-composition-workbench")).toHaveAttribute("data-hydrated", "true");
        const reconciliation = page.getByTestId("module-card-payment_reconciliation").getByRole("checkbox");
        await expect(reconciliation).toBeChecked();
        const disclosure = page.locator("summary").filter({ hasText: messages.stop.title });
        if (!(await disclosure.evaluate(node => node.parentElement.hasAttribute("open")))) await disclosure.click();
        const stop = page.locator("#stop-accounting");
        await expect(stop).toBeEnabled(); await stop.check();
        const scope = page.locator("#stop-context-accounting");
        await expect(scope.getByText(messages.stop.accountingScope, { exact: true })).toBeVisible();
        const control = scope.locator("..");
        await control.scrollIntoViewIfNeeded();
        const controlText = await control.textContent();
        assert.match(controlText, locale === "fr" ? /manuel/i : /manual/i);
        await page.screenshot({ path: path.join(__dirname, `accounting-stop-control-${locale}.png`), fullPage: false, animations: "disabled", scale: "css" });
        await page.getByRole("button", { name: messages.review, exact: true }).click();
        const dialog = page.getByTestId("configuration-review"), impact = dialog.getByTestId("stop-impact-accounting");
        await expect(impact).toBeVisible();
        await expect(impact.getByRole("heading", { name: messages.stop.dependents, exact: true })).toHaveCount(0);
        await expect(dialog.getByRole("button", { name: messages.activate, exact: true })).toBeEnabled();
        await impact.screenshot({ path: path.join(__dirname, `accounting-stop-preview-${locale}.png`), animations: "disabled", scale: "css" });
        await page.keyboard.press("Escape");
        await expect(reconciliation).toBeChecked();
        results.push({ locale, passed: true, accountingStopAvailable: true, manualJournalScopeVisible: true, blockedDependentHeadingAbsent: true, reconciliationStillSelected: true, authoritativeApplyControlEnabled: true, activated: false, controlText });
      } finally { await context.close(); }
    }
  } catch (error) { failure = { name: error.name, message: String(error.message).replaceAll(credentials.password, "[redacted password]").replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database]") }; }
  finally { await browser.close(); }
  const after = await state(fixture), afterSources = stamps();
  const persistedStateUnchanged = JSON.stringify(before) === JSON.stringify(after), sourceStable = beforeSources.every((entry, i) => entry.sha256 === afterSources[i].sha256);
  if (!persistedStateUnchanged || !sourceStable) failure ??= { name: "StateAssertion", message: "Expected unchanged persisted configuration/commands and source" };
  const report = { startedAt, completedAt: new Date().toISOString(), classification: "ISOLATED_READ_ONLY_ACCOUNTING_STOP_PREVIEW", productionApproval: false, fixtureKey: fixture.key, results, failure, persistedStateUnchanged, sourceStable, beforeSources, afterSources };
  fs.writeFileSync(path.join(__dirname, "accounting-stop-preview-browser.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
  if (failure) process.exitCode = 1;
}
main().catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database]")); process.exitCode = 1; });
