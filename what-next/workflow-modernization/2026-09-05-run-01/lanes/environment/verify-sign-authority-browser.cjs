const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: originalExpect } = require('@playwright/test'), expect = originalExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['components/finance/ReconciliationSignReview.tsx', 'components/finance/PaymentReconciliationWorkbench.tsx', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'actions/payments/reconciliation.actions.ts', 'actions/payments/reconciliation-sign-review.actions.ts', 'services/_shared/protect.ts', 'lib/auth-client.ts', 'messages/en.json', 'messages/fr.json'];
files.push("components/finance/ReconciliationSignReview.module.css");
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { startedAt: new Date().toISOString(), sourceBefore: hashes(), journeys: [], limits: ['Owned local Chromium development application; no live customer changes.', 'Automated accessibility and controlled text enlargement are not native speech or browser zoom certification.'] };
let browser;
async function journey(locale) {
  const x = await fixture('browser-authority-' + locale + '-' + stamp), password = 'Owned-sign-authority-' + crypto.randomUUID() + '!'; secrets.push(password);
  const hashed = await hashPassword(password), permissions = ['dashboard.read', 'finance.read', 'payments.reconciliation.read', 'payments.reconciliation.sign', 'payments.reconciliation.certificate.export'];
  await db.user.update({ where: { id: x.signer.id }, data: { password: hashed, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: x.signer.id, accountId: x.signer.id, providerId: 'credential', password: hashed } });
  const role = await db.role.create({ data: { organizationId: x.org.id, code: 'administrator', nameEn: 'Owned sign authority browser', permissions, users: { connect: { id: x.signer.id } } } });
  const m = require(path.join(f.root, 'messages/' + locale + '.json')).paymentReconciliationWorkbench, t = m.signReview;
  const row = { locale, organizationId: x.org.id, runId: x.run.runId, scans: [], screenshots: [], requests: [], errors: [] }; report.journeys.push(row);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: locale === 'fr' ? 'fr-FR' : 'en-GB' });
  context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: x.signer.email, password }, timeout: 180000 })).status(), 200);
  const page = await context.newPage(), starts = new WeakMap();
  page.on('request', request => starts.set(request, { at: Date.now(), phase: row.phase }));
  page.on('requestfinished', request => { const url = new URL(request.url()), start = starts.get(request); if (url.origin === base && !url.pathname.startsWith('/_next/')) row.requests.push({ phase: start?.phase, method: request.method(), pathname: url.pathname, startedAt: start?.at, elapsedMs: Date.now() - start?.at }); });
  page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
  const panel = () => page.getByRole('region', { name: t.title, exact: true });
  async function screenshot(label) { const name = 'sign-authority-browser-' + stamp + '-' + locale + '-' + label + '.png'; const target = await panel().count() ? panel() : page; await target.screenshot({ path: path.join(__dirname, name), animations: 'disabled' }); row.screenshots.push(name); }
  async function refreshAuthority() {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/me/permissions');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); window.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); window.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState;
    });
    await response; row.emulatedVisibilityTransitionRefresh = true;
  }
  async function scan(state) {
    await expect(panel()).toHaveAttribute('aria-busy', 'false');
    await expect(panel().getByText(t.loading, { exact: true })).toHaveCount(0);
    console.log(JSON.stringify({ locale, phase: 'scan-' + state }));
    await panel().evaluate(element => element.setAttribute('data-owned-sign-review', 'true'));
    await page.addScriptTag({ path: require.resolve('axe-core') });
    const scan = await page.evaluate(async () => {
      const r = await window.axe.run('[data-owned-sign-review]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      const summarize = entries => entries.map(e => ({ id: e.id, impact: e.impact, nodes: e.nodes.map(n => ({ target: n.target, html: n.html, any: n.any })) }));
      return { violations: summarize(r.violations), incomplete: summarize(r.incomplete), passes: r.passes.map(p => p.id) };
    });
    const nodes = scan.incomplete.find(rule => rule.id === 'color-contrast')?.nodes || [], measure = require('./measure-rendered-contrast.cjs'), rendered = [];
    for (const node of nodes) { await page.locator(node.target[0]).first().scrollIntoViewIfNeeded(); rendered.push(...await measure(page, [node])); }
    row.scans.push({ state, scan, rendered }); assert.deepEqual(scan.violations, []); assert.deepEqual(rendered.filter(r => !r.measured || !r.passes), []);
  }
  const url = base + '/' + locale + '/dashboard/finance/reconciliation?reviewRun=' + x.run.runId;
  try {
    row.phase = 'cold-entry'; let started = Date.now(); await page.goto(url); await expect(panel().getByText(t.ready, { exact: true })).toBeVisible(); row.firstEntryMs = Date.now() - started;
    row.phase = 'warm-entry'; started = Date.now(); await page.goto(url); await expect(panel().getByText(t.ready, { exact: true })).toBeVisible(); row.warmEntryMs = Date.now() - started;
    row.navigation = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { responseStart: n.responseStart, responseEnd: n.responseEnd, domContentLoadedEventEnd: n.domContentLoadedEventEnd, loadEventEnd: n.loadEventEnd }; });
    row.warmResources = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => ['fetch', 'xmlhttprequest'].includes(r.initiatorType)).map(r => ({ pathname: new URL(r.name).pathname, startTime: r.startTime, responseStart: r.responseStart, responseEnd: r.responseEnd, duration: r.duration })));
    await expect(panel()).toBeFocused();
    if (locale === 'en') {
      const previous = JSON.parse(fs.readFileSync(path.join(__dirname, 'sign-authority-browser-518f0abb-c9f7-46f6-b3e4-6d8c4c5f85c8.json'), 'utf8'));
      assert.equal(previous.sourceStable, true); assert.deepEqual(previous.sourceAfter, hashes());
      const ready = previous.journeys[0].scans.find(s => s.state === 'ready'); assert.deepEqual(ready.scan.violations, []); assert.ok(ready.rendered.every(r => r.measured && r.passes));
      row.reusedReadyContrast = 'sign-authority-browser-518f0abb-c9f7-46f6-b3e4-6d8c4c5f85c8.json#journeys[0].scans[0]';
    } else await scan('ready');
    for (const width of [320, 1440]) { await page.setViewportSize({ width, height: 1000 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await screenshot('ready-' + width); }
    row.phase = 'authenticate'; await panel().getByRole('button', { name: t.confirm, exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(panel().getByLabel(m.manualMatch.passwordLabel, { exact: true })).toBeFocused();
    await panel().getByLabel(m.manualMatch.passwordLabel, { exact: true }).fill(password); await panel().getByRole('button', { name: m.suspenseWorkflow.review.authenticate, exact: true }).click();
    const retry = () => panel().getByRole('button', { name: t.retry, exact: true }); await expect(retry()).toBeEnabled();
    const storageKey = 'stoquify:sign-review:v1:' + x.org.id + ':' + x.signer.id + ':' + x.run.runId;
    const pending = await page.evaluate(key => sessionStorage.getItem(key), storageKey); assert.ok(pending);
    // Keep the already-open client snapshot, but withdraw the server's current read permission.
    row.phase = 'server-read-withdrawal'; await db.role.update({ where: { id: role.id }, data: { permissions: permissions.filter(p => p !== 'payments.reconciliation.read') } });
    await retry().click();
    const deniedTitle = locale === 'en' ? 'Payment reconciliation is not available for this role' : 'Le rapprochement des paiements n’est pas accessible à ce rôle';
    await expect(page.getByText(deniedTitle, { exact: true })).toBeVisible();
    assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).status, 'READY_FOR_SIGNOFF');
    assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'PAYMENT_RECONCILIATION_RUN_SIGN' } }), 0);
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), storageKey), pending); row.actualServerReadWithdrawalDenied = true;
    await expect(panel()).toHaveCount(0); await screenshot('authority-withdrawn');
    await db.role.update({ where: { id: role.id }, data: { permissions } }); await page.goto(url); await expect(panel().getByText(t.ready, { exact: true })).toBeVisible();
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), storageKey), pending); row.currentAuthorityReread = true;
    row.phase = 'restored-sign'; await expect(retry()).toBeEnabled(); await retry().focus(); await page.keyboard.press('Enter'); await expect(panel().getByRole('button', { name: t.export, exact: true })).toBeVisible();
    if (locale === 'en') {
      const previous = JSON.parse(fs.readFileSync(path.join(__dirname, 'sign-authority-browser-52ea9907-6b7f-4215-97b6-1e16101926aa.json'), 'utf8'));
      assert.equal(previous.sourceStable, true); assert.deepEqual(previous.sourceAfter, hashes());
      const signedScan = previous.journeys[0].scans.find(s => s.state === 'signed'); assert.deepEqual(signedScan.scan.violations, []); assert.ok(signedScan.rendered.every(r => r.measured && r.passes));
      row.reusedSignedContrast = 'sign-authority-browser-52ea9907-6b7f-4215-97b6-1e16101926aa.json#journeys[0].scans[0]';
    } else await scan('signed');
    await screenshot('signed');
    assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'PAYMENT_RECONCILIATION_RUN_SIGN' } }), 1);
    assert.equal(await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }), 1);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
    await db.role.update({ where: { id: role.id }, data: { permissions: permissions.filter(p => p !== 'payments.reconciliation.sign') } }); await refreshAuthority();
    await expect(panel().getByText(t.denied, { exact: true })).toBeVisible();
    await expect(panel().getByRole('button', { name: t.export, exact: true })).toHaveCount(0); row.signedViewWithdrawn = true;
    assert.deepEqual(row.errors, []); row.passed = true; console.log(JSON.stringify({ locale, passed: true, firstEntryMs: row.firstEntryMs, warmEntryMs: row.warmEntryMs }));
  } catch (error) { row.error = f.safe(error, secrets); await screenshot('failed').catch(() => {}); throw error; } finally { await context.close(); }
}
(async () => { await f.helper.withClient(f.target, f.helper.assertOwned); browser = await chromium.launch({ headless: true }); for (const locale of ['en', 'fr']) await journey(locale); report.passed = true; })().catch(error => { report.passed = false; report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); report.endedAt = new Date().toISOString();
  const output = path.join(__dirname, 'sign-authority-browser-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
