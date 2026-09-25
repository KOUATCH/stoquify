"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../../../..");
const load = createRequire(path.join(root, "package.json"));
const { chromium, expect: playwrightExpect } = load("@playwright/test");
const expect = playwrightExpect.configure({ timeout: 60000 });
const { Client } = load("pg");
const { targetUrl, readPrivateFixture, FIXTURES, BASE_URL, DATABASE_NAME } = load("./scripts/modern-modules-local-verification.js");
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const sourcePaths = ["next.config.mjs", "lib/auth-client.ts", "hooks/useClientAuth.ts", "components/inventory/transfers/TransferDashboard.tsx", "actions/security/step-up-auth.actions.ts", "components/modules/ModuleCompositionWorkbench.tsx", "messages/en.json", "messages/fr.json"];
const stamps = () => sourcePaths.map(file => ({ path: file, sha256: hash(file) }));

async function state(fixture) {
  const client = new Client({ connectionString: targetUrl().toString(), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    assert.equal((await client.query("SELECT current_database() AS name")).rows[0].name, DATABASE_NAME);
    assert.equal((await client.query('SELECT "onboardingSource" FROM organizations WHERE id=$1', [fixture.organizationId])).rows[0].onboardingSource, "local-modern-modules-verification");
    const configuration = (await client.query('SELECT revision,"activeRevision","activeModules","newWorkStoppedModules" FROM tenant_module_configurations WHERE "organizationId"=$1', [fixture.organizationId])).rows[0];
    const drafts = (await client.query('SELECT count(*)::int AS count FROM tenant_module_configuration_commands WHERE "organizationId"=$1 AND state=$2', [fixture.organizationId, "DRAFT"])).rows[0].count;
    const assurance = (await client.query('SELECT count(*)::int AS count FROM sessions WHERE "userId"=$1 AND "assuranceVerifiedAt" IS NOT NULL AND "assuranceOrganizationId"=$2', [fixture.userId, fixture.organizationId])).rows[0].count;
    return { configuration, drafts, assurance };
  } finally { await client.query("ROLLBACK"); await client.end(); }
}

async function main() {
  const startedAt = new Date().toISOString(), beforeSources = stamps();
  const fixture = FIXTURES.find(f => f.key === "retailer_fr_mobile"), credentials = readPrivateFixture();
  const redact = value => String(value).replaceAll(credentials.password, "[redacted password]").replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database]");
  const before = await state(fixture), errors = [], observations = [];
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fr-FR", reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(240000);
  page.on("pageerror", error => errors.push(redact(error.message)));
  let failure = null;
  try {
    const signIn = await context.request.post(`${BASE_URL}/api/auth/sign-in/email`, { data: { email: fixture.email, password: credentials.password, rememberMe: false }, headers: { Origin: BASE_URL }, timeout: 120000 });
    assert.equal(signIn.status(), 200); observations.push({ check: "real_password_sign_in", passed: true });
    const session = await context.request.get(`${BASE_URL}/api/auth/get-session`);
    assert.equal(session.status(), 200); assert.equal((await session.json()).user.id, fixture.userId); observations.push({ check: "real_persisted_session", passed: true });
    for (const foreign of [false, true]) {
      const response = await context.request.get(`${BASE_URL}/api/me/permissions`, { headers: foreign ? { "x-organization-id": FIXTURES[0].organizationId } : {} });
      assert.equal(response.status(), 200); const data = await response.json();
      assert.equal(data.organizationId, fixture.organizationId); assert.ok(data.permissions.includes("system.settings.update"));
    }
    observations.push({ check: "server_permissions_and_foreign_tenant_header", passed: true });
    const loadStarted = Date.now();
    const transfer = await page.goto(`${BASE_URL}/fr/dashboard/inventory/transfers`, { waitUntil: "domcontentloaded" });
    assert.equal(transfer.status(), 200);
    const html = await transfer.text();
    const serverRenderMarkers = { useRefNull: html.includes("Cannot read properties of null"), webpackModuleFactory: html.includes("__webpack_modules__[moduleId] is not a function"), clientFallback: html.includes("Switched to client rendering because the server rendering errored") };
    observations.push({ check: "server_render_error_markers", passed: !Object.values(serverRenderMarkers).some(Boolean), markers: serverRenderMarkers });
    assert.ok(!Object.values(serverRenderMarkers).some(Boolean), "The transfer response must render without server error fallback");
    await expect(page.getByRole("button", { name: "Create Transfer", exact: true })).toBeVisible();
    observations.push({ check: "transfer_ssr_and_client_render", passed: true, usefulResultMs: Date.now() - loadStarted, serverRenderErrorMarker: false });
    await page.screenshot({ path: path.join(__dirname, "transfer-after-auth-bundling.png"), fullPage: false, animations: "disabled", scale: "css" });
    const modules = await page.goto(`${BASE_URL}/en/dashboard/settings/modules`, { waitUntil: "domcontentloaded" });
    assert.equal(modules.status(), 200);
    await expect(page.getByTestId("module-composition-workbench")).toHaveAttribute("data-hydrated", "true");
    await expect(page.getByRole("heading", { name: "Build your workspace", exact: true })).toBeVisible();
    observations.push({ check: "authenticated_module_settings", passed: true });
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    const password = page.locator('#module-step-up-password');
    await expect(password).toBeVisible();
    await password.fill(credentials.password); await password.press("Enter");
    await expect(password).toHaveCount(0);
    await expect(page.getByTestId("module-composition-workbench").getByText("Draft saved. It has not changed your workspace.", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const after = await state(fixture);
    assert.deepEqual(after.configuration, before.configuration); assert.equal(after.drafts, before.drafts + 1); assert.equal(after.assurance, before.assurance + 1);
    observations.push({ check: "genuine_password_step_up_and_durable_draft", passed: true, activeConfigurationPreserved: true });
    await page.screenshot({ path: path.join(__dirname, "modules-after-auth-bundling.png"), fullPage: false, animations: "disabled", scale: "css" });
    assert.deepEqual(errors, []);
    observations.push({ check: "no_browser_page_errors", passed: true });
  } catch (error) { failure = { message: redact(error.message), name: error.name }; }
  finally { await context.close(); await browser.close(); }
  const bundleFile = ".next-modern-modules-integration/server/app/[locale]/(dashboard)/dashboard/inventory/transfers/page.js";
  const bundle = fs.existsSync(path.join(root, bundleFile)) ? fs.readFileSync(path.join(root, bundleFile), "utf8") : "";
  const vendorDirectory = path.join(root, ".next-modern-modules-integration/server/vendor-chunks");
  const authVendor = fs.existsSync(vendorDirectory) ? fs.readdirSync(vendorDirectory).find(file => file.startsWith("better-auth@") && file.endsWith(".js")) : null;
  const vendor = authVendor ? fs.readFileSync(path.join(vendorDirectory, authVendor), "utf8") : "";
  const bundleChecks = { externalClient: bundle.includes('*** external "better-auth/react" ***'), bundledReactStore: vendor.includes("better-auth/dist/client/react/react-store.mjs"), vendoredSsrReact: vendor.includes("vendored/ssr/react.js"), vendorPath: authVendor ? path.relative(root, path.join(vendorDirectory, authVendor)) : null, vendorSha256: authVendor ? hash(path.relative(root, path.join(vendorDirectory, authVendor))) : null };
  const afterSources = stamps(), sourceStable = beforeSources.every((entry, i) => entry.sha256 === afterSources[i].sha256);
  if (!bundleChecks.bundledReactStore || bundleChecks.externalClient || !sourceStable) failure ??= { name: "BundleAssertion", message: "Expected bundled client and unchanged tested source" };
  const report = { startedAt, completedAt: new Date().toISOString(), classification: "ISOLATED_AUTHENTICATED_APPLICATION_VERIFICATION", productionApproval: false, observations, errors, failure, beforeSources, afterSources, sourceStable, bundle: { path: bundleFile, sha256: bundle ? hash(bundleFile) : null, ...bundleChecks }, scope: "Actual fixture password sign-in, session, permissions, transfer render and password step-up; only one new synthetic draft, no activation or transfer write." };
  fs.writeFileSync(path.join(__dirname, "auth-bundling-browser.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
  if (failure) process.exitCode = 1;
}
main().catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database]")); process.exitCode = 1; });
