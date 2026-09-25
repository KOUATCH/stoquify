const f = require('./suspense-currency-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const run = crypto.randomUUID().slice(0, 12), secrets = [];
const files = ['components/finance/PaymentSuspenseResolutionPanel.tsx', 'components/finance/PaymentSuspenseQueue.tsx', 'actions/payments/suspense-resolution.actions.ts', 'services/reconciliation/payment-suspense-resolution-read.service.ts', 'services/reconciliation/payment-suspense-resolution-record.ts', 'services/reconciliation/payment-suspense-resolution-archive.service.ts', 'services/reconciliation/payment-suspense-resolution-export.service.ts', 'services/reconciliation/payment-suspense-resolution.contracts.ts', 'hooks/payments/resolution-export-download.ts', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const tables = ['suspenseItem', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'closeRun', 'reconciliationRun', 'paymentException'];
const financial = async () => f.hash(await Promise.all(tables.map(n => db[n].findMany({ orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), run, sourcesBefore: sources(), journeys: [], scope: 'Actual loopback browser export and password step-up in retained owned synthetic organizations. New local test users/roles/export receipts only; no financial changes or external delivery.' };
async function journey(browser, locale) {
  const org = await db.organization.findFirstOrThrow({ where: { id: { contains: 'resolution-ui-ff8ffda6-f9c-' + locale } } });
  const item = await db.suspenseItem.findFirstOrThrow({ where: { organizationId: org.id } });
  const messages = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench, t = messages.suspenseResolution, correction = messages.suspenseCorrection;
  const result = { locale, screenshots: [], stages: [], pageErrors: [], files: [], routeLoadMs: [] }, contexts = [], pages = [];
  async function login(canExport) {
    const password = 'Owned-export-' + crypto.randomUUID() + '!', passwordHash = await hashPassword(password); secrets.push(password);
    const user = await db.user.create({ data: { organizationId: org.id, name: 'Owned export verification', email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
    await db.role.create({ data: { organizationId: org.id, code: 'OWNED_EXPORT_' + crypto.randomUUID(), nameEn: 'Owned export verification', permissions: ['payments.reconciliation.read', 'accounting.journal.read', ...(canExport ? ['payments.export'] : [])], users: { connect: { id: user.id } } } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); contexts.push(context);
    context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000); await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const response = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(response.status(), 200);
    const page = await context.newPage(); pages.push(page); page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
    const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation'); await expect(page.getByRole('region', { name: messages.suspenseWorkflow.title, exact: true })).toBeVisible(); result.routeLoadMs.push(Date.now() - start);
    return { page, password, user };
  }
  async function panelFor(page) {
    const queue = page.getByRole('region', { name: messages.suspenseWorkflow.title, exact: true });
    await queue.getByRole('button', { name: t.open, exact: true }).last().click();
    const panel = page.getByRole('region', { name: t.title, exact: true }); await expect(panel).toBeFocused(); await expect(panel.getByRole('button', { name: correction.refresh, exact: true })).toBeEnabled(); return panel;
  }
  async function shot(page, name) { const file = 'suspense-resolution-export-v107-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); result.screenshots.push(file); }
  async function download(page, panel, label, suffix) {
    const promise = page.waitForEvent('download'); await panel.getByRole('button', { name: label, exact: true }).click(); const file = await promise;
    const destination = 'suspense-resolution-export-v107-' + locale + '-' + suffix + '-' + run + '.json'; await file.saveAs(path.join(__dirname, destination));
    const bytes = fs.readFileSync(path.join(__dirname, destination)), payload = JSON.parse(bytes.toString()), hash = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.match(file.suggestedFilename(), /^stoquify-suspense-resolution-[a-f0-9-]+\.json$/); assert.equal(payload.organizationId, org.id); assert.equal(payload.sourceObservedAtExport.suspenseItemId, item.id);
    await expect(panel.getByText(t.downloadRequested, { exact: true })).toBeVisible(); await expect(panel.getByText('SHA-256: ' + hash, { exact: true })).toBeVisible();
    result.files.push({ file: destination, sha256: hash, receiptId: payload.export.receiptId, kind: payload.selectedRecord.kind }); return { hash, payload };
  }
  try {
    const denied = await login(false); let panel = await panelFor(denied.page); await expect(panel.getByText(t.exportPermission, { exact: true })).toBeVisible(); assert.equal(await panel.getByRole('button', { name: /Download evidence|Télécharger les preuves/ }).count(), 0);
    result.stages.push('Actual read-only user sees history and export-permission explanation without export controls');
    const actor = await login(true); panel = await panelFor(actor.page);
    const recordId = await panel.locator('li').first().locator('p.break-all').textContent(); assert.ok(recordId);
    const exportName = t.exportRecord.replace('{record}', recordId), key = 'stoquify:suspense-resolution:v1:' + org.id + ':' + actor.user.id + ':' + item.id;
    const before = await financial(); await panel.getByRole('button', { name: exportName, exact: true }).click(); await expect(panel.getByLabel(messages.manualMatch.passwordLabel, { exact: true })).toBeVisible();
    const saved = await actor.page.evaluate(k => sessionStorage.getItem(k), key); const request = JSON.parse(saved).pending; assert.equal(request.kind, 'export');
    assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: org.id, idempotencyKey: 'suspense-resolution-export:' + request.command.idempotencyKey } }), 0);
    await actor.page.setViewportSize({ width: 320, height: 1000 }); await panel.scrollIntoViewIfNeeded(); assert.ok(await actor.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot(actor.page, 'step-up-320');
    await panel.getByLabel(messages.manualMatch.passwordLabel, { exact: true }).fill(actor.password); await panel.getByRole('button', { name: messages.suspenseWorkflow.review.authenticate, exact: true }).click(); await expect(panel.getByText(t.authenticated, { exact: true })).toBeVisible();
    await actor.page.reload(); panel = await panelFor(actor.page); const first = await download(actor.page, panel, correction.retry, 'download');
    await expect(panel).toBeFocused(); await panel.scrollIntoViewIfNeeded(); await shot(actor.page, 'download-320');
    await actor.page.evaluate(({ k, v }) => sessionStorage.setItem(k, v), { k: key, v: saved }); await actor.page.reload(); panel = await panelFor(actor.page);
    const second = await download(actor.page, panel, correction.retry, 'replay'); assert.equal(second.hash, first.hash); assert.equal(second.payload.export.receiptId, first.payload.export.receiptId);
    assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: org.id, idempotencyKey: 'suspense-resolution-export:' + request.command.idempotencyKey } }), 1);
    assert.equal(await financial(), before);
    for (const width of [768, 1440]) { await actor.page.setViewportSize({ width, height: 1000 }); await panel.scrollIntoViewIfNeeded(); assert.ok(await actor.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot(actor.page, 'history-' + width); }
    result.stages.push('Actual export requires password step-up; no export is issued before authentication; reload and explicit retry download verified bytes');
    result.stages.push('Browser replay of the retained request returns identical bytes and one export receipt; keyboard focus returns to panel; no financial changes'); result.passed = result.pageErrors.length === 0;
  } catch (error) { result.error = f.safe(error, secrets); result.stack = String(error.stack).split('\n').slice(0, 5); for (const page of pages.slice(-1)) try { await shot(page, 'failure'); } catch {} }
  finally { for (const context of contexts) await context.close(); }
  return result;
}
(async () => { await f.local.withClient(f.target, f.local.assertOwned); report.financialBefore = await financial(); const browser = await chromium.launch({ headless: true }); try { for (const locale of ['en', 'fr']) report.journeys.push(await journey(browser, locale)); } finally { await browser.close(); } })()
.catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  report.financialUnchanged = report.financialBefore === await financial(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); await db.$disconnect();
  const file = 'suspense-resolution-export-v107-browser-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, journeys: report.journeys, error: report.error, sourceStable: report.sourceStable, financialUnchanged: report.financialUnchanged })); process.exit(!report.error && report.journeys.length === 2 && report.journeys.every(j => j.passed) && report.sourceStable && report.financialUnchanged ? 0 : 1);
});
