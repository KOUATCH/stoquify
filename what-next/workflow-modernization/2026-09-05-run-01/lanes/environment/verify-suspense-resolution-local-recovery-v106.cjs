const f = require('./suspense-currency-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const journals = require(path.join(f.root, 'services/accounting/journals.service.ts')), posting = require(path.join(f.root, 'services/accounting/posting.service.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [], secrets = [];
const files = ['components/finance/PaymentSuspenseResolutionPanel.tsx', 'components/finance/PaymentSuspenseQueue.tsx', 'actions/payments/suspense-resolution.actions.ts', 'services/reconciliation/payment-suspense-resolution-read.service.ts', 'services/reconciliation/payment-suspense-resolution-read.contracts.ts', 'services/reconciliation/payment-suspense-resolution.service.ts', 'services/reconciliation/payment-suspense-resolution-evidence.service.ts', 'services/reconciliation/payment-suspense-resolution-recovery.service.ts', 'services/reconciliation/payment-suspense-resolution-recovery-evidence.service.ts', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const tables = ['suspenseItem', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'paymentReconciliationInboxItem'];
const snapshot = async where => f.hash(await Promise.all(tables.map(n => db[n].findMany({ where, orderBy: { id: 'asc' } }))));
const permissions = [...f.permissions, 'accounting.journal.read', 'accounting.journal.create', 'accounting.journal.post'];
const report = { at: new Date().toISOString(), run, sourcesBefore: sources(), journeys: [], scope: 'Owned actual application. Normal password sign-in and step-up. Synthetic accounting setup; no live approval or external delivery.' };
async function journey(browser, locale) {
  const x = await f.fixture('resolution-ui-' + run + '-' + locale, organizations);
  const messages = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench, t = messages.suspenseResolution, correction = messages.suspenseCorrection;
  const result = { locale, screenshots: [], stages: [], pageErrors: [], routeLoadMs: [] }, contexts = [], pages = [];
  await db.organization.update({ where: { id: x.organizationId }, data: { requestedModules: ['purchasing', 'finance', 'accounting', 'payment_reconciliation'] } });
  await db.role.updateMany({ where: { id: { in: [x.roleId, x.checkerRoleId] } }, data: { permissions } });
  await f.workflow.approveSuspensePosting(x.command);
  const destination = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-FINAL', nameEn: 'Owned destination', nameFr: 'Destination de test', type: locale === 'fr' ? 'EXPENSE' : 'LIABILITY', normalBalance: 'DEBIT' } });
  const journal = await db.journal.findFirstOrThrow({ where: { organizationId: x.organizationId, code: 'OWNED-SP' } });
  const clearing = await journals.createManualJournalEntry(x.organizationId, { journalId: journal.id, entryDate: f.now, reference: 'Owned browser clearance', memo: 'Synthetic clearance', lines: [{ accountId: x.account.id, debit: '0', credit: '100.25', currency: 'XAF' }, { accountId: destination.id, debit: '100.25', credit: '0', currency: 'XAF' }] }, x.actorId);
  await posting.postJournalEntry(x.organizationId, clearing.id, x.checkerId, { actorPermissions: permissions, now: f.now, lastAuthAt: f.now });
  const third = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned recovery checker', email: crypto.randomUUID() + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
  await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_RECOVERY', nameEn: 'Owned recovery reviewer', permissions, users: { connect: { id: third.id } } } });
  async function login(id) {
    const user = await db.user.findUniqueOrThrow({ where: { id } }), password = 'Owned-resolution-' + crypto.randomUUID() + '!', passwordHash = await hashPassword(password); secrets.push(password);
    const account = await db.account.findFirst({ where: { userId: id, providerId: 'credential' }, select: { id: true } });
    if (account) await db.account.update({ where: { id: account.id }, data: { password: passwordHash } }); else await db.account.create({ data: { userId: id, accountId: id, providerId: 'credential', password: passwordHash } });
    await db.user.update({ where: { id }, data: { password: passwordHash } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); contexts.push(context);
    context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000); await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const response = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(response.status(), 200);
    const page = await context.newPage(); pages.push(page); page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
    const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation'); await expect(page.getByRole('region', { name: messages.suspenseWorkflow.title, exact: true })).toBeVisible(); result.routeLoadMs.push(Date.now() - start);
    return { page, password };
  }
  async function openPanel(page) {
    const queue = page.getByRole('region', { name: messages.suspenseWorkflow.title, exact: true });
    if (!await queue.getByRole('button', { name: t.open, exact: true }).count()) {
      await queue.getByRole('button', { name: messages.suspenseWorkflow.history.open, exact: true }).click();
      await queue.locator('li').filter({ hasText: x.item.id }).getByRole('button', { name: messages.suspenseWorkflow.history.inspect, exact: true }).click();
    }
    await queue.getByRole('button', { name: t.open, exact: true }).last().focus(); await page.keyboard.press('Enter');
    const panel = page.getByRole('region', { name: t.title, exact: true }); await expect(panel).toBeFocused(); await expect(panel.getByRole('button', { name: correction.refresh, exact: true })).toBeEnabled(); return panel;
  }
  async function shot(page, name) { const file = 'suspense-resolution-local-recovery-v106-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); result.screenshots.push(file); }
  async function approve(page, panel, password) {
    await panel.getByRole('button', { name: t.review, exact: true }).click(); await panel.getByLabel(correction.decisionReason, { exact: true }).fill('Owned independent decision from actual browser');
    const before = await snapshot({ organizationId: x.organizationId }); await panel.getByRole('button', { name: t.approve, exact: true }).click();
    await panel.getByLabel(messages.manualMatch.passwordLabel, { exact: true }).fill(password); await panel.getByRole('button', { name: messages.suspenseWorkflow.review.authenticate, exact: true }).click();
    await expect(panel.getByText(t.authenticated, { exact: true })).toBeVisible(); assert.equal(await snapshot({ organizationId: x.organizationId }), before);
    await page.reload(); panel = await openPanel(page); await expect(panel.getByRole('button', { name: correction.retry, exact: true })).toBeVisible();
    await panel.getByRole('button', { name: correction.retry, exact: true }).click(); await expect(panel.getByText(t.recorded, { exact: true })).toBeVisible(); return panel;
  }
  try {
    const maker = await login(x.actorId);
    const draftKey = 'stoquify:suspense-resolution:v1:' + x.organizationId + ':' + x.actorId + ':' + x.item.id;
    await maker.page.evaluate(key => { sessionStorage.setItem(key, '{unreadable'); sessionStorage.setItem('owned-local-draft-other', 'preserve'); }, draftKey);
    const beforeReset = await snapshot({ organizationId: x.organizationId }); let panel = await openPanel(maker.page);
    await expect(panel.getByRole('alert')).toContainText(t.resetDraftHelp);
    await expect(panel.getByRole('button', { name: t.preview, exact: true })).toBeDisabled();
    await maker.page.setViewportSize({ width: 320, height: 1000 }); await panel.getByRole('alert').scrollIntoViewIfNeeded();
    assert.ok(await maker.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot(maker.page, 'unreadable-320');
    await panel.getByRole('button', { name: t.resetDraft, exact: true }).focus(); await maker.page.keyboard.press('Enter');
    await expect(panel.getByText(t.draftReset, { exact: true })).toBeVisible();
    await expect(panel).toBeFocused();
    assert.equal(await snapshot({ organizationId: x.organizationId }), beforeReset);
    assert.equal(await maker.page.evaluate(() => sessionStorage.getItem('owned-local-draft-other')), 'preserve');
    await maker.page.setViewportSize({ width: 1440, height: 1000 });
    result.stages.push('Unreadable local draft warning stays visible; explicit keyboard reset first reads current server records, changes no financial evidence and preserves unrelated browser keys');
    await panel.getByLabel(t.search, { exact: true }).fill('Owned browser'); await panel.getByRole('button', { name: t.find, exact: true }).click();
    await panel.getByLabel(t.clearing, { exact: true }).selectOption(clearing.id); if (locale === 'fr') await panel.getByLabel(t.outcome, { exact: true }).selectOption('WRITTEN_OFF');
    await panel.getByLabel(t.reason, { exact: true }).fill('Owned browser proposal with complete clearing evidence');
    await panel.getByRole('button', { name: t.preview, exact: true }).click(); await expect(panel.getByText(t.impact, { exact: true })).toBeVisible(); await shot(maker.page, 'preview-desktop');
    for (const width of [320, 768]) { await maker.page.setViewportSize({ width, height: 1000 }); await panel.scrollIntoViewIfNeeded(); assert.ok(await maker.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot(maker.page, 'preview-' + width); }
    await maker.page.setViewportSize({ width: 1440, height: 1000 }); await panel.getByRole('button', { name: t.propose, exact: true }).click(); await expect(panel.getByText(t.recorded, { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: t.review, exact: true }).click(); await expect(panel.getByText(t.denied, { exact: true })).toBeVisible(); assert.equal(await panel.getByRole('button', { name: t.approve, exact: true }).count(), 0);
    result.stages.push('Actual maker searches/selects clearing journal, previews consequences and proposes; maker approval unavailable; desktop/mobile/tablet verified');
    const checker = await login(x.checkerId); panel = await openPanel(checker.page); panel = await approve(checker.page, panel, checker.password);
    assert.equal((await db.suspenseItem.findUniqueOrThrow({ where: { id: x.item.id } })).status, locale === 'fr' ? 'WRITTEN_OFF' : 'RESOLVED'); assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 2);
    await shot(checker.page, 'resolved');
    await panel.getByRole('button', { name: t.close, exact: true }).focus(); await checker.page.keyboard.press('Enter');
    await expect(checker.page.getByRole('region', { name: messages.suspenseWorkflow.title, exact: true })).toBeFocused();
    panel = await openPanel(checker.page);
    result.stages.push('After resolution removes the original opener, closing returns keyboard focus to the existing queue; retained history reopens the final record');
    result.stages.push('Independent actual password step-up has no posting effect; reload restores exact approval request; explicit retry resolves without another journal');
    await panel.getByLabel(t.reason, { exact: true }).fill('Owned browser reopening of reviewed clearance'); await panel.getByRole('button', { name: t.preview, exact: true }).click();
    await expect(panel.getByText(t.recoveryImpact, { exact: true })).toBeVisible(); await panel.getByRole('button', { name: t.propose, exact: true }).click(); await expect(panel.getByText(t.recorded, { exact: true })).toBeVisible();
    const recoveryChecker = await login(third.id); panel = await openPanel(recoveryChecker.page); panel = await approve(recoveryChecker.page, panel, recoveryChecker.password);
    const after = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.item.id } }); assert.equal(after.status, 'POSTED_TO_SUSPENSE'); assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 3);
    await expect(panel.getByText(t.events.SUSPENSE_RESOLUTION_RECOVERY_APPROVED_V1, { exact: true })).toBeVisible(); await shot(recoveryChecker.page, 'recovered-history');
    result.stages.push('Previously final item discovered through retained history; separate reviewer authenticates, reloads and confirms recovery; exact clearing reversal and durable decision history visible');
    result.passed = result.pageErrors.length === 0;
  } catch (error) { result.error = f.safe(error, secrets); result.failureLocation = String(error.stack).split('\n').filter(line => line.includes('verify-suspense-resolution-ui')); for (const page of pages.slice(-1)) try { await shot(page, 'failure'); } catch {} }
  finally { for (const context of contexts) await context.close(); }
  return result;
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await snapshot({ organizationId: { notIn: organizations } });
  const browser = await chromium.launch({ headless: true }); try { for (const locale of ['en', 'fr']) report.journeys.push(await journey(browser, locale)); } finally { await browser.close(); }
})().catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await snapshot({ organizationId: { notIn: organizations } }); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  await db.$disconnect(); const file = 'suspense-resolution-local-recovery-v106-browser-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, journeys: report.journeys, error: report.error, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged })); process.exit(!report.error && report.journeys.length === 2 && report.journeys.every(j => j.passed) && report.sourceStable && report.originalUnchanged ? 0 : 1);
});
