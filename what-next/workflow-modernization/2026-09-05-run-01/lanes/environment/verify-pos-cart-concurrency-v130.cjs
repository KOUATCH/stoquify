const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const services = require(path.join(f.root, 'services/pos/pos.service.ts')), dbExport = require(path.join(f.root, 'prisma/db.ts'));
const after = process.argv.includes('--after'), stamp = crypto.randomUUID(), source = 'services/pos/pos.service.ts';
const digest = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, source))).digest('hex');
const report = { at: new Date().toISOString(), phase: after ? 'after' : 'before', sourceBefore: digest(), checks: [], scope: 'Real cart services on owned local PostgreSQL. Synthetic fixtures and controlled read barrier; no payment, posting or external operation.' };
async function fixture(label) {
  const organizationId = 'workflow_pos_cart_' + label + '_' + stamp;
  await db.organization.create({ data: { id: organizationId, name: f.helper.prefix + 'POS cart ' + label, slug: organizationId, currency: 'XAF' } });
  const user = await db.user.create({ data: { organizationId, email: label + stamp + '@example.invalid', name: 'Owned cashier' } });
  const location = await db.location.create({ data: { organizationId, name: 'Owned store', code: 'OWNED' } });
  const terminal = await db.pOSStation.create({ data: { organizationId, locationId: location.id, name: 'Owned terminal', terminalNumber: 'OWNED' } });
  const session = await db.pOSSession.create({ data: { organizationId, locationId: location.id, terminalId: terminal.id, userId: user.id, sessionNumber: 'OWNED', openingBalance: 0, expectedBalance: 0 } });
  await db.pOSStation.update({ where: { id: terminal.id }, data: { currentSessionId: session.id } });
  const customer = await db.customer.create({ data: { organizationId, name: 'Owned customer' } });
  const item = await db.item.create({ data: { organizationId, slug: 'owned', sku: 'OWNED', nameEn: 'Owned item', sellingPrice: 100, imageUrls: [] } });
  await db.inventoryLevel.create({ data: { itemId: item.id, locationId: location.id, quantityOnHand: 10, quantityAvailable: 10 } });
  const sale = await db.salesOrder.create({ data: { organizationId, locationId: location.id, terminalId: terminal.id, sessionId: session.id, createdById: user.id, customerId: customer.id, orderNumber: 'OWNED', status: 'DRAFT', subtotal: 100, total: 100 } });
  const line = await db.salesOrderLine.create({ data: { salesOrderId: sale.id, itemId: item.id, quantity: 1, unitPrice: 100, taxRate: 0, taxAmount: 0, lineTotal: 100 } });
  return { organizationId, userId: user.id, locationId: location.id, terminalId: terminal.id, sessionId: session.id, salesOrderId: sale.id, lineId: line.id, itemId: item.id };
}
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  if (process.argv.includes('--boundaries')) {
    report.phase = 'boundaries';
    const c = await fixture('boundaries');
    for (const edit of [services.updatePOSCartLine, services.removePOSCartLine]) {
      await assert.rejects(() => edit({ ...c, organizationId: 'different-org', quantity: 2 }));
      await assert.rejects(() => edit({ ...c, userId: 'different-cashier', quantity: 2 }));
    }
    await db.inventoryLevel.update({ where: { itemId_locationId: { itemId: c.itemId, locationId: c.locationId } }, data: { quantityAvailable: 0, quantityReserved: 10 } });
    await assert.rejects(() => services.updatePOSCartLine({ ...c, quantity: 2 }));
    assert.equal(String((await db.salesOrderLine.findUniqueOrThrow({ where: { id: c.lineId } })).quantity), '1');
    report.checks.push({ name: 'tenant, cashier and reserved-stock denial preserve quantity', passed: true });
    let changed = false;
    dbExport.db = db.$extends({ query: { salesOrderLine: { async findFirst({ args, query }) {
      const line = await query(args);
      if (!changed && args.where?.salesOrderId === c.salesOrderId) {
        changed = true;
        await db.salesOrder.update({ where: { id: c.salesOrderId }, data: { status: 'COMPLETED' } });
      }
      return line;
    } } } });
    try { await assert.rejects(() => services.removePOSCartLine(c)); } finally { dbExport.db = db; }
    assert.equal(changed, true);
    assert.equal(await db.salesOrderLine.count({ where: { id: c.lineId } }), 1);
    report.checks.push({ name: 'controlled finalization between line read and deletion aborts edit and preserves retained line', passed: true, limitation: 'Synthetic status transition isolates the cart/checkout race; not a complete financial checkout.' });
    assert.equal(await db.journalEntry.count({ where: { organizationId: c.organizationId } }), 0);
    report.passed = true; return;
  }
  const a = await fixture('quantity');
  if (after) {
    await assert.rejects(() => services.updatePOSCartLine({ ...a, quantity: 25 }), e => e.code === 'BUSINESS_RULE_VIOLATION');
    assert.equal(String((await db.salesOrderLine.findUniqueOrThrow({ where: { id: a.lineId } })).quantity), '1');
  } else { await services.updatePOSCartLine({ ...a, quantity: 25 }); assert.equal(String((await db.salesOrderLine.findUniqueOrThrow({ where: { id: a.lineId } })).quantity), '10'); }
  report.checks.push({ name: after ? 'insufficient stock rejects without altering cart' : 'reproduced silent quantity substitution', passed: true });
  await db.pOSSession.update({ where: { id: a.sessionId }, data: { status: 'CLOSED' } });
  if (after) await assert.rejects(() => services.removePOSCartLine(a));
  else { await services.removePOSCartLine(a); assert.equal(await db.salesOrderLine.count({ where: { id: a.lineId } }), 0); }
  report.checks.push({ name: after ? 'closed shift denies cart edit' : 'reproduced cart removal after shift close', passed: true });
  const b = await fixture('concurrency'); let reads = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const extended = db.$extends({ query: { salesOrderLine: { async findFirst({ args, query }) {
    const result = await query(args);
    if (args.where?.salesOrderId === b.salesOrderId && ++reads <= 2) { if (reads === 2) release(); await gate; }
    return result;
  } } } });
  dbExport.db = extended;
  try { await Promise.all([services.addPOSCartLine({ ...b, quantity: 1 }), services.addPOSCartLine({ ...b, quantity: 1 })]); }
  finally { dbExport.db = db; }
  const quantity = String((await db.salesOrderLine.findUniqueOrThrow({ where: { id: b.lineId } })).quantity);
  assert.equal(quantity, after ? '3' : '2');
  report.checks.push({ name: after ? 'concurrent additions both retained after aborted transaction retry' : 'reproduced lost concurrent cart addition', quantity, passed: true });
  assert.equal(await db.journalEntry.count({ where: { organizationId: { in: [a.organizationId, b.organizationId] } } }), 0);
  report.passed = true;
}
main().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = digest(); report.sourceStable = report.sourceBefore === report.sourceAfter;
  const file = path.join(__dirname, 'pos-cart-v130-concurrency-' + (after ? 'after-' : 'before-') + stamp + '.json');
  console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await db.$disconnect(); }
});
