const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/reconciliation/payment-reconciliation-certification.service.ts', 'services/modules/module-entitlement.service.ts', 'services/modules/module-catalog.service.ts', 'actions/payments/reconciliation.actions.ts', 'actions/payments/reconciliation-sign-review.actions.ts', 'components/finance/ReconciliationSignReview.tsx', 'components/finance/ReconciliationSignReview.module.css', 'components/finance/ReconciliationCertificateExportPanel.tsx', 'components/finance/PaymentReconciliationWorkbench.tsx', 'messages/en.json', 'messages/fr.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { at: new Date().toISOString(), sourceBefore: hashes(), journeys: [] }; let browser;
async function journey(locale) {
  const x = await fixture('module-browser-' + locale + '-' + stamp), modules = getModuleCatalog().map(m => m.slug), password = 'Owned-module-sign-' + crypto.randomUUID() + '!'; secrets.push(password);
  const hashed = await hashPassword(password), permissions = ['dashboard.read', 'finance.read', 'payments.reconciliation.read', 'payments.reconciliation.sign', 'payments.reconciliation.certificate.export'];
  await db.user.update({ where: { id: x.signer.id }, data: { password: hashed, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: x.signer.id, accountId: x.signer.id, providerId: 'credential', password: hashed } });
  await db.role.create({ data: { organizationId: x.org.id, code: 'administrator', nameEn: 'Owned module sign reviewer', permissions, users: { connect: { id: x.signer.id } } } });
  await db.tenantModuleConfiguration.create({ data: { organizationId: x.org.id, manifestHash: 'owned-sign-module-browser', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.org.id, moduleSlug, status: moduleSlug === 'payment_reconciliation' ? 'read_only' : 'active', source: 'requested_modules' })) });
  const moduleStatus = status => db.tenantModuleGrant.update({ where: { organizationId_moduleSlug: { organizationId: x.org.id, moduleSlug: 'payment_reconciliation' } }, data: { status } });
  const m = require(path.join(f.root, 'messages/' + locale + '.json')).paymentReconciliationWorkbench, t = m.signReview;
  const row = { locale, organizationId: x.org.id, runId: x.run.runId, scans: [], screenshots: [], errors: [] }; report.journeys.push(row);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true, locale: locale === 'fr' ? 'fr-FR' : 'en-GB' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: x.signer.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
  const page = await context.newPage(); page.on('pageerror', e => row.errors.push(f.safe(e, secrets))); page.on('console', m => { if (m.text().includes('MISSING_MESSAGE')) row.errors.push(f.safe(m.text(), secrets)); });
  const panel = () => page.getByRole('region', { name: t.title, exact: true }), url = base + '/' + locale + '/dashboard/finance/reconciliation?reviewRun=' + x.run.runId;
  async function shot(label, target = panel()) { const file = 'sign-module-browser-' + stamp + '-' + locale + '-' + label + '.png'; await target.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); }
  async function scan(state, target) {
    console.log(JSON.stringify({ locale, phase: 'scan-' + state }));
    await target.evaluate(el => el.setAttribute('data-owned-module-review', 'true')); await page.addScriptTag({ path: require.resolve('axe-core') });
    const scan = await page.evaluate(async () => { const r = await window.axe.run('[data-owned-module-review]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); const summarize = entries => entries.map(e => ({ id: e.id, impact: e.impact, nodes: e.nodes.map(n => ({ target: n.target, html: n.html, any: n.any })) })); return { violations: summarize(r.violations), incomplete: summarize(r.incomplete), passes: r.passes.map(e => e.id) }; });
    const rendered = [], measure = require('./measure-rendered-contrast.cjs');
    for (const node of scan.incomplete.find(r => r.id === 'color-contrast')?.nodes || []) { await page.locator(node.target[0]).first().scrollIntoViewIfNeeded(); rendered.push(...await measure(page, [node])); }
    row.scans.push({ state, scan, rendered }); assert.deepEqual(scan.violations, []); assert.deepEqual(rendered.filter(r => !r.disabled && (!r.measured || !r.passes)), []);
    await target.evaluate(el => el.removeAttribute('data-owned-module-review'));
  }
  try {
    const started = Date.now(); await page.goto(url); await expect(panel().getByText(t.moduleUnavailable, { exact: true })).toBeVisible(); row.readOnlyEntryMs = Date.now() - started;
    await expect(panel()).toHaveAttribute('aria-busy', 'false'); await expect(panel().getByRole('button', { name: t.confirm, exact: true })).toBeDisabled();
    await scan('read-only-review', panel());
    for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('read-only-' + width); }
    await page.setViewportSize({ width: 320, height: 1000 }); const enlargement = await page.addStyleTag({ content: 'html { font-size: 200% !important; }' }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('read-only-text-enlargement'); await enlargement.evaluate(el => el.remove());
    await moduleStatus('active'); await panel().getByRole('button', { name: t.reviewAgain, exact: true }).focus(); await page.keyboard.press('Enter'); await expect(panel().getByText(t.ready, { exact: true })).toBeVisible();
    await panel().getByRole('button', { name: t.confirm, exact: true }).focus(); await page.keyboard.press('Enter'); await expect(panel().getByLabel(m.manualMatch.passwordLabel, { exact: true })).toBeFocused();
    await panel().getByLabel(m.manualMatch.passwordLabel, { exact: true }).fill(password); await panel().getByRole('button', { name: m.suspenseWorkflow.review.authenticate, exact: true }).click(); await expect(panel().getByRole('button', { name: t.retry, exact: true })).toBeEnabled();
    const key = 'stoquify:sign-review:v1:' + x.org.id + ':' + x.signer.id + ':' + x.run.runId, pending = await page.evaluate(k => sessionStorage.getItem(k), key); assert.ok(pending);
    await moduleStatus('suspended'); await panel().getByRole('button', { name: t.retry, exact: true }).click();
    const lockedTitle = locale === 'en' ? 'Payment reconciliation is not enabled for this tenant' : 'Le rapprochement des paiements n’est pas activé pour ce locataire';
    await expect(page.getByRole('heading', { name: lockedTitle, exact: true })).toBeVisible();
    assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).status, 'READY_FOR_SIGNOFF'); assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), pending); row.suspendedActionDeniedWithoutLosingCommand = true;
    const locked = page.getByRole('heading', { name: lockedTitle, exact: true }).locator('..'); await scan('module-locked-route', locked); await shot('module-locked', locked);
    // A pending request remains retained but cannot be retried while the grant is read-only.
    await moduleStatus('read_only'); await page.goto(url); await expect(panel().getByText(t.moduleUnavailable, { exact: true })).toBeVisible(); await expect(panel().getByRole('button', { name: t.retry, exact: true })).toBeDisabled(); assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), pending); row.readOnlyPendingRetryDisabled = true;
    await moduleStatus('active'); await page.reload(); await expect(panel().getByRole('button', { name: t.retry, exact: true })).toBeEnabled(); await panel().getByRole('button', { name: t.retry, exact: true }).click(); await expect(panel().getByRole('button', { name: t.export, exact: true })).toBeVisible();
    const signed = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } }); assert.equal(signed.status, 'SIGNED'); assert.equal(signed.certificatePayload.reviewedEvidenceRevision, JSON.parse(pending).expectedEvidenceRevision); row.restoredExactCommandSigned = true;
    await moduleStatus('read_only'); await panel().getByRole('button', { name: t.export, exact: true }).click(); const exported = page.getByRole('region', { name: m.certificateExport.title, exact: true }); await expect(exported).toBeFocused();
    const downloading = page.waitForEvent('download'); await exported.getByRole('button', { name: m.certificateExport.download, exact: true }).click(); const download = await downloading, bytes = fs.readFileSync(await download.path()), sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const receipt = await db.paymentReconciliationInboxItem.findFirstOrThrow({ where: { organizationId: x.org.id, source: 'CERTIFICATE_EXPORT', externalId: x.run.runId }, orderBy: { createdAt: 'desc' } }); assert.equal(receipt.payloadSummary.result.sha256, sha256); assert.equal(receipt.payloadSummary.result.certificateHash, signed.certificateHash); row.retainedReadOnlyDownload = { sha256, receiptId: receipt.id };
    await expect(exported.getByText(m.certificateExport.downloadRequested, { exact: true })).toBeVisible(); await shot('retained-read-only-export', exported); await exported.getByRole('button', { name: m.certificateExport.close, exact: true }).click(); await expect(panel().getByRole('button', { name: t.export, exact: true })).toBeFocused(); row.exportFocusReturned = true;
    assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'PAYMENT_RECONCILIATION_RUN_SIGN' } }), 1); assert.equal(await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }), 1); assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0); assert.deepEqual(row.errors, []); row.passed = true; console.log(JSON.stringify({ locale, passed: true }));
  } catch (error) { row.error = f.safe(error, secrets); await shot('failure', page).catch(() => {}); throw error; } finally { await context.close(); }
}
(async () => { await f.helper.withClient(f.target, f.helper.assertOwned); browser = await chromium.launch({ headless: true }); for (const locale of ['en', 'fr']) await journey(locale); report.passed = true; })().catch(error => { report.passed = false; report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); const output = path.join(__dirname, 'sign-module-browser-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
