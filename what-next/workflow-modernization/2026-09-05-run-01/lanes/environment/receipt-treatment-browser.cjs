// Author-only until the coordinating owner explicitly releases source and runtime.
// Real application guidance smoke; no browser response mocking or external effects.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Use --run only after the owner releases the current source and confirms the local application listener.');
} else {
  const runtime = require('./receipt-treatment-runtime.cjs');
  const { h, f, db } = runtime, { fs, path, crypto, assert, base } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test');
  const expect = baseExpect.configure({ timeout: 60000 });
  const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
  const run = crypto.randomUUID(), secrets = [];
  const files = [
    'components/purchasing/InvoiceLedgerRecoveryWorkbench.tsx',
    'actions/purchasing/invoice-ledger-recovery.actions.ts',
    'services/purchasing/invoice-ledger-recovery-authority.ts',
    'services/purchasing/invoice-ledger-recovery-contracts.ts',
    'app/[locale]/(dashboard)/dashboard/purchases/payables/recovery/page.tsx',
    'app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts',
    'messages/en.json', 'messages/fr.json',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/receipt-treatment-browser.cjs',
  ];
  const sources = () => ({ ...runtime.sources(), ...Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')])) });
  const report = { run, at: new Date().toISOString(), journeys: [], scope: 'Actual isolated application: EN 1440 and FR 320 invoice accounting recovery. Real operational non-stock receipt, preparation and independent approval; normal browser sign-in and password step-up, real recovery action and durable setup-blocker evidence. Synthetic identities and chart setup are not professional approval. No migrations, seeds, messages, payments or production certification.' };
  async function journey(browser, locale, width) {
    const result = { locale, width, passed: false, screenshots: [], pageErrors: [], stages: [] };
    let context;
    try {
      const x = await runtime.fixture('browser-' + locale, '5.00', true, locale);
      const receipt = await runtime.receive(x, [x.lineId], 'unavailable', 'not_required');
      const invoiceId = await runtime.prepare(x, receipt), decision = await runtime.approve(x, invoiceId);
      assert.equal(decision.ledgerStatus, 'BLOCKED_PENDING_RULES'); assert.equal(decision.blockerCode, 'AP_NON_STOCK_TREATMENT_REVIEW');
      const retained = await runtime.proof(x, invoiceId, 3, 0, 1);
      await db.role.update({ where: { id: x.checkerRoleId }, data: { permissions: ['purchases.orders.read', 'purchasing.ap.invoice.view', 'purchasing.ap.invoice.post'] } });
      const checker = await db.user.findUniqueOrThrow({ where: { id: x.checkerId } });
      const password = 'Owned-treatment-' + crypto.randomUUID() + '!'; secrets.push(password);
      const passwordHash = await hashPassword(password);
      await db.account.create({ data: { userId: checker.id, accountId: checker.id, providerId: 'credential', password: passwordHash } });
      await db.user.update({ where: { id: checker.id }, data: { password: passwordHash } });
      context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
      context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const page = await context.newPage(); page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
      const t = require(path.join(f.root, 'messages', locale + '.json')).invoiceLedgerRecovery;
      const shot = async stage => { const file = 'receipt-treatment-browser-' + run + '-' + locale + width + '-' + stage + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); result.screenshots.push(file); };
      const signed = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: checker.email, password }, headers: { Origin: base }, timeout: 180000 });
      assert.equal(signed.status(), 200); await db.session.updateMany({ where: { userId: checker.id }, data: { assuranceVerifiedAt: null } });
      const started = Date.now(); await page.goto(base + '/' + locale + '/dashboard/purchases/payables/recovery');
      await expect(page.getByRole('heading', { name: t.title, exact: true })).toBeVisible();
      await expect(page.getByRole('radio')).toHaveCount(1); await page.getByRole('radio').check();
      result.loadMs = Date.now() - started;
      await page.getByRole('button', { name: t.review, exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByLabel(t.password, { exact: true })).toBeVisible();
      await expect(dialog).toContainText('5.00'); await shot('review');
      for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); assert.ok(await dialog.evaluate(element => element.contains(document.activeElement))); }
      await dialog.getByLabel(t.password, { exact: true }).fill(password);
      await dialog.getByRole('button', { name: t.confirm, exact: true }).click();
      await expect(dialog).toContainText(t.stillBlocked);
      const guidance = dialog.getByText(t.nonStockTreatmentHelp, { exact: true }); await expect(guidance).toBeVisible(); await guidance.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
      await shot('nonstock-treatment-guidance');
      assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 0);
      assert.equal(await db.inventoryTransaction.count({ where: { organizationId: x.organizationId } }), 0);
      assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 1);
      const recorded = await db.businessEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceId: invoiceId, eventType: 'purchase.supplier_invoice.ledger_recovery_recorded' } });
      assert.equal(recorded.status, 'APPLIED'); assert.equal(recorded.payload.result.blockerCode, 'AP_NON_STOCK_TREATMENT_REVIEW');
      assert.equal((await runtime.proof(x, invoiceId, 3, 0, 1)).approvalHash, retained.approvalHash);
      await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: t.review, exact: true })).toBeFocused();
      await expect(page.getByRole('heading', { name: t.history, exact: true })).toBeVisible();
      await shot('retained-blocked-history');
      assert.equal(await db.payment.count({ where: { organizationId: x.organizationId } }), 0);
      result.organizationId = x.organizationId; result.invoiceId = invoiceId; result.recoveryEventId = recorded.id;
      result.stages = ['Actual non-stock receipt and independent invoice approval retained', 'Normal sign-in and password step-up', 'Actual recovery returns AP_NON_STOCK_TREATMENT_REVIEW', 'Localized treatment-owner guidance without horizontal overflow', 'No inventory or journal, one payable, unchanged original approval', 'Keyboard focus containment and return; durable blocked history'];
      result.passed = result.pageErrors.length === 0;
    } catch (error) { result.error = f.safe(error, secrets); result.stack = f.safe(error.stack || error, secrets); }
    finally { if (context) await context.close(); }
    console.log(JSON.stringify({ locale, width, passed: result.passed, error: result.error }));
    return result;
  }
  async function main() {
    await f.local.withClient(f.target, f.local.assertOwned);
    report.sourcesBefore = sources(); report.originalBefore = await runtime.stable();
    const browser = await chromium.launch({ headless: true });
    try { for (const [locale, width] of [['en', 1440], ['fr', 320]]) report.journeys.push(await journey(browser, locale, width)); }
    finally { await browser.close(); }
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error, secrets); }
    finally {
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.originalAfter = await runtime.stable(); report.originalUnchanged = report.originalBefore === report.originalAfter; }
      catch (error) { report.finalizationError = f.safe(error, secrets); }
      report.fixtureOrganizations = [...h.organizations]; report.passed = !report.error && !report.finalizationError && report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.sourceStable && report.originalUnchanged;
      const file = path.join(__dirname, 'receipt-treatment-browser-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  if (require.main === module) runMain();
}
