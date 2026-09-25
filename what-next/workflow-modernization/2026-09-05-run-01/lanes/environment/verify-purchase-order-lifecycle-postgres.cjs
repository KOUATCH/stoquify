const f = require('./supplier-ack-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const service = require(path.join(f.root, 'services/purchase-order/purchase-order.service.ts'));
assert.equal(require(path.join(f.root, 'prisma/db.ts')).db, db, 'Owned service client must match');
const baseline = process.argv.includes('--baseline'), run = crypto.randomUUID().slice(0, 12);
const files = ['services/purchase-order/purchase-order.service.ts', 'services/purchase-order/purchase-order.schemas.ts', 'actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts', 'prisma/schema.prisma'];
files.push('services/purchase-order/purchase-order-capabilities.ts');
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { run, mode: baseline ? 'before' : 'after', at: new Date().toISOString(), sourcesBefore: sources(), checks: [], scope: 'Owned local synthetic orders. Transaction-start interleaving commits a competing domain transition before the tested write transaction; no immutable evidence is modified.' };
async function fixture(name, status = 'DRAFT', shippingCost = '0.00') {
  const x = await f.fixture('en', 'lifecycle-' + run + '-' + name, { skipInvite: true });
  await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { status, approvedById: null, approvedAt: null, shippingCost, total: new (require('@prisma/client').Prisma.Decimal)(25000).plus(shippingCost) } });
  return x;
}
const input = (x, patch = {}) => ({ id: x.purchaseOrderId, organizationId: x.organizationId, updatedById: x.actorId, ...patch });
const order = x => db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId }, include: { lines: true } });
async function check(name, runCheck) { try { report.checks.push({ name, status: 'passed', ...await runCheck() }); } catch (error) { report.checks.push({ name, status: 'failed', error: f.safe(error) }); throw error; } }
async function beforeTransaction(compete, work) {
  const original = db.$transaction.bind(db); let pending = true;
  db.$transaction = async (...args) => { if (pending) { pending = false; await compete(); } return original(...args); };
  try { return await work(); } finally { db.$transaction = original; }
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await f.stable();
  await check('Shipping-only update recalculates total', async () => {
    const x = await fixture('shipping', 'DRAFT', '50.00'); await service.updatePurchaseOrder(input(x, { shippingCost: 175.25 })); const saved = await order(x);
    if (!baseline) { assert.equal(saved.shippingCost.toFixed(2), '175.25'); assert.equal(saved.total.toFixed(2), '25175.25'); }
    return { shipping: saved.shippingCost.toFixed(2), total: saved.total.toFixed(2), expectedTotal: '25175.25' };
  });
  await check('Removing all draft lines preserves unchanged shipping in total', async () => {
    const x = await fixture('empty', 'DRAFT', '50.00'); await service.updatePurchaseOrder(input(x, { orderLines: [] })); const saved = await order(x);
    if (!baseline) { assert.equal(saved.lines.length, 0); assert.equal(saved.shippingCost.toFixed(2), '50.00'); assert.equal(saved.total.toFixed(2), '50.00'); }
    return { lines: saved.lines.length, shipping: saved.shippingCost.toFixed(2), total: saved.total.toFixed(2), expectedTotal: '50.00' };
  });
  await check('Submitted order cannot be edited through the service', async () => {
    const x = await fixture('submitted', 'SUBMITTED'), before = f.hash(await order(x)); let error;
    try { await service.updatePurchaseOrder(input(x, { notes: 'Should not change submitted terms' })); } catch (caught) { error = caught; }
    if (!baseline) { assert.equal(error?.code, 'BUSINESS_RULE_VIOLATION'); assert.equal(f.hash(await order(x)), before); }
    return { rejected: !!error, code: error?.code };
  });
  await check('Approval committed before edit transaction prevents the stale edit', async () => {
    const x = await fixture('approval-race'), checker = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned independent checker', email: 'checker-' + run + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
    let error, afterApproval;
    try { await beforeTransaction(async () => { await service.submitPurchaseOrder(x.purchaseOrderId, x.organizationId); await service.approvePurchaseOrder(x.purchaseOrderId, x.organizationId, checker.id); afterApproval = f.hash(await order(x)); }, () => service.updatePurchaseOrder(input(x, { notes: 'Stale edit must not alter approved terms' }))); } catch (caught) { error = caught; }
    const saved = await order(x);
    if (!baseline) { assert.equal(error?.code, 'BUSINESS_RULE_VIOLATION'); assert.equal(f.hash(saved), afterApproval); }
    return { rejected: !!error, code: error?.code, orderStatus: saved.status, notesChangedAfterApproval: f.hash(saved) !== afterApproval };
  });
  await check('Cancellation committed before approval transaction cannot be overwritten', async () => {
    const x = await fixture('cancel-race', 'SUBMITTED'), checker = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned independent checker', email: 'cancel-checker-' + run + '@example.invalid' } });
    let error;
    try { await beforeTransaction(() => service.cancelPurchaseOrder(x.purchaseOrderId, x.organizationId, 'Owned competing cancellation'), () => service.approvePurchaseOrder(x.purchaseOrderId, x.organizationId, checker.id)); } catch (caught) { error = caught; }
    const saved = await order(x);
    if (!baseline) { assert.equal(error?.code, 'BUSINESS_RULE_VIOLATION'); assert.equal(saved.status, 'CANCELLED'); assert.equal(saved.approvedById, null); }
    return { rejected: !!error, code: error?.code, orderStatus: saved.status, retainedCancellation: saved.notes.includes('Owned competing cancellation') };
  });
  if (!baseline) {
    await check('Foreign tenant cannot edit, submit, approve, cancel, complete or archive another order', async () => {
      const x = await fixture('scope'), other = await fixture('foreign'), before = f.hash(await order(x));
      for (const operation of [() => service.updatePurchaseOrder({ ...input(x, { notes: 'Foreign edit' }), organizationId: other.organizationId }), ...['submitPurchaseOrder', 'cancelPurchaseOrder', 'closePurchaseOrder'].map(name => () => service[name](x.purchaseOrderId, other.organizationId)), () => service.approvePurchaseOrder(x.purchaseOrderId, other.organizationId, other.actorId), () => service.deletePurchaseOrder(x.purchaseOrderId, other.organizationId, other.actorId)]) await assert.rejects(operation, error => error.code === 'NOT_FOUND');
      assert.equal(f.hash(await order(x)), before); return { deniedOperations: 6 };
    });
    await check('Empty orders cannot be submitted or approved singly or through bulk submission', async () => {
      const x = await fixture('no-lines'); await service.updatePurchaseOrder(input(x, { orderLines: [] }));
      await assert.rejects(() => service.submitPurchaseOrder(x.purchaseOrderId, x.organizationId), error => error.code === 'BUSINESS_RULE_VIOLATION');
      const bulk = await service.bulkUpdateStatus({ organizationId: x.organizationId, purchaseOrderIds: [x.purchaseOrderId, x.purchaseOrderId], toStatus: 'SUBMITTED' }); assert.equal(bulk.updated.length, 0); assert.equal(bulk.failed.length, 1);
      await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { status: 'SUBMITTED' } });
      await assert.rejects(() => service.approvePurchaseOrder(x.purchaseOrderId, x.organizationId, x.actorId), error => error.code === 'BUSINESS_RULE_VIOLATION');
      return { emptySubmissionDenied: true, duplicateSelectionEvaluatedOnce: true, emptyApprovalDenied: true };
    });
    await check('Bulk operations cannot synthesize receipt or approval states', async () => {
      const x = await fixture('bulk-receipt', 'SUBMITTED'), before = f.hash(await order(x));
      for (const toStatus of ['APPROVED', 'RECEIVED', 'PARTIALLY_RECEIVED']) await assert.rejects(() => service.bulkUpdateStatus({ organizationId: x.organizationId, purchaseOrderIds: [x.purchaseOrderId], toStatus }), error => error.code === 'BUSINESS_RULE_VIOLATION');
      await assert.rejects(() => service.bulkUpdateStatus({ organizationId: x.organizationId, purchaseOrderIds: [], toStatus: 'SUBMITTED' }), error => error.code === 'BUSINESS_RULE_VIOLATION'); assert.equal(f.hash(await order(x)), before);
      return { deniedStates: 3, emptySelectionDenied: true };
    });
    await check('Completion rejects remaining fractional quantities despite received status', async () => {
      const x = await fixture('remaining', 'RECEIVED'); await db.purchaseOrderLine.update({ where: { id: x.lineId }, data: { orderedQuantity: '10.125', receivedQuantity: '10.124' } }); const before = f.hash(await order(x));
      await assert.rejects(() => service.closePurchaseOrder(x.purchaseOrderId, x.organizationId), error => error.code === 'BUSINESS_RULE_VIOLATION');
      const bulk = await service.bulkUpdateStatus({ organizationId: x.organizationId, purchaseOrderIds: [x.purchaseOrderId], toStatus: 'COMPLETED' }); assert.equal(bulk.updated.length, 0); assert.equal(bulk.failed.length, 1); assert.equal(f.hash(await order(x)), before);
      return { remaining: '0.001', singleAndBulkDenied: true };
    });
    await check('Held inspection blocks single and bulk completion without changing receipts', async () => {
      const x = await fixture('held', 'RECEIVED'), po = await order(x); await db.purchaseOrderLine.update({ where: { id: x.lineId }, data: { receivedQuantity: '10.000' } });
      const receipt = await db.goodsReceipt.create({ data: { organizationId: x.organizationId, purchaseOrderId: x.purchaseOrderId, locationId: po.locationId, receiptNumber: 'GR-OWNED-' + run, status: 'HELD', receivedById: x.actorId } }), before = f.hash(await order(x));
      await assert.rejects(() => service.closePurchaseOrder(x.purchaseOrderId, x.organizationId), error => error.code === 'BUSINESS_RULE_VIOLATION');
      const bulk = await service.bulkUpdateStatus({ organizationId: x.organizationId, purchaseOrderIds: [x.purchaseOrderId], toStatus: 'COMPLETED' }); assert.equal(bulk.updated.length, 0); assert.equal(bulk.failed.length, 1); assert.equal(f.hash(await order(x)), before); assert.equal(f.hash(await db.goodsReceipt.findUniqueOrThrow({ where: { id: receipt.id } })), f.hash(receipt));
      return { syntheticHeldCondition: true, singleAndBulkDenied: true, receiptUnchanged: true };
    });
    await check('Concurrent approvals produce one state change and one audit record', async () => {
      const x = await fixture('parallel', 'SUBMITTED'), checker = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned checker', email: 'parallel-checker-' + run + '@example.invalid' } });
      const results = await Promise.allSettled([1, 2].map(() => service.approvePurchaseOrder(x.purchaseOrderId, x.organizationId, checker.id)));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); const failure = results.find(r => r.status === 'rejected'); assert.equal(failure.reason.code, 'BUSINESS_RULE_VIOLATION');
      const auditCount = await db.auditLog.count({ where: { organizationId: x.organizationId, entityId: x.purchaseOrderId, action: 'APPROVE_PURCHASE_ORDER' } }); assert.equal(auditCount, 1); assert.equal((await order(x)).status, 'APPROVED'); return { applied: 1, rejected: 1, auditCount };
    });
    await check('Requester self approval leaves the submitted order unchanged', async () => {
      const x = await fixture('self', 'SUBMITTED'), before = f.hash(await order(x)); await assert.rejects(() => service.approvePurchaseOrder(x.purchaseOrderId, x.organizationId, x.actorId), error => error.code === 'BUSINESS_RULE_VIOLATION'); assert.equal(f.hash(await order(x)), before); assert.equal(await db.auditLog.count({ where: { entityId: x.purchaseOrderId } }), 0); return { noEffects: true };
    });
    await check('Audit failure rolls back an otherwise valid approval', async () => {
      const x = await fixture('audit', 'SUBMITTED'), checker = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned checker', email: 'audit-checker-' + run + '@example.invalid' } }), before = f.hash(await order(x)), original = db.$transaction.bind(db);
      db.$transaction = (callback, settings) => original(tx => callback(new Proxy(tx, { get(target, property) { if (property === 'auditLog') return new Proxy(target.auditLog, { get(model, method) { return method === 'create' ? () => { throw new Error('Owned injected audit write failure'); } : model[method]; } }); return target[property]; } })), settings);
      try { await assert.rejects(() => service.approvePurchaseOrder(x.purchaseOrderId, x.organizationId, checker.id), /Owned injected audit write failure/); } finally { db.$transaction = original; }
      assert.equal(f.hash(await order(x)), before); assert.equal(await db.auditLog.count({ where: { entityId: x.purchaseOrderId } }), 0); return { transactionalRollback: true };
    });
    await check('Bulk cancellation preserves notes and ignores duplicate and foreign IDs', async () => {
      const x = await fixture('bulk-valid', 'SUBMITTED'), foreign = await fixture('bulk-foreign', 'SUBMITTED'), foreignBefore = f.hash(await order(foreign)), po = await order(x);
      const result = await service.bulkUpdateStatus({ organizationId: x.organizationId, purchaseOrderIds: [x.purchaseOrderId, foreign.purchaseOrderId, x.purchaseOrderId], toStatus: 'CANCELLED', reason: 'Owned bulk reason' });
      assert.deepEqual(result.updated, [x.purchaseOrderId]); assert.equal(result.failed.length, 1); assert.equal((await order(x)).notes, po.notes + '\n\nOwned bulk reason'); assert.equal(f.hash(await order(foreign)), foreignBefore); return { applied: 1, foreignDenied: 1, priorNotesPreserved: true };
    });
    await check('Fully received order completes while retaining its lines', async () => {
      const x = await fixture('complete', 'RECEIVED'); await db.purchaseOrderLine.update({ where: { id: x.lineId }, data: { receivedQuantity: '10.000' } }); const before = f.hash((await order(x)).lines);
      await service.closePurchaseOrder(x.purchaseOrderId, x.organizationId); assert.equal((await order(x)).status, 'COMPLETED'); assert.equal(f.hash((await order(x)).lines), before); return { syntheticReceivedCondition: true, retainedLines: true };
    });
  }
  report.originalUnchanged = report.originalBefore === await f.stable(); assert.ok(report.originalUnchanged);
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesAfter) === JSON.stringify(report.sourcesBefore); assert.ok(report.sourceStable);
})().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  await db.$disconnect(); const file = 'purchase-order-lifecycle-' + report.mode + '-' + run + '.json'; fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, checks: report.checks, error: report.error, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged }));
});
