const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..');
const load = createRequire(path.join(root, 'package.json'));
const { chromium, expect: baseExpect } = load('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const { Client } = load('pg');
const helper = load('./scripts/modern-modules-local-verification.js');
const fixture = helper.FIXTURES.find(item => item.key === 'service_en_desktop');
const sourcePaths = ['next.config.mjs', 'services/modules/module-composition.service.ts', 'services/modules/module-composition-contracts.ts', 'actions/modules/module-composition.actions.ts', 'components/modules/ModuleCompositionWorkbench.tsx', 'messages/en.json', 'messages/fr.json'];
const sources = () => sourcePaths.map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') }));
async function state() {
  const client = new Client({ connectionString: helper.targetUrl().toString(), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, 'stoquify_local_modern_modules_20260905_01');
    assert.equal((await client.query('SELECT "onboardingSource" FROM organizations WHERE id=$1', [fixture.organizationId])).rows[0].onboardingSource, helper.FIXTURE_SOURCE);
    const configuration = (await client.query('SELECT * FROM tenant_module_configurations WHERE "organizationId"=$1', [fixture.organizationId])).rows[0];
    const commands = (await client.query('SELECT id,state,"selectedModules","reviewSnapshot" FROM tenant_module_configuration_commands WHERE "organizationId"=$1 ORDER BY "createdAt" DESC,id DESC', [fixture.organizationId])).rows;
    const assurance = (await client.query('SELECT count(*)::int AS count FROM sessions WHERE "userId"=$1 AND "assuranceOrganizationId"=$2 AND "assuranceVerifiedAt" IS NOT NULL', [fixture.userId, fixture.organizationId])).rows[0].count;
    return { configuration, commands, assurance };
  } finally { await client.query('ROLLBACK'); await client.end(); }
}
async function main() {
  const credentials = helper.readPrivateFixture();
  const redact = value => String(value).replaceAll(credentials.password, '[redacted password]').replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted database]');
  const proof = JSON.parse(fs.readFileSync(path.join(__dirname, 'history-pagination-verify.json'), 'utf8'));
  assert.ok(proof.oldActive && proof.oldActive.ordinal > 100);
  const before = await state(); assert.ok(before.commands.length > 100);
  const targetId = proof.oldActive.id;
  const original = before.commands.find(item => item.id === targetId); assert.ok(original);
  const receipt = { startedAt: new Date().toISOString(), fixture: fixture.key, productionApproval: false, beforeSources: sources(), checks: [], targetCommandId: targetId, targetOrdinalBefore: before.commands.findIndex(item => item.id === targetId) + 1, errors: [] };
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-GB', reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(240000);
  page.on('pageerror', error => receipt.errors.push(redact(error.message)));
  try {
    const response = await context.request.post(`${helper.BASE_URL}/api/auth/sign-in/email`, { data: { email: fixture.email, password: credentials.password, rememberMe: false }, headers: { Origin: helper.BASE_URL }, timeout: 120000 });
    assert.equal(response.status(), 200);
    const started = Date.now();
    await page.goto(`${helper.BASE_URL}/en/dashboard/settings/modules`, { waitUntil: 'domcontentloaded' });
    const workbench = page.getByTestId('module-composition-workbench');
    await expect(workbench).toHaveAttribute('data-hydrated', 'true');
    await page.getByRole('tab', { name: 'Change history', exact: true }).click();
    const rows = page.locator('li[id^="module-history-"]');
    await expect(rows).toHaveCount(25);
    receipt.usefulHistoryMs = Date.now() - started;
    const seenCounts = [25]; let clicks = 0;
    while (await page.getByTestId('module-history-older').count()) {
      assert.ok(clicks < 10, 'Unexpected unbounded pagination');
      const expectedCount = Math.min(before.commands.length, seenCounts.at(-1) + 25);
      await page.getByTestId('module-history-older').click();
      await expect(rows).toHaveCount(expectedCount);
      seenCounts.push(expectedCount); clicks += 1;
    }
    const ids = await rows.evaluateAll(elements => elements.map(element => element.id.replace('module-history-', '')));
    assert.deepEqual(ids, before.commands.map(item => item.id));
    assert.equal(new Set(ids).size, before.commands.length);
    receipt.checks.push({ name: 'actual_five_page_history_without_gaps_or_duplicates', passed: true, loadedCounts: seenCounts, loadMoreClicks: clicks });
    const targetRow = page.locator(`#module-history-${targetId}`);
    await expect(targetRow.getByText('Applied', { exact: true })).toBeVisible();
    await targetRow.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await targetRow.screenshot({ path: path.join(__dirname, 'history-older-applied-configuration.png'), animations: 'disabled', scale: 'css' });
    receipt.checks.push({ name: 'older_applied_record_visible_beyond100', passed: true });
    // Deliberate stability observation: the prior defect discarded loaded pages
    // during a fresh server-props replay immediately after the screenshot.
    await page.waitForTimeout(1500);
    await expect(rows).toHaveCount(before.commands.length);
    await expect(targetRow).toBeVisible();
    receipt.checks.push({ name: 'older_row_preserved_after_capture_and_settle', passed: true, settledMs: 1500 });
    receipt.beforeReopen = { rowCount: await targetRow.count(), loadedRows: await rows.count(), buttons: await targetRow.getByRole('button').allTextContents(), accessibleTree: await targetRow.ariaSnapshot() };
    await targetRow.getByRole('button', { name: 'Reopen as new draft', exact: true }).click();
    const password = page.locator('#module-step-up-password');
    await expect(password).toBeVisible();
    await password.fill(credentials.password); await password.press('Enter');
    await expect(password).toHaveCount(0); await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(workbench.getByText('Earlier configuration opened as a new draft. Review it before applying.', { exact: true })).toBeVisible();
    const after = await state();
    assert.deepEqual(after.configuration, before.configuration);
    assert.equal(after.commands.length, before.commands.length + 1);
    assert.equal(after.assurance, before.assurance + 1);
    const fresh = after.commands.find(item => !before.commands.some(old => old.id === item.id));
    assert.equal(fresh.state, 'DRAFT'); assert.deepEqual(fresh.selectedModules, original.selectedModules);
    const previousScope = original.reviewSnapshot?.preview ?? original.reviewSnapshot ?? {};
    assert.deepEqual(fresh.reviewSnapshot.stopNewWorkModules, previousScope.stopNewWorkModules ?? []);
    assert.deepEqual(fresh.reviewSnapshot.setupInputs, previousScope.setupInputs ?? {});
    assert.deepEqual(after.commands.find(item => item.id === original.id), original);
    receipt.checks.push({ name: 'genuine_password_reopen_creates_new_draft_only', passed: true, originalUnchanged: true, activeAndDesiredConfigurationUnchanged: true, newDraftId: fresh.id });
    await page.getByRole('button', { name: 'Review configuration', exact: true }).evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: path.join(__dirname, 'history-reopened-draft.png'), animations: 'disabled', fullPage: false, scale: 'css' });
    assert.deepEqual(receipt.errors, []);
    receipt.checks.push({ name: 'no_browser_page_errors', passed: true });
  } catch (error) {
    receipt.failure = redact(error.message); process.exitCode = 1;
    receipt.failureState = { url: page.url(), rows: await page.locator('li[id^="module-history-"]').count(), targetRows: await page.locator(`#module-history-${targetId}`).count(), dialogs: await page.getByRole('dialog').allTextContents(), currentTabs: await page.getByRole('tab', { selected: true }).allTextContents(), historyButtons: await page.locator(`#module-history-${targetId} button`).allTextContents() };
    await page.screenshot({ path: path.join(__dirname, 'history-reopen-failure-context.png'), animations: 'disabled', fullPage: false, scale: 'css' });
  }
  finally { await context.close(); await browser.close(); }
  receipt.afterSources = sources(); receipt.sourceStable = JSON.stringify(receipt.beforeSources) === JSON.stringify(receipt.afterSources);
  if (!receipt.sourceStable) { receipt.failure ??= 'Tested application source changed during verification'; process.exitCode = 1; }
  receipt.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(__dirname, 'history-pagination-browser.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ passed: receipt.checks.filter(item => item.passed).length, usefulHistoryMs: receipt.usefulHistoryMs, failure: receipt.failure ?? null, sourceStable: receipt.sourceStable }));
}
main().catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted database]')); process.exitCode = 1; });
