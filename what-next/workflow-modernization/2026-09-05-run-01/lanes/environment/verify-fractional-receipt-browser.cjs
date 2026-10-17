// Owned local browser evidence for original-date receipt recovery with a zero-value return.
// Uses actual receiving, return and recovery services; no invoice approval or payment.
const h = require('./verify-operational-receipt-recognition.cjs');
const { f, db } = h, { fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const base = 'http://127.0.0.1:3110', run = crypto.randomUUID(), secrets = [];
const files = [
  'components/purchase-orders/ReceiptLedgerRecoveryDialog.tsx',
  'components/purchase-orders/PurchaseReceivingWorkbench.tsx',
  'actions/purchaseOrderWorkflow/purchase-receiving.actions.ts',
  'services/purchase-order/receipt-ledger-recovery-contracts.ts',
  'services/purchase-order/receipt-ledger-recovery-authority.ts',
  'services/purchasing/receipt-invoice-capacity.ts',
  'services/purchasing/invoice-preparation.service.ts',
  'services/purchasing/invoice-preparation-authority.ts',
  'services/purchasing/invoice-preparation-contracts.ts',
  'services/purchasing/invoice-preparation-evidence.ts',
  'services/purchasing/invoice-correction.service.ts',
  'services/purchasing/invoice-correction-authority.ts',
  'services/purchasing/invoice-correction-contracts.ts',
  'services/purchasing/invoice-source-evidence.ts',
  'services/purchasing/purchase-return-credit.service.ts',
  'services/purchasing/purchase-return-credit.schemas.ts',
  'services/purchasing/purchase-correction-ledger.service.ts',
  'services/accounting/periods.service.ts',
  'components/purchasing/InvoicePreparationWorkbench.tsx',
  'components/purchasing/InvoiceCorrectionWorkbench.tsx',
  'actions/purchasing/invoice-preparation.actions.ts',
  'actions/purchasing/invoice-correction.actions.ts',
  'app/[locale]/(dashboard)/dashboard/purchases/payables/prepare/page.tsx',
  'app/[locale]/(dashboard)/dashboard/purchases/payables/correct/page.tsx',
  'services/inventory/receipt-cost-allocation.ts', 'services/inventory/inventory-stock-event.service.ts',
  'services/purchasing/receipt-return-recognition.ts',
  'messages/en.json', 'messages/fr.json',
  'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-fractional-receipt-browser.cjs',
];
const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')])) });
const report = {
  run, at: new Date().toISOString(), sourcesBefore: sources(), journeys: [],
  scope: 'Owned localhost PostgreSQL and actual localhost:3110 application. EN desktop and FR narrow-mobile receipt recovery with a source-bound zero-value return, actual password verification, stale rejection, lost response and exact retry. No fabricated journal, live payment, external message, migration or certification.',
  productionReceiptProducerImplemented: true,
};
async function stable() {
  return f.hash({ shared: await h.stable(), inventoryLevels: await db.inventoryLevel.findMany({ where: { item: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }) });
}
async function financialState(x) {
  const where={organizationId:x.organizationId};
  return f.hash({ models: await Promise.all(['journalEntry','journalEntryLine','ledgerPostingBatch','accountingSourceLink','supplierLedgerEntry','payment','supplierPayment','inventoryTransaction','purchaseReturn','purchaseReturnLine','businessEvent'].map(model=>db[model].findMany({where,orderBy:{id:'asc'}}))), inventoryLevels: await db.inventoryLevel.findMany({ where: { item: where }, orderBy: { id: 'asc' } }) });
}
async function signedContext(browser, x, locale, width) {
  const user = await db.user.findUniqueOrThrow({ where: { id: x.actorId } });
  const password = 'Owned-capacity-' + crypto.randomUUID() + '!'; secrets.push(password);
  const passwordHash = await hashPassword(password);
  await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
  await db.user.update({ where: { id: user.id }, data: { password: passwordHash } });
  await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read', 'purchases.orders.receive', 'purchasing.ap.invoice.post', 'purchasing.ap.invoice.view'] } });
  const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'UTC', locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' });
  context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const signed = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000, maxRedirects: 0 });
  assert.equal(signed.status(), 200);
  return { context, page: await context.newPage(), password };
}
async function recoveryJourney(browser, locale, width) {
  const result = { locale, width, kind: 'receipt-return-recovery', stages: [], screenshots: [], pageErrors: [], passed: false };
  let context, page;
  const shot = async stage => {
    const file = 'fractional-receipt-browser-' + run + '-' + locale + width + '-recovery-' + stage + '.png';
    await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' });
    result.screenshots.push({ stage, file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex') });
  };
  const layout = async () => {
    const value = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(node => node.getBoundingClientRect().width > 0).map(node => ({ width: node.clientWidth, scrollWidth: node.scrollWidth })) }));
    assert.ok(value.documentWidth <= value.viewport + 1);
    for (const dialog of value.dialogs) assert.ok(dialog.scrollWidth <= dialog.width + 1);
    return value;
  };
  try {
    const fixtureLabel = 'frac-browser-' + locale;
    assert.ok(('workflow_supplier_ack_' + locale + '_receipt-handoff-' + '0'.repeat(36) + '-operational-' + '0'.repeat(36) + '-' + fixtureLabel).length <= 191, 'Owned fixture ID must fit before insertion');
    const x = await h.fixture(fixtureLabel, { locale });
    const order = await db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId }, include: { lines: true } });
    assert.equal(order.organizationId, x.organizationId); assert.equal(order.lines.length, 1);
    await db.item.update({ where: { id: order.lines[0].itemId }, data: { costPrice: '0.01' } });
    await db.purchaseOrderLine.update({ where: { id: x.lineId }, data: { orderedQuantity: '1.000', unitCost: '0.01', lineTotal: '0.01' } });
    await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { subtotal: '0.01', total: '0.01' } });
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: false } });
    const { receipt } = await h.receive(x, 1, 'review_required'), returned = await h.returnGoods(x, receipt, '0.300');
    assert.equal(returned.purchaseReturn.journalEntryId, null);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 0);
    const zeroMovement = await db.inventoryTransaction.findFirstOrThrow({ where: { organizationId: x.organizationId, referenceId: returned.purchaseReturn.id, type: 'PURCHASE_RETURN' } });
    assert.equal(zeroMovement.quantity.toFixed(3), '-0.300'); assert.equal(zeroMovement.totalCost.toFixed(2), '0.00');
    const immutableReturn = f.hash(returned.purchaseReturn);
    const messages = JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'), 'utf8')), t = messages.purchaseReceiving, a = t.accountingRecovery;
    const signed = await signedContext(browser, x, locale, width); context = signed.context; page = signed.page;
    page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
    const start = Date.now();
    await page.goto(base + '/' + locale + '/dashboard/purchase-orders/' + x.purchaseOrderId, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: t.history, exact: true }).click();
    const opener = page.getByRole('button', { name: a.review, exact: true }), dialog = page.getByRole('dialog');
    await expect(opener).toBeVisible(); await opener.focus(); await page.keyboard.press('Enter');
    await expect(dialog).toContainText(a.blockers.RULE_UNAVAILABLE); await expect(dialog.getByRole('button', { name: a.confirm, exact: true })).toHaveCount(0);
    result.blockedLayout = await layout(); await shot('missing-rule');
    await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: true } });
    await opener.focus(); await page.keyboard.press('Enter');
    await expect(dialog).toContainText(a.returnsTitle); await expect(dialog).toContainText(returned.purchaseReturn.id); await expect(dialog).toContainText(a.noJournalRequired);
    const password = dialog.getByLabel(a.password, { exact: true });
    result.actualPasswordStepUp = await password.isVisible(); assert.equal(result.actualPasswordStepUp, true);
    await password.fill(signed.password);
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); assert.ok(await dialog.evaluate(node => node.contains(document.activeElement))); }
    result.reviewLayout = await layout(); await shot('original-dates-review');
    // Mutate only the owned rule after preview to prove a stale financial review
    // cannot post. No original customer or shared configuration is changed.
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { priority: x.receiptRule.priority + 1 } });
    const beforeStaleSubmit = await financialState(x);
    await dialog.getByRole('button', { name: a.confirm, exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(a.stale);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 0);
    assert.equal(await financialState(x), beforeStaleSubmit);
    await shot('stale-denied');
    await dialog.getByRole('button', { name: a.review, exact: true }).click();
    await expect(dialog).toContainText(a.returnsTitle);
    let dropped = false, droppedResponseStatus = null, droppedFetchError = null;
    await page.route('**/*', async route => {
      const request = route.request(), body = request.postData() || '';
      if (!dropped && request.method() === 'POST' && request.headers()['next-action'] && body.includes(receipt.id) && body.includes('idempotencyKey')) {
        dropped = true;
        try { droppedResponseStatus = (await route.fetch()).status(); } // Commit the owned request, then lose only its response.
        catch (error) { droppedFetchError = f.safe(error, secrets); }
        await route.abort('failed');
      } else await route.fallback();
    });
    const confirmAt = Date.now(); await dialog.getByRole('button', { name: a.confirm, exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(a.unknown); assert.equal(dropped, true);
    assert.equal(droppedFetchError, null); assert.equal(droppedResponseStatus, 200);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 1);
    const storedKey = 'stoquify:receipt-ledger-recovery:' + JSON.stringify([x.organizationId, x.actorId, x.purchaseOrderId, receipt.id]);
    const retained = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || 'null'), storedKey); assert.ok(retained?.idempotencyKey);
    const afterCommitted = await financialState(x); await shot('response-lost-request-retained');
    await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('tab', { name: t.history, exact: true }).click();
    await page.getByRole('button', { name: a.retry, exact: true }).click();
    await expect(dialog).toContainText(retained.idempotencyKey);
    await dialog.getByRole('button', { name: a.retry, exact: true }).click();
    await expect(dialog.getByRole('heading', { name: a.recorded, exact: true })).toBeVisible();
    await expect(dialog).toContainText(a.returnsRecorded); await expect(dialog).toContainText(a.posted); await expect(dialog).toContainText(a.noJournalRequired);
    assert.equal(await financialState(x), afterCommitted); result.lostResponseExactRetry = true;
    result.confirmMs = Date.now() - confirmAt; result.routeThroughRecoveryMs = Date.now() - start;
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 1);
    const receiptJournal = await db.journalEntry.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceType: 'GOODS_RECEIPT', sourceId: receipt.id } });
    assert.equal(receiptJournal.entryDate.toISOString(), receipt.inventoryPostedAt.toISOString());
    assert.equal(receiptJournal.currency, x.currency);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId, sourceType: 'PURCHASE_RETURN' } }), 0);
    const recoveryEvents = await db.businessEvent.findMany({ where: { organizationId: x.organizationId, sourceId: receipt.id, eventType: 'purchase.goods_receipt.ledger_recovery_recorded' } });
    assert.equal(recoveryEvents.length, 1); assert.equal(recoveryEvents[0].status, 'APPLIED');
    const decision = recoveryEvents[0].payload.result;
    assert.equal(decision.requestReference, retained.idempotencyKey); assert.equal(decision.journalEntryId, receiptJournal.id);
    assert.equal(decision.returnOutcomes.length, 1);
    assert.deepEqual(decision.returnOutcomes[0], { returnId: returned.purchaseReturn.id, effectiveAt: returned.purchaseReturn.occurredAt.toISOString(), sourceHash: decision.returnOutcomes[0].sourceHash, ledgerStatus: 'NOT_REQUIRED', postingBatchId: null, journalEntryId: null, accountingSourceLinkId: null });
    assert.match(decision.returnOutcomes[0].sourceHash, /^[a-f0-9]{64}$/);
    assert.equal(await db.inventoryTransaction.count({ where: { organizationId: x.organizationId } }), 2);
    assert.equal(f.hash(await db.purchaseReturn.findUniqueOrThrow({ where: { id: returned.purchaseReturn.id }, include: { lines: true } })), immutableReturn);
    assert.equal(await db.payment.count({ where: { organizationId: x.organizationId } }), 0);
    result.savedLayout = await layout(); await shot('receipt-journal-zero-return-verified');
    await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
    await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('tab', { name: t.history, exact: true }).click();
    await expect(page.getByRole('region', { name: t.history, exact: true })).toContainText(t.accounting.posted);
    await shot('history-posted');
    assert.deepEqual(result.pageErrors, []);
    result.stages.push('Actual EN/FR accounting review, missing-rule guidance, password verification, stale rejection, atomic receipt recovery and retained zero-value return verification, lost-response exact retry after reload and refreshed posted history; stock and immutable return preserved');
    Object.assign(result, { organizationId: x.organizationId, receiptId: receipt.id, returnId: returned.purchaseReturn.id, receiptJournalId: receiptJournal.id, returnAccountingStatus: decision.returnOutcomes[0].ledgerStatus, passed: true });
  } catch (error) { result.error = f.safe(error, secrets); if (page && !page.isClosed()) await shot('failure').catch(() => {}); }
  finally { await context?.close(); }
  return result;
}
async function main() {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.originalBefore = await stable();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [locale, width] of [['en', 1440], ['fr', 320]]) {
      const result = await recoveryJourney(browser, locale, width); report.journeys.push(result);
      console.log(JSON.stringify({ locale, width, kind: result.kind, passed: result.passed, error: result.error }));
    }
  } finally { await browser.close(); }
}
if (require.main === module && process.argv[2] !== '--run') console.log('Prepared only. Pass --run after the coordinated source freeze.');
if (require.main === module && process.argv[2] === '--run') main().catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  try {
    report.originalUnchanged = report.originalBefore === await stable();
    report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
    report.fixtureOrganizations = h.organizations;
    report.passed = !report.error && report.originalUnchanged && report.sourceStable && report.journeys.length === 2 && report.journeys.every(journey => journey.passed);
  } catch (error) { report.finalizationError = f.safe(error, secrets); report.passed = false; }
  const file = 'fractional-receipt-browser-' + run + '.json';
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, passed: report.passed, journeys: report.journeys.map(({ locale, width, kind, passed, error, screenshots }) => ({ locale, width, kind, passed, error, screenshots })), error: report.error, originalUnchanged: report.originalUnchanged, sourceStable: report.sourceStable }));
  await db.$disconnect(); process.exitCode = report.passed ? 0 : 1;
});
