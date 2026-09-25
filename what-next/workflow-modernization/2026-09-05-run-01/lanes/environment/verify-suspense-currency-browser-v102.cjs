const f = require('./suspense-currency-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [], secrets = [];
const files = ['components/finance/PaymentSuspenseQueue.tsx', 'actions/payments/reconciliation.actions.ts', 'services/_shared/action-errors.ts', 'services/reconciliation/payment-suspense-ledger.service.ts', 'services/reconciliation/payment-suspense-workflow.service.ts', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const tables = ['suspenseItem', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'paymentReconciliationInboxItem', 'organizationAccountingSettings'];
const snapshot = async where => f.hash(await Promise.all(tables.map(n => db[n].findMany({ where, orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), run, sourcesBefore: sources(), journeys: [], scope: 'Actual owned application, normal password sessions and synthetic accounting setup only. No production currency change or financial approval.' };
async function journey(browser, locale) {
  const x = await f.fixture('currency-browser-' + run + '-' + locale, organizations, { sourceCurrency: 'EUR' });
  const messages = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench, t = messages.suspenseWorkflow;
  const result = { locale, screenshots: [], stages: [], pageErrors: [] };
  await db.organization.update({ where: { id: x.organizationId }, data: { requestedModules: ['purchasing', 'finance', 'accounting', 'payment_reconciliation'] } });
  await db.role.update({ where: { id: x.checkerRoleId }, data: { permissions: f.permissions } });
  const user = await db.user.findUniqueOrThrow({ where: { id: x.checkerId } }), password = 'Owned-currency-' + crypto.randomUUID() + '!', passwordHash = await hashPassword(password); secrets.push(password);
  await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
  await db.user.update({ where: { id: user.id }, data: { password: passwordHash } });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
  context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  let page;
  const shot = async name => { const file = 'suspense-currency-v102-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); result.screenshots.push(file); };
  try {
    const response = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(response.status(), 200);
    page = await context.newPage(); page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
    const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation');
    const queue = page.getByRole('region', { name: t.title, exact: true }), review = page.getByRole('region', { name: t.review.title, exact: true });
    await expect(queue).toBeVisible(); result.routeLoadMs = Date.now() - start;
    const before = await snapshot({ organizationId: x.organizationId });
    await queue.getByRole('button', { name: t.review.open, exact: true }).focus(); await page.keyboard.press('Enter'); await expect(review).toBeFocused();
    await review.getByRole('button', { name: t.review.confirm, exact: true }).click();
    await review.getByLabel(messages.manualMatch.passwordLabel, { exact: true }).fill(password);
    await review.getByRole('button', { name: t.review.authenticate, exact: true }).click();
    await expect(queue.getByText(t.review.authenticated, { exact: true })).toBeVisible();
    assert.equal(await snapshot({ organizationId: x.organizationId }), before);
    result.stages.push('Fresh-authentication gate enforced; real password step-up does not automatically post');
    await review.getByRole('button', { name: t.history.resume, exact: true }).click();
    await expect(queue.getByRole('alert')).toContainText(t.review.currencyEvidenceRequired); assert.equal(await snapshot({ organizationId: x.organizationId }), before);
    await queue.getByRole('alert').scrollIntoViewIfNeeded(); await shot('denied-desktop');
    result.stages.push('Normal checker session receives localized currency guidance; source, financial records and retained receipts unchanged');
    const saved = await page.evaluate(() => Object.fromEntries(Object.entries(sessionStorage).filter(([key]) => key.includes('suspense'))));
    assert.ok(Object.values(saved).some(value => value.includes(x.item.id)), 'Reviewed approval must survive failure');
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 1000 }); await queue.getByRole('alert').scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('denied-' + width);
    }
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('text200');
    await page.evaluate(() => document.documentElement.style.fontSize = ''); await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload(); await expect(review).toBeVisible();
    await review.getByRole('button', { name: t.history.resume, exact: true }).click(); await expect(queue.getByRole('alert')).toContainText(t.review.currencyEvidenceRequired);
    assert.equal(await snapshot({ organizationId: x.organizationId }), before); result.stages.push('Refresh restores the retained approval; explicit retry remains safely refused; mobile/tablet and 200% text reflow checked');
    // Fixture-only correction of an intentionally wrong setup. This is not a
    // recommendation to change a real organization's functional currency.
    await db.organizationAccountingSettings.update({ where: { organizationId: x.organizationId }, data: { baseCurrency: 'EUR' } });
    await review.getByRole('button', { name: t.history.resume, exact: true }).click(); await expect(queue.getByText(t.review.posted, { exact: true }).first()).toBeVisible();
    const current = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.item.id } }); assert.equal(current.status, 'POSTED_TO_SUSPENSE');
    assert.equal(current.currencyCode, 'EUR'); assert.equal(current.amount.toString(), '100.25');
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId, sourceType: 'PAYMENT_SUSPENSE', sourceId: x.item.id } }), 1);
    const batch = await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: current.ledgerPostingBatchId } }); assert.equal(batch.metadata.currencyBasis.baseCurrency, 'EUR');
    await shot('recovered'); result.stages.push('After correcting only the synthetic setup, explicit retry posts exactly once in EUR and retains the original source amount');
    result.passed = result.pageErrors.length === 0;
  } catch (error) { result.error = f.safe(error, secrets); if (page) try { await shot('failure'); } catch {} }
  finally { await context.close(); }
  return result;
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await snapshot({ organizationId: { notIn: organizations } });
  const browser = await chromium.launch({ headless: true }); try { for (const locale of ['en', 'fr']) report.journeys.push(await journey(browser, locale)); } finally { await browser.close(); }
})().catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await snapshot({ organizationId: { notIn: organizations } }); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  await db.$disconnect(); const file = 'suspense-currency-v102-browser-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, journeys: report.journeys, error: report.error, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged }));
  process.exit(!report.error && report.journeys.length === 2 && report.journeys.every(j => j.passed) && report.sourceStable && report.originalUnchanged ? 0 : 1);
});
