const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const organizationId = 'workflow_run_discovery_bac23aa2-f708-4f23-be93-4ecb6b36125a', base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [], after = process.argv.includes('--after');
const files = ['hooks/payments/usePaymentReconciliationWorkbench.ts', 'hooks/payments/usePaymentReconciliationDashboard.ts', 'components/finance/PaymentReconciliationWorkbench.tsx', 'services/reconciliation/payment-reconciliation-dashboard.service.ts', 'services/payments/payment-reconciliation-workbench.service.ts', 'actions/payments/reconciliation-workbench.actions.ts', 'lib/auth-client.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const report = { at: new Date().toISOString(), sourcesBefore: sources(), services: [], browser: [], scope: 'Owned local development app. Service timings exclude HTTP guards and compilation. Query extension records model/operation/time only. Browser trace excludes bodies, cookies, headers and query strings. Dashboard alert trigger retained.' };
let browser, current = null;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  assert.ok((await db.organization.findUniqueOrThrow({ where: { id: organizationId } })).name.startsWith(f.helper.prefix));
  const instrumented = db.$extends({ query: { $allModels: { async $allOperations({ model, operation, args, query }) { const start = performance.now(); try { return await query(args); } finally { current?.queries.push({ model, operation, ms: Math.round((performance.now() - start) * 100) / 100 }); } } } } });
  require(path.join(f.root, 'prisma/db.ts')).db = instrumented;
  const dashboard = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-dashboard.service.ts'));
  const workbench = require(path.join(f.root, 'services/payments/payment-reconciliation-workbench.service.ts'));
  for (let i = 0; i < (after ? 0 : 3); i++) for (const [name, call] of [['durable-dashboard', () => dashboard.getPaymentReconciliationDashboardData(organizationId)], ['payment-workbench', () => workbench.getPaymentReconciliationWorkbench({ organizationId, period: 'mtd' })]]) {
    current = { name, iteration: i + 1, queries: [] }; const started = performance.now(); await call(); current.ms = Math.round(performance.now() - started); report.services.push(current); current = null;
  }
  require(path.join(f.root, 'prisma/db.ts')).db = db;
  const password = 'Owned-profile-' + crypto.randomUUID() + '!'; secrets.push(password); const passwordHash = await hashPassword(password);
  const user = await db.user.create({ data: { organizationId, name: 'Owned timing reviewer', email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
  const role = await db.role.findFirstOrThrow({ where: { organizationId, code: 'administrator' } }); await db.role.update({ where: { id: role.id }, data: { users: { connect: { id: user.id } } } });
  await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
    for (const locale of ['en', 'en', 'fr']) {
      const page = await context.newPage(), started = Date.now(), requests = new Map(), sample = { locale, requests: [], responses: [], screenshots: [], pageErrors: [] }; report.browser.push(sample);
      page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(180000); page.on('pageerror', error => sample.pageErrors.push(f.safe(error, secrets)));
      page.on('request', request => requests.set(request, Date.now()));
      page.on('response', response => sample.responses.push({ path: new URL(response.url()).pathname, method: response.request().method(), status: response.status(), headersAtMs: Date.now() - started }));
      page.on('requestfinished', request => { const when = requests.get(request), timing = request.timing(); sample.requests.push({ path: new URL(request.url()).pathname, method: request.method(), kind: request.resourceType(), startedMs: when - started, elapsedMs: Date.now() - when, responseStartMs: timing.responseStart, responseEndMs: timing.responseEnd }); });
      const copy = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench;
      await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation'); sample.navigationResolvedMs = Date.now() - started;
      await expect(page.getByRole('button', { name: copy.runPreparation.open, exact: true })).toBeEnabled(); sample.durableReadyMs = Date.now() - started;
      sample.navigation = await page.evaluate(() => performance.getEntriesByType('navigation').map(n => ({ requestStart: n.requestStart, responseStart: n.responseStart, responseEnd: n.responseEnd, domInteractive: n.domInteractive, domContentLoadedEventEnd: n.domContentLoadedEventEnd, loadEventEnd: n.loadEventEnd })));
      if (after && locale !== report.browser[report.browser.length - 2]?.locale) {
        await page.setViewportSize({ width: 320, height: 1000 }); await page.getByRole('button', { name: copy.runPreparation.open, exact: true }).click();
        const list = page.getByRole('region', { name: copy.runPreparation.title, exact: true }); await expect(list.getByRole('button', { name: copy.runPreparation.next, exact: true })).toBeEnabled(); await list.scrollIntoViewIfNeeded();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const screenshot = 'reconciliation-cache-v120-' + locale + '-' + stamp + '.png'; await page.screenshot({ path: path.join(__dirname, screenshot), animations: 'disabled' }); sample.screenshots.push(screenshot);
        let denied = false;
        await page.route('**/api/me/permissions', route => { denied = true; return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Owned authorization failure' }) }); });
        await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        const errorCopy = require(path.join(f.root, 'lib/dashboard/presentation.ts')).dashboardSharedCopy[locale].error;
        await expect(page.getByRole('heading', { name: errorCopy.title, exact: true })).toBeVisible(); assert.equal(denied, true);
        await expect(page.getByRole('region', { name: copy.runPreparation.title, exact: true })).toHaveCount(0);
        sample.permissionFailureHidesCache = true;
        await page.unroute('**/api/me/permissions');
        await Promise.all([page.waitForEvent('load', { timeout: 180000 }), page.getByRole('button', { name: errorCopy.retry, exact: true }).click()]);
        await expect(page.getByRole('button', { name: copy.runPreparation.open, exact: true })).toBeEnabled(); sample.permissionFailureHidesCacheAndReloadRecovers = true;
      }
      await page.close();
    }
  } finally { await context.close(); }
  report.passed = true;
}
main().catch(error => { report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  report.phase = after ? 'after-cache-fix' : 'before-cache-fix';
  const file = path.join(__dirname, 'reconciliation-profile-v120-' + stamp + '.json');
  console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, services: report.services.map(s => ({ name: s.name, iteration: s.iteration, ms: s.ms, queryCount: s.queries.length })), browser: report.browser.map(b => ({ locale: b.locale, navigationResolvedMs: b.navigationResolvedMs, durableReadyMs: b.durableReadyMs })), error: report.error }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await browser?.close(); await db.$disconnect(); }
});
