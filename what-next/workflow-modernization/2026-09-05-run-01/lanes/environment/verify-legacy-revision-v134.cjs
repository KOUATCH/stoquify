const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const pos = require(path.join(f.root, 'services/pos/pos.service.ts')), { snapshot } = require('./verify-tender-access-v131.cjs');
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), checks: [] };
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  // Select only the owned v133 cash fixture, created before cart revisions existed.
  const record = await db.pOSCommitResult.findFirstOrThrow({ where: { status: 'COMPLETED', organization: { name: { startsWith: f.helper.prefix + 'Tender conflict-' } } }, orderBy: { createdAt: 'desc' } });
  const line = await db.salesOrderLine.findFirstOrThrow({ where: { salesOrderId: record.salesOrderId } });
  const request = { organizationId: record.organizationId, userId: record.actorId, locationId: record.locationId, terminalId: record.terminalId, sessionId: record.sessionId, salesOrderId: record.salesOrderId, clientCommitId: record.clientCommitId, tenders: [{ method: 'CASH', amount: 100 }], receipt: { channel: 'NONE' } };
  const x = { ctx: request, cartId: record.salesOrderId, itemId: line.itemId }, before = await snapshot(x);
  assert.equal((await pos.getPOSSaleCommitStatus(request)).kind, 'RECORDED');
  assert.equal((await pos.commitPOSSale(request)).replayed, true);
  assert.equal(await snapshot(x), before);
  report.checks.push('Actual pre-revision immutable result remains readable and exactly replayable without effects');
  report.passed = true;
}
main().catch(error => { report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, 'services/pos/pos.service.ts'))).digest('hex');
  const file = path.join(__dirname, 'legacy-revision-v134-' + stamp + '.json'); console.log(JSON.stringify({ file, ...report }));
  try { fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx' }); } finally { await db.$disconnect(); }
});
