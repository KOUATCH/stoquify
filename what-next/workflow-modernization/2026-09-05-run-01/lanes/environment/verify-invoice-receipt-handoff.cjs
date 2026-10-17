// Owned local integration evidence only. Never run against a customer database.
const f = require('./supplier-ack-fixtures.cjs');
const { db, fs, path, crypto, assert } = f;
const { Prisma } = require('@prisma/client');
const fromRoot = file => require(path.join(f.root, file));
const receiving = fromRoot('services/purchase-order/purchase-receiving-workbench.service.ts');
const preparation = fromRoot('services/purchasing/invoice-preparation.service.ts');
const approval = fromRoot('services/purchasing/invoice-approval.service.ts');
const recovery = fromRoot('services/purchasing/invoice-ledger-recovery.service.ts');
const ap = fromRoot('services/purchasing/ap-control.service.ts');
const periods = fromRoot('services/accounting/periods.service.ts');
const rules = fromRoot('services/accounting/posting-rules.service.ts');
const { DEFAULT_AP_POSTING_RULES } = fromRoot('services/accounting/default-posting-rules.ts');
const run = crypto.randomUUID(), organizations = [];
const sourceFiles = [
  'services/purchasing/ap-control.service.ts',
  'services/purchasing/invoice-approval.service.ts',
  'services/purchasing/invoice-ledger-recovery.service.ts',
  'services/purchasing/invoice-preparation.service.ts',
  'services/accounting/default-posting-rules.ts',
  'services/purchase-order/purchase-receiving-workbench.service.ts',
  'services/purchase-order/purchase-receipt-accounting-evidence.ts',
  'services/inventory/inventory-stock-event.service.ts',
  'prisma/schema.prisma',
  'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-invoice-receipt-handoff.cjs',
];
// Include newly introduced receipt-consumer source without guessing its final name.
for (const name of fs.readdirSync(path.join(f.root, 'services/purchasing'))) {
  if (/receipt.*\.ts$/.test(name)) sourceFiles.push('services/purchasing/' + name);
}
const sources = () => Object.fromEntries([...new Set(sourceFiles)].sort().map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = {
  run, at: new Date().toISOString(), sourcesBefore: sources(), checks: [],
  scope: 'Owned localhost PostgreSQL; actual reviewed receiving, invoice preparation, independent approval and ledger recovery. Receipt recognition is a canonical-kernel verification fixture, not an operational goods-receipt producer. Synthetic accounting setup and fixture sessions are not professional approval or certification. No real payments, messages or migration.',
  productionReceiptProducerImplemented: false,
};
const tables = ['goodsReceipt', 'goodsReceiptLine', 'supplierInvoice', 'supplierInvoiceLine', 'threeWayMatch', 'supplierLedgerEntry', 'payment', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'businessEvent', 'businessEventAudit', 'businessEventOutbox', 'inventoryTransaction', 'ledgerAuditEvent', 'auditLog', 'supplier', 'postingRule', 'postingRuleLine', 'chartOfAccount', 'journal', 'role'];
async function stable() {
  const scope = { organizationId: { notIn: organizations } };
  return f.hash(await Promise.all(tables.map(model => db[model].findMany({ where: model === 'goodsReceiptLine' ? { goodsReceipt: scope } : scope, orderBy: { id: 'asc' } }))));
}
async function effects(x) {
  const where = { organizationId: x.organizationId };
  return f.hash(await Promise.all(['journalEntry', 'journalEntryLine', 'supplierLedgerEntry', 'supplierInvoice', 'ledgerPostingBatch', 'accountingSourceLink', 'inventoryTransaction', 'payment'].map(model => db[model].findMany({ where, orderBy: { id: 'asc' } }))));
}
async function installInvoiceRule(x, legacy = false) {
  const template = DEFAULT_AP_POSTING_RULES.find(rule => rule.sourceType === 'SUPPLIER_INVOICE' && rule.postingPurpose === 'SUPPLIER_INVOICE');
  assert.ok(template, 'The registered supplier-invoice default must exist');
  const rule = await rules.createPostingRule(x.organizationId, legacy ? {
    code: 'OWNED-LEGACY-INVOICE', nameEn: 'Owned historical inventory-debit invoice recipe', sourceType: 'SUPPLIER_INVOICE', postingPurpose: 'SUPPLIER_INVOICE', priority: 1,
    lines: [
      { lineNumber: 1, mappingKey: 'INVENTORY', side: 'DEBIT', amountSource: 'NET_AMOUNT' },
      { lineNumber: 2, mappingKey: 'INPUT_VAT', side: 'DEBIT', amountSource: 'TAX_AMOUNT' },
      { lineNumber: 3, mappingKey: 'ACCOUNTS_PAYABLE', side: 'CREDIT', amountSource: 'GROSS_AMOUNT' },
    ],
  } : template, x.actorId);
  return rule.id;
}
async function fixture(name, options = {}) {
  const x = await f.fixture(options.locale || 'en', 'receipt-handoff-' + run + '-' + name, { skipInvite: true });
  organizations.push(x.organizationId);
  await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read', 'purchases.orders.receive', 'purchasing.ap.invoice.post'] } });
  const session = await db.session.findUniqueOrThrow({ where: { id: x.sessionId } });
  x.makerScope = { organizationId: x.organizationId, actorId: x.actorId, sessionId: session.id, sessionToken: session.token };
  await periods.createFiscalYearWithPeriods(x.organizationId, { name: 'Owned handoff 2026', startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-12-31T23:59:59.999Z') }, x.actorId);
  const checker = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned independent invoice checker', email: crypto.randomUUID() + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
  const checkerRole = await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_CHECKER', nameEn: 'Owned invoice checker', permissions: ['purchasing.ap.invoice.post'], users: { connect: { id: checker.id } } } });
  const checkerSession = await db.session.create({ data: { userId: checker.id, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 3600000), assuranceOrganizationId: x.organizationId, assuranceVerifiedAt: new Date(), assuranceLevel: 1, assuranceMethod: 'password' } });
  x.scope = { organizationId: x.organizationId, actorId: checker.id, sessionId: checkerSession.id, sessionToken: checkerSession.token };
  x.checkerId = checker.id;
  x.checkerRoleId = checkerRole.id;
  x.supplierId = (await db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId } })).supplierId;
  for (const [mappingKey, code, type, normalBalance] of [
    ['INVENTORY', '310', 'ASSET', 'DEBIT'], ['GRNI', '408', 'LIABILITY', 'CREDIT'],
    ['ACCOUNTS_PAYABLE', '401', 'LIABILITY', 'CREDIT'], ['INPUT_VAT', '445', 'ASSET', 'DEBIT'],
    ['INVENTORY_VARIANCE', '603', 'EXPENSE', 'DEBIT'],
  ]) await db.chartOfAccount.create({ data: { organizationId: x.organizationId, mappingKey, code, type, normalBalance, nameEn: 'Owned synthetic ' + mappingKey, syscohadaClass: code[0], syscohadaReference: 'Synthetic fixture; not professional approval' } });
  for (const [code, type] of [['OWNED-GR', 'INVENTORY'], ['OWNED-AP', 'PURCHASE']]) await db.journal.create({ data: { organizationId: x.organizationId, code, nameEn: 'Owned handoff ' + type, type, isDefault: true, isActive: true } });
  await rules.createPostingRule(x.organizationId, {
    code: 'OWNED-RECEIPT-ACCRUAL', nameEn: 'Owned canonical-kernel receipt recognition fixture', sourceType: 'GOODS_RECEIPT', postingPurpose: 'GOODS_RECEIPT',
    lines: [{ lineNumber: 1, mappingKey: 'INVENTORY', side: 'DEBIT', amountSource: 'SOURCE_AMOUNT' }, { lineNumber: 2, mappingKey: 'GRNI', side: 'CREDIT', amountSource: 'SOURCE_AMOUNT' }],
  }, x.actorId);
  x.invoiceRuleId = await installInvoiceRule(x, options.legacyRule);
  return x;
}
async function receive(x, quantity) {
  const draft = { kind: 'receive', orderId: x.purchaseOrderId, inspectionOutcome: 'PASSED', inspectionReason: 'Owned handoff receipt', items: [{ lineId: x.lineId, receivedQuantity: quantity }] };
  const preview = await receiving.previewPurchaseReceiving(draft, x.makerScope);
  const result = await receiving.confirmPurchaseReceiving({ draft: preview.draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
  assert.equal(result.stockStatus, 'recorded');
  assert.equal(result.accountingStatus, 'review_required', 'The operational receipt producer remains explicitly unimplemented');
  const receipt = await db.goodsReceipt.findUniqueOrThrow({ where: { id: result.goodsReceiptId }, include: { lines: true } });
  assert.equal(receipt.lines.length, 1);
  return receipt;
}
async function recognizeReceipt(x, receipt) {
  const batch = await db.ledgerPostingBatch.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceType: 'GOODS_RECEIPT', sourceId: receipt.id, postingPurpose: 'GOODS_RECEIPT' } });
  const amount = receipt.lines.reduce((sum, line) => sum.plus(line.receivedQuantity.times(line.unitCost).toDecimalPlaces(2)), new Prisma.Decimal(0));
  const input = {
    organizationId: x.organizationId, periodId: batch.periodId, sourceType: 'GOODS_RECEIPT', sourceId: receipt.id,
    sourceNumber: receipt.receiptNumber, sourceDate: receipt.receiptDate, postingPurpose: 'GOODS_RECEIPT',
    journalType: 'INVENTORY', journalPrefix: 'APINV', actorId: x.actorId, supplierId: x.supplierId, currency: 'XAF',
    memo: 'Owned receipt-kernel fixture; production receipt producer remains unimplemented', documentHash: batch.metadata.documentHash,
    amounts: { sourceAmount: amount, netAmount: amount, grossAmount: amount, taxAmount: new Prisma.Decimal(0) },
    blockerCode: 'OWNED_RECEIPT_FIXTURE', blockerMessage: 'Owned receipt setup unavailable',
  };
  const posted = await db.$transaction(tx => ap.createAPLedgerPosting(tx, input));
  assert.equal(posted.ledgerStatus, 'POSTED');
  assert.equal((await db.$transaction(tx => ap.createAPLedgerPosting(tx, input))).journalEntryId, posted.journalEntryId);
  const view = await receiving.getPurchaseReceivingWorkbench(x.purchaseOrderId, x.makerScope);
  assert.equal(view.receipts.find(row => row.id === receipt.id).accountingStatus, 'posted');
  return posted;
}
async function prepare(x, name, allocations) {
  const draft = {
    supplierId: x.supplierId, invoiceNumber: 'OWNED-' + name, invoiceDate: new Date().toISOString().slice(0, 10), currency: 'XAF',
    documentReference: 'https://example.invalid/owned/receipt-handoff/' + run + '/' + name,
    documentSha256: crypto.createHash('sha256').update(run + ':' + name).digest('hex'),
    lines: allocations.map(([receipt, quantity]) => ({ goodsReceiptLineId: receipt.lines[0].id, description: 'Owned received goods', quantity: String(quantity), unitCost: '2500.00', taxRate: '0' })),
  };
  const preview = await preparation.previewInvoicePreparation(draft, x.makerScope);
  const prepared = await preparation.confirmInvoicePreparation({ draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
  assert.equal(prepared.preparationStatus, 'MATCHED');
  return prepared.invoiceId;
}
async function approveCommand(x, invoiceId) {
  const preview = await approval.previewInvoiceApproval({ invoiceId }, x.scope);
  assert.deepEqual(preview.blockers, []);
  return { invoiceId, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
}
async function approve(x, invoiceId) {
  return approval.confirmInvoiceApproval(await approveCommand(x, invoiceId), x.scope);
}
async function balances(x) {
  const rows = await db.journalEntryLine.findMany({ where: { organizationId: x.organizationId, journalEntry: { status: 'POSTED', reversedAt: null } }, include: { account: { select: { mappingKey: true } } } });
  const totals = {};
  for (const row of rows) {
    const key = row.account.mappingKey;
    totals[key] = (totals[key] || new Prisma.Decimal(0)).plus(row.debit).minus(row.credit);
  }
  return Object.fromEntries(['INVENTORY', 'GRNI', 'ACCOUNTS_PAYABLE', 'INPUT_VAT', 'INVENTORY_VARIANCE'].map(key => [key, (totals[key] || new Prisma.Decimal(0)).toFixed(2)]));
}
async function expectBalances(x, inventory, grni, payable) {
  assert.deepEqual(await balances(x), { INVENTORY: inventory, GRNI: grni, ACCOUNTS_PAYABLE: payable, INPUT_VAT: '0.00', INVENTORY_VARIANCE: '0.00' });
}
async function check(name, work) {
  const start = Date.now();
  try { report.checks.push({ name, status: 'passed', ...await work(), elapsedMs: Date.now() - start }); }
  catch (error) { report.checks.push({ name, status: 'failed', error: f.safe(error), elapsedMs: Date.now() - start }); process.exitCode = 1; }
}
async function main() {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.originalBefore = await stable();
  await check('Recognized receipt is cleared by partial invoices 6 + 4 without recognizing inventory again', async () => {
    const x = await fixture('partial'), receipt = await receive(x, 10);
    await recognizeReceipt(x, receipt);
    await expectBalances(x, '25000.00', '-25000.00', '0.00');
    const firstId = await prepare(x, 'PARTIAL-SIX', [[receipt, 6]]), firstCommand = await approveCommand(x, firstId);
    const first = await approval.confirmInvoiceApproval(firstCommand, x.scope);
    assert.equal(first.ledgerStatus, 'POSTED');
    await expectBalances(x, '25000.00', '-10000.00', '-15000.00');
    const beforeReplay = await effects(x);
    assert.equal((await approval.confirmInvoiceApproval(firstCommand, x.scope)).replayed, true);
    assert.equal(await effects(x), beforeReplay);
    const second = await approve(x, await prepare(x, 'PARTIAL-FOUR', [[receipt, 4]]));
    assert.equal(second.ledgerStatus, 'POSTED');
    await expectBalances(x, '25000.00', '0.00', '-25000.00');
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 3);
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 2);
    assert.equal(await db.inventoryTransaction.count({ where: { organizationId: x.organizationId } }), 1);
    assert.equal((await db.supplier.findUniqueOrThrow({ where: { id: x.supplierId } })).currentBalance.toFixed(2), '25000.00');
    return { organizationId: x.organizationId, invoiceIds: [firstId, second.invoiceId], journalCount: 3, stockMovementCount: 1, balances: await balances(x) };
  });
  await check('Legacy unposted receipt retains invoice-based inventory recognition', async () => {
    const x = await fixture('legacy'), receipt = await receive(x, 10);
    const result = await approve(x, await prepare(x, 'LEGACY-SIX', [[receipt, 6]]));
    assert.equal(result.ledgerStatus, 'POSTED');
    await expectBalances(x, '15000.00', '0.00', '-15000.00');
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 1);
    return { organizationId: x.organizationId, balances: await balances(x) };
  });
  await check('One invoice can combine recognized and legacy receipt lines without double counting', async () => {
    const x = await fixture('mixed'), recognized = await receive(x, 5), legacy = await receive(x, 5);
    await recognizeReceipt(x, recognized);
    const result = await approve(x, await prepare(x, 'MIXED', [[recognized, 2], [legacy, 2]]));
    assert.equal(result.ledgerStatus, 'POSTED');
    await expectBalances(x, '17500.00', '-7500.00', '-10000.00');
    assert.equal(await db.inventoryTransaction.count({ where: { organizationId: x.organizationId } }), 2);
    return { organizationId: x.organizationId, balances: await balances(x) };
  });
  await check('Historical inventory-debit rule blocks accrued invoice, then reviewed recovery clears GRNI once', async () => {
    const x = await fixture('legacy-rule', { legacyRule: true }), receipt = await receive(x, 10);
    await recognizeReceipt(x, receipt);
    const invoiceId = await prepare(x, 'RULE-RECOVERY', [[receipt, 6]]), result = await approve(x, invoiceId);
    assert.equal(result.ledgerStatus, 'BLOCKED_PENDING_RULES');
    assert.equal(result.blockerCode, 'AP_RECEIPT_RECOGNITION_RULE_REVIEW');
    await expectBalances(x, '25000.00', '-25000.00', '0.00');
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 1);
    const immutableApproval = f.hash(await db.businessEvent.findUniqueOrThrow({ where: { id: result.approvalEventId } }));
    await db.postingRule.update({ where: { id: x.invoiceRuleId }, data: { isActive: false } });
    await installInvoiceRule(x);
    const preview = await recovery.previewInvoiceLedgerRecovery({ invoiceId }, x.scope);
    assert.deepEqual(preview.blockers, []);
    const command = { invoiceId, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
    const recovered = await recovery.confirmInvoiceLedgerRecovery(command, x.scope);
    assert.equal(recovered.ledgerStatus, 'POSTED');
    assert.equal((await recovery.confirmInvoiceLedgerRecovery(command, x.scope)).replayed, true);
    assert.equal(f.hash(await db.businessEvent.findUniqueOrThrow({ where: { id: result.approvalEventId } })), immutableApproval);
    await expectBalances(x, '25000.00', '-10000.00', '-15000.00');
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId } }), 2);
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 1);
    return { organizationId: x.organizationId, invoiceId, balances: await balances(x), approvalPreserved: true };
  });
  await check('Concurrent exact reviewed approvals converge to one invoice journal and liability', async () => {
    const x = await fixture('concurrent'), receipt = await receive(x, 10);
    await recognizeReceipt(x, receipt);
    const invoiceId = await prepare(x, 'CONCURRENT', [[receipt, 6]]), command = await approveCommand(x, invoiceId);
    const results = await Promise.all([approval.confirmInvoiceApproval(command, x.scope), approval.confirmInvoiceApproval(command, x.scope)]);
    assert.equal(results[0].ledgerStatus, 'POSTED');
    assert.equal(results[0].journalEntryId, results[1].journalEntryId);
    assert.equal(results.filter(result => result.replayed).length, 1);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId, sourceType: 'SUPPLIER_INVOICE' } }), 1);
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 1);
    await expectBalances(x, '25000.00', '-10000.00', '-15000.00');
    return { organizationId: x.organizationId, invoiceId, exactRetryConverged: true };
  });
  await check('Changed receipt journal after review cannot authorize a payable or another inventory debit', async () => {
    const x = await fixture('corrupt'), receipt = await receive(x, 10), posted = await recognizeReceipt(x, receipt);
    const invoiceId = await prepare(x, 'CORRUPT-RECEIPT', [[receipt, 6]]), command = await approveCommand(x, invoiceId);
    const credit = await db.journalEntryLine.findFirstOrThrow({ where: { organizationId: x.organizationId, journalEntryId: posted.journalEntryId, credit: { gt: 0 } } });
    // Deliberately corrupt only this new synthetic record to challenge source verification.
    await db.journalEntryLine.update({ where: { id: credit.id }, data: { credit: credit.credit.minus(1) } });
    const before = await effects(x);
    await assert.rejects(approval.confirmInvoiceApproval(command, x.scope));
    assert.equal(await effects(x), before);
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 0);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.organizationId, sourceType: 'SUPPLIER_INVOICE' } }), 0);
    return { organizationId: x.organizationId, invoiceId, noInvoiceAccountingEffects: true };
  });
  for (const organizationId of organizations) assert.equal(await db.payment.count({ where: { organizationId } }), 0);
  report.noPaymentsCreated = true;
}
if (require.main === module) main().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  try {
    report.originalUnchanged = report.originalBefore === await stable();
    report.sourcesAfter = sources();
    report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
    report.fixtureOrganizations = organizations;
    report.passed = !report.error && report.originalUnchanged && report.sourceStable && report.checks.length === 6 && report.checks.every(check => check.status === 'passed');
  } catch (error) { report.finalizationError = f.safe(error); report.passed = false; }
  const file = 'invoice-receipt-handoff-' + run + '.json';
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, ...report }));
  await db.$disconnect();
  process.exitCode = report.passed ? 0 : 1;
});

module.exports = { f, db, fixture, receive, recognizeReceipt, prepare, installInvoiceRule, approveCommand, balances, expectBalances, effects, stable, sources, organizations };
