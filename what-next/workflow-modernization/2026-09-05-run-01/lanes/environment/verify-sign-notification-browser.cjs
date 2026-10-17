const { signedFixture } = require('./verify-sign-notification.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert, helper } = f;
const { runReconciliationSignNotificationWorker: deliver } = require(path.join(f.root, 'services/reconciliation/reconciliation-sign-notification.worker.ts'));
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['components/finance/PaymentReconciliationWorkbench.tsx', 'services/reconciliation/payment-reconciliation-dashboard.service.ts', 'services/reconciliation/reconciliation-sign-notification.worker.ts', 'services/reconciliation/payment-reconciliation-notifications.ts', 'messages/en.json', 'messages/fr.json'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { at: new Date().toISOString(), sourceBefore: hashes(), journeys: [] }; let browser;
(async () => {
  await helper.withClient(f.target, helper.assertOwned);
  const x = await signedFixture('notification-browser');
  assert.equal((await deliver({ organizationId: x.org.id, workerId: 'owned-browser-' + stamp }))[0].status, 'SENT');
  await db.role.create({ data: { organizationId: x.org.id, code: 'administrator', nameEn: 'Owned notification reader', permissions: ['dashboard.read', 'finance.read', 'payments.reconciliation.read'], users: { connect: [{ id: x.other.id }] } } });
  const password = 'Owned-notice-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password);
  await db.user.update({ where: { id: x.other.id }, data: { password: hashed, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: x.other.id, accountId: x.other.id, providerId: 'credential', password: hashed } });
  const retained = await db.paymentReconciliationInboxItem.findFirstOrThrow({ where: { organizationId: x.org.id, idempotencyKey: { startsWith: 'payment-reconciliation.run.signed:' } } });
  browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const t = JSON.parse(fs.readFileSync(path.join(f.root, 'messages/' + locale + '.json'), 'utf8')).paymentReconciliationWorkbench.inbox;
    const row = { locale, screenshots: [], errors: [] }; report.journeys.push(row);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
    context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: x.other.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
    const page = await context.newPage(); page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
    try {
      const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation');
      const inbox = page.getByRole('region', { name: t.title, exact: true }), label = inbox.getByText(t.types.payment_reconciliation_run_signed, { exact: true });
      await expect(label).toHaveCount(1); await expect(label).toBeVisible(); row.entryMs = Date.now() - start;
      await expect(inbox).toContainText(t.description);
      for (const badge of await inbox.getByText(t.severities.INFO, { exact: true }).all()) { await expect(badge).toHaveClass(/dashboard-filter-chip/); await expect(badge).not.toHaveClass(/dash-warning/); }
      for (const width of [1440, 768, 320]) {
        await page.setViewportSize({ width, height: 1000 }); await label.scrollIntoViewIfNeeded();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const file = 'sign-notification-browser-' + stamp + '-' + locale + '-' + width + '.png';
        await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled', caret: 'initial' }); row.screenshots.push(file);
      }
      await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await label.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await expect(label).toBeVisible();
      const file = 'sign-notification-browser-' + stamp + '-' + locale + '-text200.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled', caret: 'initial' }); row.screenshots.push(file);
      await page.reload(); await expect(label).toHaveCount(1);
      assert.deepEqual(await db.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: retained.id } }), retained);
      assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0); assert.deepEqual(row.errors, []);
      row.passed = true; console.log(JSON.stringify({ locale, passed: true, entryMs: row.entryMs }));
    } finally { await context.close(); }
  }
  report.passed = true;
})().catch(error => { report.passed = false; report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'sign-notification-browser-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
