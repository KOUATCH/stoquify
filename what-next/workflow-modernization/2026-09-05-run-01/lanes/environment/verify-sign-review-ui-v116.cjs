const f = require('./exception-closure-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const closure = require(path.join(f.root, 'services/reconciliation/payment-exception-closure.service.ts'));
const preparation = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [], secrets = [];
const files = ['services/reconciliation/payment-reconciliation-certification.service.ts', 'services/reconciliation/reconciliation-sign-review.contracts.ts', 'actions/payments/reconciliation-sign-review.actions.ts', 'actions/payments/reconciliation.actions.ts', 'components/finance/ReconciliationSignReview.tsx', 'components/finance/ReconciliationPreparationWorkbench.tsx', 'components/finance/PaymentReconciliationWorkbench.tsx', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const finance = async org => f.hash(await Promise.all(['journalEntry', 'journalEntryLine', 'ledgerPostingBatch'].map(n => db[n].findMany({ where: { organizationId: org }, orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), sourcesBefore: sources(), journeys: [], scope: 'Owned real EN/FR browser authentication, independent sign review, password/reload/retry and actual certificate download. Synthetic original provider fixture, genuine domain closure/preparation. No provider or professional approval claim.' };
async function journey(browser, locale) {
  const x = await f.fixture('sign-review-' + run + '-' + locale, organizations, { externalMismatch: true });
  const cp = await closure.previewExceptionClosure({ exceptionId: x.exceptionId }, f.context(x));
  const proposal = await closure.proposeExceptionClosure({ exceptionId: x.exceptionId, reason: 'Owned original evidence and financial treatment review', expectedRevision: cp.revision, idempotencyKey: crypto.randomUUID() }, f.context(x));
  await closure.decideExceptionClosure({ exceptionId: x.exceptionId, proposalId: proposal.proposalId, expectedRevision: cp.revision, decision: 'APPROVE', reason: 'Independent owned source and treatment decision' }, f.context(x, x.checkerId));
  const prepared = await preparation.previewReconciliationPreparation({ runId: x.runId }, f.context(x));
  await preparation.prepareReconciliationRun({ runId: x.runId, expectedRevision: prepared.revision, reason: 'Reviewed sources ready for an independent signer', idempotencyKey: crypto.randomUUID() }, f.context(x));
  const financialBefore = await finance(x.organizationId), result = { locale, screenshots: [], pageErrors: [], consoleIssues: [] }, contexts = []; let page;
  const m = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench, t = m.signReview;
  async function login(permissions) {
    const password = 'Owned-sign-review-' + crypto.randomUUID() + '!', passwordHash = await hashPassword(password); secrets.push(password);
    const user = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned independent sign reviewer', email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
    await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_SIGN_' + crypto.randomUUID(), nameEn: 'Owned signing role', permissions, users: { connect: { id: user.id } } } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce', acceptDownloads: true }); contexts.push(context); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
    page = await context.newPage(); page.on('pageerror', e => result.pageErrors.push(f.safe(e, secrets))); page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) { const text = f.safe(msg.text(), secrets).split('\n')[0]; if (!result.consoleIssues.includes(text)) result.consoleIssues.push(text); } });
    const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation'); await expect(page.getByRole('button', { name: t.open, exact: true }).first()).toBeVisible(); result.routeLoadMs = Date.now() - start; return { user, password };
  }
  const detail = () => page.getByRole('region', { name: t.title, exact: true });
  async function shot(name) { const file = 'sign-review-v116-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); result.screenshots.push(file); }
  try {
    await login(['payments.reconciliation.read']); await expect(page.getByRole('button', { name: t.open, exact: true }).first()).toBeDisabled(); result.browserReadOnlyDenied = true;
    const actor = await login(['payments.reconciliation.read', 'payments.reconciliation.sign', 'payments.reconciliation.certificate.export']);
    // Preview verifies independence and tenant boundaries before any browser signing.
    const previewInput = { organizationId: x.organizationId, runId: x.runId, actorId: actor.user.id, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.sign'] };
    assert.equal((await certification.previewReconciliationSignOff({ ...previewInput, actorId: x.actorId })).blocker, 'INDEPENDENT_SIGNER');
    await assert.rejects(() => certification.previewReconciliationSignOff({ ...previewInput, organizationId: 'foreign' })); result.serviceMakerAndTenantDenied = true;
    await expect(page.getByRole('button', { name: t.open, exact: true }).first()).toBeEnabled();
    await page.getByRole('button', { name: t.open, exact: true }).first().focus(); await page.keyboard.press('Enter'); await expect(detail().getByText(t.ready, { exact: true })).toBeVisible(); await expect(detail()).toBeFocused();
    for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); await detail().scrollIntoViewIfNeeded(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('review-' + width); }
    await detail().getByRole('button', { name: t.confirm, exact: true }).click(); await expect(detail().getByLabel(m.manualMatch.passwordLabel, { exact: true })).toBeFocused();
    const key = 'stoquify:sign-review:v1:' + x.organizationId + ':' + actor.user.id + ':' + x.runId, saved = await page.evaluate(k => sessionStorage.getItem(k), key), command = JSON.parse(saved);
    await detail().getByLabel(m.manualMatch.passwordLabel, { exact: true }).fill(actor.password); await detail().getByRole('button', { name: m.suspenseWorkflow.review.authenticate, exact: true }).click();
    await expect(detail().getByRole('button', { name: t.retry, exact: true })).toBeEnabled(); assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.runId } })).status, 'READY_FOR_SIGNOFF');
    await page.reload(); await expect(detail()).toBeVisible(); await expect(detail().getByRole('button', { name: t.retry, exact: true })).toBeEnabled(); assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), saved);
    await detail().getByRole('button', { name: t.retry, exact: true }).click(); await expect(detail().getByRole('button', { name: t.export, exact: true })).toBeVisible();
    const signed = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.runId } }); assert.equal(signed.status, 'SIGNED'); assert.equal(signed.signedById, actor.user.id); assert.equal(signed.certificatePayload.reviewedEvidenceRevision, command.expectedEvidenceRevision);
    assert.equal(await page.evaluate(k => sessionStorage.getItem(k), key), null); result.passwordReloadAndBoundSignature = true;
    await page.setViewportSize({ width: 320, height: 1000 }); await detail().scrollIntoViewIfNeeded(); await shot('signed-320');
    await detail().getByRole('button', { name: t.export, exact: true }).click(); const panel = page.getByRole('region', { name: m.certificateExport.title, exact: true }); await expect(panel).toBeFocused();
    const downloaded = page.waitForEvent('download'); await panel.getByRole('button', { name: m.certificateExport.download, exact: true }).click(); const download = await downloaded;
    const bytes = fs.readFileSync(await download.path()), fileHash = crypto.createHash('sha256').update(bytes).digest('hex');
    const receipt = await db.paymentReconciliationInboxItem.findFirstOrThrow({ where: { organizationId: x.organizationId, source: 'CERTIFICATE_EXPORT', externalId: x.runId }, orderBy: { createdAt: 'desc' } });
    assert.equal(receipt.payloadSummary.result.sha256, fileHash); assert.equal(receipt.payloadSummary.result.certificateHash, signed.certificateHash); assert.equal(receipt.payloadSummary.result.content, bytes.toString());
    await expect(panel.getByText(m.certificateExport.downloadRequested, { exact: true })).toBeVisible(); result.actualDownload = { fileName: download.suggestedFilename(), sha256: fileHash, receiptId: receipt.id };
    await panel.scrollIntoViewIfNeeded(); await shot('export-320'); await panel.getByRole('button', { name: m.certificateExport.close, exact: true }).click(); await expect(detail().getByRole('button', { name: t.export, exact: true })).toBeFocused();
    assert.equal(await finance(x.organizationId), financialBefore); result.financialUnchanged = true;
    result.passed = !result.pageErrors.length && !result.consoleIssues.some(s => s.includes('MISSING_MESSAGE'));
  } catch (error) { result.error = f.safe(error, secrets); result.stack = String(error.stack).split('\n').slice(0, 5); if (page) try { result.reviewText = await detail().allTextContents(); await detail().scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {}); await shot('failure'); } catch {} }
  finally { for (const context of contexts) await context.close(); } return result;
}
(async () => { await f.local.withClient(f.target, f.local.assertOwned); const browser = await chromium.launch({ headless: true }); try { for (const locale of ['en', 'fr']) { console.log(JSON.stringify({ locale, phase: 'starting actual independent sign and download' })); report.journeys.push(await journey(browser, locale)); } } finally { await browser.close(); } })()
.catch(error => { report.error = f.safe(error, secrets); report.stack = String(error.stack).split('\n').slice(0, 5); }).finally(async () => {
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); await db.$disconnect(); const file = 'sign-review-v116-browser-' + run + '.json';
  console.log(JSON.stringify({ file, journeys: report.journeys, error: report.error, sourceStable: report.sourceStable })); fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  process.exit(!report.error && report.sourceStable && report.journeys.length === 2 && report.journeys.every(j => j.passed) ? 0 : 1);
});
