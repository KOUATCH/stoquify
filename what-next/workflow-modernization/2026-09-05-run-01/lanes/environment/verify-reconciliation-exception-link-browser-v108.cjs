const f = require('./invoice-approval-fixtures.cjs'), { db, fs, path, crypto, assert, base } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const run = crypto.randomUUID().slice(0, 12), secrets = [];
const files = ['services/reconciliation/payment-reconciliation-run.service.ts', 'services/reconciliation/payment-suspense-workflow.service.ts', 'actions/payments/reconciliation.actions.ts', 'components/finance/PaymentSuspenseQueue.tsx', 'hooks/payments/usePaymentReconciliationDashboard.ts', 'messages/en.json', 'messages/fr.json'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const financial = async () => f.hash(await Promise.all(['journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'reconciliationRun'].map(n => db[n].findMany({ orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), run, sourcesBefore: sources(), journeys: [], scope: 'Actual EN/FR loopback assignment of previously automatically created owned synthetic exceptions; real password authentication and server action. No live payment, financial posting, approval, sign-off or external delivery.' };
async function journey(browser, org, row, locale) {
  const t = require(path.join(f.root, 'messages', locale + '.json')).paymentReconciliationWorkbench;
  const result = { locale, screenshots: [], pageErrors: [], consoleIssues: [], routeLoadMs: [] }, contexts = [];
  let page;
  async function login(allowed) {
    const password = 'Owned-link-' + crypto.randomUUID() + '!', passwordHash = await hashPassword(password); secrets.push(password);
    const user = await db.user.create({ data: { organizationId: org.id, name: 'Owned assignment verification', email: crypto.randomUUID() + '@example.invalid', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
    await db.role.create({ data: { organizationId: org.id, code: 'OWNED_LINK_' + crypto.randomUUID(), nameEn: 'Owned assignment verification', permissions: ['payments.reconciliation.read', ...(allowed ? ['payments.reconciliation.exception.assign'] : [])], users: { connect: { id: user.id } } } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); contexts.push(context);
    context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000); await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const response = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(response.status(), 200);
    page = await context.newPage(); page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets))); page.on('console', message => { if (['error', 'warning'].includes(message.type())) { const issue = f.safe(message.text(), secrets).split('\n')[0]; if (!result.consoleIssues.includes(issue)) result.consoleIssues.push(issue); } });
    const start = Date.now(); await page.goto(base + '/' + locale + '/dashboard/finance/reconciliation'); await expect(page.getByRole('region', { name: t.suspenseWorkflow.title, exact: true })).toBeVisible(); result.routeLoadMs.push(Date.now() - start);
    return { user, article: page.getByRole('article', { name: t.suspenseWorkflow.review.item + ' ' + row.suspenseItemId, exact: true }) };
  }
  async function shot(name) { const file = 'reconciliation-exception-link-v108-' + locale + '-' + name + '-' + run + '.png'; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); result.screenshots.push(file); }
  try {
    const before = await db.paymentException.findUniqueOrThrow({ where: { id: row.id } });
    const denied = await login(false); await expect(denied.article.getByRole('button', { name: t.suspenseWorkflow.actions.assign, exact: true })).toBeDisabled();
    assert.equal(f.hash(await db.paymentException.findUniqueOrThrow({ where: { id: row.id } })), f.hash(before)); result.readOnlyControlDisabledWithoutExceptionChange = true;
    const actor = await login(true), button = actor.article.getByRole('button', { name: t.suspenseWorkflow.actions.assign, exact: true });
    await expect(button).toBeEnabled(); await button.focus(); await expect(button).toBeFocused(); await button.press('Enter');
    await expect(page.getByRole('region', { name: t.suspenseWorkflow.title, exact: true }).getByText(t.suspenseWorkflow.notifications.assignedMessage, { exact: true })).toBeVisible();
    const after = await db.paymentException.findUniqueOrThrow({ where: { id: row.id } }), suspense = await db.suspenseItem.findUniqueOrThrow({ where: { id: row.suspenseItemId } });
    assert.equal(after.ownerId, actor.user.id); assert.equal(after.status, 'ASSIGNED'); assert.equal(suspense.ownerId, actor.user.id); assert.equal(suspense.status, 'ASSIGNED');
    assert.deepEqual(after.metadata.ownedSourceEvidence, before.metadata.ownedSourceEvidence); assert.equal(after.metadata.ownedRecoveryReference, before.metadata.ownedRecoveryReference);
    assert.equal(after.suspenseItemId, suspense.id); assert.equal(suspense.evidence.exceptionId, after.id);
    result.keyboardAssignmentReachedBothRecords = true; result.priorMetadataRetained = true;
    await actor.article.scrollIntoViewIfNeeded(); await shot('assigned-1440');
    await page.setViewportSize({ width: 320, height: 1000 }); await actor.article.scrollIntoViewIfNeeded(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); await shot('assigned-320'); result.reflow320 = true;
    await page.reload(); await expect(page.getByRole('article', { name: t.suspenseWorkflow.review.item + ' ' + row.suspenseItemId, exact: true }).getByText(t.suspenseWorkflow.states.ASSIGNED, { exact: true })).toBeVisible(); result.persistedAfterReload = true;
    result.passed = !result.pageErrors.length && !result.consoleIssues.some(issue => issue.includes('MISSING_MESSAGE'));
  } catch (error) { result.error = f.safe(error, secrets); result.stack = String(error.stack).split('\n').slice(0, 5); if (page) try { await shot('failure'); } catch {} }
  finally { for (const context of contexts) await context.close(); }
  return result;
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned);
  const org = await db.organization.findFirstOrThrow({ where: { id: { contains: 'exception-link-7614fbba-e73-success' } } });
  const rows = await db.paymentException.findMany({ where: { organizationId: org.id, suspenseItemId: { not: null } }, orderBy: { id: 'asc' } }); assert.equal(rows.length, 3);
  report.financialBefore = await financial(); const browser = await chromium.launch({ headless: true });
  try { for (const [index, locale] of ['en', 'fr'].entries()) report.journeys.push(await journey(browser, org, rows[index], locale)); } finally { await browser.close(); }
})().catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  report.financialUnchanged = report.financialBefore === await financial(); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); await db.$disconnect();
  const file = 'reconciliation-exception-link-v108-browser-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, journeys: report.journeys, error: report.error, sourceStable: report.sourceStable, financialUnchanged: report.financialUnchanged })); process.exit(!report.error && report.journeys.length === 2 && report.journeys.every(j => j.passed) && report.sourceStable && report.financialUnchanged ? 0 : 1);
});
