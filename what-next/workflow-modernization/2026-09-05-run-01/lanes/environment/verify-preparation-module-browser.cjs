const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'actions/payments/reconciliation-preparation.actions.ts', 'components/finance/ReconciliationPreparationWorkbench.tsx', 'components/finance/PaymentReconciliationWorkbench.tsx', 'services/modules/module-entitlement.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const copy = () => Object.fromEntries(['en', 'fr'].map(locale => [locale, crypto.createHash('sha256').update(JSON.stringify(JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'))).paymentReconciliationWorkbench)).digest('hex')]));
const report = { at: new Date().toISOString(), sourceBefore: hashes(), translationBefore: copy(), journeys: [] }; let browser;
async function journey(locale) {
  const x = await fixture('preparation-browser-' + locale + '-' + stamp), modules = getModuleCatalog().map(m => m.slug), password = 'Owned-preparation-' + crypto.randomUUID() + '!'; secrets.push(password);
  const hashed = await hashPassword(password), permissions = ['dashboard.read', 'finance.read', 'accounting.journal.read', 'payments.reconciliation.read', 'payments.reconciliation.run'];
  await db.user.update({ where: { id: x.maker.id }, data: { password: hashed, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: x.maker.id, accountId: x.maker.id, providerId: 'credential', password: hashed } });
  await db.role.create({ data: { organizationId: x.org.id, code: 'administrator', nameEn: 'Owned preparation operator', permissions, users: { connect: { id: x.maker.id } } } });
  await db.tenantModuleConfiguration.create({ data: { organizationId: x.org.id, manifestHash: 'owned-preparation-browser', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.org.id, moduleSlug, status: moduleSlug === 'payment_reconciliation' ? 'read_only' : 'active', source: 'requested_modules' })) });
  const grant = status => db.tenantModuleGrant.update({ where: { organizationId_moduleSlug: { organizationId: x.org.id, moduleSlug: 'payment_reconciliation' } }, data: { status } });
  const m = JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'))).paymentReconciliationWorkbench, t = m.runPreparation;
  const row = { locale, organizationId: x.org.id, runId: x.run.runId, screenshots: [], errors: [] }; report.journeys.push(row);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: locale === 'fr' ? 'fr-FR' : 'en-GB' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: x.maker.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
  const page = await context.newPage(); page.on('pageerror', e => row.errors.push(f.safe(e, secrets))); page.on('console', m => { if (m.text().includes('MISSING_MESSAGE')) row.errors.push(f.safe(m.text(), secrets)); });
  const panel = () => page.getByRole('region', { name: t.reviewTitle, exact: true }), url = base + '/' + locale + '/dashboard/finance/reconciliation';
  const key = 'stoquify:run-preparation:v1:' + x.org.id + ':' + x.maker.id + ':' + x.run.runId;
  async function open() {
    if (!await panel().count()) { await page.getByRole('button', { name: t.open, exact: true }).click(); const list = page.getByRole('region', { name: t.title, exact: true }); await expect(panel().or(list).first()).toBeVisible(); if (!await panel().count()) await list.getByRole('button', { name: t.review, exact: true }).click(); }
    await expect(panel()).toHaveAttribute('aria-busy', 'false');
  }
  async function shot(label) { const file = 'preparation-module-browser-' + stamp + '-' + locale + '-' + label + '.png'; await panel().screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); }
  try {
    const start = Date.now(); await page.goto(url); await open(); row.entryMs = Date.now() - start;
    await panel().getByRole('button', { name: t.preview, exact: true }).focus(); await page.keyboard.press('Enter');
    const preview = panel().getByRole('region', { name: t.previewTitle, exact: true });
    await expect(preview).toBeFocused(); await expect(preview.getByText(t.blockers.MODULE_WRITE_REQUIRED, { exact: true })).toBeVisible(); await expect(panel().getByRole('button', { name: t.confirm, exact: true })).toBeDisabled();
    await preview.evaluate(el => el.setAttribute('data-owned-preparation-preview', 'true')); await page.addScriptTag({ path: require.resolve('axe-core') });
    row.previewScan = await page.evaluate(async () => { const r = await window.axe.run('[data-owned-preparation-preview]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return { violations: r.violations, incomplete: r.incomplete }; });
    assert.deepEqual(row.previewScan.violations, []);
    if (process.env.PREPARATION_CONTRAST_ONLY === 'true') {
      row.scope = 'read-only preview rendered contrast only'; row.renderedContrast = [];
      const nodes = row.previewScan.incomplete.filter(item => item.id === 'color-contrast').flatMap(item => item.nodes);
      assert.equal(nodes.length, 2);
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const measured = await require('./measure-rendered-contrast.cjs')(page, nodes);
        assert.ok(measured.every(item => item.measured && item.passes));
        row.renderedContrast.push({ width, measured }); await shot('rendered-contrast-' + width);
      }
      row.passed = true; console.log(JSON.stringify({ locale, scope: row.scope, passed: true })); return;
    }
    for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('read-only-' + width); }
    await page.setViewportSize({ width: 640, height: 1000 }); await page.evaluate(() => document.documentElement.style.fontSize = '200%'); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('read-only-text-enlargement'); await page.evaluate(() => document.documentElement.style.fontSize = '');
    await grant('active'); await panel().getByLabel(t.reason, { exact: true }).fill(locale === 'fr' ? 'Examen des preuves conservées pour préparation' : 'Reviewed retained evidence for preparation');
    await panel().getByRole('button', { name: t.preview, exact: true }).click(); await expect(panel().getByText(t.ready, { exact: true })).toBeVisible(); await panel().getByRole('button', { name: t.confirm, exact: true }).click();
    const input = panel().getByLabel(m.manualMatch.passwordLabel, { exact: true }); await expect(input).toBeFocused();
    if (process.env.PREPARATION_AUTH_VERIFY === 'true') {
      const originalCommand = await page.evaluate(k => sessionStorage.getItem(k), key);
      await input.fill('Deliberately incorrect owned password!'); await panel().getByRole('button', { name: m.suspenseWorkflow.review.authenticate, exact: true }).click();
      await expect(panel().getByRole('alert')).toHaveText(m.suspenseWorkflow.review.authFailed); await expect(input).toHaveValue(''); await expect(input).toBeFocused();
      assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), originalCommand); row.rejectedPasswordClearedAndRefocused = true;
      await panel().evaluate(el => el.setAttribute('data-owned-authentication', 'true'));
      const scan = await page.evaluate(async () => { const result = await window.axe.run('[data-owned-authentication]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return { violations: result.violations, incomplete: result.incomplete }; });
      row.authenticationScan = scan; assert.deepEqual(scan.violations, []); row.authenticationContrast = [];
      for (const node of scan.incomplete.filter(item => item.id === 'color-contrast').flatMap(item => item.nodes)) {
        const target = page.locator(node.target[0]);
        if (!await target.evaluate(el => !!el.closest('form') || el.getAttribute('role') === 'alert')) continue;
        if (await target.evaluate(el => el instanceof HTMLInputElement && el.type === 'password' && !el.value && !el.placeholder)) { row.authenticationContrast.push({ target: node.target, notApplicable: 'Empty password input has no rendered text' }); continue; }
        const measured = await require('./measure-rendered-contrast.cjs')(page, [node]); assert.ok(measured.every(item => item.disabled || (item.measured && item.passes))); row.authenticationContrast.push(...measured);
      }
      for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('authentication-error-' + width); }
      await page.setViewportSize({ width: 640, height: 1000 }); await page.evaluate(() => document.documentElement.style.fontSize = '200%'); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('authentication-error-enlarged'); await page.evaluate(() => document.documentElement.style.fontSize = '');
      let authAborted = false;
      await page.route('**/*', route => { const request = route.request(); if (!authAborted && request.method() === 'POST' && request.headers()['next-action'] && request.postData()?.includes('password')) { authAborted = true; return route.abort('connectionfailed'); } return route.fallback(); });
      await input.fill(password); await panel().getByRole('button', { name: m.suspenseWorkflow.review.authenticate, exact: true }).click();
      await expect(panel().getByRole('alert')).toHaveText(m.suspenseWorkflow.review.authFailed); await expect(input).toHaveValue(''); await expect(input).toBeFocused(); assert.equal(authAborted, true);
      assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), originalCommand); assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 0); row.authenticationTransportFailureRetainsCommand = true;
    }
    await input.fill(password); await panel().getByRole('button', { name: m.suspenseWorkflow.review.authenticate, exact: true }).click(); await expect(panel().getByText(m.suspenseWorkflow.review.authenticated, { exact: true })).toBeVisible();
    if (process.env.PREPARATION_AUTH_VERIFY === 'true') {
      await expect(panel().getByRole('button', { name: t.retry, exact: true })).toBeFocused(); assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 0); row.authenticatedRetryFocusWithoutSubmission = true; await shot('authenticated-retry-focus');
    }
    if (process.env.PREPARATION_AUTH_FOCUS_ONLY === 'true') {
      row.scope = 'authentication focus defect reproduction only';
      row.authenticationFocus = await page.evaluate(() => ({ tag: document.activeElement.tagName, name: document.activeElement.getAttribute('aria-label') }));
      row.authenticationFocusLost = row.authenticationFocus.tag === 'BODY';
      assert.equal(row.authenticationFocusLost, true, 'Reproduce the suspected focus loss before changing application code');
      assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 0);
      await shot('authentication-focus-loss'); row.passed = true; console.log(JSON.stringify({ locale, scope: row.scope, authenticationFocusLost: true })); return;
    }
    const saved = await page.evaluate(k => sessionStorage.getItem(k), key), command = JSON.parse(saved).pending; assert.ok(command.idempotencyKey);
    await grant('read_only'); await panel().getByRole('button', { name: t.retry, exact: true }).click(); await expect(panel().getByRole('alert')).toHaveText(t.writeDenied);
    assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 0);
    await panel().getByRole('button', { name: t.preview, exact: true }).click(); await expect(panel().getByText(t.blockers.MODULE_WRITE_REQUIRED, { exact: true })).toBeVisible(); await expect(panel().getByRole('button', { name: t.retry, exact: true })).toBeDisabled(); assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), saved); row.withdrawalRetainsCommandAndDisablesRetry = true;
    await grant('active'); await panel().getByRole('button', { name: t.preview, exact: true }).click(); await expect(panel().getByText(t.ready, { exact: true })).toBeVisible();
    let intercepted = 0;
    await page.route('**/*', async route => { const request = route.request(); if (!intercepted && request.method() === 'POST' && request.headers()['next-action'] && request.postData()?.includes(command.idempotencyKey)) { intercepted++; await route.fetch(); await expect.poll(() => db.paymentReconciliationInboxItem.count({ where: { organizationId: x.org.id, idempotencyKey: 'reconciliation-run-preparation:' + command.idempotencyKey } })).toBe(1); return route.abort('connectionfailed'); } return route.fallback(); });
    await panel().getByRole('button', { name: t.retry, exact: true }).click(); await expect(panel().getByRole('alert')).toHaveText(t.failed); assert.equal(intercepted, 1); assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), saved); row.responseLostAfterCommit = true;
    const receipt = await db.paymentReconciliationInboxItem.findFirstOrThrow({ where: { organizationId: x.org.id, idempotencyKey: 'reconciliation-run-preparation:' + command.idempotencyKey } });
    await page.reload(); await open(); assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), saved);
    await panel().getByRole('button', { name: t.retry, exact: true }).focus(); await page.keyboard.press('Enter'); await expect.poll(() => page.evaluate(k => JSON.parse(sessionStorage.getItem(k)).pending, key)).toBeNull(); await expect(panel()).toHaveAttribute('aria-busy', 'false'); await expect(panel()).toBeFocused();
    assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 1);
    assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: x.org.id, idempotencyKey: 'reconciliation-run-preparation:' + command.idempotencyKey } }), 1);
    assert.equal((await db.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: receipt.id } })).payloadHash, receipt.payloadHash);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0); row.exactReplayRetainsOneReceiptAndAudit = true;
    await page.setViewportSize({ width: 320, height: 1000 }); await shot('recovered-history-320');
    await panel().getByRole('button', { name: t.back, exact: true }).click(); const list = page.getByRole('region', { name: t.title, exact: true }); await expect(list).toBeFocused(); await list.getByRole('button', { name: t.close, exact: true }).click(); await expect(page.getByRole('button', { name: t.open, exact: true })).toBeFocused(); row.keyboardReturn = true;
    assert.deepEqual(row.errors, []); row.passed = true; console.log(JSON.stringify({ locale, passed: true, entryMs: row.entryMs }));
  } catch (error) { row.error = f.safe(error, secrets); await shot('failure').catch(() => {}); throw error; } finally { await context.close(); }
}
(async () => { await f.helper.withClient(f.target, f.helper.assertOwned); browser = await chromium.launch({ headless: true }); for (const locale of process.env.PREPARATION_AUTH_FOCUS_ONLY === 'true' ? ['en'] : ['en', 'fr']) await journey(locale); report.passed = true; })().catch(error => { report.passed = false; report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); report.sourceAfter = hashes(); report.translationAfter = copy(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); report.translationStable = JSON.stringify(report.translationBefore) === JSON.stringify(report.translationAfter);
  const output = path.join(__dirname, 'preparation-module-browser-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable, translationStable: report.translationStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
