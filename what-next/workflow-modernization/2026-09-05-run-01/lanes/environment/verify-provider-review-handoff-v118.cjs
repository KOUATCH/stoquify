const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const runs = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-run.service.ts'));
const sourceFile = 'provider-review-v118-5d85a27d-68ef-431c-ae20-05c1e8131a38.json', prior = JSON.parse(fs.readFileSync(path.join(__dirname, sourceFile), 'utf8'));
const result = prior.checks[0].result, organizationId = prior.organizations[0], base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['components/finance/ReconciliationSignReview.tsx', 'components/finance/PaymentReconciliationWorkbench.tsx', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'actions/payments/reconciliation-sign-review.actions.ts', 'app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const report = { at: new Date().toISOString(), sourceFile, sourcesBefore: sources(), journeys: [], scope: 'Actual EN/FR returned review route, keyboard/reflow and truthful incomplete accounting setup. No signing or fabricated approval.' };
let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned); assert.ok(organizationId.startsWith('workflow_provider_review_'));
  const run = await db.reconciliationRun.findFirstOrThrow({ where: { id: result.runId, organizationId } });
  assert.equal(run.correlationId, result.intentId); assert.equal(run.metadata.providerOperationId, result.intentId);
  // The original intent cannot be transplanted onto a different actor or date.
  await assert.rejects(() => runs.runPaymentReconciliation({ organizationId, providerAccountId: run.providerAccountId, businessDate: run.businessDate, runById: 'different-actor', correlationId: result.intentId, providerOperationId: result.intentId }), e => e.code === 'CONFLICT');
  await assert.rejects(() => runs.runPaymentReconciliation({ organizationId, providerAccountId: run.providerAccountId, businessDate: new Date(run.businessDate.getTime() + 86400000), runById: run.runById, correlationId: result.intentId, providerOperationId: result.intentId }), e => e.code === 'CONFLICT');
  report.intentTransplantDenied = true;
  browser = await chromium.launch({ headless: true });
  for (const locale of ['en', 'fr']) {
    const password = 'Owned-provider-review-' + crypto.randomUUID() + '!'; secrets.push(password); const passwordHash = await hashPassword(password);
    const user = await db.user.create({ data: { organizationId, name: 'Owned independent reviewer', email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
    const permissions = ['dashboard.read', 'payments.reconciliation.read', 'payments.reconciliation.sign'];
    const existingRole = await db.role.findFirst({ where: { organizationId, code: 'administrator' } });
    if (existingRole) await db.role.update({ where: { id: existingRole.id }, data: { users: { connect: { id: user.id } } } });
    else await db.role.create({ data: { organizationId, code: 'administrator', nameEn: 'Owned limited signing role', permissions, users: { connect: { id: user.id } } } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
    const preview = await certification.previewReconciliationSignOff({ organizationId, runId: run.id, actorId: user.id, actorPermissions: permissions });
    assert.equal(preview.canSign, false); assert.equal(preview.blocker, 'ACCOUNTING_PERIOD_REQUIRED');
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
    try {
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
      const page = await context.newPage(), journey = { locale, screenshots: [], pageErrors: [] }; report.journeys.push(journey);
      page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(180000); page.on('pageerror', error => journey.pageErrors.push(f.safe(error, secrets)));
      const copy = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench, t = copy.signReview, started = Date.now();
      await page.goto(base + '/' + locale + result.reviewPath);
      const panel = page.getByRole('region', { name: t.title, exact: true });
      await expect(panel.getByText(copy.runPreparation.blockers.ACCOUNTING_PERIOD_REQUIRED, { exact: true })).toBeVisible();
      journey.routeToReviewedStateMs = Date.now() - started;
      await expect(panel.getByRole('button', { name: t.confirm, exact: true })).toBeDisabled();
      await expect(panel).toBeFocused();
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 }); await panel.scrollIntoViewIfNeeded(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const file = 'provider-review-v118-' + locale + '-' + width + '-' + stamp + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); journey.screenshots.push(file);
      }
      await panel.getByRole('button', { name: t.reviewAgain, exact: true }).focus(); await page.keyboard.press('Enter');
      await expect(panel.getByRole('button', { name: t.reviewAgain, exact: true })).toBeEnabled();
      await expect(panel.getByText(copy.runPreparation.blockers.ACCOUNTING_PERIOD_REQUIRED, { exact: true })).toBeVisible(); journey.passed = true;
    } finally { await context.close(); }
  }
  assert.equal(await db.reconciliationRun.count({ where: { organizationId } }), 1);
  assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: run.id } })).signedAt, null);
  assert.equal(await db.journalEntry.count({ where: { organizationId } }), 0);
  report.noSigningOrFinancialEffects = true; report.passed = true;
}
main().catch(error => { report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  const file = path.join(__dirname, 'provider-review-handoff-v118-' + stamp + '.json'); console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await browser?.close(); await db.$disconnect(); }
});
