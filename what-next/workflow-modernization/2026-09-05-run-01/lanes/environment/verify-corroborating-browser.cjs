const f = require('./corroborating-browser-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const closure = require(path.join(f.root, 'services/reconciliation/payment-exception-closure.service.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [], secrets = [];
const files = ['services/reconciliation/payment-corroborating-source-evidence.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/reconciliation/payment-exception-closure.service.ts', 'services/reconciliation/payment-exception-closure.contracts.ts', 'services/reconciliation/payment-exception-closure-evidence.service.ts', 'actions/payments/exception-closure.actions.ts', 'components/finance/PaymentExceptionClosurePanel.tsx', 'components/finance/PaymentSuspenseQueue.tsx', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const financial = async org => f.hash(await Promise.all(['journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink'].map(n => db[n].findMany({ where: { organizationId: org }, orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), sourcesBefore: sources(), journeys: [], scope: 'Actual owned EN/FR cases, proposal, fresh authentication, independent rejection and approval, retained request reload, duplicate retry and historical decision browsing. Real statement import and additional-source recovery precede the nonfinancial source decision in synthetic owned fixtures.' };
async function journey(browser, locale) {
  const x = await f.fixture('workbench-' + run + '-' + locale, organizations), beforeFinancial = await financial(x.organizationId);
  const initialStatus = (await db.paymentException.findUniqueOrThrow({ where: { id: x.exceptionId } })).status;
  console.log(JSON.stringify({ locale, phase: 'owned corroborating-source preparation complete', initialStatus }));
  const messages = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench, t = messages.exceptionClosure;
  const result = { locale, routeLoadMs: [], screenshots: [], pageErrors: [], consoleIssues: [] }, contexts = []; let page;
  async function login(canDecide) {
    const password = 'Owned-closure-' + crypto.randomUUID() + '!', passwordHash = await hashPassword(password); secrets.push(password);
    const user = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned exception reviewer', email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
    await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_CLOSURE_' + crypto.randomUUID(), nameEn: 'Owned exception review', permissions: ['payments.reconciliation.read', 'accounting.journal.read', ...(canDecide ? ['payments.reconciliation.exception.resolve'] : [])], users: { connect: { id: user.id } } } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); contexts.push(context); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
    page = await context.newPage(); page.on('pageerror', e => result.pageErrors.push(f.safe(e, secrets))); page.on('console', m => { if (['error', 'warning'].includes(m.type())) { const value = f.safe(m.text(), secrets).split('\n')[0]; if (!result.consoleIssues.includes(value)) result.consoleIssues.push(value); } });
    const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation'); await expect(page.getByRole('button', { name: t.open, exact: true })).toBeVisible(); result.routeLoadMs.push(Date.now() - start); console.log(JSON.stringify({ locale, phase: canDecide ? 'authorized reviewer signed in' : 'read-only reviewer signed in' })); return { user, password, page };
  }
  const root = () => page.getByRole('region', { name: t.title, exact: true });
  const caseName = t.case.replace('{id}', x.exceptionId), detail = () => root().getByRole('region', { name: caseName, exact: true });
  async function open() {
    const opener = page.getByRole('button', { name: t.open, exact: true }); await opener.focus(); await opener.press('Enter');
    if (!await detail().count()) { const item = root().getByRole('article', { name: caseName, exact: true }); await item.getByRole('button', { name: t.inspect, exact: true }).click(); }
    await expect(detail().getByRole('button', { name: t.preview, exact: true })).toBeVisible(); return detail();
  }
  async function shot(name) { const file = 'corroborating-browser-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); result.screenshots.push(file); }
  async function authenticate(actor) { await detail().getByLabel(messages.manualMatch.passwordLabel, { exact: true }).fill(actor.password); await detail().getByRole('button', { name: messages.suspenseWorkflow.review.authenticate, exact: true }).click(); await expect(detail().getByText(t.authenticated, { exact: true })).toBeVisible(); }
  async function propose(actor, reason) {
    page = actor.page; await detail().getByLabel(t.reason, { exact: true }).fill(reason); await detail().getByRole('button', { name: t.preview, exact: true }).click(); await expect(detail().getByText(t.sourceConsequences, { exact: true })).toBeVisible();
    await expect(detail().getByRole('region', { name: t.preview, exact: true })).toBeFocused();
    for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await detail().getByRole('region', { name: t.preview, exact: true }).scrollIntoViewIfNeeded(); await shot('source-review-' + width); }
    await detail().getByRole('button', { name: t.propose, exact: true }).click();
    const key = 'stoquify:exception-closure:v1:' + x.organizationId + ':' + actor.user.id + ':' + x.exceptionId;
    await expect.poll(() => page.evaluate(k => JSON.parse(sessionStorage.getItem(k)).pending?.kind, key)).toBe('proposal');
    const saved = await page.evaluate(k => sessionStorage.getItem(k), key), command = JSON.parse(saved).pending.command;
    await expect(detail().getByLabel(messages.manualMatch.passwordLabel, { exact: true })).toBeVisible();
    assert.equal((await db.paymentException.findUniqueOrThrow({ where: { id: x.exceptionId } })).status, initialStatus); await authenticate(actor); await page.reload(); await open(); await detail().getByRole('button', { name: t.retry, exact: true }).click();
    await expect.poll(() => db.paymentReconciliationInboxItem.count({ where: { organizationId: x.organizationId, idempotencyKey: 'exception-closure-proposal:' + command.idempotencyKey } })).toBe(1);
    const receipt = await db.paymentReconciliationInboxItem.findFirstOrThrow({ where: { organizationId: x.organizationId, idempotencyKey: 'exception-closure-proposal:' + command.idempotencyKey } });
    await expect(detail().getByText(t.recorded.replace('{id}', receipt.id), { exact: true })).toBeVisible();
    await page.evaluate(({ k, v }) => sessionStorage.setItem(k, v), { k: key, v: saved }); await page.reload(); await open(); await detail().getByRole('button', { name: t.retry, exact: true }).click();
    await expect(detail().getByText(t.recorded.replace('{id}', receipt.id), { exact: true })).toBeVisible(); assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: x.organizationId, idempotencyKey: 'exception-closure-proposal:' + command.idempotencyKey } }), 1); result.exactProposalRetry = true; return receipt;
  }
  try {
    await login(false); await open(); await expect(detail().getByText(t.denied, { exact: true })).toBeVisible(); await expect(detail().getByRole('button', { name: t.preview, exact: true })).toBeDisabled(); result.readOnlyDenied = true;
    const maker = await login(true); await open(); const first = await propose(maker, locale === 'fr' ? 'Examen de la source et du traitement financier terminé' : 'Reviewed the source and completed financial treatment');
    await detail().getByRole('button', { name: t.review, exact: true }).click(); await detail().getByLabel(t.decisionReason, { exact: true }).fill('Own proposal cannot be decided'); await expect(detail().getByRole('button', { name: t.approve, exact: true })).toBeDisabled(); await expect(detail().getByRole('button', { name: t.reject, exact: true })).toBeDisabled(); result.proposerDecisionDenied = true;
    const checker = await login(true); await open(); await detail().getByRole('button', { name: t.review, exact: true }).click(); await detail().getByLabel(t.decisionReason, { exact: true }).fill(locale === 'fr' ? 'Compléter le motif de la décision proposée' : 'The proposed reason needs further detail'); await detail().getByRole('button', { name: t.reject, exact: true }).click(); await expect(detail().getByLabel(messages.manualMatch.passwordLabel, { exact: true })).toBeVisible(); await authenticate(checker); await detail().getByRole('button', { name: t.retry, exact: true }).click(); await expect(detail().getByText(t.records.REJECTED, { exact: true })).toBeVisible(); assert.equal((await db.paymentException.findUniqueOrThrow({ where: { id: x.exceptionId } })).status, initialStatus); result.independentRejection = true;
    page = maker.page; await detail().getByRole('button', { name: t.refresh, exact: true }).click(); await expect(detail().getByText(t.records.REJECTED, { exact: true })).toBeVisible();
    // The second proposal uses the refreshed server revision and a new request identity.
    await detail().getByLabel(t.reason, { exact: true }).fill(locale === 'fr' ? 'Motif complété après examen indépendant des preuves conservées' : 'Completed the reason after independent review of retained evidence'); await detail().getByRole('button', { name: t.preview, exact: true }).click(); await detail().getByRole('button', { name: t.propose, exact: true }).click();
    await expect.poll(() => db.paymentReconciliationInboxItem.count({ where: { organizationId: x.organizationId, idempotencyKey: { startsWith: 'exception-closure-proposal:' } } })).toBe(2);
    const second = await db.paymentReconciliationInboxItem.findFirstOrThrow({ where: { organizationId: x.organizationId, idempotencyKey: { startsWith: 'exception-closure-proposal:' }, id: { not: first.id } } });
    page = checker.page; await detail().getByRole('button', { name: t.refresh, exact: true }).click(); await detail().getByRole('button', { name: t.review, exact: true }).click(); await detail().getByLabel(t.decisionReason, { exact: true }).fill(locale === 'fr' ? 'Examen indépendant de la source et du traitement conservé' : 'Independent review of source and retained treatment'); await detail().getByRole('button', { name: t.approve, exact: true }).click();
    await expect(detail().getByText(t.currentState.replace('{state}', t.states.RESOLVED), { exact: true })).toBeVisible(); await expect(detail().getByText(t.records.APPROVED, { exact: true })).toBeVisible();
    const receipt = await db.paymentReconciliationInboxItem.findFirstOrThrow({ where: { organizationId: x.organizationId, idempotencyKey: 'exception-closure-decision:' + second.id } }); assert.equal(receipt.payloadSummary.decidedById, checker.user.id); assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.runId } })).status, 'NEEDS_REVIEW'); result.independentApproval = true;
    const history = await closure.readExceptionClosureHistory({ exceptionId: x.exceptionId }, f.context(x)); assert.equal(history.total, 4); assert.equal(history.items.filter(r => r.requiresCurrentReview).length, 0); result.verifiedHistory = true;
    for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); await detail().scrollIntoViewIfNeeded(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('history-' + width); }
    await detail().getByRole('button', { name: t.back, exact: true }).click(); await root().getByRole('button', { name: t.allCases, exact: true }).click(); await expect(root().getByRole('article', { name: caseName, exact: true }).getByText(t.states.RESOLVED, { exact: true })).toBeVisible(); await root().getByRole('button', { name: t.close, exact: true }).click(); await expect(page.getByRole('button', { name: t.open, exact: true })).toBeFocused(); result.retainedDiscoveryAndFocus = true;
    assert.deepEqual(await db.matchRecord.findMany({ where: { organizationId: x.organizationId } }), x.originalMatches);
    assert.equal(await db.paymentTransaction.count({ where: { organizationId: x.organizationId } }), 1);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 0);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await shot('text-enlargement');
    assert.equal(beforeFinancial, await financial(x.organizationId)); result.closureFinancialUnchanged = true; result.passed = !result.pageErrors.length && !result.consoleIssues.some(m => m.includes('MISSING_MESSAGE'));
  } catch (error) { result.error = f.safe(error, secrets); result.stack = String(error.stack).split('\n').slice(0, 5); if (page) try { await shot('failure'); } catch {} }
  finally { for (const context of contexts) await context.close(); }
  return result;
}
(async () => { await f.local.withClient(f.target, f.local.assertOwned); const browser = await chromium.launch({ headless: true }); try { for (const locale of ['en', 'fr']) report.journeys.push(await journey(browser, locale)); } finally { await browser.close(); } })()
.catch(error => { report.error = f.safe(error, secrets); report.stack = String(error.stack).split('\n').slice(0, 5); }).finally(async () => { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); await db.$disconnect(); const file = 'corroborating-browser-browser-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ file, journeys: report.journeys, error: report.error, stack: report.stack, sourceStable: report.sourceStable })); process.exit(!report.error && report.sourceStable && report.journeys.length === 2 && report.journeys.every(j => j.passed) ? 0 : 1); });
