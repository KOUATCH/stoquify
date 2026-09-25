const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['components/finance/PaymentReconciliationWorkbench.tsx', 'hooks/payments/usePaymentReconciliationWorkbench.ts', 'hooks/payments/usePaymentReconciliationDashboard.ts', 'lib/auth-client.ts', 'app/[locale]/(dashboard)/dashboard/finance/finance-route-access.tsx'];
files.push('components/daily-habit/DailyHabitDigestDashboard.tsx');
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const tracePath = path.join(f.root, '.next-workflow-supplier/trace');
const trace = () => fs.readFileSync(tracePath, 'utf8').trim().split(/\r?\n/).flatMap(line => { try { return JSON.parse(line); } catch { return []; } });
const report = { at: new Date().toISOString(), sourceBefore: sources(), samples: [], environment: 'Existing owned local Next development server; no concurrent test/typecheck jobs. Timings include client navigation and source reads. No bodies, cookies, headers or query strings retained.' };
let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const org = await db.organization.findUniqueOrThrow({ where: { slug: 'payment-digest-6053b642-8c5d-4794-bd17-4c42ad9900f8' } }); assert.ok(org.name.startsWith(f.helper.prefix));
  const password = 'Owned-profile-' + crypto.randomUUID() + '!'; secrets.push(password); const hashed = await hashPassword(password);
  const user = await db.user.create({ data: { organizationId: org.id, email: stamp + '@example.invalid', password: hashed, isActive: true, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: hashed } });
  await db.role.create({ data: { organizationId: org.id, code: 'profile-' + stamp, nameEn: 'Owned timing reader', permissions: ['dashboard.read', 'finance.read', 'payments.reconciliation.read'], users: { connect: { id: user.id } } } });
  const beforeTrace = trace();
  report.priorColdSpans = beforeTrace.filter(span => span.startTime >= 1789482880000 && span.startTime <= 1789482945000 && ['compile-path', 'handle-request', 'ensure-page'].includes(span.name)).map(span => ({ name: span.name, startTime: span.startTime, durationMs: span.duration / 1000, pathname: typeof span.tags?.url === 'string' ? span.tags.url.split('?')[0] : undefined }));
  const startTime = Date.now();
  browser = await chromium.launch({ headless: true }); const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: user.email, password } })).status(), 200);
  for (const locale of ['en', 'en', 'fr']) {
    const page = await context.newPage(), sample = { locale, requests: [], errors: [] }; report.samples.push(sample); const requests = new Map(); let started = 0;
    page.on('pageerror', error => sample.errors.push(f.safe(error, secrets)));
    page.on('request', request => { if (!started) return; const record = { pathname: new URL(request.url()).pathname, method: request.method(), type: request.resourceType(), startedMs: Date.now() - started, state: 'pending' }; requests.set(request, record); sample.requests.push(record); });
    page.on('response', response => { const record = requests.get(response.request()); if (record) Object.assign(record, { status: response.status(), headersAtMs: Date.now() - started }); });
    page.on('requestfinished', request => { const record = requests.get(request); if (!record) return; const timing = request.timing(); Object.assign(record, { state: 'finished', elapsedMs: Date.now() - started - record.startedMs, responseStartMs: timing.responseStart, responseEndMs: timing.responseEnd }); });
    page.on('requestfailed', request => { const record = requests.get(request); if (record) record.state = 'failed-or-cancelled'; });
    await page.goto(base + '/' + locale + '/dashboard/daily-digest', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const command = page.getByRole('button', { name: locale === 'en' ? 'Command' : 'Pilotage', exact: true }); await expect(command).toBeEnabled(); await command.click();
    const target = '/' + locale + '/dashboard/finance/reconciliation', link = page.getByRole('region', { name: locale === 'en' ? 'Actions and risks' : 'Actions et risques', exact: true }).locator('a[href="' + target + '"]').first();
    await page.evaluate(() => { window.__ownedNavigationMarker = 'digest-document'; });
    await link.focus(); started = Date.now(); await page.keyboard.press('Enter'); await page.waitForURL(base + target, { waitUntil: 'domcontentloaded', timeout: 120000 }); sample.routeResolvedMs = Date.now() - started;
    const copy = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench;
    await expect(page.getByRole('heading', { name: copy.title, exact: true })).toBeVisible(); sample.headingMs = Date.now() - started;
    await expect(page.getByText(org.name, { exact: true }).first()).toBeVisible(); sample.dataVisibleMs = Date.now() - started;
    assert.equal(await page.evaluate(() => window.__ownedNavigationMarker), 'digest-document'); sample.documentPreserved = true;
    assert.deepEqual(sample.errors, []); await page.close();
  }
  await context.close(); report.currentSpans = trace().filter(span => span.startTime >= startTime && ['compile-path', 'handle-request', 'ensure-page'].includes(span.name)).map(span => ({ name: span.name, startTime: span.startTime, durationMs: span.duration / 1000, pathname: typeof span.tags?.url === 'string' ? span.tags.url.split('?')[0] : undefined })); report.passed = true;
}
main().catch(error => { report.error = f.safe(error, secrets); report.passed = false; process.exitCode = 1; }).finally(async () => {
  await browser?.close(); report.sourceAfter = sources(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'digest-reconciliation-profile-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, samples: report.samples.map(sample => ({ locale: sample.locale, routeResolvedMs: sample.routeResolvedMs, headingMs: sample.headingMs, dataVisibleMs: sample.dataVisibleMs, requests: sample.requests.filter(r => r.type !== 'script' && r.type !== 'stylesheet' && r.type !== 'image' && r.type !== 'font') })) })); await db.$disconnect();
});
