const f = require('./exception-closure-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const closure = require(path.join(f.root, 'services/reconciliation/payment-exception-closure.service.ts'));
const recovery = require(path.join(f.root, 'services/reconciliation/payment-suspense-resolution-recovery.service.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [], secrets = [];
const files = ['services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/reconciliation/reconciliation-run-preparation.contracts.ts', 'actions/payments/reconciliation-preparation.actions.ts', 'components/finance/ReconciliationPreparationWorkbench.tsx', 'components/finance/PaymentReconciliationWorkbench.tsx', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const financial = async org => f.hash(await Promise.all(['journalEntry', 'journalEntryLine', 'ledgerPostingBatch'].map(n => db[n].findMany({ where: { organizationId: org }, orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), sourcesBefore: sources(), journeys: [], scope: 'Actual EN/FR owned browser preparation with synthetic original provider mismatch, real financial treatment, exception closure and source recovery. No live provider or professional approval claim.' };
async function journey(browser, locale) {
  const x = await f.fixture('preparation-ui-' + run + '-' + locale, organizations, { externalMismatch: true }), beforeFinancial = await financial(x.organizationId);
  const m = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench, t = m.runPreparation;
  const result = { locale, screenshots: [], pageErrors: [], consoleIssues: [], routeLoadMs: [] }, contexts = []; let page;
  async function login(write) {
    const password = 'Owned-preparation-' + crypto.randomUUID() + '!', passwordHash = await hashPassword(password); secrets.push(password);
    const user = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned preparation reviewer', email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
    await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_PREPARATION_' + crypto.randomUUID(), nameEn: 'Owned preparation role', permissions: ['payments.reconciliation.read', 'accounting.journal.read', ...(write ? ['payments.reconciliation.run'] : [])], users: { connect: { id: user.id } } } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); contexts.push(context); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
    page = await context.newPage(); page.on('pageerror', e => result.pageErrors.push(f.safe(e, secrets))); page.on('console', m => { if (['error', 'warning'].includes(m.type())) { const text = f.safe(m.text(), secrets).split('\n')[0]; if (!result.consoleIssues.includes(text)) result.consoleIssues.push(text); } });
    const started = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation'); await expect(page.getByRole('button', { name: t.open, exact: true })).toBeVisible(); result.routeLoadMs.push(Date.now() - started); return { user, password, page };
  }
  const detail = () => page.getByRole('region', { name: t.reviewTitle, exact: true });
  async function open() {
    if (!await detail().count()) {
      await page.getByRole('button', { name: t.open, exact: true }).click();
      const list = page.getByRole('region', { name: t.title, exact: true });
      await expect(detail().or(list).first()).toBeVisible();
      // Hydration can restore the selected run while opening; do not force the list path after restoration.
      if (!await detail().count()) await list.getByRole('button', { name: t.review, exact: true }).click();
    }
    await expect(detail()).toHaveAttribute('aria-busy', 'false');
  }
  async function shot(name) { const file = 'run-preparation-v115-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); result.screenshots.push(file); }
  try {
    await login(false); await open(); await expect(detail().getByRole('button', { name: t.confirm, exact: true })).toBeDisabled(); await expect(detail().getByLabel(t.reason, { exact: true })).toBeDisabled(); result.readOnlyDenial = true;
    const actor = await login(true); await open(); await detail().getByRole('button', { name: t.preview, exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(detail().getByRole('region', { name: t.previewTitle, exact: true })).toBeFocused(); await expect(detail().getByText(t.blockers.OPEN_EXCEPTIONS, { exact: true })).toBeVisible(); await shot('prerequisite-desktop');
    const cp = await closure.previewExceptionClosure({ exceptionId: x.exceptionId }, f.context(x));
    const proposed = await closure.proposeExceptionClosure({ exceptionId: x.exceptionId, reason: 'Reviewed owned mismatch and actual financial treatment', expectedRevision: cp.revision, idempotencyKey: crypto.randomUUID() }, f.context(x));
    await closure.decideExceptionClosure({ exceptionId: x.exceptionId, proposalId: proposed.proposalId, expectedRevision: cp.revision, decision: 'APPROVE', reason: 'Independent owned source and treatment review' }, f.context(x, x.checkerId));
    await detail().getByLabel(t.reason, { exact: true }).fill(locale === 'fr' ? 'Examen des preuves et des obligations clôturées' : 'Review of source evidence and closed obligations');
    await detail().getByRole('button', { name: t.preview, exact: true }).click(); await expect(detail().getByText(t.ready, { exact: true })).toBeVisible(); await detail().getByRole('button', { name: t.confirm, exact: true }).click();
    await expect(detail().getByLabel(m.manualMatch.passwordLabel, { exact: true })).toBeFocused(); await detail().getByLabel(m.manualMatch.passwordLabel, { exact: true }).fill(actor.password); await detail().getByRole('button', { name: m.suspenseWorkflow.review.authenticate, exact: true }).click();
    await expect(detail().getByText(m.suspenseWorkflow.review.authenticated, { exact: true })).toBeVisible();
    const key = 'stoquify:run-preparation:v1:' + x.organizationId + ':' + actor.user.id + ':' + x.runId, saved = await page.evaluate(k => sessionStorage.getItem(k), key), command = JSON.parse(saved).pending;
    assert.ok(command.idempotencyKey); await page.reload(); await open(); assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), saved);
    await detail().getByRole('button', { name: t.retry, exact: true }).click(); await expect.poll(() => db.paymentReconciliationInboxItem.count({ where: { organizationId: x.organizationId, idempotencyKey: 'reconciliation-run-preparation:' + command.idempotencyKey } })).toBe(1);
    await expect(detail().getByText(t.currentStatus.replace('{status}', t.states.READY_FOR_SIGNOFF), { exact: true })).toBeVisible(); await expect(detail()).toHaveAttribute('aria-busy', 'false');
    assert.equal(await financial(x.organizationId), beforeFinancial); result.passwordReloadPreparationAndHistory = true;
    console.log(JSON.stringify({ locale, phase: 'actual password, reload, preparation and history verified' }));
    for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); await detail().getByRole('heading', { name: t.reviewTitle, exact: true }).scrollIntoViewIfNeeded(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('prepared-' + width); }
    const reviewer = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned independent recovery reviewer', email: crypto.randomUUID() + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
    const draft = { suspenseItemId: x.itemId, reversalDate: new Date().toISOString().slice(0, 10), reason: 'Owned source reopening after browser preparation' }, rp = await recovery.previewSuspenseResolutionRecovery(draft, f.context(x));
    const proposal = await recovery.proposeSuspenseResolutionRecovery({ ...draft, expectedRevision: rp.revision, idempotencyKey: crypto.randomUUID() }, f.context(x));
    const reviewed = await recovery.reviewSuspenseResolutionRecovery(x.itemId, proposal.proposalId, f.context(x, reviewer.id));
    await recovery.decideSuspenseResolutionRecovery({ suspenseItemId: x.itemId, proposalId: proposal.proposalId, expectedRevision: reviewed.revision, decision: 'APPROVE', reason: 'Independent owned clearing reversal decision' }, f.context(x, reviewer.id));
    await detail().getByRole('button', { name: t.refresh, exact: true }).click(); await expect(detail().getByText(t.currentStatus.replace('{status}', t.states.NEEDS_REVIEW), { exact: true })).toBeVisible();
    await expect(detail().getByText(t.total.replace('{count}', '1'), { exact: true })).toBeVisible(); await detail().getByRole('button', { name: t.preview, exact: true }).click(); await expect(detail().getByText(t.blockers.OPEN_EXCEPTIONS, { exact: true })).toBeVisible(); result.reopenedHistoryAndCurrentPrerequisite = true;
    await page.setViewportSize({ width: 320, height: 1000 }); await detail().scrollIntoViewIfNeeded(); await shot('reopened-320');
    await detail().getByRole('button', { name: t.back, exact: true }).click(); const list = page.getByRole('region', { name: t.title, exact: true }); await expect(list).toBeFocused(); await list.getByRole('button', { name: t.close, exact: true }).click(); await expect(page.getByRole('button', { name: t.open, exact: true })).toBeFocused(); result.keyboardFocusReturn = true;
    result.passed = !result.pageErrors.length && !result.consoleIssues.some(s => s.includes('MISSING_MESSAGE'));
  } catch (error) { result.error = f.safe(error, secrets); result.stack = String(error.stack).split('\n').slice(0, 5); if (page) try { await shot('failure'); } catch {} }
  finally { for (const context of contexts) await context.close(); } return result;
}
(async () => { await f.local.withClient(f.target, f.local.assertOwned); const browser = await chromium.launch({ headless: true }); try { for (const locale of ['en', 'fr']) { console.log(JSON.stringify({ locale, phase: 'starting owned preparation journey' })); report.journeys.push(await journey(browser, locale)); } } finally { await browser.close(); } })()
.catch(error => { report.error = f.safe(error, secrets); report.stack = String(error.stack).split('\n').slice(0, 5); }).finally(async () => {
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); await db.$disconnect(); const file = 'run-preparation-v115-browser-' + run + '.json';
  console.log(JSON.stringify({ file, journeys: report.journeys, error: report.error, sourceStable: report.sourceStable })); fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  process.exit(!report.error && report.sourceStable && report.journeys.length === 2 && report.journeys.every(j => j.passed) ? 0 : 1);
});
