const f = require('./supplier-ack-fixtures.cjs');
const { db, fs, path, crypto, assert } = f;
const ap = require(path.join(f.root, 'services/purchasing/ap-control.service.ts'));
const receiving = require(path.join(f.root, 'services/purchase-order/purchase-receiving-workbench.service.ts'));
const run = crypto.randomUUID().slice(0, 12);
const files = ['services/purchasing/ap-control.service.ts', 'services/purchasing/ap-control.schemas.ts', 'services/purchase-order/purchase-receiving-workbench.service.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const report = { run, at: new Date().toISOString(), sourcesBefore: sources(), checks: [], scope: 'Owned local PostgreSQL; real receiving and invoice services; no approval, payment or journal posting.' };
async function fixture(name, quantity = 10) {
  const x = await f.fixture('en', 'ap-quantity-' + run + '-' + name, { skipInvite: true });
  await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read', 'purchases.orders.receive'] } });
  await require(path.join(f.root, 'services/accounting/periods.service.ts')).createFiscalYearWithPeriods(x.organizationId, { name: 'Owned AP 2026', startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-12-31T23:59:59.999Z') }, x.actorId);
  const session = await db.session.findUniqueOrThrow({ where: { id: x.sessionId } });
  const scope = { organizationId: x.organizationId, actorId: x.actorId, sessionId: session.id, sessionToken: session.token };
  const draft = { kind: 'receive', orderId: x.purchaseOrderId, inspectionOutcome: 'PASSED', items: [{ lineId: x.lineId, receivedQuantity: quantity }] };
  const preview = await receiving.previewPurchaseReceiving(draft, scope);
  const result = await receiving.confirmPurchaseReceiving({ draft: preview.draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, scope);
  const receipt = await db.goodsReceiptLine.findFirstOrThrow({ where: { goodsReceiptId: result.goodsReceiptId } });
  const order = await db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId } });
  return { ...x, receipt, supplierId: order.supplierId };
}
function input(x, name, quantities) {
  return { organizationId: x.organizationId, supplierId: x.supplierId, createdById: x.actorId, invoiceNumber: name, invoiceDate: '2026-09-08', idempotencyKey: 'ap-quantity-' + run + '-' + name,
    lines: quantities.map((quantity, i) => ({ goodsReceiptLineId: x.receipt.id, description: 'Owned split ' + i, quantity, unitCost: '2500.00' })) };
}
async function check(name, fn) {
  try { report.checks.push({ name, status: 'passed', ...await fn() }); }
  catch (e) { report.checks.push({ name, status: 'failed', message: f.safe(e) }); process.exitCode = 1; }
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned);
  const original = await f.stable();
  await check('Repeated receipt lines cannot consume 12 from 10 received', async () => {
    const x = await fixture('split');
    await assert.rejects(ap.prepareSupplierInvoice(input(x, 'SPLIT', [6, 6]), db), /exceeds received and uninvoiced/);
    assert.equal(await db.supplierInvoice.count({ where: { organizationId: x.organizationId } }), 0);
    return { noInvoice: true };
  });
  await check('Concurrent invoices without optional PO reserve quantity once', async () => {
    const x = await fixture('concurrent');
    const results = await Promise.allSettled([ap.prepareSupplierInvoice(input(x, 'ONE', [6]), db), ap.prepareSupplierInvoice(input(x, 'TWO', [6]), db)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.match(String(results.find(r => r.status === 'rejected').reason.message), /exceeds received and uninvoiced/);
    const sum = await db.supplierInvoiceLine.aggregate({ where: { organizationId: x.organizationId }, _sum: { quantity: true } });
    assert.equal(String(sum._sum.quantity), '6');
    return { totalReserved: '6', rejected: 1 };
  });
  await check('Concurrent exact retries return the same invoice', async () => {
    const x = await fixture('retry'), command = input(x, 'RETRY', [6]);
    const results = await Promise.all([ap.prepareSupplierInvoice(command, db), ap.prepareSupplierInvoice(command, db)]);
    assert.equal(results[0].supplierInvoice.id, results[1].supplierInvoice.id);
    assert.equal(await db.supplierInvoice.count({ where: { organizationId: x.organizationId } }), 1);
    return { invoiceCount: 1 };
  });
  await check('Fractional split lines reserve exactly 0.3 and cannot consume more', async () => {
    const x = await fixture('fraction', 0.3);
    const result = await ap.prepareSupplierInvoice(input(x, 'FRACTION', ['0.1', '0.2']), db);
    assert.equal(result.ledgerStatus, 'PENDING_APPROVAL');
    assert.equal(String(result.supplierInvoice.total), '750');
    await assert.rejects(ap.prepareSupplierInvoice(input(x, 'EXTRA', ['0.001']), db), /exceeds received and uninvoiced/);
    return { quantity: '0.3', total: '750', ledgerStatus: result.ledgerStatus };
  });
  report.originalUnchanged = original === await f.stable(); assert.ok(report.originalUnchanged);
  report.sourcesAfter = sources(); assert.deepEqual(report.sourcesBefore, report.sourcesAfter);
})().catch(e => { report.error = f.safe(e); process.exitCode = 1; }).finally(async () => {
  await db.$disconnect(); const file = 'ap-receipt-quantity-' + run + '.json';
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, checks: report.checks, error: report.error, originalUnchanged: report.originalUnchanged }));
});
