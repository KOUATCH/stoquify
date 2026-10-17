// Actual local application approval of an invoice backed by a canonical-kernel
// receipt fixture. This does not claim an operational receipt posting producer.
const h = require('./verify-invoice-receipt-handoff.cjs');
const { f, db } = h, { fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const base = 'http://127.0.0.1:3110', run = crypto.randomUUID(), secrets = [];
const files = [
  'components/purchasing/InvoiceApprovalWorkbench.tsx',
  'services/purchasing/invoice-approval-contracts.ts',
  'services/purchasing/invoice-ledger-recovery-authority.ts',
  'actions/purchasing/invoice-approval.actions.ts',
  'app/[locale]/(dashboard)/dashboard/purchases/payables/approve/page.tsx',
  'messages/en.json', 'messages/fr.json',
  'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-invoice-receipt-handoff-browser.cjs',
];
const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')])) });
const report = {
  run, at: new Date().toISOString(), sourcesBefore: sources(), journeys: [],
  productionReceiptProducerImplemented: false,
  scope: 'Actual localhost application; real normal browser sign-in/password verification and invoice approval. Actual reviewed receiving and invoice preparation establish fixture source. Receipt accounting is explicitly a canonical-kernel fixture, not an operational receipt producer. EN desktop/FR narrow mobile, keyboard, screenshots and persisted accounting effects. Synthetic organization/accounting setup only; no payments, messages, deployment or certification.',
};
async function journey(browser, locale, width) {
  const result = { locale, width, stages: [], screenshots: [], pageErrors: [], passed: false };
  let context, page;
  const shot = async stage => {
    const file = 'invoice-receipt-handoff-browser-' + run + '-' + locale + width + '-' + stage + '.png';
    await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' });
    result.screenshots.push({ stage, file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex') });
  };
  try {
    const x = await h.fixture('browser-' + run + '-' + locale, { locale });
    const receipt = await h.receive(x, 10);
    await h.recognizeReceipt(x, receipt);
    const invoiceId = await h.prepare(x, 'BROWSER-' + locale + '-' + run, [[receipt, 6]]);
    await h.expectBalances(x, '25000.00', '-25000.00', '0.00');
    const checker = await db.user.findUniqueOrThrow({ where: { id: x.checkerId } });
    await db.role.update({ where: { id: x.checkerRoleId }, data: { permissions: ['purchasing.ap.invoice.post', 'purchasing.ap.invoice.view'] } });
    const password = 'Owned-receipt-handoff-' + crypto.randomUUID() + '!';
    secrets.push(password);
    const passwordHash = await hashPassword(password);
    await db.account.create({ data: { userId: checker.id, accountId: checker.id, providerId: 'credential', password: passwordHash } });
    await db.user.update({ where: { id: checker.id }, data: { password: passwordHash } });
    const t = JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'), 'utf8')).invoiceApproval;
    const preparationEvent = await db.businessEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceId: invoiceId, eventType: 'purchase.supplier_invoice.prepared' } });
    const preparationBefore = f.hash(preparationEvent);
    context = await browser.newContext({ viewport: { width, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
    context.setDefaultTimeout(60000);
    context.setDefaultNavigationTimeout(180000);
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const signedIn = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: checker.email, password }, headers: { Origin: base }, timeout: 180000, maxRedirects: 0 });
    assert.equal(signedIn.status(), 200);
    page = await context.newPage();
    page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
    const started = Date.now();
    await page.goto(base + '/' + locale + '/dashboard/purchases/payables/approve', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: t.title, exact: true })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(1);
    await page.getByRole('radio').focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('radio')).toBeChecked();
    const review = page.getByRole('button', { name: t.review, exact: true });
    await expect(review).toBeEnabled();
    await review.focus();
    await expect(review).toBeFocused();
    await shot('selected');
    result.routeAndSelectionMs = Date.now() - started;
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('15000.00');
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press('Tab');
      assert.ok(await dialog.evaluate(element => element.contains(document.activeElement)), 'Review must retain keyboard focus');
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(review).toBeFocused();
    result.stages.push('Keyboard invoice selection, review opening, dialog containment and focus return');
    await page.keyboard.press('Enter');
    await expect(dialog).toContainText('15000.00');
    const passwordField = dialog.getByLabel(t.password, { exact: true });
    const stepUpRequired = await passwordField.isVisible();
    if (stepUpRequired) await passwordField.fill(password);
    result.actualPasswordStepUp = stepUpRequired;
    const reviewLayout = await page.evaluate(() => ({ viewport: innerWidth, body: document.documentElement.scrollWidth }));
    assert.ok(reviewLayout.body <= reviewLayout.viewport + 1, 'Review must not create document overflow');
    await shot('review');
    const approvalStart = Date.now();
    const confirm = dialog.getByRole('button', { name: t.confirm, exact: true });
    await expect(confirm).toBeEnabled();
    await confirm.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toContainText(t.posted);
    result.approvalInteractionMs = Date.now() - approvalStart;
    await h.expectBalances(x, '25000.00', '-10000.00', '-15000.00');
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 2);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId, sourceType: 'SUPPLIER_INVOICE', sourceId: invoiceId, status: 'POSTED' } }), 1);
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 1);
    assert.equal(await db.inventoryTransaction.count({ where: { organizationId: x.organizationId } }), 1);
    assert.equal((await db.supplier.findUniqueOrThrow({ where: { id: x.supplierId } })).currentBalance.toFixed(2), '15000.00');
    assert.equal(await db.payment.count({ where: { organizationId: x.organizationId } }), 0);
    assert.equal(await db.supplierPayment.count({ where: { organizationId: x.organizationId } }), 0);
    assert.equal(f.hash(await db.businessEvent.findUniqueOrThrow({ where: { id: preparationEvent.id } })), preparationBefore);
    result.stages.push('Actual browser approval clears allocated GRNI once; inventory and stock remain unchanged; one supplier liability; no payment');
    await shot('posted');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: t.history, exact: true })).toBeVisible();
    await expect(page.getByText(t.currentJournal + ': ' + t.statuses.POSTED, { exact: true })).toBeVisible();
    const currentStatus = page.getByText(t.currentJournal + ': ' + t.statuses.POSTED, { exact: true });
    await currentStatus.scrollIntoViewIfNeeded();
    const layout = await page.evaluate(() => ({ viewport: innerWidth, body: document.documentElement.scrollWidth }));
    assert.ok(layout.body <= layout.viewport + 1, 'History must not create document overflow');
    await shot('history');
    assert.deepEqual(result.pageErrors, []);
    Object.assign(result, { organizationId: x.organizationId, invoiceId, balances: await h.balances(x), layout, reviewLayout, passed: true });
  } catch (error) {
    result.error = f.safe(error, secrets);
    if (page && !page.isClosed()) await shot('failure').catch(() => {});
  } finally { await context?.close(); }
  return result;
}
async function main() {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.originalBefore = await h.stable();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [locale, width] of [['en', 1440], ['fr', 320]]) {
      const result = await journey(browser, locale, width);
      report.journeys.push(result);
      console.log(JSON.stringify({ locale, width, passed: result.passed, stages: result.stages, error: result.error }));
    }
  } finally { await browser.close(); }
}
if (require.main === module) main().catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  try {
    report.originalUnchanged = report.originalBefore === await h.stable();
    report.sourcesAfter = sources();
    report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
    report.fixtureOrganizations = h.organizations;
    report.passed = !report.error && report.originalUnchanged && report.sourceStable && report.journeys.length === 2 && report.journeys.every(journey => journey.passed);
  } catch (error) { report.finalizationError = f.safe(error, secrets); report.passed = false; }
  const file = 'invoice-receipt-handoff-browser-' + run + '.json';
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, passed: report.passed, journeys: report.journeys.map(({ locale, width, passed, error, screenshots }) => ({ locale, width, passed, error, screenshots })), error: report.error, originalUnchanged: report.originalUnchanged, sourceStable: report.sourceStable }));
  await db.$disconnect();
  process.exitCode = report.passed ? 0 : 1;
});
