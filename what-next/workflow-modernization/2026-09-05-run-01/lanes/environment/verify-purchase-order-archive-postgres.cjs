const f = require('./supplier-ack-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const service = require(path.join(f.root, 'services/purchase-order/purchase-order.service.ts'));
const run = crypto.randomUUID().slice(0, 12), baseline = process.argv.includes('--baseline'), file = 'services/purchase-order/purchase-order.service.ts';
const source = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex');
const report = { run, mode: baseline ? 'before' : 'after', at: new Date().toISOString(), sourcesBefore: { [file]: source() }, scope: 'Positive draft archive through the real domain service with retained line/audit/event checks. Owned local fixture only, no live archive or migration. Current service authority and archive replay remain separately open.' };
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned); report.originalBefore = await f.stable();
  const x = await f.fixture('en', 'archive-' + run, { skipInvite: true }); await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { status: 'DRAFT', approvedById: null, approvedAt: null } });
  const before = f.hash(await db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId }, include: { lines: true } }));
  let failed; try { await service.deletePurchaseOrder(x.purchaseOrderId, x.organizationId, x.actorId); } catch (error) { failed = error; }
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId }, include: { lines: true } }), audits = await db.auditLog.findMany({ where: { organizationId: x.organizationId, action: 'ARCHIVE_PURCHASE_ORDER' } }), events = await db.businessEvent.findMany({ where: { organizationId: x.organizationId } });
  report.observed = { failed: !!failed, code: failed?.code, archiveApplied: !!po.deletedAt, retainedLines: po.lines.length, auditCount: audits.length, eventCount: events.length, unchanged: f.hash(po) === before };
  if (baseline) { assert.ok(failed); assert.equal(failed.code, 'INTERNAL_ERROR'); assert.ok(report.observed.unchanged); assert.equal(audits.length, 0); assert.equal(events.length, 0); }
  else { assert.ok(!failed); assert.ok(po.deletedAt); assert.equal(po.status, 'CANCELLED'); assert.equal(po.lines[0].id, x.lineId); assert.equal(audits.length, 1); assert.equal(events.length, 1); assert.equal(events[0].sourceType, null); assert.equal(events[0].payload.entityType, 'PurchaseOrder'); assert.equal(events[0].status, 'APPLIED'); assert.ok(events[0].processedAt); assert.equal(await db.businessEventOutbox.count({ where: { organizationId: x.organizationId } }), 0); }
  report.passed = true;
})().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await f.stable(); report.sourcesAfter = { [file]: source() }; report.sourceStable = report.sourcesBefore[file] === report.sourcesAfter[file]; await db.$disconnect();
  if (!report.originalUnchanged || !report.sourceStable) process.exitCode = 1;
  const output = 'purchase-order-archive-' + report.mode + '-' + run + '.json'; fs.writeFileSync(path.join(__dirname, output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ output, ...report.observed, passed: report.passed, error: report.error, originalUnchanged: report.originalUnchanged, sourceStable: report.sourceStable }));
});
