"use strict";

// Isolated synthetic browser proof only. Execution waits for the parent's
// post-build server release. No migration, seeding, replay, or policy SQL.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../../../..");
const load = createRequire(path.join(root, "package.json"));
const { chromium, expect: baseExpect } = load("@playwright/test");
const expect = baseExpect.configure({ timeout: 60000 });
const { Client } = load("pg");
const helper = load("./scripts/modern-modules-local-verification.js");
const fixture = helper.FIXTURES.find(item => item.key === "service_fr_mobile");
const requiredPermissions = ["accounting.accounts.read", "accounting.journal.create"];
const sourcePaths = [
  "next.config.mjs", "app/[locale]/(dashboard)/dashboard/accounting/journals/new/page.tsx",
  "app/[locale]/(dashboard)/dashboard/accounting/journals/new/ManualJournalDraftForm.tsx",
  "actions/accounting/accounts.actions.ts", "actions/accounting/journals.actions.ts",
  "services/accounting/journals.service.ts", "services/_shared/protect.ts",
  "lib/modules/module-operation-error.ts", "services/modules/module-admission.service.ts",
  "services/modules/module-operational-dependencies.ts", "services/modules/module-stop-policy.service.ts",
  "services/modules/module-composition.service.ts", "services/modules/module-lifecycle.service.ts",
  "components/modules/ModuleCompositionWorkbench.tsx", "messages/en.json", "messages/fr.json",
];
const sources = () => sourcePaths.map(file => ({ path: file, sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex") }));

async function withFixture(readOnly, operation) {
  assert.equal(helper.DATABASE_NAME, "stoquify_local_modern_modules_20260905_01");
  assert.equal(helper.BASE_URL, "http://127.0.0.1:3107");
  assert.equal(fixture.organizationId, "org_modules_service_fr_mobile");
  assert.equal(fixture.userId, "usr_modules_service_fr_mobile");
  const target = helper.targetUrl();
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname.toLowerCase()));
  const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query(readOnly ? "BEGIN READ ONLY" : "BEGIN");
    assert.equal((await client.query("SELECT current_database() AS name")).rows[0].name, helper.DATABASE_NAME);
    const organizations = (await client.query('SELECT id,"onboardingSource" FROM organizations ORDER BY id')).rows;
    assert.deepEqual(organizations.map(row => row.id).sort(), helper.FIXTURES.map(row => row.organizationId).sort());
    assert.ok(organizations.every(row => row.onboardingSource === helper.FIXTURE_SOURCE));
    const users = (await client.query('SELECT id,email,"organizationId" FROM users WHERE id=$1', [fixture.userId])).rows;
    assert.deepEqual(users, [{ id: fixture.userId, email: fixture.email, organizationId: fixture.organizationId }]);
    const result = await operation(client);
    await client.query(readOnly ? "ROLLBACK" : "COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { await client.end(); }
}

async function state() {
  return withFixture(true, async client => ({
    configuration: (await client.query('SELECT revision,"activeRevision","selectedModules","activeModules","newWorkStoppedModules","newWorkStoppedAt" FROM tenant_module_configurations WHERE "organizationId"=$1', [fixture.organizationId])).rows[0],
    grants: (await client.query('SELECT * FROM tenant_module_grants WHERE "organizationId"=$1 ORDER BY "moduleSlug"', [fixture.organizationId])).rows,
    commands: (await client.query('SELECT id,state,"createdAt" FROM tenant_module_configuration_commands WHERE "organizationId"=$1 ORDER BY "createdAt",id', [fixture.organizationId])).rows,
    operations: (await client.query('SELECT id,"commandId",state,"actorId","desiredRevision" FROM tenant_module_lifecycle_operations WHERE "organizationId"=$1 ORDER BY "createdAt",id', [fixture.organizationId])).rows,
    events: (await client.query('SELECT id,"operationId",sequence,"eventType",state,"actorId","evidenceHash" FROM tenant_module_lifecycle_events WHERE "organizationId"=$1 ORDER BY "createdAt",id', [fixture.organizationId])).rows,
    journals: (await client.query('SELECT count(*)::int AS count FROM journal_entries WHERE "organizationId"=$1', [fixture.organizationId])).rows[0].count,
    lines: (await client.query('SELECT count(*)::int AS count FROM journal_entry_lines WHERE "organizationId"=$1', [fixture.organizationId])).rows[0].count,
    createAudits: (await client.query('SELECT count(*)::int AS count FROM ledger_audit_events WHERE "organizationId"=$1 AND action=$2', [fixture.organizationId, "MANUAL_JOURNAL_DRAFT_CREATE"])).rows[0].count,
    assuranceSessions: (await client.query('SELECT count(*)::int AS count FROM sessions WHERE "userId"=$1 AND "assuranceOrganizationId"=$2 AND "assuranceVerifiedAt" IS NOT NULL', [fixture.userId, fixture.organizationId])).rows[0].count,
    eligibleAccounts: (await client.query('SELECT a.id,a.code FROM chart_of_accounts a WHERE a."organizationId"=$1 AND a."isActive" AND a."allowManualPost" AND a."deletedAt" IS NULL AND NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c."parentId"=a.id) ORDER BY a.code', [fixture.organizationId])).rows,
    manualJournals: (await client.query('SELECT id,code FROM journals WHERE "organizationId"=$1 AND "isActive" AND "allowManualEntries" ORDER BY code', [fixture.organizationId])).rows,
    openPeriods: (await client.query('SELECT id,"startDate","endDate" FROM accounting_periods WHERE "organizationId"=$1 AND status=$2 ORDER BY "startDate" DESC', [fixture.organizationId, "OPEN"])).rows,
  }));
}

async function prepareRequiredFixturePermissions() {
  return withFixture(false, async client => {
    const roles = (await client.query('SELECT id,permissions FROM roles WHERE "organizationId"=$1 AND code=$2 FOR UPDATE', [fixture.organizationId, "MODULES_LOCAL_ADMIN"])).rows;
    assert.equal(roles.length, 1);
    const role = roles[0];
    const memberships = (await client.query('SELECT "B" AS "userId" FROM "_UserRoles" WHERE "A"=$1 ORDER BY "B"', [role.id])).rows;
    assert.deepEqual(memberships, [{ userId: fixture.userId }], "Synthetic permission additions must affect this fixture user only");
    assert.ok(role.permissions.includes("accounting.journal.read"));
    const added = requiredPermissions.filter(value => !role.permissions.includes(value));
    const after = [...role.permissions, ...added];
    if (added.length) {
      const updated = await client.query('UPDATE roles SET permissions=$1::text[],"updatedAt"=CURRENT_TIMESTAMP WHERE id=$2 AND "organizationId"=$3 RETURNING permissions', [after, role.id, fixture.organizationId]);
      assert.deepEqual(updated.rows[0].permissions, after);
    }
    return { fixture: fixture.key, roleId: role.id, before: role.permissions, added, after, source: "Authorized isolated browser fixture permission setup only", productionAuthority: false };
  });
}

async function signIn(context, credentials) {
  const response = await context.request.post(`${helper.BASE_URL}/api/auth/sign-in/email`, { data: { email: fixture.email, password: credentials.password, rememberMe: false }, headers: { Origin: helper.BASE_URL }, timeout: 120000 });
  assert.equal(response.status(), 200);
  const session = await context.request.get(`${helper.BASE_URL}/api/auth/get-session`);
  assert.equal(session.status(), 200);
  assert.equal((await session.json()).user.id, fixture.userId);
  const access = await context.request.get(`${helper.BASE_URL}/api/me/permissions`);
  assert.equal(access.status(), 200);
  const payload = await access.json();
  assert.equal(payload.organizationId, fixture.organizationId);
  for (const permission of [...requiredPermissions, "accounting.journal.read", "system.settings.update"]) assert.ok(payload.permissions.includes(permission), `Missing exact fixture permission ${permission}`);
}

async function applyAccountingStop(page, credentials, messages, receipt) {
  const response = await page.goto(`${helper.BASE_URL}/en/dashboard/settings/modules`, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200);
  await expect(page.getByTestId("module-composition-workbench")).toHaveAttribute("data-hydrated", "true");
  const disclosure = page.locator("summary").filter({ hasText: messages.stop.title });
  if (!(await disclosure.evaluate(node => node.parentElement.hasAttribute("open")))) await disclosure.click();
  await expect(page.locator("#stop-accounting")).toBeEnabled();
  await expect(page.locator("#stop-accounting")).not.toBeChecked();
  await page.locator("#stop-accounting").check();
  await page.getByRole("button", { name: messages.review, exact: true }).click();
  const dialog = page.getByTestId("configuration-review");
  await expect(dialog.getByTestId("stop-impact-accounting")).toBeVisible();
  const apply = dialog.getByRole("button", { name: messages.activate, exact: true });
  await expect(apply).toBeEnabled();
  await apply.click();
  const password = page.locator("#module-step-up-password");
  await expect(password).toBeVisible();
  await password.fill(credentials.password);
  await password.press("Enter");
  await expect(password).toHaveCount(0);
  await expect(dialog).toHaveCount(0);
  const after = await state();
  assert.ok(after.configuration.newWorkStoppedModules.includes("accounting"));
  assert.ok(after.configuration.newWorkStoppedAt.accounting);
  assert.deepEqual(after.configuration.activeModules, receipt.before.configuration.activeModules);
  assert.deepEqual(after.grants, receipt.before.grants);
  assert.equal(after.configuration.revision, receipt.before.configuration.revision + 1);
  assert.equal(after.configuration.activeRevision, receipt.before.configuration.activeRevision + 1);
  assert.equal(after.commands.length, receipt.before.commands.length + 1);
  assert.equal(after.operations.length, receipt.before.operations.length + 1);
  const operation = after.operations.find(row => !receipt.before.operations.some(old => old.id === row.id));
  assert.ok(["ACTIVE", "RETAINED"].includes(operation.state));
  assert.equal(operation.actorId, fixture.userId);
  assert.ok(after.events.some(event => event.operationId === operation.id && event.eventType === "REQUEST_ACCEPTED"));
  assert.equal(after.assuranceSessions, receipt.before.assuranceSessions + 1);
  assert.equal(after.journals, receipt.before.journals);
  receipt.afterAuthorizedStop = after;
  receipt.checks.push({ name: "real_review_password_step_up_and_durable_accounting_stop", passed: true, operationId: operation.id, state: operation.state, rightsPreserved: true, directPolicyWrites: false });
}

async function verifyStoppedSubmission(page, locale, messages, receipt, output) {
  const start = Date.now();
  const response = await page.goto(`${helper.BASE_URL}/${locale}/dashboard/accounting/journals/new`, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200);
  const form = page.locator("form").filter({ has: page.locator('[name="journalId"]') });
  const submit = form.getByRole("button", { name: messages.accountingCreate.createDraft, exact: true });
  await expect(submit).toBeEnabled();
  const baseline = await state();
  assert.ok(baseline.configuration.newWorkStoppedModules.includes("accounting"));
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(baseline.openPeriods.some(period => today >= period.startDate.toISOString().slice(0, 10) && today <= period.endDate.toISOString().slice(0, 10)), "Reuse an existing genuinely open fixture period");
  assert.ok(baseline.eligibleAccounts.length >= 2 && baseline.manualJournals.length >= 1);
  await form.locator('[name="journalId"]').selectOption(baseline.manualJournals[0].id);
  const fields = { entryDate: today, currency: "XAF", reference: `SYNTHETIC-STOPPED-${locale.toUpperCase()}`, memo: locale === "fr" ? "Brouillon de vérification conservé" : "Retained verification draft" };
  for (const [name, value] of Object.entries(fields)) await form.locator(`[name="${name}"]`).fill(value);
  for (let index = 0; index < 6; index += 1) {
    await form.locator(`[name="accountId-${index}"]`).selectOption(baseline.eligibleAccounts[index % 2].id);
    await form.locator(`[name="description-${index}"]`).fill(`${locale === "fr" ? "Ligne conservée" : "Retained line"} ${index + 1}`);
    await form.locator(`[name="debit-${index}"]`).fill(index % 2 === 0 ? "100" : "");
    await form.locator(`[name="credit-${index}"]`).fill(index % 2 === 1 ? "100" : "");
  }
  const snapshot = () => form.evaluate(node => Array.from(node.querySelectorAll("input[name],select[name]")).map(field => ({ name: field.name, value: field.value })));
  const beforeFields = await snapshot();
  await submit.click();
  const alert = form.getByRole("alert");
  await expect(alert.getByText(messages.accountingCreate.stoppedTitle, { exact: true })).toBeVisible();
  await expect(alert.getByText(messages.accountingCreate.stoppedDescription, { exact: true })).toBeVisible();
  await expect(alert.getByText(messages.accountingCreate.reviewAccess, { exact: true })).toBeVisible();
  await expect(alert).toBeFocused();
  await expect(alert.getByRole("link", { name: messages.accountingCreate.openQueue, exact: true })).toHaveAttribute("href", `/${locale}/dashboard/accounting/journals`);
  await expect(submit).toBeEnabled();
  const afterFields = await snapshot();
  assert.deepEqual(afterFields, beforeFields);
  assert.equal(new URL(page.url()).pathname, `/${locale}/dashboard/accounting/journals/new`);
  assert.equal(new URL(page.url()).search, "");
  const after = await state();
  assert.equal(after.journals, baseline.journals);
  assert.equal(after.lines, baseline.lines);
  assert.equal(after.createAudits, baseline.createAudits);
  assert.deepEqual(after.configuration, baseline.configuration);
  assert.deepEqual(after.grants, baseline.grants);
  const screenshot = `journal-stopped-submit-${locale}.png`;
  await form.screenshot({ path: path.join(output, screenshot), animations: "disabled", scale: "css" });
  receipt.checks.push({ name: `actual_${locale}_stopped_submit_preserves_all_fields_and_writes_no_journal`, passed: true, locale, elapsedMs: Date.now() - start, fieldCount: beforeFields.length, beforeFields, afterFields, journalCountBefore: baseline.journals, journalCountAfter: after.journals, lineCountBefore: baseline.lines, lineCountAfter: after.lines, createAuditsBefore: baseline.createAudits, createAuditsAfter: after.createAudits, alertFocused: true, screenshot });
}

async function main() {
  assert.equal(process.argv[2], "--execute-reviewed-local-browser", "Run only after the parent releases the rebuilt isolated server; preparation does not execute this helper");
  assert.equal(process.argv.length, 3);
  const credentials = helper.readPrivateFixture();
  const redact = value => String(value).replaceAll(credentials.password, "[redacted password]").replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database]");
  const output = path.join(__dirname, `journal-stopped-submit-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  fs.mkdirSync(output);
  const receipt = { startedAt: new Date().toISOString(), classification: "ISOLATED_SYNTHETIC_JOURNAL_STOPPED_SUBMIT", database: helper.DATABASE_NAME, fixture: fixture.key, productionApproval: false, noMigration: true, noPosOfflineChanges: true, beforeSources: sources(), checks: [], errors: [] };
  const save = () => fs.writeFileSync(path.join(output, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  let browser;
  try {
    receipt.before = await state();
    assert.ok(receipt.before.configuration.activeModules.includes("payment_reconciliation"));
    assert.ok(!receipt.before.configuration.newWorkStoppedModules.includes("accounting"), "Already-stopped fixture: inspect the prior receipt rather than automatically reactivating or rewriting policy");
    assert.ok(receipt.before.eligibleAccounts.length >= 2 && receipt.before.manualJournals.length >= 1, "Existing fixture setup is required; this helper does not seed domain rows");
    save();
    receipt.fixturePermissionChange = await prepareRequiredFixturePermissions();
    save();
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    for (const locale of ["en", "fr"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: locale === "fr" ? "fr-FR" : "en-GB", reducedMotion: "reduce" });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(240000);
        page.on("pageerror", error => receipt.errors.push(redact(error.message)));
        const messages = JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), "utf8")).moduleComposition;
        await signIn(context, credentials);
        if (locale === "en") { await applyAccountingStop(page, credentials, messages, receipt); save(); }
        await verifyStoppedSubmission(page, locale, messages, receipt, output);
        save();
      } finally { await context.close(); }
    }
    assert.deepEqual(receipt.errors, []);
    receipt.checks.push({ name: "no_browser_page_errors", passed: true });
  } catch (error) { receipt.failure = { name: error.name, message: redact(error.message) }; process.exitCode = 1; }
  finally { if (browser) await browser.close(); }
  receipt.afterSources = sources();
  receipt.sourceStable = JSON.stringify(receipt.beforeSources) === JSON.stringify(receipt.afterSources);
  if (!receipt.sourceStable) { receipt.failure ??= { name: "SourceChanged", message: "Application source changed during verification" }; process.exitCode = 1; }
  receipt.completedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify({ output: path.relative(root, output), passed: receipt.checks.filter(check => check.passed).length, failure: receipt.failure ?? null, sourceStable: receipt.sourceStable }));
}

if (require.main === module) main().catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database]")); process.exitCode = 1; });
