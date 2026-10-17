const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const discovery = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const { runPaymentReconciliation } = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-run.service.ts'));
const stamp = crypto.randomUUID(), base = 'http://127.0.0.1:3110', organizationId = 'workflow_run_discovery_' + stamp, secrets = [];
const files = ['services/reconciliation/reconciliation-run-preparation.service.ts', 'actions/payments/reconciliation-preparation.actions.ts', 'components/finance/ReconciliationPreparationWorkbench.tsx', 'components/finance/PaymentReconciliationWorkbench.tsx', 'components/finance/ReconciliationSignReview.tsx', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const report = { at: new Date().toISOString(), organizationId, sourcesBefore: sources(), checks: [], journeys: [], scope: 'Owned actual run creation and tenant-scoped discovery with synthetic empty-date provider setup. No signatures, readiness certification or financial postings. Actual EN/FR browser with explicit limited permissions.' };
let browser;
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  await db.organization.create({ data: { id: organizationId, name: f.helper.prefix + 'run discovery', slug: organizationId, currency: 'XAF', country: 'CM', requestedModules: ['finance', 'accounting', 'payment_reconciliation'] } });
  const maker = await db.user.create({ data: { organizationId, name: 'Owned maker', email: crypto.randomUUID() + '@example.invalid', isActive: true } });
  const bank = await db.chartOfAccount.create({ data: { organizationId, code: 'OWNED512', nameEn: 'Owned bank', type: 'ASSET', normalBalance: 'DEBIT' } });
  const suspense = await db.chartOfAccount.create({ data: { organizationId, code: 'OWNED471', nameEn: 'Owned suspense', type: 'ASSET', normalBalance: 'DEBIT' } });
  const rail = await db.paymentRail.create({ data: { organizationId, code: 'OWNED', name: 'Owned synthetic rail', type: 'MOBILE_MONEY' } });
  const provider = await db.providerAccount.create({ data: { organizationId, paymentRailId: rail.id, providerCode: 'OWNED', displayName: 'Owned discovery provider', status: 'ACTIVE', externalAccountHash: crypto.randomUUID(), currencyCode: 'XAF', settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: suspense.id } });
  await db.settlementAccount.create({ data: { organizationId, providerAccountId: provider.id, ledgerAccountId: bank.id, approvalStatus: 'APPROVED', effectiveFrom: new Date(0), metadata: { synthetic: true, notAnApproval: true } } });
  const ids = [];
  for (let i = 0; i < 22; i++) ids.push((await runPaymentReconciliation({ organizationId, providerAccountId: provider.id, businessDate: new Date(Date.UTC(2026, 6, i + 1)), runById: maker.id, correlationId: 'owned-v119-' + stamp + '-' + i })).runId);
  const reader = { organizationId, actorId: maker.id, actorPermissions: ['payments.reconciliation.read'] };
  const first = await discovery.readReconciliationPreparation({ kind: 'runs' }, reader); assert.equal(first.total, 22); assert.equal(first.runs.length, 20); assert.ok(first.nextCursor);
  const second = await discovery.readReconciliationPreparation({ kind: 'runs', cursor: first.nextCursor }, reader); assert.equal(second.total, 22); assert.equal(second.runs.length, 2); assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.runs, ...second.runs].map(r => r.id)).size, 22);
  assert.ok(!first.runs.some(r => r.id === ids[0])); assert.ok(second.runs.some(r => r.id === ids[0]));
  assert.equal((await discovery.readReconciliationPreparation({ kind: 'runs', search: ids[0] }, reader)).runs[0].id, ids[0]);
  assert.equal((await discovery.readReconciliationPreparation({ kind: 'runs', search: 'missing-' + stamp }, reader)).total, 0);
  assert.deepEqual(Object.keys(first.runs[0]).sort(), ['id', 'status', 'businessDate', 'providerName', 'currencyCode'].sort());
  await assert.rejects(() => discovery.readReconciliationPreparation({ kind: 'history', runId: ids[0] }, reader), e => e.code === 'FORBIDDEN');
  await assert.rejects(() => discovery.previewReconciliationPreparation({ runId: ids[0] }, reader), e => e.code === 'FORBIDDEN');
  await assert.rejects(() => discovery.readReconciliationPreparation({ kind: 'runs' }, { ...reader, organizationId: 'foreign' }), e => e.code === 'FORBIDDEN');
  await assert.rejects(() => discovery.readReconciliationPreparation({ kind: 'runs' }, { ...reader, actorPermissions: [] }), e => e.code === 'FORBIDDEN');
  report.checks.push({ name: '22 real runs, stable two-page discovery/search/empty and private evidence/authority/tenant denial', passed: true });
  browser = await chromium.launch({ headless: true });
  async function login(locale, signer) {
    const password = 'Owned-discovery-' + crypto.randomUUID() + '!'; secrets.push(password); const passwordHash = await hashPassword(password);
    const user = await db.user.create({ data: { organizationId, name: 'Owned discovery reviewer', email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
    const permissions = ['dashboard.read', 'payments.reconciliation.read', ...(signer ? ['payments.reconciliation.sign'] : [])];
    // administrator supplies tenant-wide scope, but its explicit permission array has no accounting-read authority.
    const code = signer ? 'administrator' : 'OWNED_READER';
    const existing = await db.role.findFirst({ where: { organizationId, code } });
    if (existing) await db.role.update({ where: { id: existing.id }, data: { users: { connect: { id: user.id } } } });
    else await db.role.create({ data: { organizationId, code, nameEn: 'Owned limited role', permissions, users: { connect: { id: user.id } } } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
    const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(180000);
    return { context, page, user };
  }
  for (const locale of ['en', 'fr']) {
    const { context, page } = await login(locale, true), copy = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench, t = copy.runPreparation;
    const journey = { locale, screenshots: [], pageErrors: [], consoleIssues: [] }; report.journeys.push(journey);
    page.on('pageerror', error => journey.pageErrors.push(f.safe(error, secrets)));
    page.on('console', msg => { if (msg.type() === 'error') journey.consoleIssues.push(f.safe(msg.text(), secrets).split('\n')[0]); });
    try {
      const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation');
      await expect(page.getByRole('button', { name: t.open, exact: true })).toBeEnabled(); journey.routeReadyMs = Date.now() - start;
      await page.getByRole('button', { name: t.open, exact: true }).focus(); await page.keyboard.press('Enter');
      const list = page.getByRole('region', { name: t.title, exact: true });
      await expect(list.getByRole('button', { name: t.next, exact: true })).toBeEnabled(); await expect(list).toBeFocused();
      await expect(list.getByText(t.preparationReadDenied, { exact: true })).toBeVisible();
      await expect(list.getByRole('button', { name: t.review, exact: true }).first()).toBeDisabled();
      await list.getByRole('button', { name: t.next, exact: true }).click();
      await expect(list.getByText(t.run.replace('{id}', ids[0]), { exact: true })).toBeVisible();
      await expect(list.getByRole('button', { name: t.next, exact: true })).toBeDisabled();
      if (process.argv.includes('--focus-probe')) {
        journey.scope = 'Run-discovery last-page focus reproduction only';
        journey.focusAfterLastPage = await page.evaluate(() => document.activeElement.tagName);
        assert.equal(journey.focusAfterLastPage, 'BODY'); journey.defectReproduced = true; report.passed = true; return;
      }
      await expect(list).toBeFocused(); journey.lastPageFocusRestored = true;
      await list.getByRole('button', { name: t.previous, exact: true }).click(); await expect(list.getByRole('button', { name: t.next, exact: true })).toBeEnabled();
      const failureSearch = 'owned-v119-fail-' + stamp; let interrupted = false;
      await page.route('**/*', async route => { if (!interrupted && route.request().method() === 'POST' && route.request().postData()?.includes(failureSearch)) { interrupted = true; await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Owned read interruption' }); } else await route.fallback(); });
      await list.getByLabel(t.searchLabel, { exact: true }).fill(failureSearch); await list.getByRole('button', { name: t.search, exact: true }).click();
      await expect(list.getByText(t.failed, { exact: true })).toBeVisible(); assert.equal(interrupted, true);
      await expect(list).toBeFocused(); journey.failedReadFocusRestored = true;
      await expect(list.getByText(t.emptyRuns, { exact: true })).toHaveCount(0);
      await expect(list.getByRole('button', { name: copy.signReview.open, exact: true }).first()).toBeDisabled();
      await list.getByRole('button', { name: t.retryRead, exact: true }).click(); await expect(list.getByText(t.emptyRuns, { exact: true })).toBeVisible();
      await list.getByLabel(t.searchLabel, { exact: true }).fill(ids[0]); await list.getByRole('button', { name: t.search, exact: true }).click();
      const sign = list.getByRole('button', { name: copy.signReview.open, exact: true }); await expect(sign).toBeEnabled();
      for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); await list.scrollIntoViewIfNeeded(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); const file = 'run-discovery-v119-' + locale + '-' + width + '-' + stamp + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); journey.screenshots.push(file); }
      await sign.focus(); await page.keyboard.press('Enter');
      const review = page.getByRole('region', { name: copy.signReview.title, exact: true });
      await expect(review.getByText(copy.runPreparation.blockers.ACCOUNTING_PERIOD_REQUIRED, { exact: true })).toBeVisible(); await expect(review).toBeFocused();
      await expect(review.getByRole('button', { name: copy.signReview.confirm, exact: true })).toBeDisabled();
      await page.reload(); await expect(review.getByText(copy.runPreparation.blockers.ACCOUNTING_PERIOD_REQUIRED, { exact: true })).toBeVisible();
      journey.paginationSearchFailureRetryAndReview = true; journey.passed = true;
    } finally { await context.close(); }
  }
  const limited = await login('en', false), t = require(path.join(f.root, 'messages/en.json')).paymentReconciliationWorkbench;
  try { await limited.page.goto(base + '/en/dashboard/finance/reconciliation'); await limited.page.getByRole('button', { name: t.runPreparation.open, exact: true }).click();
    const list = limited.page.getByRole('region', { name: t.runPreparation.title, exact: true });
    await expect(list.getByRole('button', { name: t.signReview.open, exact: true }).first()).toBeDisabled(); report.checks.push({ name: 'actual browser reader can discover but cannot sign or prepare', passed: true });
  } finally { await limited.context.close(); }
  assert.equal(await db.reconciliationRun.count({ where: { organizationId, status: 'SIGNED' } }), 0); assert.equal(await db.journalEntry.count({ where: { organizationId } }), 0);
  report.passed = true;
}
main().catch(error => { report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  const file = path.join(__dirname, 'run-discovery-v119-' + stamp + '.json'); console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await browser?.close(); await db.$disconnect(); }
});
