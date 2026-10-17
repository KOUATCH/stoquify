// Owned local browser evidence for net receipt capacity after a real return.
// Uses actual receipt/return posting and compares those financial effects before and after invoice preparation/correction. No invoice approval/payment.
const h = require('./verify-operational-receipt-recognition.cjs');
const { f, db } = h, { fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { postPurchaseReturn } = require(path.join(f.root, 'services/purchasing/purchase-return-credit.service.ts'));
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
  'components/purchasing/InvoicePreparationWorkbench.tsx',
  'components/purchasing/InvoiceCorrectionWorkbench.tsx',
  'actions/purchasing/invoice-preparation.actions.ts',
  'actions/purchasing/invoice-correction.actions.ts',
  'app/[locale]/(dashboard)/dashboard/purchases/payables/prepare/page.tsx',
  'app/[locale]/(dashboard)/dashboard/purchases/payables/correct/page.tsx',
  'messages/en.json', 'messages/fr.json',
  'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-operational-receipt-browser.cjs',
];
const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')])) });
const report = {
  run, at: new Date().toISOString(), sourcesBefore: sources(), journeys: [],
  scope: 'Owned localhost PostgreSQL and actual localhost:3110 application. Actual reviewed receiving and purchase-return domain effects; normal credential sign-in. New preparation and correction after returns, EN desktop and FR narrow mobile, keyboard/dialog/focus/overflow and actual persisted invoice quantities. Actual receipt and return journals; no fabricated recognition, invoice approval, supplier liability, payment, external message, migration or certification.',
  productionReceiptProducerImplemented: true,
};
async function stable() {
  return f.hash({ shared: await h.stable(), returns: await db.purchaseReturn.findMany({ where: { organizationId: { notIn: h.organizations } }, include: { lines: true }, orderBy: { id: 'asc' } }) });
}
async function returnThree(x, receipt) {
  const result = await postPurchaseReturn({
    organizationId: x.organizationId, purchaseOrderId: x.purchaseOrderId, goodsReceiptId: receipt.id,
    postedById: x.actorId, idempotencyKey: crypto.randomUUID(),
    reason: 'Owned capacity verification: three cartons returned before invoice approval',
    lines: [{ sourceGoodsReceiptLineId: receipt.lines[0].id, quantity: '3' }],
  }, db);
  assert.equal(result.purchaseReturn.lines.length, 1);
  assert.equal(result.purchaseReturn.lines[0].uninvoicedQuantity.toString(), '3');
  assert.equal(result.purchaseReturn.lines[0].invoicedQuantity.toString(), '0');
  assert.ok(result.purchaseReturn.journalEntryId, 'Return accounting comes from the actual source-bound producer');
  const movements = await db.inventoryTransaction.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } });
  assert.equal(movements.length, 2, 'One real receipt movement and one real return movement');
  assert.equal(movements.reduce((sum, row) => sum + Number(row.quantity), 0), 7);
  return result.purchaseReturn;
}
async function financialState(x) {
  const where={organizationId:x.organizationId};
  return f.hash(await Promise.all(['journalEntry','journalEntryLine','accountingSourceLink','supplierLedgerEntry','payment','supplierPayment'].map(model=>db[model].findMany({where,orderBy:{id:'asc'}}))));
}
async function noFinancialEffects(x) {
  assert.equal(await financialState(x),x.financialBefore,'Invoice preparation/correction does not change actual receipt/return accounting');
  for(const model of ['supplierLedgerEntry','payment','supplierPayment']) assert.equal(await db[model].count({where:{organizationId:x.organizationId}}),0);
  assert.equal((await db.supplier.findUniqueOrThrow({where:{id:x.supplierId}})).currentBalance.toString(),'0');
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
async function journey(browser, locale, width, kind) {
  const result = { locale, width, kind, stages: [], screenshots: [], pageErrors: [], passed: false };
  let context, page;
  const shot = async stage => {
    const file = 'operational-receipt-browser-' + run + '-' + locale + width + '-' + kind + '-' + stage + '.png';
    await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' });
    result.screenshots.push({ stage, file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex') });
  };
  const layout = async () => {
    const observed = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      dialogs:[...document.querySelectorAll('[role="dialog"]')].filter(node=>node.getBoundingClientRect().width>0).map(node=>({width:node.clientWidth,scrollWidth:node.scrollWidth})) }));
    for(const dialog of observed.dialogs) assert.ok(dialog.scrollWidth<=dialog.width+1,'Long references stay within the actual dialog');
    assert.ok(observed.documentWidth <= observed.viewport + 1, 'No document overflow at the actual viewport');
    return observed;
  };
  try {
    const x = await h.fixture('browser-' + locale + '-' + kind, { locale });
    const {receipt} = await h.receive(x, 10);
    const invoiceId = kind === 'correction' ? (await h.prepare(x, receipt, 8, 'CAPACITY-CORRECTION-' + run + '-' + locale)).invoiceId : null;
    const originalPreparation = invoiceId ? await db.businessEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceId: invoiceId, eventType: 'purchase.supplier_invoice.prepared' } }) : null;
    const originalPreparationHash = originalPreparation && f.hash(originalPreparation);
    const returned = await returnThree(x, receipt);
    const returnHash = f.hash(returned);
    x.financialBefore = await financialState(x);
    await noFinancialEffects(x);
    const messages = JSON.parse(fs.readFileSync(path.join(f.root, 'messages', locale + '.json'), 'utf8'));
    const p = messages.invoicePreparation, c = messages.invoiceCorrection, t = kind === 'correction' ? c : p;
    const signed = await signedContext(browser, x, locale, width); context = signed.context; page = signed.page;
    page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
    const start = Date.now();
    await page.goto(base + '/' + locale + '/dashboard/purchases/payables/' + (kind === 'correction' ? 'correct' : 'prepare'), { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: t.title, exact: true })).toBeVisible();
    if (kind === 'correction') {
      await expect(page.getByRole('radio')).toHaveCount(1);
      await page.getByRole('radio').focus(); await page.keyboard.press('Space');
      await expect(page.getByRole('radio')).toBeChecked();
      await expect(page.getByLabel(p.quantity, { exact: true })).toHaveValue('8');
      await page.getByLabel(c.reason, { exact: true }).fill(locale === 'fr' ? 'Réduire la facture après le retour des trois cartons.' : 'Reduce the invoice after returning the three cartons.');
    } else {
      await page.getByLabel(p.supplier, { exact: true }).selectOption(x.supplierId);
      await expect(page.getByRole('checkbox')).toHaveCount(1);
      await page.getByLabel(p.number, { exact: true }).fill('CAPACITY-BROWSER-' + run + '-' + locale);
      await page.getByLabel(p.date, { exact: true }).fill(new Date().toISOString().slice(0, 10));
      await page.getByLabel(p.reference, { exact: true }).fill('https://example.invalid/owned/capacity/' + run + '/' + locale);
      await page.getByLabel(p.file, { exact: true }).setInputFiles({ name: 'owned-capacity-invoice.txt', mimeType: 'text/plain', buffer: Buffer.from('Owned capacity invoice ' + run + ' ' + locale) });
      await expect(page.getByRole('checkbox')).toBeEnabled();
      await page.getByRole('checkbox').focus();
      await expect(page.getByRole('checkbox')).toBeFocused();
      await page.keyboard.press('Space');
      await expect(page.getByRole('checkbox')).toBeChecked();
      await page.getByLabel(p.quantity, { exact: true }).fill('8');
    }
    const receiptLabel = page.locator('label').filter({ has: page.getByRole('checkbox') });
    await expect(receiptLabel).toContainText(p.available + ': 7');
    await receiptLabel.scrollIntoViewIfNeeded();
    result.routeAndDraftMs = Date.now() - start;
    result.sourceLayout = await layout();
    await shot('available-seven');
    const review = page.getByRole('button', { name: t.review, exact: true });
    await expect(review).toBeEnabled(); await review.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('alert').filter({ hasText: t.unavailable })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByLabel(p.quantity, { exact: true })).toHaveValue('8');
    assert.equal(await db.supplierInvoice.count({ where: { organizationId: x.organizationId } }), kind === 'correction' ? 1 : 0);
    await noFinancialEffects(x);
    await shot('eight-denied-draft-retained');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByLabel(p.quantity, { exact: true })).toHaveValue('8');
    await expect(page.locator('label').filter({ has: page.getByRole('checkbox') })).toContainText(p.available + ': 7');
    result.stages.push('Real return reduces displayed capacity to seven; eight is denied without invoice effects and the draft survives reload');
    await page.getByLabel(p.quantity, { exact: true }).fill('7');
    await review.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible(); await expect(dialog).toContainText('17500.00');
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); assert.ok(await dialog.evaluate(element => element.contains(document.activeElement)), 'Review focus remains in the dialog'); }
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(review).toBeFocused();
    await page.keyboard.press('Enter'); await expect(dialog).toContainText('17500.00');
    if (kind === 'correction') {
      const passwordField = dialog.getByLabel(c.password, { exact: true });
      result.actualPasswordStepUp = await passwordField.isVisible();
      if (result.actualPasswordStepUp) await passwordField.fill(signed.password);
    }
    result.reviewLayout = await layout(); await shot('seven-review');
    const confirmedAt = Date.now(), confirm = dialog.getByRole('button', { name: t.confirm, exact: true });
    await expect(confirm).toBeEnabled(); await confirm.focus(); await page.keyboard.press('Enter');
    if (kind === 'correction') await expect(dialog).toContainText(c.current);
    else await expect(dialog).toContainText(p.noPosting);
    result.confirmInteractionMs = Date.now() - confirmedAt;
    const invoices = await db.supplierInvoice.findMany({ where: { organizationId: x.organizationId }, include: { lines: true } });
    assert.equal(invoices.length, 1);
    const invoice = invoices[0];
    if (invoiceId) assert.equal(invoice.id, invoiceId);
    assert.equal(invoice.status, 'MATCHED'); assert.equal(invoice.lines.length, 1);
    assert.equal(invoice.lines[0].quantity.toString(), '7'); assert.equal(invoice.lines[0].goodsReceiptLineId, receipt.lines[0].id);
    assert.equal(invoice.total.toFixed(2), '17500.00'); assert.equal(invoice.approvedById, null); assert.equal(invoice.postedAt, null);
    await noFinancialEffects(x);
    assert.equal(f.hash(await db.purchaseReturn.findUniqueOrThrow({ where: { id: returned.id }, include: { lines: true } })), returnHash);
    assert.equal(await db.inventoryTransaction.count({ where: { organizationId: x.organizationId } }), 2);
    if (originalPreparation) {
      assert.equal(f.hash(await db.businessEvent.findUniqueOrThrow({ where: { id: originalPreparation.id } })), originalPreparationHash);
      assert.equal(await db.businessEvent.count({ where: { organizationId: x.organizationId, sourceId: invoice.id, eventType: 'purchase.supplier_invoice.reprepared' } }), 1);
    }
    result.savedLayout = await layout(); await shot('seven-saved');
    result.stages.push('Keyboard review focus and return verified; seven saved through the application as one unapproved invoice, with receipt/return accounting retained and no new journal/liability/payment');
    assert.deepEqual(result.pageErrors, []);
    Object.assign(result, { organizationId: x.organizationId, receiptId: receipt.id, returnId: returned.id, invoiceId: invoice.id, persistedQuantity: invoice.lines[0].quantity.toString(), invoiceStatus: invoice.status, noInvoiceApprovalOrFinancialEffects: true, passed: true });
  } catch (error) {
    result.error = f.safe(error, secrets);
    if (page && !page.isClosed()) await shot('failure').catch(() => {});
  } finally { await context?.close(); }
  return result;
}
async function recoveryJourney(browser, locale, width) {
  const result = { locale, width, kind: 'receipt-return-recovery', stages: [], screenshots: [], pageErrors: [], passed: false };
  let context, page;
  const shot = async stage => {
    const file = 'operational-receipt-browser-' + run + '-' + locale + width + '-recovery-' + stage + '.png';
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
    const x = await h.fixture('browser-recovery-' + locale, { locale });
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: false } });
    const { receipt } = await h.receive(x, 10, 'review_required'), returned = await h.returnGoods(x, receipt, 3);
    assert.equal(returned.purchaseReturn.journalEntryId, null);
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
    await expect(dialog).toContainText(a.returnsTitle); await expect(dialog).toContainText(returned.purchaseReturn.id);
    const password = dialog.getByLabel(a.password, { exact: true });
    result.actualPasswordStepUp = await password.isVisible(); assert.equal(result.actualPasswordStepUp, true);
    await password.fill(signed.password);
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); assert.ok(await dialog.evaluate(node => node.contains(document.activeElement))); }
    result.reviewLayout = await layout(); await shot('original-dates-review');
    // Mutate only the owned rule after preview to prove a stale financial review
    // cannot post. No original customer or shared configuration is changed.
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { priority: x.receiptRule.priority + 1 } });
    await dialog.getByRole('button', { name: a.confirm, exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(a.stale);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 0);
    await shot('stale-denied');
    await dialog.getByRole('button', { name: a.review, exact: true }).click();
    await expect(dialog).toContainText(a.returnsTitle);
    let dropped = false;
    await page.route('**/*', async route => {
      const request = route.request(), body = request.postData() || '';
      if (!dropped && request.method() === 'POST' && request.headers()['next-action'] && body.includes(receipt.id) && body.includes('idempotencyKey')) {
        dropped = true;
        await route.fetch(); // Allow the owned server transaction to commit, then lose only its response.
        await route.abort('failed');
      } else await route.fallback();
    });
    const confirmAt = Date.now(); await dialog.getByRole('button', { name: a.confirm, exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(a.unknown); assert.equal(dropped, true);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 2);
    const storedKey = 'stoquify:receipt-ledger-recovery:' + JSON.stringify([x.organizationId, x.actorId, x.purchaseOrderId, receipt.id]);
    const retained = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) || 'null'), storedKey); assert.ok(retained?.idempotencyKey);
    const afterCommitted = await financialState(x); await shot('response-lost-request-retained');
    await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('tab', { name: t.history, exact: true }).click();
    await page.getByRole('button', { name: a.retry, exact: true }).click();
    await expect(dialog).toContainText(retained.idempotencyKey);
    await dialog.getByRole('button', { name: a.retry, exact: true }).click();
    await expect(dialog.getByRole('heading', { name: a.recorded, exact: true })).toBeVisible();
    await expect(dialog).toContainText(a.returnsRecorded); await expect(dialog).toContainText(a.posted);
    assert.equal(await financialState(x), afterCommitted); result.lostResponseExactRetry = true;
    result.confirmMs = Date.now() - confirmAt; result.routeThroughRecoveryMs = Date.now() - start;
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 2);
    assert.equal(await db.inventoryTransaction.count({ where: { organizationId: x.organizationId } }), 2);
    assert.equal(f.hash(await db.purchaseReturn.findUniqueOrThrow({ where: { id: returned.purchaseReturn.id }, include: { lines: true } })), immutableReturn);
    assert.equal(await db.payment.count({ where: { organizationId: x.organizationId } }), 0);
    result.savedLayout = await layout(); await shot('both-journals-recorded');
    await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
    await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('tab', { name: t.history, exact: true }).click();
    await expect(page.getByRole('region', { name: t.history, exact: true })).toContainText(t.accounting.posted);
    await shot('history-posted');
    assert.deepEqual(result.pageErrors, []);
    result.stages.push('Actual EN/FR accounting review, missing-rule guidance, password verification, stale rejection, atomic receipt+return recovery, lost-response exact retry after reload and refreshed posted history; stock and immutable return preserved');
    Object.assign(result, { organizationId: x.organizationId, receiptId: receipt.id, returnId: returned.purchaseReturn.id, passed: true });
  } catch (error) { result.error = f.safe(error, secrets); if (page && !page.isClosed()) await shot('failure').catch(() => {}); }
  finally { await context?.close(); }
  return result;
}
async function main() {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.originalBefore = await stable();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [locale, width] of [['en', 1440], ['fr', 320]]) for (const kind of ['preparation', 'correction']) {
      const result = await journey(browser, locale, width, kind); report.journeys.push(result);
      console.log(JSON.stringify({ locale, width, kind, passed: result.passed, stages: result.stages, error: result.error }));
    }
    for (const [locale, width] of [['en', 1440], ['fr', 320]]) {
      const result = await recoveryJourney(browser, locale, width); report.journeys.push(result);
      console.log(JSON.stringify({ locale, width, kind: result.kind, passed: result.passed, error: result.error }));
    }
  } finally { await browser.close(); }
}
if (require.main === module) main().catch(error => { report.error = f.safe(error, secrets); }).finally(async () => {
  try {
    report.originalUnchanged = report.originalBefore === await stable();
    report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
    report.fixtureOrganizations = h.organizations;
    report.passed = !report.error && report.originalUnchanged && report.sourceStable && report.journeys.length === 6 && report.journeys.every(journey => journey.passed);
  } catch (error) { report.finalizationError = f.safe(error, secrets); report.passed = false; }
  const file = 'operational-receipt-browser-' + run + '.json';
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, passed: report.passed, journeys: report.journeys.map(({ locale, width, kind, passed, error, screenshots }) => ({ locale, width, kind, passed, error, screenshots })), error: report.error, originalUnchanged: report.originalUnchanged, sourceStable: report.sourceStable }));
  await db.$disconnect(); process.exitCode = report.passed ? 0 : 1;
});
